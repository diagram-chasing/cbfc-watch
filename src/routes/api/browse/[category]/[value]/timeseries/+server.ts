import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';
import {
	isValidUrlPath,
	getCategoryFromUrlPath,
	getCategoryQuery
} from '../../../../../browse/categories';

interface TimeseriesDataPoint {
	date: string;
	count: number;
	rollingAverage?: number;
}

export const GET: RequestHandler = async ({ params, url, platform }) => {
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

	try {
		const decodedValue = decodeURIComponent(value);
		const data = await fetchTimeseriesData(db, categoryId, decodedValue, period, rollingWindow);

		const response = {
			data,
			category: urlPath,
			value: decodedValue,
			period,
			rollingWindow
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

	const result = await db.prepare(query).bind(searchParam).all();

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
