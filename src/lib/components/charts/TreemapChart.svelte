<script lang="ts">
	import { Plot, Rect, Text } from 'svelteplot';
	import { hierarchy, treemap } from 'd3-hierarchy';
	import { mappings } from '../../../routes/search/mappings';
	import { getActionTypeClasses } from '../../../routes/film/film-display';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	let {
		actionTypesData = [],
		infoButton = undefined,
		tutorialMode = false,
		tutorialStep = 0,
		onTutorialChange = undefined
	}: {
		actionTypesData?: { name: string; value: number; category?: string }[];
		primaryColorCount?: number;
		infoButton?: import('svelte').Snippet;
		tutorialMode?: boolean;
		tutorialStep?: number;
		onTutorialChange?: (step: number) => void;
	} = $props();

	function getDisplayName(actionType: string): string {
		return mappings.aiActionTypes[actionType as keyof typeof mappings.aiActionTypes] || actionType;
	}

	function getTailwindFillColor(bgClass: string): string {
		const colorMap: Record<string, string> = {
			'bg-blue/50': 'var(--color-blue)',
			'bg-yellow/50': 'var(--color-yellow)',
			'bg-red/50': 'var(--color-red)',
			'bg-green/50': 'var(--color-green)',
			'bg-sepia-dark/25': 'var(--color-sepia-dark)',
			'bg-sepia-med': 'var(--color-sepia-med)',
			'bg-sepia-light': 'var(--color-sepia-light)'
		};

		return colorMap[bgClass] || 'var(--color-sepia-light)';
	}

	function getContrastingTextColor(actionType: string): string {
		const classes = getActionTypeClasses(actionType);

		const textColorMap: Record<string, string> = {
			'bg-blue/50': 'white',
			'bg-yellow/50': 'black',
			'bg-red/50': 'white',
			'bg-green/50': 'white',
			'bg-sepia-dark/25': 'white',
			'bg-sepia-med': 'white',
			'bg-sepia-light': 'black'
		};

		return textColorMap[classes.bg] || 'white';
	}

	const data = $derived(() => {
		if (actionTypesData.length > 0) {
			return actionTypesData.map((item) => ({
				...item,
				displayName: getDisplayName(item.name),
				originalName: item.name
			}));
		}
		return [
			{
				name: 'No Data',
				displayName: 'No Data',
				originalName: 'No Data',
				value: 1,
				category: 'default'
			}
		];
	});

	const treemapLayout = $derived(() => {
		const currentData = data();
		if (!currentData || !Array.isArray(currentData) || currentData.length === 0)
			return { data: [], x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2' };

		const root = hierarchy({ children: currentData }).sum((d: any) => d.value || 0);
		const totalValue = root.value || 1;

		const layout = treemap().size([200, 100]).padding(4);

		layout(root);

		const layoutData = root.leaves().map((d: any, index: number) => {
			const actionTypeClasses = getActionTypeClasses(d.data.originalName || d.data.name);
			const fillColor = getTailwindFillColor(actionTypeClasses.bg);

			const textColor = getContrastingTextColor(d.data.originalName || d.data.name);
			const percentage = Math.round((d.data.value / totalValue) * 100);

			return {
				x1: d.x0,
				y1: d.y0,
				x2: d.x1,
				y2: d.y1,
				name: d.data.displayName || d.data.name,
				originalName: d.data.originalName || d.data.name,
				value: d.data.value,
				percentage,
				category: d.data.category || d.data.name,
				fillColor,
				textColor
			};
		});

		return {
			data: layoutData,
			x1: 'x1',
			y1: 'y1',
			x2: 'x2',
			y2: 'y2'
		};
	});

	function generateTutorialSteps(layoutData: any[]) {
		if (!layoutData.length || layoutData[0]?.name === 'No Data') {
			return [
				{
					title: 'Action Types Breakdown',
					description:
						'This chart would show the breakdown of content modifications by type, but no data is available for this film.',
					highlight: null
				}
			];
		}

		const sortedData = [...layoutData].sort((a, b) => b.value - a.value);
		const topAction = sortedData[0];
		const totalActions = sortedData.reduce((sum, item) => sum + item.value, 0);

		return [
			{
				title: 'Reading the Treemap',
				description: `Each box represents a type of censor action, with size proportional to frequency. "${topAction.name}" is the most common action (${topAction.percentage}% of ${totalActions} total modifications).`,
				highlight: { originalName: topAction.originalName, type: 'dominant' }
			}
		];
	}

	const tutorialSteps = $derived(() => generateTutorialSteps(treemapLayout().data));
	const currentStep = $derived(tutorialSteps()[tutorialStep] || tutorialSteps()[0]);
</script>

<Plot
	height={110}
	x={{ domain: [0, 200] }}
	y={{ domain: [0, 100] }}
	marginLeft={-3}
	marginRight={0}
	marginBottom={0}
>
	<Rect
		data={treemapLayout().data}
		x1={treemapLayout().x1}
		y1={treemapLayout().y1}
		x2={treemapLayout().x2}
		y2={treemapLayout().y2}
		fill={(d: any) => d.fillColor}
		stroke="var(--color-sepia-brown)"
		strokeWidth={0.5}
		opacity={tutorialMode && currentStep.highlight?.type === 'dominant' ? 0.3 : 1}
	/>

	{#if tutorialMode && currentStep.highlight}
		{#if currentStep.highlight.type === 'dominant'}
			<Rect
				data={treemapLayout().data.filter(
					(d: any) => d.originalName === currentStep.highlight?.originalName
				)}
				x1={treemapLayout().x1}
				y1={treemapLayout().y1}
				x2={treemapLayout().x2}
				y2={treemapLayout().y2}
				fill={(d: any) => d.fillColor}
				stroke="var(--color-sepia-brown)"
				strokeWidth={2}
				opacity={0.9}
			/>
		{:else if currentStep.highlight.type === 'proportions'}
			<Rect
				data={treemapLayout().data}
				x1={treemapLayout().x1}
				y1={treemapLayout().y1}
				x2={treemapLayout().x2}
				y2={treemapLayout().y2}
				fill="transparent"
				stroke="var(--color-sepia-brown)"
				strokeWidth={1.5}
				strokeDasharray="3,2"
				opacity={0.8}
			/>
		{/if}
	{/if}

	<Text
		data={treemapLayout().data}
		x={(d: any) => (d.x1 + d.x2) / 2}
		y={(d: any) => (d.y1 + d.y2) / 2}
		text={(d: any) => {
			const width = d.x2 - d.x1;
			const name = d.name;
			const percentage = d.percentage;

			if (width < 60 && name.length > 8) {
				const words = name.split(' ');
				if (words.length > 1) {
					const nameText = words.join('\n');
					return `${nameText}\n${percentage}%`;
				}
			}

			return `${name}\n${percentage}%`;
		}}
		fontSize={12}
		strokeWidth={1}
		strokeLinejoin="round"
		strokeMiterlimit={0}
		stroke={(d: any) => (d.textColor === 'white' ? 'black' : 'white')}
		fill={(d: any) => d.textColor}
		opacity={tutorialMode && currentStep?.highlight?.type === 'dominant'
			? (d: any) => (d.originalName === currentStep.highlight.originalName ? 1 : 0.3)
			: 1}
		filter={(d: any) => {
			const width = d.x2 - d.x1;
			const height = d.y2 - d.y1;
			const area = width * height;
			const minWidth = 40;
			const minHeight = 12;
			return area > 300 && width >= minWidth && height >= minHeight;
		}}
	/>

	{#snippet header()}
		{#if tutorialMode}
			<p class="min-h-[3lh] text-xs leading-relaxed text-gray-700">
				{currentStep.description}
			</p>
		{:else}
			<div class="flex items-center justify-between">
				<h2 class="font-atkinson text-sepia-brown text-xs font-bold tracking-wide uppercase">
					Actions breakdown
				</h2>
				{#if infoButton}
					{@render infoButton()}
				{/if}
			</div>
		{/if}
	{/snippet}
</Plot>

<style>
	:global(.tooltip-text) {
		animation: tooltip-fade-in 0.1s var(--ease-out-quart) forwards;
		transform-origin: center bottom;
	}

	@keyframes tooltip-fade-in {
		0% {
			opacity: 0;
			transform: translateY(5px) scale(0.95);
		}
		100% {
			opacity: 1;
			transform: translateY(0px) scale(1);
		}
	}
</style>
