import { error } from '@sveltejs/kit';

export async function GET({ url, fetch, setHeaders }) {
	const imageUrl = url.searchParams.get('url');

	if (!imageUrl) {
		throw error(400, 'Missing image URL');
	}

	try {
		const response = await fetch(imageUrl);

		if (!response.ok) {
			throw error(response.status, 'Failed to fetch image');
		}

		// Get content type and other headers from the original response
		const contentType = response.headers.get('content-type');
		const contentLength = response.headers.get('content-length');

		// Set cache headers for browser caching
		setHeaders({
			'Cache-Control': 'public, max-age=86400',
			'Content-Type': contentType || 'image/jpeg'
		});

		if (contentLength) {
			setHeaders({
				'Content-Length': contentLength
			});
		}

		// Return the image data as a stream
		return new Response(response.body);
	} catch (err) {
		console.error('Error proxying image:', err);
		throw error(500, 'Failed to proxy image');
	}
}
