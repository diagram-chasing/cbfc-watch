import type { RequestHandler } from './$types';
import type { D1Database } from '@cloudflare/workers-types';

interface DBFilmDetail {
  id: string;
  slug: string;
  name: string;
  year: number;
  duration: number;
  rating: string;
  poster_url: string;
  imdb_id: string;
  imdb_rating: number;
  imdb_votes: string;
  imdb_overview: string;
  views: number;
  language: string;
  cert_date: string;
  cbfc_file_no: string;
  certifier: string;
  imdb_genres: string;
  imdb_directors: string;
  imdb_actors: string;
  imdb_countries: string;
  imdb_languages: string;
  imdb_studios: string;
  modifications_json: string; // JSON string from the view
}

interface Modification {
  id: number;
  description: string | null;
  ai_description: string | null;
  cut_no: number | null;
  deleted_secs: number | null;
  replaced_secs: number | null;
  inserted_secs: number | null;
  ai_action_types: string | null;
  ai_content_types: string | null;
  ai_media_elements: string | null;
  ai_references: string | null;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date to RFC-822 format for RSS
 */
function formatRFC822Date(dateString: string): string {
  if (!dateString) return new Date().toUTCString();
  const date = new Date(dateString);
  return date.toUTCString();
}

function generateDescription(film: DBFilmDetail, modifications: Modification[], siteUrl: string): string {
  const parts: string[] = [];

  if (film.poster_url) {
    parts.push(
      `<img src="${escapeXml(film.poster_url)}" alt="${escapeXml(film.name)}" style="width: 150px; height: 225px; object-fit: cover;" />`
    );
  }

  // Basic Film Info
  parts.push(`<p><strong>Language:</strong> ${escapeXml(film.language)}</p>`);

  const ratingInfo: string[] = [];
  if (film.rating) ratingInfo.push(`CBFC: ${film.rating}`);
  if (film.imdb_rating) ratingInfo.push(`IMDb: ${film.imdb_rating}/10`);
  if (ratingInfo.length) parts.push(`<p><strong>Rating:</strong> ${escapeXml(ratingInfo.join(' | '))}</p>`);

  if (film.imdb_overview) {
    parts.push(`<p>${escapeXml(film.imdb_overview)}</p>`);
  }

  const credits: string[] = [];
  if (film.imdb_directors) credits.push(`<strong>Director:</strong> ${escapeXml(film.imdb_directors.split('|').slice(0, 3).join(', '))}`);
  if (film.imdb_actors) credits.push(`<strong>Cast:</strong> ${escapeXml(film.imdb_actors.split('|').slice(0, 4).join(', '))}`);
  if (credits.length) parts.push(`<p>${credits.join('<br/>')}</p>`);

  parts.push(`<hr/>`);

  if (modifications && modifications.length > 0) {
    const validMods = modifications.filter(m => m.description || m.ai_description);

    if (validMods.length > 0) {
      parts.push(`<h3><strong>Modifications (${validMods.length})</strong></h3>`);
      parts.push(`<ul>`);

      for (const mod of validMods) {
        const desc = mod.ai_description || mod.description || 'No description';

        parts.push(`<li>`);
        parts.push(`<strong>#${escapeXml(mod.cut_no?.toString())}:</strong> ${escapeXml(desc)}`);
        parts.push(`</li>`);
      }
      parts.push(`</ul>`);

      // Footer reference to original source
      if (film.id) {
        const eCinepramaanLink = `https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&i=${encodeURIComponent(film.id)}`;
        parts.push(`<p><em>For original modifications, refer to <a href="${eCinepramaanLink}">E-Cinepramaan</a></em></p>`);
      }
    }
  }

    parts.push(`<hr/>`);


  const links: string[] = [];
  links.push(`<a href="${siteUrl}/film/${escapeXml(film.slug)}">View on CBFC Watch</a>`);

  if (film.cbfc_file_no) {
    const encodedFileNo = btoa(film.cbfc_file_no);
    links.push(`<a href="https://www.cbfcindia.gov.in/cbfcAdmin/search-result.php?recid=${encodedFileNo}">CBFC Listing</a>`);
  }

  parts.push(`<p>${links.join(' | ')}</p>`);

  return parts.join('');
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const db = platform?.env?.DB as D1Database;

  if (!db) {
    console.warn('DB not found on platform context');
    return new Response('Database not available', { status: 500 });
  }

  try {
    const { results } = await db
      .prepare(`
				SELECT * FROM v_film_details
				ORDER BY cert_date DESC
				LIMIT 20
			`)
      .all<DBFilmDetail>();

    if (!results) {
      return new Response('No data found', { status: 404 });
    }

    // Get site URL
    const siteUrl = `${url.protocol}//${url.host}`;
    const buildDate = new Date().toUTCString();
    const latestPubDate = results.length > 0 ? formatRFC822Date(results[0].cert_date) : buildDate;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:cbfc="https://cbfc.watch/rss/cbfc">
  <channel>
    <title>CBFC Watch - Recent Certifications</title>
    <link>${siteUrl}</link>
    <description>Latest film certifications and modifications from the Central Board of Film Certification (CBFC) India.</description>
    <language>en</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <pubDate>${latestPubDate}</pubDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

    for (const film of results) {
      // Parse the aggregated modifications JSON
      let modifications: Modification[] = [];
      try {
        if (film.modifications_json) {
          const rawModifications: Modification[] = JSON.parse(film.modifications_json);

          // 1. Deduplicate
          const uniqueMods = new Map<string, Modification>();
          rawModifications.forEach(m => {
            if (m && m.id) {
              // Unique key: Cut No + Description
              const key = `${m.cut_no || '0'}-${(m.description || '').trim()}`;
              if (!uniqueMods.has(key)) {
                uniqueMods.set(key, m);
              }
            }
          });

          modifications = Array.from(uniqueMods.values());

          // 2. Sort by cut_no ASCENDING
          modifications.sort((a, b) => {
            const cutA = a.cut_no || 0;
            const cutB = b.cut_no || 0;
            return cutA - cutB;
          });
        }
      } catch (e) {
        console.error('Error parsing modifications JSON', e);
      }

      const itemLink = `${siteUrl}/film/${escapeXml(film.slug)}`;
      const description = generateDescription(film, modifications, siteUrl);

      xml += `
    <item>
      <title>CBFC Watch: ${escapeXml(film.name)} (${film.year}) - ${escapeXml(film.language)}</title>
      <link>${itemLink}</link>
      <guid isPermaLink="false">${escapeXml(film.id)}</guid>
      <pubDate>${formatRFC822Date(film.cert_date)}</pubDate>
      <description><![CDATA[${description}]]></description>`;

      // Categories
      if (film.rating) xml += `\n      <category>Rating: ${escapeXml(film.rating)}</category>`;
      if (film.language) xml += `\n      <category>Language: ${escapeXml(film.language)}</category>`;

      if (film.imdb_genres) {
        film.imdb_genres.split('|').forEach(g => {
          xml += `\n      <category>Genre: ${escapeXml(g.trim())}</category>`;
        });
      }

      // Enclosure
      if (film.poster_url) {
        xml += `\n      <enclosure url="${escapeXml(film.poster_url)}" type="image/jpeg" length="0" />`;
      }

      // CBFC Specific Metadata
      xml += `\n      <cbfc:certNo>${escapeXml(film.cbfc_file_no)}</cbfc:certNo>`;
      xml += `\n      <cbfc:modificationsCount>${modifications.length}</cbfc:modificationsCount>`;

      xml += `\n    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=UTF-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200' // 1 hour cache
      }
    });

  } catch (error) {
    console.error('RSS Feed Generation Error:', error);
    return new Response('Error generating feed', { status: 500 });
  }
};
