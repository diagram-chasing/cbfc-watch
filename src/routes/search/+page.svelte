<script>
	import { onMount } from 'svelte';
	import { createTypesenseAdapter } from '$lib/typesense';
	import Card from '$lib/components/Card.svelte';
	import SimpleSearchBox from './components/SearchBox.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import instantsearch from 'instantsearch.js';
	import { hits, pagination } from 'instantsearch.js/es/widgets';
	import { MediaQuery } from 'svelte/reactivity';
	import { browser } from '$app/environment';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import Filter from 'lucide-svelte/icons/filter';
	import X from 'lucide-svelte/icons/x';
	import { createSearchWidgets, FILTER_CONFIGS } from './widgets.js';
	import { parseQuery } from './simple-parser';
	import { getTypesenseField } from './search-fields';

	const isMobile = new MediaQuery('(max-width: 768px)');

	let search = null;
	let searchBoxValue = $state('');
	let showMobileFilters = $state(false);
	let isInitializing = $state(true);
	let searchResults = $state([]);
	let isLoading = $state(false);

	function handleSearch(event) {
		if (!search) return;

		const { parsedQuery } = event;
		search.helper.clearRefinements();

		const arrayFields = [
			'imdb_actors',
			'imdb_directors',
			'imdb_genres',
			'imdb_countries',
			'language',
			'rating',
			'ai_actions',
			'ai_content_types'
		];

		const numericFields = [
			'modification_count',
			'imdb_rating',
			'imdb_votes',
			'year',
			'popularity_score',
			'click_count',
			'cert_date_timestamp',
			'imdb_release_date'
		];

		const filterQueries = [];

		parsedQuery.fieldQueries?.forEach((fq) => {
			const field = getTypesenseField(fq.field);

			if (arrayFields.includes(field) || numericFields.includes(field)) {
				// Use filters for array fields and numeric fields
				// Typesense expects format like "field:>value" or "field:value"
				const operator = fq.operator === '=' ? ':' : `:${fq.operator}`;
				filterQueries.push(`${field}${operator}${fq.value}`);
			} else {
				// Use facet refinements for simple string fields
				search.helper.addFacetRefinement(field, String(fq.value));
			}
		});

		if (filterQueries.length > 0) {
			search.helper.setQueryParameter('filters', filterQueries.join(' && '));
		}

		const textQuery = parsedQuery.textQuery || (parsedQuery.hasFieldTargeting ? '*' : '');
		search.helper.setQuery(textQuery).search();

		if (!isInitializing) {
			updateURL(event.query, 1);
		}
	}

	function handleSearchChange(event) {
		searchBoxValue = event.value;
	}

	function handleClearAll() {
		if (!search) return;
		search.helper.clearRefinements().setQuery('').setQueryParameter('filters', '').search();
		searchBoxValue = '';
		updateURL('', 1);
	}

	function updateURL(query = searchBoxValue, pageNum = 1) {
		if (!browser) return;
		const url = new URL(window.location.href);
		if (query.trim()) url.searchParams.set('q', query);
		else url.searchParams.delete('q');
		if (pageNum > 1) url.searchParams.set('page', pageNum.toString());
		else url.searchParams.delete('page');
		window.history.replaceState({}, '', url.toString());
	}

	const searchMatchFields = [
		{
			field: 'modification_descriptions',
			displayName: 'modifications',
			snippetField: 'modification_descriptions'
		},
		{
			field: 'imdb_overview',
			displayName: 'overview',
			snippetField: 'imdb_overview'
		},
		{
			field: 'ai_cleaned_descriptions',
			displayName: 'content tags',
			snippetField: 'ai_cleaned_descriptions'
		}
	];

	// Helper function to determine search match from highlights
	function determineSearchMatch(hit, highlights) {
		for (const config of searchMatchFields) {
			if (highlights[config.field]?.matchedWords?.length > 0) {
				return {
					variant: 'search',
					searchMatch: {
						field: config.displayName,
						snippet: hit._snippetResult?.[config.snippetField]?.value || hit[config.snippetField]
					}
				};
			}
		}

		return {
			variant: 'list',
			searchMatch: null
		};
	}

	function transformSearchHit(hit) {
		const highlights = hit._highlightResult || {};
		const { variant, searchMatch } = determineSearchMatch(hit, highlights);

		return {
			film: {
				id: hit.id,
				slug: hit.slug,
				name: hit.name,
				year: hit.year,
				languages: Array.isArray(hit.language) ? hit.language : [hit.language],
				posterUrl: hit.poster_url || ''
			},
			variant,
			href: `/film/${hit.slug}`,
			searchMatch
		};
	}

	onMount(() => {
		// Initialize search
		const adapter = createTypesenseAdapter();
		search = instantsearch({
			indexName: 'films',
			searchClient: adapter.searchClient
		});

		// Create widgets
		const widgets = [
			...createSearchWidgets(),
			hits({
				container: '#search-hits',
				templates: {
					item: () => '',
					empty: () => ''
				}
			}),
			pagination({
				container: '#pagination',
				showFirst: true,
				showLast: true,
				showPrevious: true,
				showNext: true,
				padding: 1,
				cssClasses: {
					list: 'flex items-center gap-0.5 text-[10px]',
					item: 'flex h-5 w-auto  text-[10px] items-center justify-center rounded  border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
					selectedItem: 'bg-blue-50 border-blue-300 text-blue-700',
					disabledItem: 'opacity-50 cursor-not-allowed',
					firstPageItem:
						'flex h-5 w-auto items-center justify-center  border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
					lastPageItem:
						'flex h-5 w-auto items-center justify-center  border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
					previousPageItem:
						'flex h-5 w-auto items-center justify-center  border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
					nextPageItem:
						'flex h-5 w-auto items-center justify-center  border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
				}
			})
		];

		// Add custom hits rendering with loading state
		widgets.push({
			$$type: 'ais.hits',
			init() {
				isLoading = false;
			},
			render({ results }) {
				// Set loading state based on search status
				isLoading = search?.status === 'loading' || search?.status === 'stalled';

				if (!results) {
					searchResults = [];
					return;
				}
				searchResults = (results.hits || []).map(transformSearchHit);
			}
		});

		search.addWidgets(widgets);

		// Track search status for loading states
		search.on('search', () => {
			isLoading = true;
		});

		search.on('result', () => {
			isLoading = false;
		});

		search.on('error', () => {
			isLoading = false;
		});

		search.start();

		// Handle URL restoration
		const urlParams = new URLSearchParams(window.location.search);
		const urlQuery = urlParams.get('q') || '';
		const urlPage = parseInt(urlParams.get('page') || '1', 10);

		if (urlQuery) searchBoxValue = urlQuery;

		if (urlQuery || urlPage > 1) {
			if (urlPage > 1) search.helper.setPage(urlPage - 1);
			if (urlQuery) {
				const parsedQuery = parseQuery(urlQuery);
				handleSearch({ query: urlQuery, parsedQuery });
			}
		}

		isInitializing = false;

		// Handle example search terms
		function handleExampleSearch(term) {
			if (search?.helper) {
				search.helper.clearRefinements().setQuery(term).search();
				searchBoxValue = term;
			}
		}

		document.querySelectorAll('.example-search-term').forEach((button) => {
			button.addEventListener('click', (e) => {
				const term = e.target?.textContent;
				if (term) handleExampleSearch(term);
			});
		});
	});
