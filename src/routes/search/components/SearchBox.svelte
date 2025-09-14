<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { parseQuery, type ParsedQuery } from '../simple-parser';
	import { SEARCH_EXAMPLES, FIELD_ALIASES } from '../search-fields';
	import { X, Search, Info, ArrowRight } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		placeholder?: string;
		value?: string;
		className?: string;
		onsearch?: (event: { query: string; parsedQuery: ParsedQuery }) => void;
		onchange?: (event: { value: string }) => void;
		onclear?: () => void;
	}

	let {
		placeholder = 'Search films by title, content, genre, director, actors...',
		value = '',
		className = '',
		onsearch,
		onchange,
		onclear
	}: Props = $props();

	let inputValue = $state(value);
	let parsedQuery = $state<ParsedQuery | null>(null);
	let showHelp = $state(false);
	let showSuggestions = $state(false);
	let suggestions = $state<Array<{ query: string; field: string; example: string }>>([]);
	let selectedSuggestionIndex = $state(-1);

	$effect(() => {
		inputValue = value;
	});

	$effect(() => {
		if (inputValue.trim()) {
			try {
				parsedQuery = parseQuery(inputValue);
				updateSuggestions();
			} catch (error) {
				console.warn('Failed to parse query, treating as text search:', error);
				parsedQuery = { textQuery: inputValue, fieldQueries: [], hasFieldTargeting: false };
				suggestions = [];
				showSuggestions = false;
			}
		} else {
			parsedQuery = null;
			suggestions = [];
			showSuggestions = false;
		}
	});

	// Field examples for better UX
	const FIELD_EXAMPLES: Record<string, string> = {
		director: '"sanjay leela bhansali"',
		directors: '"christopher nolan"',
		actor: '"shah rukh khan"',
		actors: '"deepika padukone"',
		cast: '"aamir khan"',
		genre: 'thriller',
		genres: 'action',
		language: 'hindi',
		lang: 'tamil',
		year: '>2020',
		date: '2023',
		rating: 'U',
		cert: 'A',
		country: 'india',
		countries: '"united states"',
		imdb: '>8.0',
		score: '<7.5',
		mods: '>5',
		modifications: '0',
		cuts: '>10',
		action: '"cut"',
		actions: '"delete"',
		censor: '"modified"',
		content: 'violence',
		tag: 'adult',
		popularity: '>0.5',
		popular: '>0.8',
		clicks: '>100',
		poster: 'true',
		name: '"3 idiots"',
		title: '"dangal"',
		film: '"lagaan"',
		movie: '"taare zameen par"'
	};

	function updateSuggestions() {
		try {
			const lastWord = inputValue.split(' ').pop() || '';

			// Show field suggestions when typing a potential field name
			if (lastWord.length > 1 && !lastWord.includes(':')) {
				const matchingFields = Object.keys(FIELD_ALIASES)
					.filter((field) => field.startsWith(lastWord.toLowerCase()))
					.slice(0, 5);

				if (matchingFields.length > 0) {
					suggestions = matchingFields.map((field) => ({
						query: inputValue.replace(lastWord, `${field}:`),
						field,
						example: FIELD_EXAMPLES[field] || 'value'
					}));
					showSuggestions = true;
					selectedSuggestionIndex = -1;
					return;
				}
			}

			suggestions = [];
			showSuggestions = false;
			selectedSuggestionIndex = -1;
		} catch (error) {
			console.warn('Failed to update suggestions:', error);
			suggestions = [];
			showSuggestions = false;
			selectedSuggestionIndex = -1;
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		onchange?.({ value: inputValue });
	}

	function handleSearch() {
		try {
			if (parsedQuery) {
				onsearch?.({ query: inputValue, parsedQuery });
			} else if (inputValue.trim()) {
				// Fallback for text-only queries
				onsearch?.({
					query: inputValue,
					parsedQuery: { textQuery: inputValue, fieldQueries: [], hasFieldTargeting: false }
				});
			}
		} catch (error) {
			console.warn('Search failed, falling back to text search:', error);
			// Always provide a fallback text search
			if (inputValue.trim()) {
				onsearch?.({
					query: inputValue,
					parsedQuery: { textQuery: inputValue, fieldQueries: [], hasFieldTargeting: false }
				});
			}
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (showSuggestions && selectedSuggestionIndex >= 0) {
				// Use selected suggestion
				inputValue = suggestions[selectedSuggestionIndex].query;
				onchange?.({ value: inputValue });
				showSuggestions = false;
				selectedSuggestionIndex = -1;
			} else {
				showSuggestions = false;
				handleSearch();
			}
		} else if (event.key === 'Escape') {
			showSuggestions = false;
			showHelp = false;
			selectedSuggestionIndex = -1;
		} else if (event.key === 'ArrowDown' && showSuggestions) {
			event.preventDefault();
			selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
		} else if (event.key === 'ArrowUp' && showSuggestions) {
			event.preventDefault();
			selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
		} else if (event.key === 'Tab' && suggestions.length > 0) {
			event.preventDefault();
			const index = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
			inputValue = suggestions[index].query;
			onchange?.({ value: inputValue });
			showSuggestions = false;
			selectedSuggestionIndex = -1;
		}
	}

	function removePill(index: number) {
		if (!parsedQuery) return;

		const fieldQuery = parsedQuery.fieldQueries[index];
		if (fieldQuery) {
			inputValue = inputValue.replace(fieldQuery.raw, '').trim();
			onchange?.({ value: inputValue });
		}
	}

	function useExample(example: string) {
		try {
			inputValue = example;
			onchange?.({ value: inputValue });
			showHelp = false;
			// Parse the example query before searching
			const parsedQuery = parseQuery(inputValue);
			onsearch?.({ query: inputValue, parsedQuery });
		} catch (error) {
			console.warn('Failed to use example, falling back to text search:', error);
			inputValue = example;
			onchange?.({ value: inputValue });
			showHelp = false;
			// Fallback to text search
			onsearch?.({
				query: inputValue,
				parsedQuery: { textQuery: inputValue, fieldQueries: [], hasFieldTargeting: false }
			});
		}
	}

	function useSuggestion(suggestion: { query: string; field: string; example: string }) {
		inputValue = suggestion.query;
		onchange?.({ value: inputValue });
		showSuggestions = false;
		selectedSuggestionIndex = -1;
	}
</script>

<div class={cn('relative w-full', className)}>
	<!-- Field Query Pills -->

	<!-- Search Input -->
	<div class="relative">
		<label for="search-input" class="sr-only">Search films</label>
		<div
			class="border-sepia-dark bg-sepia-light focus-within:border-blue focus-within:ring-blue flex items-center rounded border shadow-xs focus-within:ring-2"
		>
			<Search class="ml-3 hidden h-4 w-4 shrink-0 opacity-50 md:block" />
			<input
				id="search-input"
				type="text"
				{placeholder}
				bind:value={inputValue}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onfocus={() => {
					if (suggestions.length > 0) showSuggestions = true;
				}}
				onblur={() => {
					setTimeout(() => (showSuggestions = false), 150);
					setTimeout(() => (showHelp = false), 150);
				}}
				class="flex h-11 w-full rounded bg-transparent px-3 py-3 text-sm outline-hidden placeholder:text-gray-600 md:text-lg"
			/>

			<!-- Clear Button -->
			{#if inputValue.trim()}
				<Button
					variant="ghost"
					size="sm"
					class="bg-red/10 hover:bg-red/50 hover:border-red/80 border-red/40 text-red mr-1 size-9 rounded-sm border px-4 hover:text-white"
					onclick={() => {
						inputValue = '';
						onchange?.({ value: '' });
						parsedQuery = null;
						onclear?.();
					}}
					title="Clear search and all filters"
					aria-label="Clear search and all filters"
				>
					<X class="size-3" />
					<span class="sr-only">Clear search</span>
				</Button>
			{/if}

			<!-- Help Button -->
			<Button
				variant="ghost"
				size="sm"
				class="bg-sepia-med mr-1 size-9 rounded-sm  border-black px-4 hover:border "
				onclick={() => {
					showHelp = !showHelp;
					showSuggestions = false;
				}}
				aria-label="Show search help and examples"
				title="Show search help and examples"
			>
				<Info class="size-3" />
				<span class="sr-only">Search help</span>
			</Button>
		</div>
		{#if parsedQuery?.fieldQueries.length}
			<div class="my-2 flex flex-wrap items-center gap-1">
				{#each parsedQuery.fieldQueries as fieldQuery, index}
					<Badge
						variant="secondary"
						class="bg-sepia border-sepia-dark flex items-center gap-1 border pr-1 text-black"
					>
						<span class="text-xs font-medium">
							{fieldQuery.field}:{fieldQuery.operator === 'CONTAINS'
								? `${fieldQuery.value}*`
								: `${fieldQuery.operator === '=' ? '' : fieldQuery.operator}${fieldQuery.value}`}
						</span>
						<Button
							variant="ghost"
							size="sm"
							class="hover:bg-red h-4 w-4 rounded-full p-0 hover:text-white"
							onclick={() => removePill(index)}
							title="Remove filter"
							aria-label="Remove {fieldQuery.field} filter"
						>
							<X class="h-2.5 w-2.5" />
							<span class="sr-only">Remove filter</span>
						</Button>
					</Badge>
				{/each}
			</div>
		{/if}

		<!-- Suggestions Dropdown -->
		{#if showSuggestions && suggestions.length > 0}
			<div
				in:slide
				out:slide
				class="border-sepia-dark bg-sepia-light absolute top-full z-50 mt-1 w-full rounded border shadow-lg"
			>
				<div class="p-1">
					<div class="border-sepia-dark mb-1 border-b px-2 py-1 text-xs text-gray-600">
						Use ↑↓ arrows, Tab or Enter to select
					</div>
					{#each suggestions as suggestion, index}
						<button
							class="flex w-full items-start justify-between rounded px-2 py-1.5 text-left text-sm {index ===
							selectedSuggestionIndex
								? 'bg-blue text-white'
								: 'hover:bg-sepia'}"
							onclick={() => useSuggestion(suggestion)}
						>
							<div class="flex-1">
								<div class="flex items-center gap-1">
									<code
										class="text-xs font-medium {index === selectedSuggestionIndex
											? 'text-white'
											: 'text-blue'}">{suggestion.field}:</code
									>
									<code
										class="text-xs {index === selectedSuggestionIndex
											? 'text-blue-100'
											: 'text-gray-500'}">{suggestion.example}</code
									>
								</div>
							</div>
							<ArrowRight
								class="h-3 w-3 shrink-0 {index === selectedSuggestionIndex
									? 'text-white'
									: 'text-gray-500'}"
							/>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Help Panel -->
	{#if showHelp}
		<div
			in:slide
			out:slide
			class="border-sepia-dark bg-sepia-light mt-2 rounded border p-3 text-xs"
		>
			<div class="mb-3 font-medium text-black">Search Examples:</div>
			<div class="grid grid-cols-1 gap-1 md:grid-cols-2 md:gap-x-4 md:gap-y-1">
				{#each SEARCH_EXAMPLES as example}
					<button
						class="hover:bg-sepia-med block w-full rounded p-1 text-left transition-colors hover:cursor-pointer"
						onclick={() => useExample(example.query)}
					>
						<code class="text-blue">{example.query}</code>
						<span class="ml-2 text-gray-700">{example.description}</span>
					</button>
				{/each}
			</div>
			<div class="border-sepia-dark mt-2 border-t pt-2 text-gray-700">
				Use <code class="text-blue">*</code> for wildcards, <code class="text-blue">&gt; &lt;</code>
				for numbers, <code class="text-blue">"search term"</code> for exact phrases, and
				<code class="text-blue">-</code> to exclude terms
			</div>
		</div>
	{/if}
</div>
