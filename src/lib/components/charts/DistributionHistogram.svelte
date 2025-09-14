<script>
	import { Plot, Rect, RuleX, GridY, Text, RectX } from 'svelteplot';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import data from '$lib/data/charts/histogram_data.json';
	import { formatDuration } from '$lib/utils/format';

	let {
		currentFilmDuration = null,
		infoButton = undefined,
		tutorialMode = false,
		tutorialStep = 0,
		onTutorialChange = undefined
	} = $props();

	const histogramData = data.histogram_bins.map((bin) => ({
		x1: Math.pow(10, bin.x_min),
		x2: Math.pow(10, bin.x_max),
		y1: 0,
		y2: bin.y_percent_total ?? bin.y_percent ?? 0,
		count: bin.count,
		percentage: bin.y_percent_total ?? bin.y_percent ?? 0,
		isHighlighted:
			currentFilmDuration !== null &&
			currentFilmDuration >= Math.pow(10, bin.x_min) &&
			currentFilmDuration < Math.pow(10, bin.x_max)
	}));

	const isZero = currentFilmDuration === 0;
	const median = data.statistics.median_positive_secs;

	// Define scale breaks and labels if not provided in data
	const scaleBreaks = data.axis_config?.breaks || [1, 10, 60, 300, 1800];
	const scaleLabels = data.axis_config?.labels || ['1s', '10s', '1m', '5m', '30m'];

	// Calculate dynamic Y-axis domain
	const maxPercentage = Math.max(
		...data.histogram_bins.map((bin) => bin.y_percent_total ?? bin.y_percent ?? 0)
	);
	const yDomain = [0, Math.ceil(maxPercentage * 1.1)];

	// Find the peak bin (highest count/percentage)
	const peakBin = histogramData.reduce(
		(max, bin) => (bin.percentage > max.percentage ? bin : max),
		histogramData[0]
	);

	const tutorialSteps = [
		{
			title: 'Film Modification Duration Distribution',
			description:
				'Each bar represents a range of durations and shows what percentage of films fall into that range.',
			highlight: null
		},
		{
			title: 'The Median Line',
			description: `The dashed line shows the median (${formatDuration(median, 'short')}). Half of all films have modifications shorter than this, and half have longer modifications. `,
			highlight: { x1: median * 0.9, x2: median * 1.1, color: 'var(--color-sepia-dark)' }
		},
		{
			title: 'The Most Common Duration Range',
			description: `The tallest bar shows the most common modification duration range (${formatDuration(peakBin.x1, 'short')} - ${formatDuration(peakBin.x2, 'short')}). About ${Math.round(peakBin.percentage)}% of all films fall into this range.`,
			highlight: { x1: peakBin.x1, x2: peakBin.x2, color: 'var(--color-sepia-brown)' }
		},
		{
			title: currentFilmDuration ? "This Film's Position" : 'Film Position Example',
			description: currentFilmDuration
				? (() => {
						const filmBin = histogramData.find(
							(bin) => currentFilmDuration >= bin.x1 && currentFilmDuration < bin.x2
						);
						const comparison =
							currentFilmDuration < median
								? `${Math.round(((median - currentFilmDuration) / median) * 100)}% less than the median`
								: currentFilmDuration > median
									? `${Math.round(((currentFilmDuration - median) / median) * 100)}% more than the median`
									: 'exactly at the median';

						return `This film has ${formatDuration(currentFilmDuration)} of modifications (${comparison}). It falls in a range where about ${filmBin ? Math.round(filmBin.percentage) : 0}% of films are found.`;
					})()
				: "When viewing a specific film, this step would highlight where that film's modification duration falls relative to all other films.",
			highlight: currentFilmDuration
				? (() => {
						const filmBin = histogramData.find(
							(bin) => currentFilmDuration >= bin.x1 && currentFilmDuration < bin.x2
						);
						return filmBin
							? {
									x1: filmBin.x1,
									x2: filmBin.x2,
									color: 'var(--color-red)'
								}
							: null;
					})()
				: null
		}
	];

	const currentStep = $derived(tutorialSteps[tutorialStep] || tutorialSteps[0]);
</script>

<Plot
	height={120}
	marginRight={5}
	x={{
		type: 'log',
		domain: [1, 2000],
		ticks: scaleBreaks,
		tickFormat: (d) => {
			const index = scaleBreaks.findIndex((tick) => tick === Number(d));
			return index >= 0 ? scaleLabels[index] : String(d);
		}
	}}
	y={{
		ticks: [2, 4],
		tickFormat: (d) => {
			return `${String(d)}%`;
		},
		domain: yDomain
	}}
