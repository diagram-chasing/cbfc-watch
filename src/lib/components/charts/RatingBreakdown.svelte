<script lang="ts">
	import { Plot, BarX, AxisY } from 'svelteplot';
	import { MediaQuery } from 'svelte/reactivity';
	import data from '$lib/data/charts/rating_breakdown.json';

	let { title = null, subtitle = null, caption } = $props();

	const ratingGroups = data.reduce(
		(acc, item) => {
			if (!acc[item.rating]) {
				acc[item.rating] = [];
			}
			const existing = acc[item.rating].find(
				(existing) => existing.content_category === item.content_category
			);
			if (!existing) {
				acc[item.rating].push({
					...item,
					id: `${item.rating}-${item.content_category}`
				});
			}
			return acc;
		},
		{} as Record<string, any[]>
	);

	Object.keys(ratingGroups).forEach((rating) => {
		ratingGroups[rating].sort((a, b) => b.percentage - a.percentage);
	});

	const ratings = ['A', 'U', 'UA'];

	function formatPercentage(d: any): string {
		const value = Number(d) * 100;
		return `${value.toFixed(0)}%`;
	}
</script>

<section>
	<div class="mb-4 max-w-2xl space-y-2">
		{#if title}
			<h3 class="font-atkinson text-md font-bold text-balance">{title}</h3>
		{/if}
		{#if subtitle}
			<p class="font-atkinson text-sm">{subtitle}</p>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each ratings as rating, index}
			{@const ratingData = ratingGroups[rating] || []}
			<div class="chart-container">
				<h3 class="font-atkinson text-sepia-brown mb-2 text-center text-lg font-bold">
					{rating}
				</h3>
				<Plot
					height={170}
					y={{
						type: 'band',
						padding: 0.1,
						domain: ratingData.map((d) => d.content_category),
						label: ''
					}}
					x={{
						label: index === 1 ? '% of all modifications for this rating' : '',
						tickFormat: formatPercentage,
						domain: [0, Math.max(...ratingData.map((d) => d.percentage)) * 1.1]
					}}
				>
					<BarX
						data={ratingData}
						y="content_category"
						x1={0}
						x2="percentage"
						fill="var(--color-sepia-brown)"
						stroke="var(--color-sepia-brown)"
					/>
					<AxisY stroke="var(--color-sepia-brown)" strokeWidth={1} tickSize={0} />
				</Plot>
			</div>
		{/each}
	</div>
	{#if caption}
		<p class="font-atkinson text-sepia-brown/60 my-4 text-xs text-balance">{caption}</p>
	{/if}
</section>
