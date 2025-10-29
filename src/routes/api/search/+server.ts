import {
	PUBLIC_TYPESENSE_API_KEY,
	PUBLIC_TYPESENSE_HOST,
	PUBLIC_TYPESENSE_PROTOCOL
} from '$env/static/public';

/**
 * Catch-all proxy handler for Typesense API requests
 * This handles all requests to /api/search/* and forwards them to Typesense
 */

async function proxyToTypesense(request: Request, url: URL) {
	// Extract the path after /api/search/
	const searchPath = url.pathname.replace(/^\/api\/search\/?/, '');

	// Get Typesense configuration
	const typesenseApiKey = PUBLIC_TYPESENSE_API_KEY;
	const typesenseHost = PUBLIC_TYPESENSE_HOST;
	const typesenseProtocol = PUBLIC_TYPESENSE_PROTOCOL;

	if (!typesenseApiKey || !typesenseHost || !typesenseProtocol) {
		console.error('Missing Typesense configuration');
		return new Response(JSON.stringify({ error: 'Service configuration error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Construct the full Typesense URL
	const typesenseUrl = new URL(
		`${typesenseProtocol}://${typesenseHost}/${searchPath}${url.search}`
	);

	try {
		// Forward the request to Typesense
		const typesenseResponse = await fetch(typesenseUrl.toString(), {
			method: request.method,
			headers: {
				'X-TYPESENSE-API-KEY': typesenseApiKey,
				'Content-Type': 'application/json'
			},
			body: request.method !== 'GET' ? await request.text() : undefined
		});

		if (!typesenseResponse.ok) {
			const errorText = await typesenseResponse.text();
			console.error('Typesense request failed:', errorText);
			return new Response(errorText, {
				status: typesenseResponse.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const responseData = await typesenseResponse.json();

		// Return response with cache headers
		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				// Cloudflare edge caching headers
				'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1200',
				'CDN-Cache-Control': 'public, max-age=600',
				'Cloudflare-CDN-Cache-Control': 'public, max-age=3600',
				Vary: 'Accept-Encoding'
			}
		});
	} catch (error) {
		console.error('Error proxying to Typesense:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

export async function GET({ request, url }: { request: Request; url: URL }) {
	return proxyToTypesense(request, url);
}

export async function POST({ request, url }: { request: Request; url: URL }) {
	return proxyToTypesense(request, url);
}
