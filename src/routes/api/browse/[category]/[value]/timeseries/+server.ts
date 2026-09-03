import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import { cachedJson } from '$lib/server/edge-cache';
import {
	isValidUrlPath,
	getCategoryFromUrlPath,
	getCategoryQuery
} from '../../../../../browse/categories';

const EDGE_TTL_SECONDS = 86400;

// Categories whose histograms are rebuilt into category_timeseries by
// scripts/db/003-timeseries.sql. Their values each match hundreds of thousands
// of modification rows, so the live query is far too expensive to run per hit.
const PRECOMPUTED_CATEGORIES = new Set(['aiContentTypes', 'aiActionTypes', 'aiMediaElements']);

interface TimeseriesDataPoint {
	date: string;
	count: number;
	rollingAverage?: number;
}

export const GET: RequestHandler = async (event) => {
	const { params, url, platform } = event;
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

	const period = (url.searchParams.get('period') as 'yearly' | 'monthly' | 'weekly') || 'yearly';
	const rollingWindow = url.searchParams.get('rolling')
		? parseInt(url.searchParams.get('rolling')!)
		: undefined;

	if (!['yearly', 'monthly', 'weekly'].includes(period)) {
		return new Response(JSON.stringify({ error: 'Invalid period' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (rollingWindow && (rollingWindow < 2 || rollingWindow > 12)) {
		return new Response(JSON.stringify({ error: 'Invalid rolling window' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return cachedJson(event, EDGE_TTL_SECONDS, async () => {
		try {
			const decodedValue = decodeURIComponent(value);
			const data = await fetchTimeseriesData(db, categoryId, decodedValue, period, rollingWindow);

			return {
				body: { data, category: urlPath, value: decodedValue, period, rollingWindow }
			};
		} catch (error) {
			return { body: { error: 'Server error' }, status: 500 };
		}
	});
};

async function fetchTimeseriesData(
	db: D1Database,
	category: string,
	decodedValue: string,
	period: 'yearly' | 'monthly' | 'weekly',
	rollingWindow?: number
): Promise<TimeseriesDataPoint[]> {
	const baseQuery = getCategoryQuery(category);
	if (!baseQuery) {
		throw new Error(`Unknown category: ${category}`);
	}

	const searchParam = decodedValue;

	const dateGroups = {
		yearly: 'SUBSTR(f.cert_date, 1, 4)',
		monthly: 'SUBSTR(f.cert_date, 1, 7)',
		weekly: `PRINTF('%04d-W%02d', CAST(SUBSTR(f.cert_date, 1, 4) AS INTEGER), CAST(STRFTIME('%W', f.cert_date) AS INTEGER))`
	};

	const dateGroup = dateGroups[period];
	const orderBy =
		period === 'weekly'
			? 'SUBSTR(date_period, 1, 4), CAST(SUBSTR(date_period, 7) AS INTEGER)'
			: 'date_period';

	const precomputed = PRECOMPUTED_CATEGORIES.has(category)
		? await fetchPrecomputed(db, category, searchParam, period, orderBy)
		: null;

	const query = `
		SELECT
			${dateGroup} as date_period,
			COUNT(*) as count
		FROM (${baseQuery}) matched_films
		JOIN films f ON matched_films.id = f.id
		WHERE f.cert_date IS NOT NULL
			AND f.cert_date != ''
			AND LENGTH(f.cert_date) >= 10
			AND f.cert_date >= '2017-01-01'
		GROUP BY ${dateGroup}
		ORDER BY ${orderBy}
	`;

	const result = precomputed ?? (await db.prepare(query).bind(searchParam).all());

	if (!result.success || !result.results) {
		return [];
	}

	let data = result.results.map((row: any) => ({
		date: row.date_period,
		count: row.count
	}));

	// Add rolling average if requested
	if (rollingWindow && rollingWindow > 1) {
		data = data.map((point, index) => {
			if (index < rollingWindow - 1) return point;

			const windowData = data.slice(index - rollingWindow + 1, index + 1);
			const average = windowData.reduce((sum, p) => sum + p.count, 0) / rollingWindow;

			return { ...point, rollingAverage: Math.round(average * 100) / 100 };
		});
	}

	return data;
}

// Falls back to the live query when the table is missing (import not yet
// re-run) or has no rows for this value.
async function fetchPrecomputed(
	db: D1Database,
	category: string,
	slug: string,
	period: string,
	orderBy: string
) {
	try {
		const result = await db
			.prepare(
				`SELECT bucket AS date_period, count
				 FROM category_timeseries
				 WHERE category_type = ?1 AND category_slug = ?2 AND period = ?3
				 ORDER BY ${orderBy}`
			)
			.bind(category, slug, period)
			.all();
		return result.success && result.results?.length ? result : null;
	} catch {
		return null;
	}
}
