import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

const LIMIT = 30;
const EDGE_TTL_SECONDS = 1800;

const SITE_URL = 'https://cbfc.watch';

const SELECT_RECENT = `
WITH recent AS (
  SELECT
    f.id, f.slug, f.name, f.year, f.language, f.duration, f.cert_date,
    f.cbfc_file_no, f.applicant,
    f.rating, f.poster_url, f.imdb_id, f.imdb_overview, f.imdb_genres,
    ROW_NUMBER() OVER (PARTITION BY LOWER(f.name) ORDER BY f.cert_date DESC) AS rn
  FROM films f
  WHERE f.cert_date IS NOT NULL AND f.cert_date != ''
)
SELECT
  r.*,
  (
    SELECT json_group_array(json_object(
      'cut_no', cut_no,
      'description', description,
      'ai_description', ai_description,
      'deleted_secs', deleted_secs,
      'replaced_secs', replaced_secs,
      'inserted_secs', inserted_secs
    ))
    FROM (
      SELECT DISTINCT cut_no, description, ai_description,
        deleted_secs, replaced_secs, inserted_secs
      FROM modifications
      WHERE film_id = r.id
      ORDER BY cut_no ASC
    )
  ) AS modifications_json
FROM recent r
WHERE rn = 1
ORDER BY cert_date DESC
LIMIT ?1
`;

type Modification = {
	cut_no: number | null;
	description: string | null;
	ai_description: string | null;
	deleted_secs: number | null;
	replaced_secs: number | null;
	inserted_secs: number | null;
};

type FilmRow = {
	id: string;
	slug: string;
	name: string;
	year: number | null;
	language: string | null;
	duration: number | null;
	cert_date: string;
	cbfc_file_no: string | null;
	applicant: string | null;
	rating: string | null;
	poster_url: string | null;
	imdb_id: string | null;
	imdb_overview: string | null;
	imdb_genres: string | null;
	modifications_json: string | null;
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

const formatDuration = (mins: number): string => {
	const total = Math.round(mins);
	const h = Math.floor(total / 60);
	const m = total % 60;
	if (h && m) return `${h}h ${m}m`;
	if (h) return `${h}h`;
	return `${m}m`;
};

const formatSecs = (secs: number): string => {
	if (secs < 60) return `${Math.round(secs)}s`;
	const m = Math.floor(secs / 60);
	const s = Math.round(secs % 60);
	return s ? `${m}m ${s}s` : `${m}m`;
};

const parseModifications = (json: string | null): Modification[] => {
	if (!json) return [];
	try {
		const arr = JSON.parse(json) as Modification[];
		return arr.filter((m) => m && (m.description || m.ai_description));
	} catch {
		return [];
	}
};

const cleanApplicant = (raw: string): string => {
	const studioMatch = raw.match(/\(([^)]+)\)\s*$/);
	if (studioMatch) {
		const inner = studioMatch[1].replace(/^MS\s+/i, '').trim();
		const looksLikeTitle = inner.length < 8 || /^[A-Z]\.[A-Z]\.?$/.test(inner);
		if (!looksLikeTitle) return inner;
	}
	const beforeParen = raw.replace(/\s*\([^)]+\)\s*$/, '');
	return beforeParen.split(' - ')[0].trim();
};

const renderModifications = (mods: Modification[]): string => {
	if (!mods.length) return '';

	const totalDeleted = mods.reduce((s, m) => s + (m.deleted_secs ?? 0), 0);
	const totalReplaced = mods.reduce((s, m) => s + (m.replaced_secs ?? 0), 0);
	const totalInserted = mods.reduce((s, m) => s + (m.inserted_secs ?? 0), 0);

	const summary: string[] = [];
	if (totalDeleted > 0) summary.push(`${formatSecs(totalDeleted)} deleted`);
	if (totalReplaced > 0) summary.push(`${formatSecs(totalReplaced)} replaced`);
	if (totalInserted > 0) summary.push(`${formatSecs(totalInserted)} inserted`);

	const cutsLabel = `${mods.length} ${mods.length === 1 ? 'cut' : 'cuts'}`;
	const heading = summary.length
		? `${cutsLabel} · ${summary.join(' · ')}`
		: cutsLabel;

	const items = mods
		.map((m) => {
			const text = m.ai_description || m.description || '';
			const secs = (m.deleted_secs ?? 0) + (m.replaced_secs ?? 0) + (m.inserted_secs ?? 0);
			const suffix = secs > 0 ? ` (${formatSecs(secs)})` : '';
			return `<li>${escapeXml(text + suffix)}</li>`;
		})
		.join('');

	return `<h3>Modifications</h3><p>${escapeXml(heading)}</p><ol>${items}</ol>`;
};

const renderDescription = (film: FilmRow): string => {
	const parts: string[] = [];

	if (film.poster_url) {
		parts.push(
			`<p><img src="${escapeXml(film.poster_url)}" alt="${escapeXml(film.name)}" width="120" height="180" /></p>`
		);
	}

	const meta: string[] = [];
	if (film.rating) meta.push(film.rating);
	if (film.language) meta.push(film.language);
	if (film.duration) meta.push(formatDuration(film.duration));
	if (film.imdb_genres) {
		const g = film.imdb_genres.split('|').slice(0, 2).join(', ');
		meta.push(g);
	}
	if (meta.length) parts.push(`<p>${escapeXml(meta.join(' · '))}</p>`);

	if (film.imdb_overview) {
		parts.push(`<p>${escapeXml(film.imdb_overview)}</p>`);
	}

	const mods = parseModifications(film.modifications_json);
	const modsBlock = renderModifications(mods);
	if (modsBlock) parts.push(modsBlock);

	const tertiary: string[] = [];
	if (film.cbfc_file_no) tertiary.push(`CBFC File ${film.cbfc_file_no}`);
	if (film.applicant) tertiary.push(`Applicant: ${cleanApplicant(film.applicant)}`);
	if (tertiary.length) {
		parts.push(`<p><small>${escapeXml(tertiary.join(' · '))}</small></p>`);
	}

	const filmUrl = `${SITE_URL}/film/${film.slug}`;
	const links: string[] = [`<a href="${filmUrl}">View on CBFC Watch</a>`];
	if (film.id) {
		links.push(
			`<a href="https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&amp;i=${escapeXml(film.id)}">E-Cinepramaan</a>`
		);
	}
	if (film.imdb_id) {
		const imdbClean = film.imdb_id.split('.')[0].padStart(7, '0');
		links.push(`<a href="https://www.imdb.com/title/tt${imdbClean}/">IMDb</a>`);
	}
	parts.push(`<p>${links.join(' · ')}</p>`);

	return parts.join('\n');
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
