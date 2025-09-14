<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		Film as FilmIcon,
		Eye,
		NotebookTabs,
		ExternalLink,
		FileText,
		Info,
		HelpCircle
	} from 'lucide-svelte';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import FilmDistribution from '$lib/components/charts/DistributionHistogram.svelte';
	import FilmDetailSkeleton from './components/FilmDetailSkeleton.svelte';
	import ModificationTable from './components/ModificationTable.svelte';
	import { FilmCreditsGroup } from '$lib/components/ui/film-credits/index.js';
	import DateStamp from '$lib/components/DateStamp.svelte';

	import { slugify } from '$lib/utils/core';
	import { getColorInfo } from '$lib/utils/colors';
	import type { Film, Modification } from '$lib/types';
	import { onMount } from 'svelte';
	import type { CoreFilmData } from './+page';
	import { getDisplayFilm } from '../film-processing';
	import { generateExternalLinks } from '../external-links';
	import TreemapChart from '$lib/components/charts/TreemapChart.svelte';
	import PeerComparisonChart from '$lib/components/charts/ComparisonChart.svelte';
	import ChartInfoDialog from '$lib/components/ChartInfoDialog.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import {
		getUniqueModifications,
		computeTotalModifiedDuration,
		computeActionTypesData,
		countDeletions,
		countReplacements,
		getActionTypesParam,
		computeContentTypesData
	} from '../film-stats';
	import { formatDuration } from '$lib';
	import SafeMode from '$lib/components/SafeMode.svelte';

	let { data }: { data: { coreData: CoreFilmData } } = $props();

	let currentFilm = $state(data.coreData.currentFilm);
	let filmsByLanguage = $state(data.coreData.filmsByLanguage);
	let categoriesAvailability = $state(data.coreData.categoriesAvailability);
	let error = $state(data.coreData.error);

	const coreDataPromise = $derived(Promise.resolve());
	const uniqueModifications = $derived(getUniqueModifications(currentFilm));
	const totalModifiedDuration = $derived(computeTotalModifiedDuration(uniqueModifications));
	const actionTypesData = $derived(computeActionTypesData(uniqueModifications));
	const contentTypesData = $derived(computeContentTypesData(uniqueModifications));
	const deletions = $derived(countDeletions(actionTypesData));
	const replacements = $derived(countReplacements(actionTypesData));
	const actionTypesParam = $derived(getActionTypesParam(actionTypesData));
	const primaryContentType = $derived(contentTypesData.length > 0 ? contentTypesData[0].name : '');

	let dominantColor = $state('#2c3e50');
	let textColor = $state('text-white');
	let selectedLanguage = $state('');
	let imageLoaded = $state(false);
	let chartTutorialStep = $state(0);

	const isMobileAccordion = new MediaQuery('max-width: 768px');

	onMount(() => {
		// Handle initial film setup
		if (currentFilm && currentFilm.languageCount && currentFilm.languageCount > 1) {
			setDefaultLanguageInUrl(currentFilm.language);
		}
	});

	function setDefaultLanguageInUrl(language: string | undefined) {
		if (typeof window === 'undefined' || !language) return;
		const url = new URL(window.location.href);
		if (!url.searchParams.has('lang')) {
			url.searchParams.set('lang', slugify(language));
			history.replaceState({}, '', url);
		}
	}
	const availableLanguages = $derived(() => {
		if (filmsByLanguage && Object.keys(filmsByLanguage).length > 0) {
			return Object.keys(filmsByLanguage);
		} else if (currentFilm?.language) {
			return [currentFilm.language];
		}
		return [];
	});

	const selectedLanguageOption = $derived(() => {
		return selectedLanguage ? { value: selectedLanguage, label: selectedLanguage } : undefined;
	});

	const optimizedPosterUrl = $derived(() => {
		const posterUrl = currentFilm?.posterUrl || '';
		return posterUrl?.startsWith('http')
			? posterUrl.replace(/@\.jpg$/, '@._V1_QL99_UX600_.jpg')
			: posterUrl;
	});

	$effect(() => {
		if (currentFilm?.language) selectedLanguage = currentFilm.language;
	});

	async function extractDominantColor(posterUrl: string) {
		if (posterUrl && posterUrl.trim() !== '') {
			try {
				const colorInfo = await getColorInfo(posterUrl, 'dark');
				if (colorInfo) {
					dominantColor = colorInfo.dominantColor;
					textColor = colorInfo.textColor;
				}
			} catch (err) {
				console.error('Error extracting colors:', err);
			}
		}
	}

	async function handleImageLoad() {
		imageLoaded = true;
		if (optimizedPosterUrl() && optimizedPosterUrl().startsWith('http')) {
			await extractDominantColor(optimizedPosterUrl());
		}
	}

	function handleImageError() {
		imageLoaded = false;
	}

	function handleLanguageChange(value: { value: string; label: string } | undefined) {
		if (!value?.value || !filmsByLanguage) return;

		const newDisplayFilm = getDisplayFilm(value.value, filmsByLanguage);
		if (newDisplayFilm) {
			currentFilm = newDisplayFilm;
			selectedLanguage = value.value;

			if (typeof window !== 'undefined') {
				const url = new URL(window.location.href);
				url.searchParams.set('lang', slugify(value.value));
				history.replaceState({}, '', url);
			}
		}
	}
