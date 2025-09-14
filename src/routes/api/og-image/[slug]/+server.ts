import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, request }) => {
	const { slug } = params;

	if (!slug) {
		return new Response('Missing slug', { status: 400 });
	}

	try {
		// Try to fetch from R2 with custom domain
		const r2Url = `https://images.cbfc.watch/og/${slug}.jpg`;

		const response = await fetch(r2Url);

		if (response.ok) {
			// Forward the image with proper headers
			return new Response(response.body, {
				status: 200,
				headers: {
					'Content-Type': 'image/jpeg',
					'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
					'CDN-Cache-Control': 'public, max-age=31536000'
				}
			});
		}

		// If image not found in R2, fallback to runtime generation
		const ogUrl = new URL('/api/og', new URL(request.url).origin);
		ogUrl.searchParams.set('pageType', 'movie');
		ogUrl.searchParams.set('title', slug.replace(/-/g, ' '));

		const fallbackResponse = await fetch(ogUrl.toString());

		return new Response(fallbackResponse.body, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=3600' // Cache fallback for 1 hour
			}
		});
	} catch (error) {
		console.error('Error serving image:', error);

		// Return a 1x1 transparent pixel as ultimate fallback
		const pixel = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
			0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f,
			0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00,
			0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
			0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
		]);

		return new Response(pixel, {
			status: 200,
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'public, max-age=300' // Cache error for 5 minutes
			}
		});
	}
};
