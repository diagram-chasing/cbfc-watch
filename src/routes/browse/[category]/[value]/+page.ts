import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, url }) => {
	const { category, value } = params;

	if (!category || !value) {
		throw error(400, 'Category and value are required');
	}

	// Get page from URL search params
	const page = parseInt(url.searchParams.get('page') || '1');

	try {
		// Fetch both the main data and timeseries data in parallel
		const [mainResponse, timeseriesResponse] = await Promise.all([
			fetch(`/api/browse/${category}/${value}?page=${page}`),
			fetch(`/api/browse/${category}/${value}/timeseries?period=monthly&rolling=6`)
		]);

		if (!mainResponse.ok) {
			const errorData = await mainResponse.json().catch(() => ({ error: 'Failed to fetch data' }));
			throw error(mainResponse.status, errorData.error || 'Failed to fetch category data');
		}

		const data = await mainResponse.json();

		// Handle timeseries data
		let timeseriesData = null;
		if (timeseriesResponse.ok) {
			try {
				timeseriesData = await timeseriesResponse.json();
			} catch {
				// If timeseries fails, just continue without it
				timeseriesData = null;
			}
		}

		return {
			films: data.films,
			category: data.category,
			value: data.value,
			totalCount: data.totalCount,
			displayName: data.displayName,
			timeseries: timeseriesData,
			pagination: data.pagination
		};
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load category data');
	}
};
