import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { cachedJson } from '$lib/server/edge-cache';

const LIMIT = 100;
const EDGE_TTL_SECONDS = 21600;

const SELECT_RECENT = `
WITH recent AS (
  SELECT
    id, slug, name, year, language, cert_date, cert_no, cbfc_file_no,
    rating, poster_url, imdb_id, imdb_rating, imdb_overview,
    imdb_genres, imdb_directors, imdb_actors,
    ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY cert_date DESC) AS rn
  FROM films
  WHERE cert_date IS NOT NULL AND cert_date != ''
)
SELECT * FROM recent WHERE rn = 1 ORDER BY cert_date DESC LIMIT ?1
`;

export const GET: RequestHandler = async (event) => {
	const db = event.platform?.env?.DB as D1Database | undefined;
	if (!db) {
		return new Response(JSON.stringify({ error: 'Database unavailable' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return cachedJson(event, EDGE_TTL_SECONDS, async () => {
		const { results } = await db.prepare(SELECT_RECENT).bind(LIMIT).all<Record<string, unknown>>();

		const films = (results ?? []).map((row) => ({
			id: row.id,
			slug: row.slug,
			movie_name: row.name,
			language: row.language,
			cert_date: row.cert_date,
			cert_no: row.cert_no,
			cbfc_file_no: row.cbfc_file_no,
			rating: row.rating,
			imdb_year: row.year,
			imdb_poster_url: row.poster_url,
			imdb_id: row.imdb_id,
			imdb_rating: row.imdb_rating,
			imdb_overview: row.imdb_overview,
			imdb_genres: row.imdb_genres,
			imdb_directors: row.imdb_directors,
			imdb_actors: row.imdb_actors
		}));

		return { body: films };
	});
};
