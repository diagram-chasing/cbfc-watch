<script lang="ts">
	import * as Pagination from '$lib/components/ui/pagination';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();

	// Grouping Logic
	let groupedFilms = $derived(data.films ? groupFilmsByMonth(data.films) : {});

	function groupFilmsByMonth(films: any[]) {
		const groups: Record<string, any[]> = {};
		films.forEach((film) => {
			if (!film.cert_date) return;
			const date = new Date(film.cert_date);
			const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
			if (!groups[key]) groups[key] = [];
			groups[key].push(film);
		});
		return groups;
	}

	// Preserve Month Order (keys might be scrambled)
	let sortedGroupKeys = $derived(
		Object.keys(groupedFilms).sort((a, b) => {
			return new Date(b).getTime() - new Date(a).getTime();
		})
	);

	function handlePageChange(newPage: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', newPage.toString());
		goto(url.toString());
	}
</script>

<div class="mx-auto w-full max-w-4xl">
	<!-- Header Section -->
	<div class="mb-6">
		<h1 class="font-gothic text-sepia-brown mb-3 text-6xl font-bold tracking-tight">
			Archival Log
		</h1>
		<p class="text-sepia-brown/70 text-lg font-medium">Changelog of movies added to the database</p>
	</div>

	{#if data.error}
		<div class="border-sepia-dark rounded-xs border bg-red-50 p-4 shadow-xs">
			<p class="font-atkinson text-sm text-red-800">{data.error}</p>
		</div>
	{:else if data.films.length === 0}
		<div class="bg-sepia-light border-sepia-dark rounded-xs border py-12 text-center shadow-xs">
			<p class="font-atkinson text-sepia-brown">No records found.</p>
		</div>
	{:else}
		<div class="space-y-10">
			{#each sortedGroupKeys as month}
				<section>
					<!-- Month heading with better visual hierarchy -->
					<h2
						class="font-gothic border-sepia-dark/80 text-sepia-brown mb-4 border-b pb-2 text-4xl font-semibold tracking-tight"
					>
						{month}
					</h2>

					<!-- Film list with improved spacing and hierarchy -->
					<ul class="space-y-5">
						{#each groupedFilms[month] as film}
							<li class="transition-colors">
								<a href="/film/{film.slug}" class="group block transition-colors">
									<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
										<span
											class="font-atkinson text-sepia-brown group-hover:text-sepia-dark text-base font-semibold transition-colors"
										>
											{film.name}
										</span>
										<span class="font-atkinson text-sm text-gray-500">({film.year})</span>
									</div>
									<div
										class="font-atkinson mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-600"
									>
										<span class="font-medium">{film.language}</span>
										{#if film.cert_date}
											<span class="flex items-center gap-1">
												<span class="text-gray-400">• </span>
												<span class="text-gray-500">
													{new Date(film.cert_date).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														year: 'numeric'
													})}
												</span>
											</span>
										{/if}
									</div>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.pagination && data.pagination.totalPages > 1}
			<div class="mt-8 flex justify-center">
				<Pagination.Root
					count={data.totalCount}
					perPage={data.pagination.perPage}
					page={data.pagination.currentPage}
					onPageChange={handlePageChange}
				>
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton size="compact" variant="secondary" />
						</Pagination.Item>

						{#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as pageNum}
							{#if pageNum === 1 || pageNum === data.pagination.totalPages || (pageNum >= data.pagination.currentPage - 2 && pageNum <= data.pagination.currentPage + 2)}
								<Pagination.Item>
									<Pagination.Link
										page={{ value: pageNum, type: 'page' }}
										isActive={pageNum === data.pagination.currentPage}
										inactiveVariant="secondary"
									>
										{pageNum}
									</Pagination.Link>
								</Pagination.Item>
							{:else if (pageNum === data.pagination.currentPage - 3 && data.pagination.currentPage > 4) || (pageNum === data.pagination.currentPage + 3 && data.pagination.currentPage < data.pagination.totalPages - 3)}
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
