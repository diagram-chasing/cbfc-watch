<script lang="ts">
	import { cn } from '$lib/utils';
	import BarPlot from '$lib/components/charts/BarPlot.svelte';
	import ActionDurationBoxPlot from '$lib/components/charts/ActionDurationBoxPlot.svelte';
	import Trends from '$lib/components/charts/Trends.svelte';
	import RatingBreakdown from '$lib/components/charts/RatingBreakdown.svelte';
	import { Table } from '$lib/components/charts/tables';
	import SEO from '$lib/components/SEO.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import notebook from '$lib/assets/notebook.webp';
	import CensoredFilms from '$lib/components/charts/CensoredFilms.svelte';
	import SafeMode from '$lib/components/SafeMode.svelte';
	// Data
	import cutsByOfficeData from '$lib/data/charts/cuts_by_office.json';
	import tfidfData from '$lib/data/charts/tfidf_analysis.json';
	import filmsByLanguageData from '$lib/data/charts/films_by_language.json';
	import modificationsByContentData from '$lib/data/charts/modifications_by_content.json';

	const tableData = {
		columnGroups: [
			{ label: 'CONTENT', span: 2 },
			{ label: 'MEASURES', span: 2 }
		],
		search: {
			enabled: true,
			placeholder: 'Search words or content types...',
			fields: ['word', 'ai_content_types']
		},
		sort: {
			enabled: true,
			defaultColumn: 'tf_idf',
			defaultDirection: 'desc'
		},
		pagination: {
			enabled: true,
			itemsPerPage: 20
		},
		columns: [
			{ key: 'ai_content_types', label: 'TYPE', type: 'text', bold: true, group: 0 },
			{ key: 'word', label: 'WORD/PHRASE', type: 'text', group: 0 },
			{
				key: 'n',
				label: 'COUNT',
				type: 'number',
				precision: 0,
				group: 1
			},

			{
				key: 'tf_idf',
				label: 'TF-IDF',
				type: 'number',
				precision: 4,
				showBar: true,
				barColor: 'orange',
				colorScale: 'cbfc_yellow',
				group: 1
			}
		],
		data: tfidfData.slice(0, 500)
	};
</script>

