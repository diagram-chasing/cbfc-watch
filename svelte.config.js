import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			routes: {
				exclude: ['/api/og']
			}
		}),

		// Configure prerendering
		prerender: {
			// Don't fail the build for 404 errors on dynamic pages
			handleHttpError: ({ path, referrer, message }) => {
				// API endpoints for data are expected to fail during prerendering
				if (path.startsWith('/api/')) {
					console.warn(`API endpoint ${path} skipped during prerendering: ${message}`);
					return;
				}

				// For film, category, and year pages - log but don't fail the build
				if (path.startsWith('/film/') || path.startsWith('/browse/') || path.startsWith('/year/')) {
					console.warn(`Dynamic page ${path} skipped during prerendering: ${message}`);
					return;
				}

				// For other paths or error types, throw to fail the build
				throw new Error(`${message} (${path}${referrer ? ` - referrer: ${referrer}` : ''})`);
			}
		},
		paths: {
			base: ''
		},

		// Fix MIME type issues by using a proper preload strategy
		output: {
			preloadStrategy: 'modulepreload' // Use modulepreload which is better supported
		},

		// Add this to ensure .js extension in imports to fix MIME type issues
		moduleExtensions: ['.js', '.ts']
	}
};

export default config;