>
	{#snippet header()}
		{#if tutorialMode && !isZero}
			<div class="flex items-start justify-between gap-2">
				<p class="min-h-[3lh] text-xs leading-relaxed text-gray-700 md:min-h-[2lh]">
					{currentStep.description}
				</p>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							class="h-6 w-fit text-xs"
							onclick={() => onTutorialChange?.(Math.max(0, tutorialStep - 1))}
							disabled={tutorialStep === 0}
						>
							<ChevronLeft class="mr-1 h-3 w-3" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							class="h-6 w-fit text-xs"
							onclick={() =>
								onTutorialChange?.(Math.min(tutorialSteps.length - 1, tutorialStep + 1))}
							disabled={tutorialStep === tutorialSteps.length - 1}
						>
							<ChevronRight class="ml-1 h-3 w-3" />
						</Button>
					</div>
				</div>
			</div>
		{:else if tutorialMode && isZero}
			<p class="min-h-[2lh] text-sm leading-relaxed font-medium text-gray-700">
				Some changes to the movie may be logged as 0 seconds by CBFC. For this movie, there may be
				changes but the official edited duration is 0s.
			</p>
		{:else}
			<div class="flex items-center justify-between">
				<h2 class="font-atkinson text-sepia-brown text-xs font-bold tracking-wide uppercase">
					Modification time comparison
				</h2>
				{#if infoButton}
					{@render infoButton()}
				{/if}
			</div>
		{/if}
	{/snippet}

	<GridY stroke="var(--color-sepia-brown)" opacity={!isZero ? 1 : 0.3} />

	<Text
		data={[{ y: 4 }]}
		y="y"
		frameAnchor="left"
		text="of movies"
		fontSize={10}
		fill="var(--color-sepia-brown)"
		opacity={0.7}
		strokeLinejoin="round"
		strokeMiterlimit={0}
		strokeWidth={4}
		stroke="var(--color-sepia-light)"
	/>

	{#if !isZero}
		<!-- Normal histogram bars -->
		<Rect
			data={histogramData}
			x1="x1"
			x2="x2"
			y1="y1"
			y2="y2"
			fill="var(--color-yellow)"
			stroke="var(--color-sepia-med)"
			strokeWidth={0}
		/>

		<Rect
			data={histogramData.filter((d) => d.isHighlighted)}
			x1="x1"
			x2="x2"
			y1="y1"
			y2="y2"
			strokeWidth={1}
			fill="var(--color-yellow)"
			opacity={1}
			stroke="var(--color-sepia-med)"
		/>

		<!-- Tutorial highlight overlay -->
		{#if tutorialMode && currentStep.highlight}
			<RectX
				data={[currentStep.highlight]}
				x1="x1"
				x2="x2"
				fill={currentStep.highlight.color}
				stroke="none"
				opacity={0.5}
			/>
		{/if}

		<RuleX
			data={[{ x: median }]}
			x="x"
			stroke="var(--color-sepia-brown)"
			strokeWidth={1}
			strokeDasharray="5,5"
		/>

		<Text
			text="Median"
			fontSize={10}
			fill="var(--color-sepia-brown)"
			opacity={0.6}
			frameAnchor="top"
		/>

		<Text
			data={histogramData.filter((d) => d.isHighlighted)}
			x={(d) => Math.sqrt(d.x1 * d.x2)}
			y={(d) => d.y2 + yDomain[1] * 0.25}
			text={formatDuration(currentFilmDuration, 'short')}
			fontSize={12}
			strokeLinejoin="round"
			strokeMiterlimit={0}
			fill="var(--color-red)"
			strokeWidth={4}
			stroke="var(--color-sepia-light)"
		/>

		<Text
			data={histogramData.filter((d) => d.isHighlighted)}
			x={(d) => Math.sqrt(d.x1 * d.x2)}
			y={(d) => d.y2 + yDomain[1] * 0.12}
			text="▼"
			fontSize={7}
			fill="var(--color-red)"
			strokeWidth={4}
			stroke="var(--color-sepia-light)"
		/>
	{:else}
		<!-- Empty state visualization -->
		<Rect
			data={histogramData}
			x1="x1"
			x2="x2"
			y1="y1"
			y2="y2"
			fill="var(--color-sepia-brown)"
			opacity={0.08}
			stroke="var(--color-sepia-brown)"
			strokeWidth={0.5}
			strokeDasharray="2,2"
		/>

		<!-- Empty state median line (ghosted) -->
		<RuleX
			data={[{ x: median }]}
			x="x"
			stroke="var(--color-sepia-brown)"
			strokeWidth={1}
			strokeDasharray="3,3"
			opacity={0.2}
		/>

		<!-- Empty state message -->
		<Text
			text="No data available for this film"
			fontSize={12}
			fill="var(--color-sepia-brown)"
			opacity={0.6}
			frameAnchor="top"
			stroke="var(--color-sepia-light)"
			strokeWidth={4}
			strokeLinejoin="round"
			strokeMiterlimit={0}
		/>
	{/if}

	{#snippet footer()}
		{#if tutorialMode}
			<div class="pt-2">
				<!-- Proportion visualization with inline labels -->
				<div class="flex items-center justify-center gap-2">
					<div
						class="border-sepia-med relative flex h-4 w-full max-w-xs overflow-hidden rounded-xs border"
					>
						<div
							class="bg-yellow relative flex h-full items-center justify-center"
							style="width: {(1 - data.statistics.percent_zero_mods) * 100}%"
							title="Movies with modifications"
						>
							<span class="font-atkinson text-[8px] font-bold text-gray-800/70 mix-blend-multiply">
								{Math.round((1 - data.statistics.percent_zero_mods) * 100)}% have timed edits
							</span>
						</div>
						<div
							class="bg-sepia-med relative flex h-full items-center justify-center"
							style="width: {data.statistics.percent_zero_mods * 100}%"
							title="Movies with no modifications"
						>
							<span class="font-atkinson text-[8px] font-bold text-gray-600">
								{Math.round(data.statistics.percent_zero_mods * 100)}% have zero-duration edits
							</span>
						</div>
					</div>
				</div>
				<p
					class="font-atkinson text-sepia-brown mt-1 text-center text-[10px] tracking-wide opacity-50"
				>
					The chart is based on films with measurable edits.
				</p>
			</div>
		{:else}
			<p
				class="font-atkinson text-sepia-brown pt-1 text-[10px] tracking-wide"
				class:opacity-80={!isZero}
				class:opacity-50={!!isZero}
			>
				{!isZero
					? 'Showing movies with >0s of modifications. Excludes 46% of all movies.'
					: 'This chart typically shows modification time distribution across movies.'}
			</p>
		{/if}
	{/snippet}
</Plot>
