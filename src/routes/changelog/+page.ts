import type { PageLoad } from './$types';

export const prerender = false;

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/changelog');
		if (!response.ok) throw new Error('Failed to fetch changelog');
		const data = await response.json();
		return {
			films: data.films || [],
			totalCount: data.totalCount || 0,
			error: data.error
		};
	} catch (e) {
		console.error('Load error:', e);
		return {
			films: [],
			totalCount: 0,
			error: 'Failed to load data'
		};
	}
};
