<script lang="ts">
	/**
	 * Component for displaying dates in a stamp-like style
	 */
	import { twMerge } from 'tailwind-merge';
	export let date: string = '';
	export let minRotation = -3;
	export let maxRotation = 3;
	export let classNames = '';
	export let gradientSeed = true; // Whether to use seed for gradient
	export let minAngle = 20;
	export let maxAngle = 40;
	export let seed: string | number | null = 4543534543; // Optional custom seed value
	export let colorScheme: 'sepia' | 'default' | 'custom' = 'default'; // Theme to use for gradient
	export let colors: string[] = []; // Optional custom colors for gradient

	$: hash = (() => {
		// Use custom seed if provided, otherwise use date
		const seedValue = seed !== null ? String(seed) : date;
		let h = 0;
		for (let i = 0; i < seedValue.length; i++) h = ((h << 5) - h + seedValue.charCodeAt(i)) | 0;
		return h;
	})();

	$: rotation = (() => {
		return minRotation + ((hash % 1000) / 1000) * (maxRotation - minRotation);
	})();

	$: gradientAngle = (() => {
		if (!gradientSeed) return 30; // Default angle
		return minAngle + ((hash % 1000) / 1000) * (maxAngle - minAngle);
	})();

	$: baseColors = (() => {
		if (colorScheme === 'custom' && colors.length >= 3) {
			return colors;
		} else if (colorScheme === 'sepia') {
			return [
				'var(--color-sepia-light)',
				'var(--color-sepia)',
				'var(--color-sepia-dark)',
				'var(--color-sepia-med)',
				'var(--color-sepia-brown)',
				'var(--color-sepia-red)'
			];
		} else {
			// Default scheme
			return [
				'var(--color-alabaster)',
				'var(--color-blue)',
				'var(--color-black)',
				'var(--color-blue)',
				'var(--color-green)',
				'var(--color-red)'
			];
		}
	})();

	$: gradientColors = (() => {
		if (!gradientSeed) {
			return {
				color1: baseColors[0],
				color2: baseColors[1],
				color3: baseColors[2],
				color4: baseColors[3] || baseColors[1],
				color5: baseColors[4] || baseColors[0],
				color6: baseColors[5] || baseColors[2]
			};
		}

		// Use the hash to select/reorder colors rather than modify them
		// Since we're using CSS variables, we'll reorder/select rather than modify
		const colorIndex1 = hash % baseColors.length;
		const colorIndex2 = (hash + 1) % baseColors.length;
		const colorIndex3 = (hash + 2) % baseColors.length;
		const colorIndex4 = (hash + 3) % baseColors.length;
		const colorIndex5 = (hash + 4) % baseColors.length;
		const colorIndex6 = (hash + 5) % baseColors.length;

		return {
			color1: baseColors[colorIndex1],
			color2: baseColors[colorIndex2],
			color3: baseColors[colorIndex3],
			color4: baseColors[colorIndex4],
			color5: baseColors[colorIndex5],
			color6: baseColors[colorIndex6]
		};
	})();
</script>

{#if date && date.trim()}
	<span
		class={twMerge('date-stamp font-mono text-base font-bold uppercase', classNames)}
		style="
			transform: rotate({rotation}deg);
			--gradient-angle: {gradientAngle}deg;
			--color1: {gradientColors.color1};
			--color2: {gradientColors.color2};
			--color3: {gradientColors.color3};
			--color4: {gradientColors.color4};
			--color5: {gradientColors.color5};
			--color6: {gradientColors.color6};
		"
	>
		{date}
	</span>
{:else}
	<span class={twMerge('font-mono text-base font-bold text-gray-400 uppercase', classNames)}>
		No date
	</span>
{/if}

<style>
	.date-stamp {
		position: relative;
		padding: 0.25em 0.5em;
		display: inline-block;

		background-image: linear-gradient(
			var(--gradient-angle, 30deg),
			var(--color1, var(--color-alabaster)),
			var(--color2, var(--color-blue)),
			var(--color3, var(--color-black)),
			var(--color4, var(--color-blue)),
			var(--color5, var(--color-green)),
			var(--color6, var(--color-red)),
			transparent 70%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-shadow: 0.07em 0 0 rgba(0, 0, 0, 0.3);
	}
</style>
