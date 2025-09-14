// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			analyticsID?: string;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				CBFC_CONTRIBUTIONS_KV: KVNamespace;
				// Typesense configuration - can be either prefixed or non-prefixed
				PUBLIC_TYPESENSE_API_KEY?: string;
				PUBLIC_TYPESENSE_HOST?: string;
				PUBLIC_TYPESENSE_PROTOCOL?: string;
				TYPESENSE_API_KEY?: string;
				TYPESENSE_ADMIN_API_KEY?: string;
				TYPESENSE_HOST?: string;
				TYPESENSE_PROTOCOL?: string;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
