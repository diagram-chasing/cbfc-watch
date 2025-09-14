import { browser } from '$app/environment';
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, event }) => {
	if (browser) {
		console.error('Client error:', error);
	}

	const errorMessage = error instanceof Error ? error.message : String(error);

	if (event.url.pathname.startsWith('/film/')) {
		return {
			message: 'Film not found',
			slug: event.params?.slug,
			status: 404
		};
	}

	return {
		message: errorMessage || 'An unexpected error occurred',
		status: 500
	};
};
