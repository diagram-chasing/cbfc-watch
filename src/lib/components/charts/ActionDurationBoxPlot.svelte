<script lang="ts">
	import { Plot, BoxX } from 'svelteplot';
	import boxplotData from '$lib/data/charts/duration_by_action_boxplot.json';

	let { title = '', subtitle = '' } = $props();

	function formatDuration(d: any): string {
		const seconds = typeof d === 'number' ? d : Number(d);
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
		return `${(seconds / 3600).toFixed(1)}h`;
	}
</script>

<div class="w-full">
	{#if title}
		<div class="space-y-2">
			<h3 class="font-atkinson text-md font-bold text-balance">{title}</h3>
			<p class="font-atkinson text-sm">{subtitle}</p>
		</div>
	{/if}
	<Plot
		height={300}
		inset={5}
		padding={0.3}
		x={{
			type: 'log',
			grid: true,

			tickFormat: formatDuration,
			ticks: [1, 2, 5, 10, 30, 60, 120, 300, 600, 1800]
		}}
		y={{
			label: false,
			axis: 'left'
		}}
	>
		<BoxX
			data={boxplotData}
			x="duration"
			y="category"
			tickMinMax
			dot={{ fill: 'var(--color-sepia-brown)', r: 2, opacity: 0.7 }}
			bar={{
				fill: 'var(--color-yellow)',
				stroke: 'var(--color-sepia-brown)'
			}}
		/>
	</Plot>
</div>
