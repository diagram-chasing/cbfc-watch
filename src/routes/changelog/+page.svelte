<script lang="ts">
	import { Calendar, ChevronRight } from 'lucide-svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationNextButton as PaginationNext,
		PaginationPrevButton as PaginationPrevious,
		PaginationEllipsis
	} from '$lib/components/ui/pagination';

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
</script>

<div class="mx-auto w-full max-w-4xl">
	<!-- Header Section -->
	<div class="grain-effect mb-6">
		<div class="space-y-3 py-6">
			<h1
				class="font-gothic flex items-center gap-3 text-4xl font-bold tracking-tight text-black md:text-5xl"
			>
				<Calendar class="h-8 w-8 md:h-10 md:w-10" />
				Certification Log
			</h1>
			<p class="font-atkinson text-base leading-relaxed text-gray-700 md:text-lg">
				Complete chronological history of CBFC certifications
			</p>
		</div>
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
		<div class="space-y-8">
			{#each sortedGroupKeys as month}
				<section>
					<!-- Simple month heading -->
					<h2 class="font-gothic mb-3 text-2xl font-medium tracking-tight text-black">
						{month}
					</h2>

					<!-- Simple list of films -->
					<ul class="space-y-2 pl-4">
						{#each groupedFilms[month] as film}
							<li class="font-atkinson text-sm leading-relaxed">
								<a
									href="/film/{film.slug}"
									class="text-sepia-brown inline transition-colors hover:text-black"
								>
									<span class="font-medium">{film.name}</span>
									<span class="text-gray-500"> ({film.year})</span>
								</a>
								<span class="text-gray-500"> · </span>
								<span class="text-gray-600">{film.language}</span>
								{#if film.rating}
									<span class="text-gray-500"> · </span>
									<span class="text-gray-600">{film.rating}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.page > 1 || data.hasNext}
			<div class="border-sepia-dark mt-8 flex items-center justify-between border-t pt-6">
				{#if data.page > 1}
					<Button href="/changelog?page={data.page - 1}" variant="secondary" size="sm">
						← Previous
					</Button>
				{:else}
					<div></div>
				{/if}

				<span class="font-atkinson text-sepia-brown text-sm font-medium">Page {data.page}</span>

				{#if data.hasNext}
					<Button href="/changelog?page={data.page + 1}" variant="secondary" size="sm">
						Next →
					</Button>
				{:else}
					<div></div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
