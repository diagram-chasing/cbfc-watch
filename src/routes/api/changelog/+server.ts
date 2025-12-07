
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 100;
  const offset = (page - 1) * limit;

  try {
    const db = platform?.env?.DB;

    if (!db) {
      return json({ films: [], hasNext: false }, { status: 404 });
    }

    // Fetch films sorted by cert_date DESC
    const results = await db.prepare(`
            SELECT
                slug,
                name,
                year,
                language,
                rating,
                cert_date,
                imdb_rating
            FROM films
            WHERE cert_date IS NOT NULL
            ORDER BY cert_date DESC
            LIMIT ? OFFSET ?
        `).bind(limit + 1, offset).all();

    const films = results.results || [];
    const hasNext = films.length > limit;
    if (hasNext) {
      films.pop();
    }

    return json({
      films,
      page,
      hasNext
    });

  } catch (e) {
    console.error("Error fetching changelog:", e);
    return json({ error: "Failed to load data" }, { status: 500 });
  }
};
