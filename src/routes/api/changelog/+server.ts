
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform, url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 100;
  const offset = (page - 1) * limit;

  try {
    const db = platform?.env?.DB;

    if (!db) {
      return json({ films: [], hasNext: false, totalCount: 0, pagination: null }, { status: 404 });
    }

    // Get total count
    const countResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM films
      WHERE cert_date IS NOT NULL
    `).first();

    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

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
      hasNext,
      totalCount,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages,
        totalCount
      }
    });

  } catch (e) {
    console.error("Error fetching changelog:", e);
    return json({ error: "Failed to load data" }, { status: 500 });
  }
};
