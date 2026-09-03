import type { RequestEvent } from '@sveltejs/kit';

type CacheStore = { default: Cache };

/**
 * Serve a JSON endpoint through the Cloudflare edge cache, keyed by URL.
 *
 * The D1 data only changes when the import cron runs (every four days), so
 * recomputing on every request just burns rows_read against the daily quota.
 * Error responses are never cached.
 */
export async function cachedJson(
	event: Pick<RequestEvent, 'request' | 'platform'>,
	ttlSeconds: number,
	produce: () => Promise<{ body: unknown; status?: number }>
): Promise<Response> {
	const cache =
		event.platform?.caches?.default ??
		(globalThis as unknown as { caches?: CacheStore }).caches?.default;
	const cacheKey = new Request(new URL(event.request.url).toString(), { method: 'GET' });

	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) return cached;
	}

	const { body, status = 200 } = await produce();
	const ok = status >= 200 && status < 300;

	const response = new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': ok ? `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}` : 'no-store'
		}
	});

	if (cache && ok) {
		const cachePut = cache.put(cacheKey, response.clone());
		const ctx = event.platform?.context;
		if (ctx?.waitUntil) ctx.waitUntil(cachePut);
		else await cachePut;
	}

	return response;
}
