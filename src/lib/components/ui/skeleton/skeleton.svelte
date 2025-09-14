<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	type $$Props = HTMLAttributes<HTMLDivElement>;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<div class={cn('animate-shimmer bg-sepia-dark/50 rounded-xs', className)} {...$$restProps}></div>

<style>
	/* Define the shimmer animation globally */
	:global(.animate-shimmer) {
		position: relative;
		overflow: hidden;
	}

	:global(.animate-shimmer::after) {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		transform: translateX(-100%);
		background-image: linear-gradient(
			90deg,
			rgba(254, 251, 247, 0) 0,
			rgba(254, 251, 247, 0.3) 20%,
			rgba(254, 251, 247, 0.6) 40%,
			rgba(254, 251, 247, 0)
		);
		animation: shimmer 2s infinite;
	}

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}
</style>
