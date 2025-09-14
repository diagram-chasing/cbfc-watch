<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { Plot, AreaY, AxisX } from 'svelteplot';
	import {
		getCategoryFromUrlPath,
		getCategoryDisplayName,
		getCategoryDescription
	} from '../../categories';
	import SEO from '$lib/components/SEO.svelte';
	import type { Film } from '$lib/types';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data: PageData;

	$: ({ films, category, totalCount, displayName, timeseries, pagination } = data);
	$: categoryId = getCategoryFromUrlPath(category);
	$: categoryDisplayName = categoryId ? getCategoryDisplayName(categoryId) : category;
	$: categoryDescription = categoryId ? getCategoryDescription(categoryId) : '';

	$: timeseriesData = timeseries?.data || [];
	$: timeseriesResponse = timeseries;

	$: chartData = timeseriesData.map((d) => {
		let date: Date;

		// Parse date based on the period returned from API
		if (timeseriesResponse?.period === 'yearly') {
			date = new Date(parseInt(d.date), 0, 1);
		} else if (timeseriesResponse?.period === 'monthly') {
			date = new Date(d.date + '-01');
		} else if (timeseriesResponse?.period === 'weekly') {
			// For weekly format like "2023-W15", convert to approximate date
			const [year, week] = d.date.split('-W');
			const jan1 = new Date(parseInt(year), 0, 1);
			const days = (parseInt(week) - 1) * 7;
			date = new Date(jan1.getTime() + days * 24 * 60 * 60 * 1000);
		} else {
			// Fallback to yearly
			date = new Date(parseInt(d.date), 0, 1);
		}

		return {
			date,
			// Use rolling average if available, otherwise use count
			value: d.rollingAverage !== undefined ? d.rollingAverage : d.count
		};
	});

	function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
	}
</script>

<SEO
	title="{displayName} | {categoryDisplayName}"
	description="Browse {totalCount} films related to {displayName} in {categoryDisplayName}. {categoryDescription ||
		'View CBFC censorship records and modifications for these films.'}"
	keywords="CBFC {displayName}, {categoryDisplayName} films, movie censorship, film database, CBFC modifications"
/>

<div class="container mx-auto">
	<div class="mb-6">
		<div class="flex items-end justify-start gap-4">
			<h1 class="font-gothic text-sepia-brown text-6xl font-bold">
				{categoryDisplayName} / {displayName}
			</h1>
			<p class="text-sepia-brown/70 text-lg font-medium">
				{totalCount} film{totalCount !== 1 ? 's' : ''} found
			</p>
		</div>

		<!-- Timeseries Chart -->
		{#if chartData.length > 0}
			<Plot
				height={200}
				y={{
					label: 'Number of Films'
				}}
			>
				<AreaY
					data={chartData}
					x="date"
					y="value"
					fill="var(--color-sepia-dark)"
					fillOpacity={0.8}
					stroke="var(--color-sepia-brown)"
					strokeWidth={1}
				/>
				<AxisX />
			</Plot>
		{/if}
	</div>

	<div class="flex flex-col gap-4 lg:flex-row">
		<aside class="w-full space-y-4 lg:w-56">
			<!-- Category Information -->
			<div>
				<p class="text-sepia-brown/70 mb-4 text-sm font-medium">
					Showing all films under <strong>{categoryDisplayName}</strong>
					with <strong>{displayName}</strong>.
				</p>
				<hr class="border-sepia-brown/20 my-4" />
				<h3 class="font-atkinson text-sepia-brown mb-3 text-sm font-semibold">
					About this category
				</h3>
				{#if categoryDescription}
					<p class="text-sepia-brown/80 mb-4 text-sm leading-relaxed">
						{categoryDescription}
					</p>
				{/if}
			</div>

			<!-- Statistics -->
			<!-- {#if films.length > 0}
				<div>
					<div class="space-y-2 text-xs">
						{#if films.some((f: Film) => f.year)}
							{@const years = films.filter((f: Film) => f.year).map((f: Film) => f.year)}
							{@const earliestYear = Math.min(...years)}
							{@const latestYear = Math.max(...years)}
							<div class="flex justify-between">
								<span class="text-sepia-brown/60">Year range:</span>
								<span class="text-sepia-brown font-medium">
									{earliestYear === latestYear ? earliestYear : `${earliestYear} - ${latestYear}`}
								</span>
							</div>
						{/if}
						{#if films.some((f: Film) => f.language)}
							{@const languages = [
								...new Set(films.filter((f: Film) => f.language).map((f: Film) => f.language))
							]}
							<div class="flex justify-between">
								<span class="text-sepia-brown/60">Languages:</span>
								<span class="text-sepia-brown font-medium">{languages.length}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if} -->
		</aside>
		<!-- Main Content -->
		<div class="flex-1">
			{#if films.length === 0}
				<div class="py-12 text-center">
					<p class="text-sepia-brown/70 text-lg">No films found for this category.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-2">
					{#each films as film}
						<Card
							variant="list"
							href="/film/{film.slug}"
							title={film.name}
							year={film.year?.toString() || ''}
							posterUrl={film.poster_url || ''}
							languages={film.language ? [film.language] : []}
						/>
					{/each}
				</div>

				<!-- Pagination -->
				{#if pagination && pagination.totalPages > 1}
					<div class="mt-8 flex justify-center">
						<Pagination.Root
							count={totalCount}
							perPage={pagination.perPage}
							page={pagination.currentPage}
							onPageChange={handlePageChange}
						>
							<Pagination.Content>
								<Pagination.Item>
									<Pagination.PrevButton size="compact" variant="secondary" />
								</Pagination.Item>

								{#each Array.from({ length: pagination.totalPages }, (_, i) => i + 1) as pageNum}
									{#if pageNum === 1 || pageNum === pagination.totalPages || (pageNum >= pagination.currentPage - 2 && pageNum <= pagination.currentPage + 2)}
										<Pagination.Item>
											<Pagination.Link
												page={{ value: pageNum, type: 'page' }}
												isActive={pageNum === pagination.currentPage}
												inactiveVariant="secondary"
											>
												{pageNum}
											</Pagination.Link>
										</Pagination.Item>
									{:else if (pageNum === pagination.currentPage - 3 && pagination.currentPage > 4) || (pageNum === pagination.currentPage + 3 && pagination.currentPage < pagination.totalPages - 3)}
										<Pagination.Item>
											<Pagination.Ellipsis />
										</Pagination.Item>
									{/if}
								{/each}

								<Pagination.Item>
									<Pagination.NextButton size="compact" variant="secondary" />
								</Pagination.Item>
							</Pagination.Content>
						</Pagination.Root>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