{#snippet ChartCard(title, subtitle, chartComponent, chartProps, className, layout = 'row')}
	<article
		class={cn('border-sepia-dark bg-sepia-light @container border p-3 shadow-sm md:p-4', className)}
	>
		<div
			class={cn(
				'flex items-start justify-between gap-4',
				layout === 'column' ? 'flex-col' : 'flex-col @lg:flex-row @lg:items-stretch'
			)}
		>
			<!-- Text content -->
			<div
				class={cn(
					'flex flex-col self-stretch',
					layout === 'column' ? 'w-full' : '@lg:w-80 @lg:flex-shrink-0'
				)}
			>
				<div class="space-y-2">
					<h3
						class="font-atkinson text-base font-bold text-balance @lg:text-lg"
						style="text-wrap: balance;"
					>
						{title}
					</h3>
					<p
						class="font-atkinson text-sepia-brown/80 text-sm leading-relaxed @lg:text-base"
						style="text-wrap: pretty;"
					>
						{subtitle}
					</p>
				</div>
			</div>

			<!-- Chart content -->
			<div
				class={cn(
					'overflow-hidden',
					layout === 'column' ? 'w-full' : 'w-full @lg:min-w-0 @lg:flex-1'
				)}
			>
				<svelte:component this={chartComponent} {...chartProps} />
			</div>
		</div>
	</article>
{/snippet}

<SEO
	title="Statistics"
	description="Statistics and analysis of film censorship in India. Charts, trends, and data visualizations of CBFC modifications by content type, office, and time period from 2017-2025."
	keywords="CBFC statistics, film censorship data, movie modification trends, censorship analysis, CBFC office comparison, film cuts data"
/>

<!-- Main Content Container -->
<main class="z-3 min-h-screen w-full space-y-4 text-gray-900 md:space-y-6 md:px-0">
	<section class="relative" aria-label="Statistics hero section">
		<div class="relative mx-auto max-w-6xl">
			<div class="grain-effect">
				<div class="px-2 py-4 md:px-0">
					<!-- Title -->
					<h1
						class="font-gothic mb-6 text-4xl leading-tight font-bold tracking-[-0.01em] text-black sm:text-5xl md:text-6xl"
						style="text-wrap: balance;"
					>
						Trends and analysis
					</h1>

					<!-- Context paragraph -->
					<div class="flex max-w-2xl items-start justify-between gap-4">
						<p
							class="font-atkinson text-base leading-relaxed text-gray-700"
							style="text-wrap: pretty;"
						>
							To give you a sense of what's in the data, we've highlighted a few key trends and
							relationships below. These visualizations are designed to illustrate the types of
							questions this dataset can help answer and to serve as a starting point for analysis.
						</p>
					</div>
				</div>
				<div
					class="border-sepia-dark bg-sepia-light flex w-fit items-center gap-3 border px-4 py-3"
				>
					<p class=" text-sm text-amber-800">
						This page may contain explicit terms and offensive language from film censorship
						records.
					</p>
					<SafeMode id="sfw-mode-stats" labelText="Safe mode" />
				</div>
			</div>
		</div>
	</section>

	<section id="charts-section" class="space-y-4">
		{@render ChartCard(
			'CBFC modification rates show consistent patterns for violence, volatile trends for cultural topics',
			'Film censorship varies most for religious and political content',
			Trends,
			{
				caption:
					'Analysis of Central Board of Film Certification modification records, showing 3-month moving average of deviations from baseline censorship rates by content type. Baseline represents the overall average modification rate for each category from 2017-2025.'
			},
			'h-fit'
		)}

		{@render ChartCard(
			'Chennai and Thiruvananthpuram offices modify more content in films than other regions',
			'The average amount of content modified varies by certifying office location.',
			BarPlot,
			{
				data: cutsByOfficeData,
				xLabel: 'Average minutes of content modified per movie',
				yLabel: '',
				xTickFormat: (value: any) => {
					const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
					if (numValue < 1) {
						return `${(numValue * 60).toFixed(0)} sec`;
					} else {
						const rounded = Math.round(numValue * 10) / 10;
						if (Number.isInteger(rounded)) {
							return `${rounded} m`;
						} else {
							return `${rounded} m`;
						}
					}
				}
			},
			'flex-row-reverse'
		)}
		<div class="flex flex-col gap-4 lg:flex-row">
			{@render ChartCard(
				'Hindi leads film production, followed by Tamil and Telugu',
				'Distribution of films by language in on E-CinePramaan (2017-2025).',
				BarPlot,
				{
					data: filmsByLanguageData,
					xLabel: 'Number of films',
					yLabel: '',
					valueField: 'n',
					yField: 'language'
				},
				'flex-1'
			)}
			{@render ChartCard(
				'Profanity and violence are the most commonly modified content types',
				'Total number of modifications by content category across all films.',
				BarPlot,
				{
					data: modificationsByContentData,
					xLabel: 'Number of modifications',
					yLabel: '',
					valueField: 'n',
					yField: 'pretty_name',
					barFill: 'var(--color-red)',
					barStroke: 'var(--color-red)',
					textFill: 'white',
					textFillMobile: 'var(--color-red)'
				},
				'flex-1'
			)}
		</div>

		{@render ChartCard(
			'Edits adding to the movie are the longest, audio modifications are quickest',
			"Distribution of modification durations by action type. 'Insertions' are often for adding disclaimers such as smoking warnings, whereas audio modifications might be quick cuts for profanity.",
			ActionDurationBoxPlot,
			{},
			''
		)}

		{@render ChartCard(
			'Heavily modified movies by office',
			'Top ten movies from each CBFC office by total duration of modifications. Select an office to see the films with the most content removed.',
			CensoredFilms,
			{
				title: 'Heavily modified movies',
				subtitle: 'Films with the most content removed by CBFC offices'
			},
			''
		)}

		<!-- {@render ChartCard(
			'Censorship reasons by film rating',
			'Proportional breakdown of modification reasons within each film rating category.',
			RatingBreakdown,
			{
				caption: 'Showing the distribution of content modification types within each CBFC rating category (A, U, UA) from 2017-2025.'
			},
			'',
			'column'
		)} -->

		{@render ChartCard(
			'Distinctive keywords by modification category',
			'Terms with the highest Term Frequency-Inverse Document Frequency (TF-IDF) score for each category. TF-IDF is a measure used to find words that are uniquely important to a specific topic. A high score means a term is a distinctive signal for that category.',
			Table,
			{ data: tableData },
			''
		)}

		<!-- Methodology -->
		<section class="py-8">
			<div class="flex flex-col items-center gap-4 md:items-start lg:flex-row">
				<img src={notebook} alt="" class="w-64 [filter:drop-shadow(2px_2px_2px_#22222280)]" />
				<div class="space-y-3 px-4 md:px-0">
					<h3 id="notebook" class="text-2xl font-medium">Use this data</h3>
					<p class="font-atkinson text-sepia-brown/80 text-base leading-relaxed">
						We’re making our code and data available so you can dig into the numbers yourself. Our
						RMarkdown notebook has everything you need to replicate our charts and analysis, or to
						use as a jumping-off point for your own projects. And if you spot a mistake in our work,
						<a href="https://github.com/diagram-chasing/cbfc-watch"
							>please file an issue on our GitHub</a
						>.
					</p>
					<Button
						href="/notebook/index.html"
						class="flex  w-fit items-center"
						variant="card"
						aria-describedby="download-heading"
						>Data analysis notebook
					</Button>
				</div>
			</div>
		</section>
	</section>
</main>
