import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

const LIMIT = 30;
const EDGE_TTL_SECONDS = 1800;

const SITE_URL = 'https://cbfc.watch';

const SELECT_RECENT = `
WITH recent AS (
  SELECT
    f.id, f.slug, f.name, f.year, f.language, f.cert_date, f.cbfc_file_no,
    f.rating, f.poster_url, f.imdb_id, f.imdb_rating, f.imdb_overview,
    f.imdb_directors, f.imdb_actors,
    ROW_NUMBER() OVER (PARTITION BY LOWER(f.name) ORDER BY f.cert_date DESC) AS rn
  FROM films f
  WHERE f.cert_date IS NOT NULL AND f.cert_date != ''
)
SELECT * FROM recent WHERE rn = 1 ORDER BY cert_date DESC LIMIT ?1
`;

type FilmRow = {
	id: string;
	slug: string;
	name: string;
	year: number | null;
	language: string | null;
	cert_date: string;
	cbfc_file_no: string | null;
	rating: string | null;
	poster_url: string | null;
	imdb_id: string | null;
	imdb_rating: number | null;
	imdb_overview: string | null;
	imdb_directors: string | null;
	imdb_actors: string | null;
};

const escapeXml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

const formatPubDate = (certDate: string): string => {
	const d = new Date(`${certDate}T00:00:00Z`);
	if (Number.isNaN(d.getTime())) return '';
	return d.toUTCString();
};

const renderDescription = (film: FilmRow): string => {
	const parts: string[] = [];

	if (film.poster_url) {
		parts.push(
			`<img src="${escapeXml(film.poster_url)}" alt="${escapeXml(film.name)}" style="width:150px;height:225px;object-fit:cover;" /><br/>`
		);
	}

	const meta: string[] = [];
	if (film.rating) meta.push(`Certificate: ${film.rating}`);
	if (film.imdb_rating != null) meta.push(`IMDb: ${film.imdb_rating}/10`);
	if (meta.length) parts.push(`<p><strong>${escapeXml(meta.join(' | '))}</strong></p>`);

	if (film.imdb_overview) parts.push(`<p>${escapeXml(film.imdb_overview)}</p>`);

	const credits: string[] = [];
	if (film.imdb_directors) {
		const d = film.imdb_directors.split('|').slice(0, 3).join(', ');
		credits.push(`<strong>Director:</strong> ${escapeXml(d)}`);
	}
	if (film.imdb_actors) {
		const a = film.imdb_actors.split('|').slice(0, 4).join(', ');
		credits.push(`<strong>Cast:</strong> ${escapeXml(a)}`);
	}
	if (credits.length) parts.push(`<p>${credits.join(' | ')}</p>`);

	const filmUrl = `${SITE_URL}/film/${film.slug}`;
	const links: string[] = [`<a href="${filmUrl}">View on CBFC Watch</a>`];
	if (film.imdb_id) {
		const imdbClean = film.imdb_id.split('.')[0].padStart(7, '0');
		links.push(`<a href="https://www.imdb.com/title/tt${imdbClean}/">IMDb</a>`);
	}
	if (film.id) {
		links.push(
			`<a href="https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&amp;i=${escapeXml(film.id)}">E-Cinepramaan</a>`
		);
	}
	parts.push(`<p>${links.join(' | ')}</p>`);

	return parts.join('');
};

const renderItem = (film: FilmRow): string => {
	const title = `${film.name}${film.year ? ` (${film.year})` : ''}${film.language ? ` — ${film.language}` : ''}`;
	const link = `${SITE_URL}/film/${film.slug}`;
	const pubDate = formatPubDate(film.cert_date);
	const guid = film.id || film.slug;
	return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <description><![CDATA[${renderDescription(film)}]]></description>
      ${film.poster_url ? `<media:content url="${escapeXml(film.poster_url)}" medium="image" />` : ''}
    </item>`;
};

export const GET: RequestHandler = async ({ platform, request }) => {
	const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
	const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });

	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) return cached;
	}

	const db = platform?.env?.DB as D1Database | undefined;
	if (!db) {
		return new Response('Database unavailable', { status: 503 });
	}

	const { results } = await db
		.prepare(SELECT_RECENT)
		.bind(LIMIT)
		.all<FilmRow>();

	const items = (results ?? []).map(renderItem).join('\n');
	const lastBuildDate = new Date().toUTCString();

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>CBFC Watch — Recent Certifications</title>
    <link>${SITE_URL}</link>
    <description>Latest film certifications and censorship records from the Central Board of Film Certification, India.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

	const response = new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}, s-maxage=${EDGE_TTL_SECONDS}`
		}
	});

	const ctx = platform?.context as { waitUntil?: (p: Promise<unknown>) => void } | undefined;
	if (cache) {
		const cachePut = cache.put(cacheKey, response.clone());
		if (ctx?.waitUntil) ctx.waitUntil(cachePut);
		else await cachePut;
	}

	return response;
};
