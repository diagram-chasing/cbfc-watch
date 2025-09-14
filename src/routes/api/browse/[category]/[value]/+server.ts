import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import {
	isValidUrlPath,
	getCategoryFromUrlPath,
	getCategoryQuery,
	convertValueToDisplayName
} from '../../../../browse/categories';

interface Film {
	id: string;
	slug: string | null;
	name: string;
	year: number | null;
	language: string | null;
	poster_url: string | null;
}

export const GET: RequestHandler = async ({ params, platform, url }) => {
	const { category: urlPath, value } = params;
	const db = platform?.env?.DB as D1Database;

	if (!urlPath || !value || !db) {
		return new Response(JSON.stringify({ error: 'Missing parameters or database' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!isValidUrlPath(urlPath)) {
		return new Response(JSON.stringify({ error: `Unknown category: ${urlPath}` }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const categoryId = getCategoryFromUrlPath(urlPath);
	if (!categoryId) {
		return new Response(JSON.stringify({ error: 'Invalid category mapping' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = 50;

	try {
		const decodedValue = decodeURIComponent(value);
		const { films, totalCount } = await fetchFilms(db, categoryId, decodedValue, page, perPage);
		const totalPages = Math.ceil(totalCount / perPage);

		const response = {
			films,
			category: urlPath,
			value: decodedValue,
			totalCount,
			displayName: convertValueToDisplayName(categoryId, decodedValue),
			pagination: {
				currentPage: page,
				perPage,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1
			}
		};

		return new Response(JSON.stringify(response), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

async function fetchFilms(
	db: D1Database,
	category: string,
	decodedValue: string,
	page: number,
	perPage: number
): Promise<{ films: Film[]; totalCount: number }> {
	const baseQuery = getCategoryQuery(category);
	if (!baseQuery) {
		throw new Error(`Unknown category: ${category}`);
	}

	// With normalized tables, we search directly by slug (no conversion needed)
	const param = decodedValue;
	const offset = (page - 1) * perPage;

	// D1-optimized: Single query with window function instead of 2 separate queries
	const optimizedQuery = `
		SELECT *, COUNT(*) OVER() as total_count 
		FROM (${baseQuery}) 
		LIMIT ${perPage} OFFSET ${offset}
	`;

	const result = await db.prepare(optimizedQuery).bind(param).all();

	if (!result.success || !result.results?.length) {
		return { films: [], totalCount: 0 };
	}

	const films = result.results.map((row: any) => ({
		id: row.id,
		slug: row.slug,
		name: row.name,
		year: row.year,
		language: row.language,
		poster_url: row.poster_url
	}));

	const totalCount = (result.results[0] as any).total_count || 0;

	return { films, totalCount };
}