</script>

<SEO
	title="Search Films"
	description="Search and filter through thousands of CBFC censorship records. Find films by name, director, genre, rating, modifications, and more."
	contentType="search"
	keywords="CBFC search, film database, movie censorship search, filter films, CBFC records"
/>

<!-- Header Section -->
<div>
	<div class="mx-auto">
		<div class="flex items-center justify-between">
			<div class="w-full text-center">
				<h1 class="font-gothic text-center text-4xl font-bold tracking-tight sm:text-6xl">
					Film Search
				</h1>
				<p class="mt-1 text-sm sm:text-base">
					Search our archive across movies, actors, directors for movies released between 2017-2025
				</p>
			</div>
		</div>
	</div>
</div>

<!-- Search Container -->
<div class="mx-auto mt-2 md:mt-6">
	<!-- Search Box -->
	<div class="mb-2">
		<SimpleSearchBox
			placeholder="Search films by title, content, genre, director, actors..."
			value={searchBoxValue}
			onsearch={handleSearch}
			onchange={handleSearchChange}
			onclear={handleClearAll}
		/>
	</div>

	<!-- Results Section -->
	<div id="results-section">
		<!-- Stats and Sort Row -->
		<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			{#if !isMobile.current}
				<div id="stats" class="hidden text-xs md:block md:text-sm">
					<!-- Initial skeleton that gets replaced by InstantSearch -->
					<Skeleton class="h-4 w-36 rounded-xs" />
				</div>
			{/if}
			<div class="flex items-center justify-between gap-2 sm:gap-3">
				<button
					class="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:hidden"
					onclick={() => (showMobileFilters = !showMobileFilters)}
				>
					{#if showMobileFilters}<X class="h-3 w-3" />{:else}<Filter class="h-3 w-3" />{/if}
				</button>
				<div class="flex flex-row-reverse items-center gap-3">
					<div id="pagination" class="text-xs">
						<!-- Initial skeleton that gets replaced by InstantSearch -->
						<div class="flex items-center gap-1.5">
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
							<Skeleton class="size-4 rounded-xs" />
						</div>
					</div>
					<div id="sort-by">
						<!-- Initial skeleton that gets replaced by InstantSearch -->
						<Skeleton class="h-4 w-20 rounded-xs" />
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile Filters -->
		<div
			class="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:hidden {showMobileFilters
				? 'block'
				: 'hidden'}"
		>
			<Accordion value={FILTER_CONFIGS.map((c) => c.id)} type="multiple">
				{#each FILTER_CONFIGS as config}
					<AccordionItem value={config.id} class="border-b-0">
						<AccordionTrigger
							class="py-2 text-xs font-medium tracking-wide text-gray-600 uppercase hover:no-underline"
						>
							{config.title}
						</AccordionTrigger>
						<AccordionContent class="pt-0 pb-2">
							<div id="{config.id}-mobile">
								<!-- Initial skeleton content that gets replaced by InstantSearch -->
								<div class="refinement-list-container max-h-24 space-y-1 overflow-y-auto">
									{#each Array(4) as _}
										<div class="flex items-center gap-1 px-1 py-0.5">
											<Skeleton class="h-2.5 w-2.5 rounded" />
											<Skeleton class="h-2.5 flex-1 rounded" />
											<Skeleton class="h-2.5 w-4 rounded" />
										</div>
									{/each}
								</div>
							</div>
						</AccordionContent>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>

		{#if isMobile.current}
			<div id="stats" class="-mt-3 mb-2 md:hidden md:text-sm">
				<!-- <Skeleton class="h-3 w-28 rounded" /> -->
			</div>
		{/if}

		<!-- Main Results Layout -->
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-4">
			<!-- Desktop Filters Sidebar -->
			<div class="hidden lg:col-span-1 lg:block">
				<div class=" overflow-y-auto">
					<div class="space-y-3">
						{#each FILTER_CONFIGS as config}
							<div class="border-sepia-dark bg-sepia-light rounded-xs border p-3 shadow-xs">
								<h4
									class="mb-3 border-b border-gray-200 pb-2 text-xs font-medium tracking-wide text-gray-600 uppercase"
								>
									{config.title}
								</h4>
								<div id={config.id}>
									<!-- Initial skeleton that gets replaced by InstantSearch -->
									<div class="refinement-list-container max-h-32 space-y-0.5 overflow-y-auto">
										{#each Array(config.limit || 6) as _}
											<div class="flex items-center gap-1.5 px-2 py-1">
												<Skeleton class="h-3 flex-1 rounded" />
												<Skeleton class="h-3 w-6 rounded" />
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Results Area -->
			<div class="lg:col-span-3">
				<div id="search-hits" class="hidden"></div>

				{#if isLoading}
					<div class="space-y-1">
						{#each Array(10) as _}
							<Card loading={true} variant="list" />
						{/each}
					</div>
				{:else if searchResults.length > 0}
					<div class="space-y-1">
						{#each searchResults as result (result.film.slug)}
							<Card
								film={result.film}
								variant={result.variant}
								href={result.href}
								searchMatch={result.searchMatch}
								loading={false}
							/>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="mb-4 text-6xl opacity-60">🎬</div>
						<h3 class="mb-2 text-lg font-medium text-gray-900">Search our film archive</h3>
						<p class="mb-6 max-w-md text-sm text-gray-600">
							Search through our comprehensive collection of films by title, content, genre,
							director, actors, and more.
						</p>
						<div class="flex flex-wrap justify-center gap-2">
							<button
								class="example-search-term rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
								>violence</button
							>
							<button
								class="example-search-term rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
								>horror</button
							>
							<button
								class="example-search-term rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
								>caste</button
							>
							<button
								class="example-search-term rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
								>politics</button
							>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	:global(.ais-Highlight-highlighted) {
		background-color: var(--color-yellow) !important;
		padding: 0.1em 0.2em;
		border-radius: 0.2em;
		font-weight: 600;
		color: #1f2937;
	}

	:global(.ais-Snippet-highlighted) {
		background-color: var(--color-yellow) !important;
		padding: 0.1em 0.2em;
		border-radius: 0.2em;
		font-weight: 600;
		color: #1f2937;
	}

	:global(.ais-Pagination-item) {
		margin: 0 0.125rem;
	}

	:global(.ais-Pagination-link) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 0.25rem;
		border: 1px solid #d1d5db;
		background-color: white;
		color: #374151;
		font-size: 0.75rem;
		line-height: 1rem;
		text-decoration: none;
	}

	:global(.ais-Pagination-link:hover) {
		background-color: #f9fafb;
	}

	:global(.ais-Pagination-item--selected .ais-Pagination-link) {
		background-color: #eff6ff;
		border-color: #93c5fd;
		color: #1e40af;
	}

	:global(.ais-Pagination-item--disabled .ais-Pagination-link) {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
