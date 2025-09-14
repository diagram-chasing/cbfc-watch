<script lang="ts">
	import { Plot, BarX, RuleX, Text, AxisY, AxisX, GridX, GridY, Arrow } from 'svelteplot';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { AnalysisData } from '$lib/types';

	let {
		analysis,
		rating,
		genre,
		language,
		infoButton = undefined,
		tutorialMode = false,
		tutorialStep = 0,
		onTutorialChange = undefined
	}: {
		analysis: AnalysisData;
		rating?: string;
		genre?: string;
		language?: string;
		infoButton?: import('svelte').Snippet;
		tutorialMode?: boolean;
		tutorialStep?: number;
		onTutorialChange?: (step: number) => void;
	} = $props();

	const CHART_HEIGHT = 92;
	const BAND_PADDING = 0.2;
	const BAR_INSET = 3;
	const SCALE_FACTOR = 1.2;
	const STROKE_WIDTH = 1.3;
	const FONT_SIZE = 12;
	const LABEL_OFFSET = 10;

	const CATEGORIES = [
		{
			key: 'violence',
			label: 'Violence',
			valueField: 'violence_modifications' as keyof AnalysisData,
			medianField: 'violence_peer_median' as keyof AnalysisData
		},
		{
			key: 'sensitive',
			label: 'Sensitive Content',
			valueField: 'sensitive_content_modifications' as keyof AnalysisData,
			medianField: 'sensitive_content_peer_median' as keyof AnalysisData
		},
		{
			key: 'political',
			label: 'Political & Religious',
			valueField: 'political_religious_modifications' as keyof AnalysisData,
			medianField: 'political_religious_peer_median' as keyof AnalysisData
		},
		{
			key: 'disclaimers',
			label: 'Disclaimers',
			valueField: 'disclaimers_added' as keyof AnalysisData,
			medianField: 'disclaimers_peer_median' as keyof AnalysisData
		}
	];

	function createChartDataItem(category: (typeof CATEGORIES)[0], analysis: AnalysisData) {
		const value = analysis[category.valueField] as number;
		const medianValue = analysis[category.medianField] as number;
		const median = Math.floor(medianValue);

		return {
			category: category.label,
			value,
			median,
			isAboveMedian: value > medianValue
		};
	}

	function isTopCategoryDuringMedianTutorial(
		category: string,
		tutorialMode: boolean,
		currentStepType: string | undefined,
		chartData: any[]
	) {
		return (
			tutorialMode &&
			currentStepType === 'medians' &&
			category === chartData[chartData.length - 1]?.category
		);
	}

	function shouldShowLabel(
		item: any,
		tutorialMode: boolean,
		currentStepType: string | undefined,
		chartData: any[]
	) {
		const isTopCategory = isTopCategoryDuringMedianTutorial(
			item.category,
			tutorialMode,
			currentStepType,
			chartData
		);
		return !isTopCategory;
	}

	const chartData = $derived(() => {
		if (!analysis) return [];
		return CATEGORIES.map((category) => createChartDataItem(category, analysis));
	});

	function buildPeerGroupLabel(genre?: string, rating?: string, language?: string): string {
		const parts = [];

		if (language) parts.push(language);
		if (genre) parts.push(`'${genre}'`);
		if (rating) parts.push(`(${rating})`);

		if (parts.length === 0) {
			return rating ? `${rating} films` : 'peer group';
		}

		return parts.join(' ');
	}

	const maxValue = $derived(() => {
		const data = chartData();
		if (!data.length) return 10;
		return Math.max(...data.map((d) => Math.max(d.value, d.median))) * SCALE_FACTOR;
	});

	const singleLineTitle = $derived(() => {
		if (!analysis) return 'Edits vs. group';

		const peerGroup = buildPeerGroupLabel(genre, rating, language);
		return `Edits vs. Other ${peerGroup}`;
	});

	function generateTutorialSteps(data: any[]) {
		if (!data.length) return [];

		const hasData = data.some((d) => d.value > 0 || d.median > 0);
		const longestBar = data.reduce((max, item) => (item.value > max.value ? item : max), data[0]);
		const hasMedianDifference = data.some((d) => d.value !== d.median && d.median > 0);

		const generateBigPictureDescription = () => {
			const aboveMedianCount = data.filter((d) => d.isAboveMedian && d.value > 0).length;
			const totalWithData = data.filter((d) => d.value > 0 || d.median > 0).length;

			if (!hasData) {
				return `With minimal to no edits, this film was censored far less than is typical for its genre.`;
			} else if (aboveMedianCount > totalWithData / 2) {
				return `Overall, this film was edited more heavily than is typical, with a majority of categories exceeding the median.`;
			} else if (aboveMedianCount === 0) {
				return `Across the board, this film required fewer edits than the genre median, suggesting it was largely compliant with censor standards.`;
			} else {
				return `The results are mixed. The film was edited more than is typical in some categories but less in others.`;
			}
		};

		const generateFilmEditsDescription = () => {
			return longestBar.value > 0
				? `Each red bar shows this film's edit count. For example, it had ${Math.floor(longestBar.value)} mentions for "${longestBar.category},"${longestBar.category === 'Sensitive Content' ? '' : 'content,'} which is ${longestBar.isAboveMedian ? 'more' : 'less'} than the genre median.`
				: `This film has no edits in these categories, placing it well below the typical number of changes for films in its genre.`;
		};

		return [
			{
				title: 'Film vs. The Genre Average',
				description: `This chart measures the film's edits against the typical number for its genre. The red bar is this film; the dashed line is the median for comparable films.`,
				highlight: null
			},
			{
				title: "This Film's Edits",
				description: generateFilmEditsDescription(),
				highlight: longestBar.value > 0 ? { category: longestBar.category, type: 'bar' } : null
			},
			{
				title: 'What the Dashed Line Means',
				description: hasMedianDifference
					? `The dashed line marks the median number of edits for the genre. If the red bar passes this line, the film was edited more than is typical for that category.`
					: `The dashed line marks the median for the genre. This film's edits are consistently near the median, indicating a typical level of censorship.`,
				highlight: hasMedianDifference ? { type: 'medians' } : null
			},
			{
				title: 'The Big Picture',
				description: generateBigPictureDescription(),
				highlight: { type: 'comparison' }
			}
		];
	}

	const tutorialSteps = $derived(() => generateTutorialSteps(chartData()));

	const currentStep = $derived(tutorialSteps()[tutorialStep] || tutorialSteps()[0]);
