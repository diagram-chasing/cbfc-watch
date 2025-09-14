import { json } from '@sveltejs/kit';
import {
	PUBLIC_TYPESENSE_API_KEY,
	PUBLIC_TYPESENSE_HOST,
	PUBLIC_TYPESENSE_PROTOCOL
} from '$env/static/public';

async function sha256(message: string): Promise<string> {
	const msgBuffer = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
	return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST({ request }) {
	try {
		const body = await request.text();

		// Hash the request body to use as part of the cache key
		const hash = await sha256(body);

		// Create a cache key
		const cacheUrl = new URL(request.url);
		cacheUrl.pathname = `${hash}`;
		cacheUrl.search = '';

		// Convert to a GET request for caching
		const cacheKey = new Request(cacheUrl.toString(), {
			method: 'GET',
			headers: {
				'content-type': 'application/json'
			}
		});

		// Try to get from cache first
		let response: Response | undefined;

		// Use CloudFlare Workers cache API
		if (typeof caches !== 'undefined') {
			try {
				// In CloudFlare Workers, access the default cache
				const cache = (caches as any).default;
				if (cache) {
					response = await cache.match(cacheKey);
				}
			} catch (e) {
				console.warn('Cache lookup failed:', e);
			}
		}

		// If not in cache, make the request to Typesense
		if (!response) {
			console.log(`Cache miss for hash: ${hash.substring(0, 12)}...`);

			// Get Typesense configuration
			const typesenseApiKey = PUBLIC_TYPESENSE_API_KEY;
			const typesenseHost = PUBLIC_TYPESENSE_HOST;
			const typesenseProtocol = PUBLIC_TYPESENSE_PROTOCOL;

			if (!typesenseApiKey || !typesenseHost || !typesenseProtocol) {
				console.error('Missing Typesense configuration');
				return json({ error: 'Service configuration error' }, { status: 500 });
			}

			// Construct Typesense URL based on the request
			const typesenseUrl = `${typesenseProtocol}://${typesenseHost}/multi_search?use_cache=true&prefix=false`;
			const typesenseResponse = await fetch(typesenseUrl, {
				method: 'POST',
				headers: {
					'X-TYPESENSE-API-KEY': typesenseApiKey,
					'Content-Type': 'application/json'
				},
				body: body
			});

			if (!typesenseResponse.ok) {
				const errorText = await typesenseResponse.text();
				console.error('Typesense request failed:', errorText);
				return new Response(errorText, { status: typesenseResponse.status });
			}

			const responseData = await typesenseResponse.json();

			// Create a response with cache headers
			response = new Response(JSON.stringify(responseData), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					// Cloudflare edge caching headers
					'Cache-Control': 'public, max-age=600, s-maxage=604800, stale-while-revalidate=1209600',
					'CDN-Cache-Control': 'public, max-age=1800',
					'Cloudflare-CDN-Cache-Control': 'public, max-age=604800',
					Vary: 'Accept-Encoding',
					// Add ETag for caching
					ETag: `"${hash}"`
				}
			});

			// Cache the response in Cloudflare Workers cache
			if (typeof caches !== 'undefined') {
				try {
					const cache = (caches as any).default;
					if (cache) {
						const responseToCache = response.clone();
						cache.put(cacheKey, responseToCache);

						try {
							const cachedResponse = await cache.match(cacheKey);
							if (cachedResponse) {
								console.log(`Cache put for hash: ${hash.substring(0, 12)}...`);
							}
						} catch (e) {
							console.error('Cache put failed:', e);
						}
					}
				} catch (e) {
					console.error('Cache put failed:', e);
				}
			}
		} else {
			console.log(`Cache hit for hash: ${hash.substring(0, 12)}...`);

			const headers = new Headers(response.headers);
			headers.set('Content-Type', 'application/json');

			// Add cache hit header to cached responses
			response = new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
		}

		return response;
	} catch (error) {
		console.error(`Error in search proxy`, error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