</script>

{#if currentFilm}
	<SEO
		title={currentFilm.name?.replace(/"/g, '') || 'Film Details'}
		description={`${currentFilm.name} (${currentFilm.rating || 'Not Rated'}) - ${uniqueModifications.length} CBFC modification${uniqueModifications.length !== 1 ? 's' : ''}, ${formatDuration(Math.round(totalModifiedDuration), 'short')} seconds total. View detailed censorship analysis and modifications.`}
		contentType="movie"
		film={currentFilm}
		modifications={uniqueModifications.length}
		{primaryContentType}
		totalDuration={totalModifiedDuration}
		{deletions}
		{replacements}
		{actionTypesParam}
	/>
{/if}

{#snippet ChartWithInfo(component: any, props: any, title: string, description: string)}
	{@const Component = component}
	<svelte:boundary onerror={(err) => console.error('Chart error:', err)}>
		<Component {...props}>
			{#snippet infoButton()}
				{#if component === FilmDistribution || component === PeerComparisonChart || component === TreemapChart}
					<ChartInfoDialog
						{title}
						{description}
						onOpenChange={(open) => {
							if (open) chartTutorialStep = 0;
						}}
					>
						{#snippet chart()}
							<Component
								{...props}
								tutorialMode={true}
								tutorialStep={chartTutorialStep}
								onTutorialChange={(step: number) => (chartTutorialStep = step)}
							/>
						{/snippet}
					</ChartInfoDialog>
				{:else}
					<ChartInfoDialog {title} {description}>
						{#snippet chart()}
							{@const ChartComponent = component}
							<ChartComponent {...props} />
						{/snippet}
					</ChartInfoDialog>
				{/if}
			{/snippet}
		</Component>
		{#snippet failed()}
			<div class="p-4 text-sm text-gray-700">Chart unavailable</div>
		{/snippet}
	</svelte:boundary>
{/snippet}

{#snippet DataAccuracyDialog()}
	<DialogPrimitive.Root>
		<DialogPrimitive.Trigger>
			<Button
				variant="ghost"
				size="icon"
				class="group -mr-4 flex h-fit w-full flex-row-reverse items-center gap-1 rounded-xs px-2 py-0.5 text-xs text-amber-700/80 hover:text-amber-800 hover:shadow-none md:-mr-2 md:w-fit md:flex-row"
				aria-label="Show data accuracy information"
				title="Learn about data accuracy"
			>
				<span class="font-bold">Data accuracy</span>
				<HelpCircle class="!size-4 opacity-70 transition-opacity group-hover:opacity-100" />
			</Button>
		</DialogPrimitive.Trigger>

		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
				style="animation-duration: 150ms; animation-timing-function: var(--ease-out-quad);"
			/>
			<DialogPrimitive.Content
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 h-fit w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border bg-white p-4 shadow-xl"
				style="animation-duration: 200ms; animation-timing-function: var(--ease-out-quart);"
				preventScroll={false}
			>
				<div class="mb-2 flex items-center justify-between">
					<h2 class="font-atkinson text-sepia-brown text-lg font-semibold">
						Poster, description or cast look wrong?
					</h2>
					<DialogPrimitive.Close
						class="rounded-sm opacity-70 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</DialogPrimitive.Close>
				</div>

				<div class="space-y-3">
					<p class="font-atkinson text-sm text-gray-800">
						The core of this project is the official modification data from the CBFC. We consider
						this data to be reliable. To add context, we matched each film to its IMDb entry by
						title. This automated process is imperfect and can sometimes result in mismatches (for
						example, you might see a regional Indian film paired with a Hollywood cast).

						<br /><br />
						These potential metadata errors do not affect our analysis of the censorship records themselves.
						To verify any film’s details, you can consult the original 'CBFC Listing'.
					</p>
				</div>
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	</DialogPrimitive.Root>
{/snippet}

{#snippet LanguageSelector(
	availableLanguages: string[],
	selectedLanguageOption: any,
	handleLanguageChange: any,
	variant = 'desktop'
)}
	{#if availableLanguages.length > 1}
		{#key selectedLanguageOption?.value}
			<Select.Root
				type="single"
				value={selectedLanguageOption?.value}
				onValueChange={(value) => handleLanguageChange(value ? { value, label: value } : undefined)}
			>
				<Select.Trigger
					class="bg-sepia-med text-sepia-brown h-7 w-full rounded-xs border-none p-3 lg:min-w-[130px] "
					aria-label="Select film language"
					title="Choose language version of the film"
				>
					{selectedLanguageOption?.label || 'Select Language'}
				</Select.Trigger>
				<Select.Content
					class=" border-sepia-dark {variant === 'desktop'
						? 'bg-sepia-brown rounded-xs text-white'
						: ''}"
				>
					{#each availableLanguages as lang}
						<Select.Item class={variant === 'desktop' ? 'text-base' : ''} value={lang} label={lang}>
							{lang}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		{/key}
	{:else if availableLanguages.length === 1}
		<p
			class="bg-sepia-med text-sepia-brown flex h-7 w-full min-w-[130px] items-center justify-center rounded-xs border-none px-2 font-bold"
		>
			{availableLanguages[0]}
		</p>
	{/if}
{/snippet}

{#snippet RatingBadge(rating: string)}
	{@const ratingColors = {
		U: 'bg-green text-sepia-light border-green/70',
		UA: 'bg-yellow text-sepia-brown border-yellow/70',
		A: 'bg-red text-sepia-light border-red/70',
		S: 'bg-sepia-brown text-sepia-light border-sepia-brown/70'
	}}
	{@const colorClass =
		ratingColors[rating as keyof typeof ratingColors] ||
		'bg-sepia-dark text-neutral border-sepia-dark/70'}

	<span
		class="inline-flex h-7 items-center justify-center rounded-xs border-2 px-1 text-xs font-bold text-nowrap lg:p-1 {colorClass}"
		title="CBFC Rating: {rating}"
	>
		{rating}
	</span>
{/snippet}

{#snippet FilmPoster(film: Film, posterUrl: string, textColor: string)}
	<figure
		class="border-sepia-dark ignore-safe-mode relative mx-auto flex h-full w-full flex-col gap-1 overflow-hidden rounded-xs border bg-white p-1 lg:max-w-[550px]"
		style:view-transition-name={`card-${slugify(film.name)}`}
	>
		<header
			class="card-title-container flex-shrink-0 {textColor}"
			style="background-color: {dominantColor || 'var(--color-sepia-dark)'};"
		>
			<h3 class="card-title font-gothic text-2xl font-medium uppercase md:text-4xl">
				{film.name.replace(/^"|"$/g, '')}
			</h3>
		</header>

		<div class="relative flex-1">
			{#if posterUrl && posterUrl.trim() !== ''}
				<div class="relative h-full w-full overflow-hidden">
					<div
						class="absolute inset-0 flex animate-pulse items-center justify-center"
						style="background-color: {dominantColor ||
							'var(--color-sepia-med)'}; background-image: {dominantColor
							? 'none'
							: 'linear-gradient(to bottom right, var(--color-sepia-med), var(--color-sepia-dark))'};"
					>
						<div
							class="text-sepia-brown flex animate-pulse flex-col items-center justify-center text-center"
						>
							<div class="text-6xl opacity-60"><Eye /></div>
							<div class="text-lg font-medium">{film.name.replace(/^\"|\"$/g, '')}</div>
						</div>
					</div>
					<img
						src={posterUrl}
						alt={`Movie poster for ${film.name.replace(/^"|"$/g, '')} (${film.rating} rated)`}
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
						style="opacity: {imageLoaded ? 1 : 0};"
						loading="lazy"
						decoding="async"
						fetchpriority="high"
						onload={handleImageLoad}
						onerror={handleImageError}
					/>
				</div>
			{:else}
				<div
					class="flex h-full w-full flex-col items-center justify-center space-y-3 bg-gray-800"
					role="img"
					aria-label="No poster available for this film"
				>
					<Eye size={48} class="text-gray-400" aria-hidden="true" />
					<span class="text-sm text-gray-400">No Poster</span>
				</div>
			{/if}
		</div>
	</figure>
{/snippet}

{#snippet IMDbButton(imdbId: string, rating: string, variant = 'desktop')}
	{@const href = `https://www.imdb.com/title/tt${imdbId.padStart(7, '0')}/`}
	{@const baseClass =
		'flex items-center gap-1 border-[#d4a017] bg-[#F5C518] text-black font-bold shadow-sm hover:bg-[#e6b800]'}
	{@const variantClass = {
		desktop: 'gap-1.5 rounded-sm text-sm',
		mobile: 'rounded-xs text-xs sm:text-sm',
		smallest: 'rounded-xs text-xs sm:text-sm'
	}[variant]}
	{@const size = { desktop: 'xs', mobile: 'xs', smallest: 'smallest' }[variant]}

	<Button
		{href}
		target="_blank"
		class="{baseClass} {variantClass}"
		size={size as any}
		aria-label="View film on IMDb (rating: {rating})"
		title="Open IMDb page for this film"
	>
		{#if variant === 'mobile'}
			<Icon icon="ph:star-fill" class="text-black" height="1.5em" />
		{/if}
		<span
			class="font-atkinson font-bold {variant === 'smallest' ? 'text-xs sm:text-sm' : 'text-sm'}"
			>{rating}</span
		>
		<span
			class="font-atkinson font-medium {variant === 'smallest'
				? 'text-[9px] sm:text-xs'
				: variant === 'mobile'
					? 'text-[9px] sm:text-xs'
					: 'text-xs font-bold'}">IM{variant === 'mobile' ? 'DB' : 'Db'}</span
		>
		{#if variant === 'desktop'}
			<ExternalLink class="-mt-0.5 !size-3" />
		{/if}
	</Button>
{/snippet}

{#snippet ModificationCreditsGroup(
	film: Film,
	categoriesAvailability: Record<string, Record<string, boolean>>,
	field: keyof Pick<
		Modification,
		'aiActionTypes' | 'aiContentTypes' | 'aiMediaElements' | 'aiReferences'
	>,
	title: string
)}
	{@const hasData = film?.modifications?.some((mod) => mod[field] && mod[field] !== '')}
	{#if hasData}
		<FilmCreditsGroup
			groupTitle={title}
			{categoriesAvailability}
			credits={[
				{
					categoryId: field,
					names: [
						...new Set(
							film.modifications
								?.filter((mod) => mod[field] && mod[field] !== '')
								.map((mod) => mod[field]?.split('|') || [])
								.flat()
								.filter(Boolean)
								.map((item) => item.trim())
						)
					]
				}
			]}
			roleTextContainerBgClass="bg-sepia-light"
			flexWrapOnly={true}
		/>
	{/if}
{/snippet}

{#snippet FilmDetailsDesktop(
	film: Film,
	availableLanguages: string[],
	selectedLanguageOption: any,
	handleLanguageChange: any
)}
	<article class="border-sepia-dark mb-0 flex h-full flex-col rounded-xs border p-2 shadow-md">
		<!-- Header with language selector and rating -->
		<header class="bg-sepia-brown -mx-2 -mt-2 mb-2 flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				{@render LanguageSelector(
					availableLanguages,
					selectedLanguageOption,
					handleLanguageChange,
					'desktop'
				)}
				{#if film.rating}
					{@render RatingBadge(film.rating)}
				{/if}
			</div>

			{#if film.imdbRating && film.imdbId}
				{@render IMDbButton(film.imdbId, film.imdbRating, 'desktop')}
			{/if}
		</header>

		{#if film.imdbOverview}
			<!-- Content section -->
			<div class="ignore-safe-mode flex flex-col p-2">
				<!-- Synopsis with compact metadata -->
				<div class="flex-1">
					<p class="font-atkinson mb-2 max-w-[60ch] text-sm leading-snug text-gray-800">
						{film.imdbOverview}
					</p>

					<!-- Compact metadata inline -->
					<div class="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-700">
						<div class="flex flex-wrap gap-3">
							{#if film.imdbDirectors}
								<span class="flex items-center gap-1">
									<span class="font-medium text-gray-700">Dir:</span>
									{film.imdbDirectors.split('|').slice(0, 1).join('')}
								</span>
							{/if}
							{#if film.imdbActors}
								<span class="flex items-center gap-1">
									<span class="font-medium text-gray-700">Cast:</span>
									{film.imdbActors.split('|').slice(0, 2).join(', ')}
								</span>
							{/if}
						</div>
						{@render DataAccuracyDialog()}
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="mb-3 flex flex-col items-center justify-center text-center">
				<div
					class="bg-sepia-dark/30 my-2 flex items-center justify-center gap-2 rounded-xs p-1 px-3"
				>
					<Info class="text-sepia-brown size-5" />
					<h3 class="font-gothic text-sepia-brown text-lg font-medium">No IMDB Data</h3>
				</div>

				<p class="font-atkinson text-sm text-gray-800">
					Metadata could not be found, but modifications are listed below.
				</p>
			</div>
		{/if}
		<div class="mt-2 grid h-full grid-cols-12 gap-2">
			{#await coreDataPromise then}
				<div class="bg-sepia-light col-span-12 p-2">
					{@render ChartWithInfo(
						FilmDistribution,
						{ currentFilmDuration: totalModifiedDuration },
						'Total Modification Time',
						"A comparison of the film's total edit duration versus other movies in the database."
					)}
				</div>

				<div class="bg-sepia-light col-span-7 p-2">
					{#if currentFilm?.analysis}
						{@render ChartWithInfo(
							PeerComparisonChart,
							{
								analysis: currentFilm.analysis,
								title: currentFilm.name.replace(/^"|"$/g, ''),
								subtitle: 'Film Censorship Profile',
								rating: currentFilm.rating,
								genre: currentFilm.imdbGenres?.split('|')[0],
								language: currentFilm.language
							},
							'Film Censorship Profile',
							'A breakdown of edits by content type—like violence or profanity—measured against a baseline of comparable films (matched by genre, rating, or language).'
						)}
					{/if}
				</div>
				<div class="bg-sepia-light col-span-5 p-2">
					{@render ChartWithInfo(
						TreemapChart,
						{ actionTypesData: actionTypesData, primaryColorCount: 2 },
						'Breakdown of Censor Edits',
						'Each rectangle represents a type of censor action. Its size corresponds to how frequently that action was taken compared to the others.'
					)}
				</div>
			{/await}
		</div>
	</article>
{/snippet}

{#snippet ExternalLinks(film: Film, showOn = 'both')}
	{@const visibilityClass =
		showOn === 'mobile' ? 'block lg:hidden' : showOn === 'desktop' ? 'hidden lg:block' : ''}
	<nav class="external-links-nav {visibilityClass}">
		<h3
			class="font-atkinson text-sepia-brown mb-2 text-xs font-bold tracking-wide uppercase md:text-center"
		>
			Original documents
		</h3>
		<div class="flex gap-2">
			<Button
				class="w-full"
				variant="card"
				size="sm"
				onclick={() => window.open(generateExternalLinks(film).cbfcListing, '_blank')}
				aria-label="View CBFC official listing for this film"
				title="Open official CBFC listing page"
			>
				<FileText class="mr-2 h-4 w-4" aria-hidden="true" />
				CBFC Listing
			</Button>
			<Button
				class="w-full"
				variant="blue"
				size="sm"
				onclick={() => window.open(generateExternalLinks(film).eCinepramaan, '_blank')}
				aria-label="View detailed certification information on E-Cinepramaan"
				title="Open E-Cinepramaan page for detailed information"
			>
				<NotebookTabs class="mr-2 h-4 w-4" aria-hidden="true" />
				E-Cinepramaan
			</Button>
		</div>
	</nav>
{/snippet}

{#snippet CertificationDetails(film: Film)}
	<Accordion.Root
		type="multiple"
		value={isMobileAccordion.current ? [] : ['details']}
		class="mt-2 w-full md:mt-0  lg:mb-0"
	>
		<Accordion.Item value="details" class="border-none">
			<Accordion.Trigger
				class="border-sepia-dark visible rounded-xs border bg-white px-2 py-1 text-left text-sm font-medium hover:no-underline lg:hidden"
				aria-label="Toggle certificate details section"
				title="View certification information and external links"
			>
				Certificate Details
			</Accordion.Trigger>
			<Accordion.Content class="w-full">
				<article
					class="border-sepia-dark bg-sepia-light relative mx-auto flex h-fit w-full flex-col overflow-hidden rounded-xs border lg:mt-[15%] lg:max-w-sm"
				>
					<section class="flex w-full flex-col justify-between gap-2 p-2">
						{@render ExternalLinks(film, 'desktop')}

						<dl class="font-atkinson mt-2 grid grid-cols-[auto_1fr] gap-2 text-xs">
							<dt class="tracking-tight whitespace-nowrap text-gray-700">CERT NO:</dt>
							<dd class="text-sepia-brown/80 text-right font-medium">{film.cbfcFileNo}</dd>
							<dt class="tracking-tight whitespace-nowrap text-gray-700">CERTIFIED BY:</dt>
							<dd class="text-sepia-brown/80 text-right font-medium break-words">
								{film.certifier}
							</dd>
						</dl>

						<footer class="flex items-center justify-between gap-2">
							<div class="-mt-5 w-[60px] rotate-26 transition-transform duration-300">
								{@render Stamp('CBFC', film.cbfcFileNo)}
							</div>
							<div class="flex flex-col items-center">
								<DateStamp
									date={film.certDate}
									colorScheme="custom"
									seed={film.certNo}
									colors={['#4B5563', '#4B5563', '#1F2937']}
								/>
								<span
									class="font-atkinson min-w-[120px] border-t border-black/40 text-center text-xs font-medium text-amber-900"
								>
									Date of Certification
								</span>
							</div>
						</footer>
					</section>
				</article>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
{/snippet}

{#snippet ModificationsSection(
	film: Film,
	categoriesAvailability: Record<string, Record<string, boolean>>
)}
	{@const uniqueModifications = [
		...new Map(film.modifications.map((mod) => [mod.cutNo, mod])).values()
	]}
	<section class="relative overflow-hidden lg:col-span-4">
		<section class="mx-auto max-w-4xl">
			<div class="relative ml-7 flex items-center md:ml-0 md:justify-center">
				<h2
					class="rounded-tab font-gothic text-sepia-med relative z-10 text-center text-2xl font-medium uppercase"
				>
					<span>{uniqueModifications.length}</span>
					Modification{uniqueModifications.length > 1 ? 's' : ''}
				</h2>
				<div class="absolute top-1/2 right-0 z-20 -translate-y-1/2">
					<SafeMode id="sfw-mode-film" labelText="Safe mode" />
				</div>
			</div>
			<ModificationTable {film} />
		</section>
		<!-- Mobile certification details -->
		<section class="my-3 block lg:hidden">
			{@render CertificationDetails(currentFilm)}
		</section>
		<section
			class="border-sepia-dark bg-sepia-light text-sepia-brown mt-3 flex flex-col space-y-2 rounded-xs border p-3 shadow-md sm:p-2"
		>
			<h3
				class="border-sepia-dark/60 font-atkinson text-sepia-brown mb-2 border-b pb-2 text-left text-sm font-bold tracking-wide uppercase"
			>
				Browse more by...
			</h3>

			{@render ModificationCreditsGroup(
				film,
				categoriesAvailability,
				'aiActionTypes',
				'Action Types'
			)}

			{@render ModificationCreditsGroup(
				film,
				categoriesAvailability,
				'aiMediaElements',
				'Media Elements'
			)}
			{@render ModificationCreditsGroup(
				film,
				categoriesAvailability,
				'aiContentTypes',
				'Content Types'
			)}
			{@render ModificationCreditsGroup(film, categoriesAvailability, 'aiReferences', 'References')}
			<hr class="border-sepia-dark/60 mb-2" />

			{#if film?.imdbDirectors || film?.imdbActors}
				<FilmCreditsGroup
					{categoriesAvailability}
					credits={[
						...(film?.imdbDirectors
							? [
									{
										role: 'DIRECTOR',
										names: film.imdbDirectors.split('|'),
										categoryId: 'directors'
									}
								]
							: []),
						...(film?.imdbActors
							? [
									{
										role: 'Actors',
										names: film.imdbActors.split('|'),
										categoryId: 'actors'
									}
								]
							: [])
					]}
					roleTextContainerBgClass="bg-sepia-light"
				/>
			{/if}

			{#if film?.imdbGenres || film?.imdbCountries || film?.imdbStudios}
				<FilmCreditsGroup
					{categoriesAvailability}
					credits={[
						...(film?.imdbGenres
							? [
									{
										role: 'GENRES',
										names: film.imdbGenres.split('|'),
										categoryId: 'genres'
									}
								]
							: []),
						...(film?.imdbCountries
							? [
									{
										role: 'COUNTRIES',
										names: film.imdbCountries.split('|'),
										categoryId: 'countries'
									}
								]
							: []),
						...(film?.imdbStudios
							? [
									{
										role: 'STUDIOS',
										names: film.imdbStudios.split('|'),
										categoryId: 'studios'
									}
								]
							: [])
					]}
					roleTextContainerBgClass="bg-sepia-light"
				/>
			{/if}

			<FilmCreditsGroup
				{categoriesAvailability}
				credits={[
					{
						role: 'CERTIFIER',
						names: [film?.certifier ? film.certifier.split(',')[0] : ''],
						categoryId: 'certifiers'
					}
				]}
				roleTextContainerBgClass="bg-sepia-light"
			/>
		</section>
	</section>
{/snippet}

{#snippet Stamp(
	innerText: string = 'CBFC',
	outerText: string = '41BJSDKJFH4234',
	repeat: number = 4,
	dividerSymbol: string = '✷'
)}
	<svg class="stamp" viewBox="0 0 132 132" preserveAspectRatio="xMidYMid meet">
		<circle cx="66" cy="66" r="65" fill="none" stroke="black" stroke-width="2" />
		<circle cx="66" cy="66" r="48" fill="none" stroke="black" stroke-width="1" />
		<circle cx="66" cy="66" r="46" fill="none" stroke="black" stroke-width="1" />
		<defs>
			<path id="text-path" d="M66 126A60 60 0 1 0 66 6a60 60 0 0 0 0 120" fill="none" />
		</defs>
		<text
			dominant-baseline="middle"
			text-anchor="middle"
			x="50%"
			y="52%"
			font-family="var(--font-gothic)"
			font-size="36"
			font-weight="600"
			fill="black"
			class="middle"
			stroke="black"
			stroke-width="1">{innerText}</text
		>
		<text>
			<textPath
				xlink:href="#text-path"
				font-family="var(--font-gothic)"
				font-size="10"
				fill="black"
				letter-spacing="2"
			>
				{#each Array(repeat) as _}
					{outerText} {dividerSymbol}
				{/each}
			</textPath>
		</text>
	</svg>
{/snippet}

{#snippet MobileLayout(film: Film)}
	<section class="flex gap-2 lg:hidden">
		<!-- Poster -->
		<section class="w-[140px] flex-shrink-0 sm:w-[180px] md:w-[220px]">
			{@render FilmPoster(film, optimizedPosterUrl(), textColor)}
		</section>

		<!-- Metadata Grid -->
		<section class="flex flex-1 flex-col overflow-hidden rounded-xs bg-white shadow-xs">
			<!-- Header with Language and Rating -->
			<header class="bg-sepia-brown flex items-center justify-between px-2 py-2">
				<div class="flex min-w-0 flex-1 items-center">
					{@render LanguageSelector(
						availableLanguages(),
						selectedLanguageOption(),
						handleLanguageChange,
						'mobile'
					)}
				</div>
				{#if film.rating}
					<div class="ml-2">
						{@render RatingBadge(film.rating)}
					</div>
				{/if}
			</header>

			<!-- Content Grid -->
			<div class="flex flex-1 flex-col">
				{#if film.imdbOverview}
					<!-- IMDB Rating -->
					{#if film.imdbRating && film.imdbId}
						<div class="border-sepia-dark/20 border-b px-2 py-2">
							{@render IMDbButton(film.imdbId, film.imdbRating, 'desktop')}
						</div>
					{/if}

					<!-- Synopsis -->
					<div class="flex-1 px-3 py-2">
						<ScrollArea class="h-[140px] sm:h-[180px] md:h-[220px]">
							<p
								class="font-atkinson ignore-safe-mode text-xs leading-relaxed text-gray-800 sm:text-sm"
							>
								{film.imdbOverview}
							</p>
						</ScrollArea>
						<div class="mt-2 flex justify-start">
							{@render DataAccuracyDialog()}
						</div>
					</div>

					<!-- Credits Footer -->
					<footer class="bg-sepia-light/50 border-sepia-dark/20 border-t px-3 py-2">
						<div class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
							{#if film.imdbDirectors}
								<span class="text-right font-medium text-gray-800">Dir:</span>
								<span class="break-words text-gray-900"
									>{film.imdbDirectors.split('|').slice(0, 1).join('')}</span
								>
							{/if}
							{#if film.imdbActors}
								<span class="text-right font-medium text-gray-800">Cast:</span>
								<span class="break-words text-gray-900"
									>{film.imdbActors.split('|').slice(0, 2).join(', ')}</span
								>
							{/if}
						</div>
					</footer>
				{:else}
					<!-- Empty state with better spacing -->
					<div class="flex flex-1 items-center justify-center p-6">
						<div class="space-y-3 text-center">
							<div class="bg-sepia-med mx-auto w-fit rounded-full p-3">
								<Icon icon="mdi:information-outline" class="text-sepia-brown h-6 w-6" />
							</div>
							<div>
								<p class="font-atkinson text-sepia-brown text-sm font-medium">No IMDB data</p>
								<p class="font-atkinson mt-1 text-xs text-gray-800">See modifications below</p>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</section>

	<!-- Charts Section -->
	<section class="bg-sepia-med/80 rounded-xs lg:hidden">
		{#await coreDataPromise then}
			<div class="space-y-2">
				<div class="bg-sepia-light rounded-xs p-2">
					{@render ChartWithInfo(
						FilmDistribution,
						{ currentFilmDuration: totalModifiedDuration },
						'Total Modification Time',
						"A comparison of the film's total edit duration versus other movies in the database."
					)}
				</div>

				{#if currentFilm?.analysis}
					<div class="space-y-3">
						<div class="bg-sepia-light rounded-xs p-2">
							{@render ChartWithInfo(
								PeerComparisonChart,
								{
									analysis: currentFilm.analysis,
									title: currentFilm.name.replace(/^"|"$/g, ''),
									subtitle: 'Film Censorship Profile',
									rating: currentFilm.rating,
									genre: currentFilm.imdbGenres?.split('|')[0],
									language: currentFilm.language
								},
								'Film Censorship Profile',
								'A breakdown of edits by content type—like violence or profanity—measured against a baseline of comparable films (matched by genre, rating, or language).'
							)}
						</div>

						<div class="bg-sepia-light rounded-xs p-2">
							{@render ChartWithInfo(
								TreemapChart,
								{ actionTypesData: actionTypesData, primaryColorCount: 2 },
								'Breakdown of Censor Edits',
								'Each rectangle represents a type of censor action. Its size corresponds to how frequently that action was taken compared to the others.'
							)}
						</div>
					</div>
				{/if}
			</div>
		{/await}
		<div class="mt-3">
			{@render ExternalLinks(film, 'mobile')}
		</div>
	</section>
{/snippet}

{#if error}
	<main class="main-content min-h-screen w-full text-gray-900">
		<article class="relative mx-auto my-2 max-w-4xl p-4">
			<section
				class="border-sepia-dark bg-sepia-light flex flex-col items-center justify-center rounded-xs border p-8 text-center shadow-md"
			>
				<div class="bg-sepia-med mb-6 flex h-24 w-24 items-center justify-center rounded-xs">
					<FilmIcon class="text-sepia-brown" size={48} />
				</div>

				<h1 class="font-gothic text-sepia-brown mb-4 text-3xl font-medium uppercase">
					Film Not Found
				</h1>

				<p class="font-atkinson mb-8 max-w-md text-sm leading-relaxed text-gray-700">
					{error?.message ||
						"We couldn't locate this film in our CBFC records. It may have been moved or removed from our database."}
				</p>

				<div class="flex flex-col gap-3 sm:flex-row">
					<Button
						variant="card"
						onclick={() => goto('/search')}
						aria-label="Return to search page to find films"
						title="Go back to the search page"
						class="bg-sepia-brown hover:bg-sepia-dark text-white"
					>
						<ArrowLeft class="mr-2 h-4 w-4" aria-hidden="true" />
						Browse Films
					</Button>

					<Button
						variant="outline"
						onclick={() => goto('/')}
						aria-label="Return to homepage"
						title="Go to the homepage"
						class="border-sepia-dark text-sepia-brown hover:bg-sepia-med"
					>
						Home
					</Button>
				</div>
			</section>
		</article>
	</main>
{:else if !currentFilm}
	<FilmDetailSkeleton />
{:else}
	<main
		class="main-content min-h-screen w-full text-gray-900"
		style="--dominant-color: {dominantColor}; --text-color: {textColor};"
	>
		<article class="relative mx-auto my-2 max-w-4xl">
			<section class="layout-container flex flex-col gap-4">
				<!-- Top Section: Poster and Metadata -->
				<section class="grid grid-cols-1 gap-2 lg:grid-cols-6 lg:gap-2" style="min-height: 450px;">
					{@render MobileLayout(currentFilm)}

					<!-- Desktop layout -->
					<section class="hidden h-full max-w-[400px] lg:col-span-2 lg:block">
						{@render FilmPoster(currentFilm, optimizedPosterUrl(), textColor)}
					</section>

					<!-- Desktop metadata -->
					<section class="hidden h-full lg:col-span-4 lg:flex lg:flex-col lg:space-y-2">
						<section class="flex h-full flex-col space-y-2">
							{@render FilmDetailsDesktop(
								currentFilm,
								availableLanguages(),
								selectedLanguageOption(),
								handleLanguageChange
							)}
						</section>
					</section>
				</section>

				<section class="grid grid-cols-1 gap-2 lg:grid-cols-6">
					<!-- Certificate Details -->
					<aside class="hidden w-full lg:col-span-2 lg:block">
						<section class="block lg:sticky lg:top-0">
							{@render CertificationDetails(currentFilm)}
						</section>
					</aside>

					<!-- Modifications Table -->
					{@render ModificationsSection(currentFilm, categoriesAvailability)}
				</section>
			</section>
		</article>
	</main>
{/if}

<style>
	.card-title-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 0.5em 1em;
		text-shadow:
			var(--color-black) 0px 0px 0px,
			var(--color-black) 0.669131px 0.743145px 0px,
			var(--color-black) 1.33826px 1.48629px 0px;
		overflow: hidden;
	}

	.rounded-tab {
		--r: 6px;
		line-height: 1.8;
		padding-inline: 1em;
		border-inline: var(--r) solid #0000;
		border-radius: calc(2 * var(--r)) calc(2 * var(--r)) 0 0 / var(--r);
		mask:
			radial-gradient(var(--r) at var(--r) 0, #0000 98%, #000 101%) calc(-1 * var(--r)) 100%/100%
				var(--r) repeat-x,
			conic-gradient(#000 0 0) padding-box;
		background: var(--color-sepia-brown) border-box;
		width: fit-content;
		padding: 0em 1em;
		z-index: 2;
		text-transform: uppercase;
		text-align: center;
	}

	.stamp {
		height: 100%;
		width: auto;
		max-height: 100%;
		max-width: 100%;
		text-shadow: none;
		opacity: 0.7;
		/* transform: rotate(-6deg); */
		margin: 0.2em 0 0 0.2em;
	}

	.stamp .middle {
		background-image: linear-gradient(30deg, #ccc, #999, #444, #999, #bbb, #777, transparent 90%);
		text-shadow: 0.07em 0 0 black(0.3);
	}
</style>
