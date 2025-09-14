<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import noise from '$lib/assets/noise.png';
	import { onMount, setContext } from 'svelte';
	import { blurWords } from '$lib/blurWords';
	let { children, data } = $props();

	// Extract lastCommitDate from data, with fallback
	const lastCommitDate = data?.lastCommitDate ?? 'Recently';

	// Set svelteplot defaults theme
	setContext('svelteplot/defaults', {
		// Axis defaults
		axis: {
			stroke: 'var(--color-sepia-brown)',
			strokeWidth: 1,
			tickSize: 0,
			tickPadding: 6,
			fontSize: 12,
			fontFamily: 'var(--font-atkinson)',
			fill: 'var(--color-sepia-brown)'
		},

		// Grid defaults
		grid: {
			stroke: 'var(--color-sepia-brown)',
			strokeWidth: 1,
			strokeDasharray: '3,2'
		},

		// Text defaults
		text: {
			fontSize: 12,
			fontFamily: 'var(--font-atkinson)',
			fill: 'var(--color-sepia-brown)'
		},

		// Line defaults
		line: {
			stroke: 'var(--color-sepia-brown)',
			strokeWidth: 2
		},

		// Bar defaults
		bar: {
			fill: 'var(--color-sepia-brown)',
			stroke: 'none'
		},

		// Rect defaults
		rect: {
			fill: 'var(--color-yellow)',
			stroke: 'white',
			strokeWidth: 0.5
		},

		// Rule defaults
		rule: {
			stroke: 'var(--color-sepia-brown)',
			strokeWidth: 1
		}
	});

	onMount(() => {
		// Set noise background
		document.documentElement.style.setProperty('--noise-bg', `url(${noise})`);
	});
</script>

<div class="relative flex min-h-screen flex-col">
	<Navigation />

	<div class="grain-effect text-dark-bg relative z-10 mx-auto flex w-full flex-1 flex-col px-2">
		<Header />
		<main class="mx-auto w-full max-w-4xl flex-1">
			<div use:blurWords={{ ignoreClasses: ['ignore-safe-mode'] }}>
				{@render children()}
			</div>
		</main>
	</div>
	<Footer {lastCommitDate} />
</div>

<!-- Toast notifications -->
<Toaster position="bottom-center" />

<style global>
	:root {
		--noise-bg: none;
		--color-overscroll-top: transparent;
		--color-overscroll-bottom: var(--color-sepia-light);
	}

	:root::after {
		content: '';
		position: fixed;
		inset: 0;
		background: linear-gradient(
			var(--color-overscroll-top) 49.99%,
			var(--color-overscroll-bottom) 50%
		);
		z-index: -1;
	}
	:global {
		html,
		body {
			min-height: 100vh;
			height: auto;
			margin: 0;
			padding: 0;
		}
		body {
			position: relative;
			overflow-x: hidden;
		}
		body::before {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			min-height: 100vh;
			z-index: -2;
			background-image: var(--noise-bg);
			background-size: 180px;
			background-repeat: repeat;
			opacity: 0.05;
			pointer-events: none;
		}
		/* body::after {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			min-height: 100vh;
			z-index: -1;
			box-shadow: inset 0 -10px 80px 10px rgba(0, 0, 0, 0.3);
			pointer-events: none;
		} */
	}
</style>