</script>

<Plot
	height={CHART_HEIGHT}
	x={{
		domain: [0, maxValue()],
		label: false,
		tickFormat: (d) => String(d)
	}}
	y={{
		type: 'band',
		domain: chartData().map((d) => d.category),
		padding: BAND_PADDING,
		label: false
	}}
>
	{#snippet header()}
		{#if tutorialMode}
			<div class="flex items-start justify-between gap-2">
				<p class="min-h-[3lh] text-xs leading-relaxed text-gray-700">
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
								onTutorialChange?.(Math.min(tutorialSteps().length - 1, tutorialStep + 1))}
							disabled={tutorialStep === tutorialSteps().length - 1}
						>
							<ChevronRight class="ml-1 h-3 w-3" />
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<div class="chart-header">
				<div class="title-and-legend">
					<div class="flex w-full items-start justify-between">
						<h2 class="font-atkinson text-sepia-brown text-xs font-bold tracking-wide uppercase">
							{singleLineTitle()}
						</h2>
						<div class="flex items-center gap-4">
							<div class="legend">
								<span class="legend-item">
									<span class="bar-legend"></span>
									Movie
								</span>
								<span class="legend-item">
									<span class="line-legend"></span>
									Median
								</span>
							</div>
							{#if infoButton}
								{@render infoButton()}
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	{/snippet}

	<GridX stroke="var(--color-sepia-brown)" strokeWidth={0.9} opacity={1} />
	<GridY stroke="var(--color-sepia-brown)" strokeWidth={0.9} opacity={1} />

	{#if tutorialMode && currentStep?.highlight}
		{#if currentStep.highlight.type === 'bar' && currentStep.highlight.category}
			<BarX
				data={chartData().filter((d) => d.category === currentStep.highlight?.category)}
				y="category"
				x1={0}
				x2="value"
				inset={BAR_INSET}
				fill="var(--color-sepia-brown)"
				opacity={0.9}
				stroke="var(--color-sepia-red)"
				strokeWidth={1}
			/>
		{:else if currentStep.highlight.type === 'medians'}
			<RuleX
				data={chartData().filter((d) => d.median > 0)}
				x="median"
				y1={(d) => d.category}
				y2={(d) => d.category}
				stroke="var(--color-sepia-brown)"
				strokeWidth={3}
				strokeDasharray="2,1"
				opacity={0.8}
			/>
			<Arrow
				data={chartData()
					.filter((d) => d.median > 0)
					.slice(0, 1)}
				x1={maxValue() * 0.8}
				y1={chartData()[chartData().length - 1]?.category}
				x2="median"
				y2="category"
				stroke="var(--color-sepia-brown)"
				strokeWidth={1.5}
				headLength={6}
				headAngle={90}
				opacity={0.6}
				bend={20}
				insetEnd={10}
			/>
			<Text
				data={[
					{
						x: maxValue() * 0.8,
						y: chartData()[chartData().length - 1]?.category,
						text: 'Median line'
					}
				]}
				x="x"
				y="y"
				text="text"
				fontSize={12}
				fontWeight="bold"
				fill="var(--color-sepia-brown)"
				dy={0}
				strokeWidth={8}
				strokeLinejoin="round"
				strokeMiterlimit={0}
				stroke="white"
			/>
		{:else if currentStep.highlight.type === 'comparison'}
			<BarX
				data={chartData().filter((d) => d.isAboveMedian && d.value > 0)}
				y="category"
				x1={0}
				x2="value"
				inset={BAR_INSET}
				fill="var(--color-red)"
				opacity={0.2}
				stroke="none"
			/>
		{/if}
	{/if}

	<BarX
		data={chartData()}
		y="category"
		x1={0}
		x2="value"
		inset={BAR_INSET}
		fill="var(--color-sepia-red)"
		stroke="var(--color-sepia-med)"
		strokeWidth={0}
		opacity={tutorialMode && currentStep.highlight?.type === 'medians' ? 0 : 0.7}
	/>

	<RuleX
		data={chartData()}
		x="median"
		y1={(d) => (d as any).category}
		y2={(d) => (d as any).category}
		stroke="var(--color-sepia-brown)"
		strokeWidth={STROKE_WIDTH}
		strokeDasharray="2,1"
	/>

	<Text
		data={chartData().filter((d) => {
			const shouldShow = shouldShowLabel(d, tutorialMode, currentStep.highlight?.type, chartData());
			return d.value > 0 && d.value !== d.median && shouldShow;
		})}
		y="category"
		x="value"
		dx={LABEL_OFFSET}
		text={(d) => String(Math.floor((d as any).value))}
		fontSize={FONT_SIZE}
		fontWeight="bold"
		fill="var(--color-sepia-brown)"
	/>

	<!-- Median labels (only show if > 0 and different from value) -->
	<Text
		data={chartData().filter((d) => {
			const shouldShow = shouldShowLabel(d, tutorialMode, currentStep.highlight?.type, chartData());
			return d.median > 0 && d.value !== d.median && shouldShow;
		})}
		y="category"
		strokeWidth={3}
		strokeLinejoin="round"
		strokeMiterlimit={0}
		stroke="var(--color-sepia-med)"
		x="median"
		dx={8}
		text={(d) => String((d as any).median)}
		fontSize={FONT_SIZE}
		fill="var(--color-sepia-brown)"
		opacity={0.8}
	/>

	<Text
		data={chartData().filter((d) => {
			const shouldShow = shouldShowLabel(d, tutorialMode, currentStep.highlight?.type, chartData());
			return d.value > 0 && d.value === d.median && shouldShow;
		})}
		y="category"
		x="value"
		dx={LABEL_OFFSET}
		text={(d) => String(Math.floor((d as any).value))}
		fontSize={FONT_SIZE}
		fontWeight="bold"
		fill="var(--color-sepia-brown)"
	/>

	<AxisX stroke="var(--color-sepia-brown)" strokeWidth={2} />

	<AxisY stroke="var(--color-sepia-brown)" opacity={1} strokeWidth={1} tickSize={0} />

	{#snippet footer()}
		<div class="pb-3"></div>
	{/snippet}
</Plot>

<style>
	.title-and-legend {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 11px;
	}

	.legend {
		display: flex;
		gap: 4px;
		font-size: 12px;
		font-weight: 400;
		opacity: 0.8;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 3px;
		color: var(--color-sepia-brown);
	}

	.bar-legend {
		width: 8px;
		height: 8px;
		background-color: var(--color-sepia-red);
		border: 0px solid var(--color-sepia-brown);
		flex-shrink: 0;
	}

	.line-legend {
		width: 2px;
		height: 10px;
		background-color: var(--color-sepia-brown);
		flex-shrink: 0;
		border-left: 1px dotted var(--color-sepia-brown);
		height: 12px;
		width: 0;
		background: none;
	}
</style>
