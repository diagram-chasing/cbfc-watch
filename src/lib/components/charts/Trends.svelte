<script lang="ts">
	import data from '$lib/data/charts/content_trends.json';
	import { Plot, Line, RuleY, AxisY, Text } from 'svelteplot';
	import { MediaQuery } from 'svelte/reactivity';

	const isMobile = new MediaQuery('(max-width: 768px)');

	let { title = null, subtitle = null, caption } = $props();
	type DataPoint = {
		year_month: Date;
		deviation_pct_smooth: number;
		above_baseline: boolean;
	};

	type Segment = {
		data: DataPoint[];
		color: string;
	};

	type ChartData = {
		contentType: string;
		segments: Segment[];
	};

	const contentTypes = Array.from(new Set(data.map((item) => item.content_type)));

	const allDeviations = data
		.filter((item) => typeof item.deviation_pct_smooth === 'number')
		.map((item) => item.deviation_pct_smooth!);
	const minDeviation = Math.min(...allDeviations);
	const maxDeviation = Math.max(...allDeviations);

	const yPadding = Math.max(Math.abs(minDeviation), Math.abs(maxDeviation)) * 0;
	const yDomain = [minDeviation - yPadding, maxDeviation + yPadding];

	// Define specific tick values for y-axis
	const yTicks = [-50, 0, 50, 100];

	// Determine if chart should show axis labels (only show on left column and bottom row)
	function shouldShowYAxis(index: number): boolean {
		return isMobile.current ? index % 2 === 0 : index % 3 === 0; // Left column in 2-column grid (mobile) or 3-column grid (desktop)
	}

	// Create chart data for each content type
	function createChartData(contentType: string): ChartData {
		const processedData: DataPoint[] = data
			.filter(
				(item) =>
					item.content_type === contentType &&
					typeof item.deviation_pct_smooth === 'number' &&
					typeof item.above_baseline === 'boolean'
			)
			.map((item) => ({
				year_month: new Date(item.year_month),
				deviation_pct_smooth: item.deviation_pct_smooth!,
				above_baseline: item.above_baseline!
			}))
			.sort((a, b) => a.year_month.getTime() - b.year_month.getTime());

		if (processedData.length === 0) {
			return { contentType, segments: [] };
		}

		function getIntersection(p1: DataPoint, p2: DataPoint): DataPoint {
			const x1 = p1.year_month.getTime();
			const x2 = p2.year_month.getTime();
			const t = (0 - p1.deviation_pct_smooth) / (p2.deviation_pct_smooth - p1.deviation_pct_smooth);

			return {
				year_month: new Date(x1 + t * (x2 - x1)),
				deviation_pct_smooth: 0,
				above_baseline: p2.above_baseline // Use the next segment's status
			};
		}

		const segments: Segment[] = [];
		let currentSegment: DataPoint[] = [processedData[0]];
		let currentColor = processedData[0].above_baseline ? 'var(--color-red)' : 'var(--color-green)';

		for (let i = 1; i < processedData.length; i++) {
			const prev = processedData[i - 1];
			const curr = processedData[i];

			if (prev.above_baseline !== curr.above_baseline) {
				const intersection = getIntersection(prev, curr);
				currentSegment.push(intersection);
				segments.push({ data: currentSegment, color: currentColor });

				currentColor = curr.above_baseline ? 'var(--color-red)' : 'var(--color-green)';
				currentSegment = [intersection, curr];
			} else {
				currentSegment.push(curr);
			}
		}

		segments.push({ data: currentSegment, color: currentColor });

		return { contentType, segments };
	}

	const chartsData: ChartData[] = contentTypes.map(createChartData);

	function formatPercentage(d: any): string {
		const value = Number(d);
		const sign = value >= 0 ? '+' : '';
		return `${sign}${value.toFixed(0)}%`;
	}

	function formatYear(d: any): string {
		const date = new Date(String(d));
		return `'${date.getFullYear().toString().slice(-2)}`;
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
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3">
		{#each chartsData as chartData, index}
			<div class="chart-container ignore-safe-mode">
				<h3 class="font-atkinson text-sepia-brown text-center text-sm font-semibold">
					{chartData.contentType}
				</h3>
				<Plot
					maxWidth="300px"
					height={200}
					y={{
						grid: true,
						label: '',
						domain: yDomain,
						tickFormat: shouldShowYAxis(index) ? formatPercentage : () => '',
						ticks: yTicks
					}}
					x={{
						tickFormat: formatYear
					}}
				>
					{#each chartData.segments as segment}
						<Line
							data={segment.data}
							x="year_month"
							y="deviation_pct_smooth"
							stroke={segment.color}
							strokeWidth={2}
						/>
					{/each}
					<RuleY y={0} stroke="black" strokeWidth={1.5} opacity={0.6} />
					<AxisY tickSize={0} />

					{#if index === 1}
						<Text
							data={[{ x: new Date('2024-01-01'), y: maxDeviation * 0.4 }]}
							text="↑ More than usual"
							fontSize={12}
							x="x"
							y="y"
							dx={-50}
							strokeWidth={6}
							stroke="white"
							fill="var(--color-red)"
						/>
						<Text
							data={[{ x: new Date('2024-01-01'), y: minDeviation * 0.6 }]}
							text="↓ Less than usual"
							fontSize={12}
							x="x"
							y="y"
							dx={-50}
							strokeWidth={6}
							stroke="white"
							fill="var(--color-green)"
						/>
					{/if}
				</Plot>
			</div>
		{/each}
	</div>
	<p class="font-atkinson text-sepia-brown/60 my-4 text-xs text-balance">{caption}</p>
</section>
