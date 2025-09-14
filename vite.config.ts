import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dsv from '@rollup/plugin-dsv';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import wasmModuleWorkers from 'vite-plugin-wasm-module-workers';

export default defineConfig({
	plugins: [wasmModuleWorkers(), sveltekit(), dsv(), tailwindcss()],
	resolve: {
		alias: {
			'@assets': path.resolve(__dirname, './src/assets'),
			'@components': path.resolve(__dirname, './src/lib/components')
		}
	},
	ssr: {
		noExternal: ['flexsearch']
	},
	worker: {
		format: 'es'
	},
	build: {
		chunkSizeWarningLimit: 1000
	}
});
