<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { formatNumber } from '$lib/utils/format';
	import Hero from '$lib/assets/hero.webp';
	import BarPlot from '$lib/components/charts/BarPlot.svelte';
	import Trends from '$lib/components/charts/Trends.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import CDRom from '$lib/assets/cd.webp';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationNextButton as PaginationNext,
		PaginationPrevButton as PaginationPrevious,
		PaginationEllipsis
	} from '$lib/components/ui/pagination';
	import MetadataPhoto from '$lib/assets/metadata.webp';
	import PoliticalPhoto from '$lib/assets/political.webp';
	import ProfanityPhoto from '$lib/assets/profanity.webp';
	import SexualPhoto from '$lib/assets/sexual.webp';
	import Substance from '$lib/assets/substance.webp';
	import ViolencePhoto from '$lib/assets/violence.webp';
	import { MediaQuery } from 'svelte/reactivity';
	import { ExternalLink, Shuffle } from 'lucide-svelte';
	let { data } = $props();
	import cutsByOfficeData from '$lib/data/charts/cuts_by_office.json';
	import CensoredFilms from '$lib/components/charts/CensoredFilms.svelte';
	let currentPage = $state(1);
	let isMobile = new MediaQuery('(max-width: 768px)');
	let itemsPerPage = $derived(isMobile.current ? 5 : 9);
	let siblingCount = $derived(isMobile.current ? 0 : 1);

	const allCounts = data.allCounts || { all: 0, modifications: 0 };

	const originalMovies = Array.isArray(data.currentMovies) ? [...data.currentMovies] : [];
	let currentMovies = $state(
		originalMovies.sort((a, b) => {
			const aHasPoster = !!a.posterUrl?.trim();
			const bHasPoster = !!b.posterUrl?.trim();

			// Primary sort: movies with posters first
			if (aHasPoster !== bHasPoster) {
				return aHasPoster ? -1 : 1;
			}

			// Secondary sort: by popularity score if available, otherwise by votes
			const aScore = a.popularityScore ?? a.bmsApiRatings?.totalVotes ?? -1;
			const bScore = b.popularityScore ?? b.bmsApiRatings?.totalVotes ?? -1;

			if (bScore !== aScore) {
				return bScore - aScore;
			}

			return 0;
		})
	);

	function shuffleMovies() {
		const shuffled = [...originalMovies];

		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		const subsetSize = Math.floor(Math.random() * 21) + 30;
		currentMovies = shuffled.slice(0, subsetSize);

		currentPage = 1;
	}

	let gridMovies = $derived(currentMovies.slice(0, isMobile.current ? 9 : 12));
	let remainingMovies = $derived(currentMovies.slice(isMobile.current ? 9 : 12));
	let totalPages = $derived(Math.ceil(remainingMovies.length / itemsPerPage));

	let startIndex = $derived((currentPage - 1) * itemsPerPage);
	let endIndex = $derived(Math.min(startIndex + itemsPerPage, remainingMovies.length));
	let paginatedMovies = $derived(remainingMovies.slice(startIndex, endIndex));
</script>

<SEO
	title="Home"
	description="Open-source database of CBFC censorship decisions, cuts, and modifications from 2017-2025. Browse {formatNumber(
		allCounts.all
	)} films and {formatNumber(allCounts.modifications)} censorship records."
	keywords="CBFC, film censorship, movie certification, India, cuts, modifications, database"
/>

<main class="ignore-safe-mode z-3 min-h-screen w-full px-0 text-gray-900">
	<div class=" mx-auto max-w-4xl">
		<section class="text-left" aria-label="Hero section">
			<div class="relative mx-auto max-w-6xl">
				<img
					src={Hero}
					alt="Hero background"
					class="absolute top-1/2 -right-16 -z-10 h-auto max-w-lg -translate-y-1/2 opacity-100 sm:-right-8 sm:max-w-xl md:right-0 md:max-w-2xl"
				/>

				<div class="grain-effect py-12 text-black">
					<div
						class="font-gothic bg-background relative z-2 flex w-full max-w-[140px] flex-col items-center justify-center space-y-2 border border-black px-3 py-2 tracking-tight md:w-full md:max-w-lg md:items-start md:justify-start md:border-none md:bg-transparent md:p-0"
					>
						<!-- Title -->
						<h1
							class="font-gothic text-red m-0 text-4xl font-bold tracking-tight text-nowrap uppercase drop-shadow-[0px_1px_0_rgba(0,0,0,0.8)] md:text-7xl md:drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
						>
							CBFC<br class="hidden md:block" /> Watch
						</h1>

						<p
							class=" font-atkinson m-0 max-w-full py-1 text-center text-xs leading-tight font-bold tracking-wide text-black uppercase md:w-1/3 md:max-w-sm md:text-left md:text-sm"
						>
							Archive of film censorship in India
						</p>

						<div class=" flex justify-center gap-3" role="group" aria-label="Statistics">
							<div
								class="text-center"
								aria-label="{formatNumber(allCounts.all, {
									compact: true,
									decimals: 1
								})} films in database"
							>
								<div class="text-2xl font-medium text-black uppercase md:text-4xl">
									{formatNumber(allCounts.all, { compact: true, decimals: 1 })}
								</div>
								<div class="font-atkinson mt-0.5 text-xs leading-tight font-medium uppercase">
									Films
								</div>
							</div>
							<div
								class="text-center"
								aria-label="{formatNumber(allCounts.modifications, {
									compact: true
								})} censorship records"
							>
								<div class="text-2xl font-medium text-black uppercase md:text-4xl">
									{formatNumber(allCounts.modifications, { compact: true })}
								</div>
								<div class="font-atkinson mt-0.5 text-xs leading-tight font-medium uppercase">
									Records
								</div>
							</div>
						</div>

						<div>
							<Button
								variant="default"
								class="px-3 py-2 text-sm md:px-4 md:py-3 md:text-base"
								onclick={() => goto('/search')}
								aria-label="Browse all {formatNumber(allCounts.all)} films in database"
							>
								Browse all films
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<div class="relative mx-auto mb-3 max-w-4xl">
			<div
				class="flex flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between md:text-base"
			>
				<p
					class="font-atkinson text-sm leading-relaxed text-pretty text-gray-800 md:w-2/3 md:max-w-md md:text-base"
				>
					An open-source database of available CBFC censorship decisions, cuts, and modifications
					from 2017-2025.
				</p>
			</div>
		</div>

		{#if currentMovies.length > 0}
			<section class="relative py-2" aria-label="Popular films">
				<div class="flex items-center justify-start gap-2">
					<h2 class="font-gothic mb-4 text-left text-4xl font-medium tracking-tight text-black">
						Popular Films
					</h2>
					<Button
						variant="secondary"
						size="compact"
						class="mb-4 h-8 w-8 text-gray-600 hover:bg-gray-100 hover:text-black"
						onclick={shuffleMovies}
						aria-label="Shuffle movies to show different selection"
					>
						<Shuffle class="h-4 w-4" />
					</Button>
				</div>

				{#if gridMovies.length > 0}
					<div
						class="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-6 md:gap-3"
						role="list"
						aria-label="Featured movies grid"
					>
						{#each gridMovies as movie (movie.posterUrl || movie.slug)}
							{#if movie?.name && movie?.slug}
								<Card
									film={movie}
									languages={movie.language}
									href={`/film/${movie.slug}`}
									variant="compact"
									onclick={(e) => {
										e.preventDefault();
										goto(`/film/${movie.slug}`);
									}}
								/>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Remaining movies as line items with pagination -->
				{#if remainingMovies.length > 0}
					<div class="overflow-hidden" aria-label="Additional movies with pagination">
						<div class="grid grid-cols-1 gap-2 md:grid-cols-3" role="list">
							{#each paginatedMovies as movie (movie.posterUrl || movie.slug)}
								{#if movie?.name && movie.slug}
									<Card
										film={movie}
										variant="list"
										onclick={(e) => {
											e.preventDefault();
											goto(`/film/${movie.slug}`);
										}}
										href={`/film/${movie.slug}`}
									/>
								{/if}
							{/each}
						</div>

						<footer class="flex items-center justify-between">
							{#if totalPages > 1}
								<nav class="border-t border-gray-100 py-3">
									<Pagination
										count={remainingMovies.length}
										perPage={itemsPerPage}
										{siblingCount}
										bind:page={currentPage}
									>
										{#snippet children({ pages, currentPage: paginationCurrentPage })}
											<PaginationContent>
												<PaginationItem>
													<PaginationPrevious size="compact" variant="secondary" />
												</PaginationItem>

												{#each pages as page (page.key)}
													{#if page.type === 'ellipsis'}
														<PaginationItem>
															<PaginationEllipsis />
														</PaginationItem>
													{:else}
														<PaginationItem>
															<PaginationLink
																{page}
																size="compact"
																isActive={paginationCurrentPage === page.value}
															>
																{page.value}
															</PaginationLink>
														</PaginationItem>
													{/if}
												{/each}

												<PaginationItem>
													<PaginationNext size="compact" variant="secondary" />
												</PaginationItem>
											</PaginationContent>
										{/snippet}
									</Pagination>
								</nav>
							{/if}
							<div class="flex items-center justify-center">
								<Button
									variant="default"
									class="mx-auto"
									size="compact"
									onclick={() => goto('/search')}
								>
									View all movies ({formatNumber(allCounts.all, { compact: true, decimals: 1 })})
								</Button>
							</div>
						</footer>
					</div>
				{/if}
			</section>
		{/if}

		<section class="mt-2">
			<h2
				id="trends-heading"
				class="font-gothic mb-4 text-left text-4xl font-medium tracking-tight text-black"
			>
				Trends and analysis
			</h2>
			<article class="border-sepia-dark ignore-safe-mode bg-sepia-light mb-4 border p-4 shadow-sm">
				<Trends
					subtitle="Film censorship varies most for religious and political content"
					title="CBFC modification rates show consistent patterns for violence, volatile trends for cultural topics"
					caption="Analysis of Central Board of Film Certification modification records, showing 3-month moving average of deviations from baseline censorship rates by content type. Baseline represents the overall average modification rate for each category from 2017-2025."
				/>
			</article>
			<article class=" grid grid-cols-1 gap-4 md:my-2 md:grid-cols-6">
				<div class="border-sepia-dark bg-sepia-light col-span-3 border p-4 shadow-sm">
					<BarPlot
						title=" Chennai and Thiruvananthpuram offices modify more in films than other regions"
						subtitle="The average amount of content modified varies by certifying office location."
						data={cutsByOfficeData}
						xLabel="Total minutes of content modified per movie (mean)"
						yLabel=""
						xTickFormat={(value: any) => {
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
						}}
					/>
				</div>
				<aside class="border-sepia-dark bg-sepia-light col-span-3 border p-4 shadow-sm">
					<CensoredFilms
						title="Heavily modified movies"
						subtitle="Top ten movies from each office by total duration of modifications (2017-2025)"
					/>
				</aside>
			</article>
		</section>

		<div class="mt-3 flex">
			<Button variant="default" class="ml-auto" onclick={() => goto('/stats')}>
				See more stats
			</Button>
		</div>

		<div class="mt-8 mb-8 space-y-4 md:mt-0">
			<h2 id="trends-heading" class="font-gothic text-4xl font-medium tracking-tight text-black">
				Browse modifications by topic
			</h2>
			<section
				class="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-5"
				aria-label="Content categories"
				role="group"
			>
				{#each [{ photo: ProfanityPhoto, label: 'Profanity' }, { photo: SexualPhoto, label: 'Sexual' }, { photo: Substance, label: 'Substance' }, { photo: PoliticalPhoto, label: 'Political' }, { photo: ViolencePhoto, label: 'Violence' }] as category, i (category.label)}
					<Button
						size="lg"
						variant="card"
						class="focus:ring-blue relative m-0 flex h-28 flex-col items-center justify-center gap-2 !p-2 focus:ring-2 focus:outline-none sm:h-28 md:h-24 lg:h-32
							{i === 4 ? ' col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto' : ''}"
						aria-label="View {category.label} content category"
						href="/search?q=content%3A{encodeURIComponent(
							category.label === 'Sexual' ? '"sexual_*"' : `"${category.label.toLowerCase()}"`
						)}"
					>
						<img
							src={category.photo}
							alt=""
							class="-mt-2 h-32 w-auto sm:-mt-3 sm:h-20 lg:-mt-4 lg:h-32"
						/>
						<span class="absolute bottom-2 text-xs font-medium sm:bottom-3 sm:text-sm lg:bottom-4"
							>{category.label}</span
						>
					</Button>
				{/each}
			</section>
		</div>
		<!-- Downloads and data -->
		<section
			class="border-sepia-brown/20 grid grid-cols-1 gap-6 border-t py-6 md:px-0 lg:grid-cols-12"
			aria-label="Data downloads and contributions"
		>
			<div class="flex items-center gap-4 space-y-2 md:items-start lg:col-span-6">
				<img
					src={CDRom}
					alt="Download data"
					class="size-32 -rotate-6 [filter:drop-shadow(2px_2px_2px_#22222280)] sm:h-20 sm:w-20 lg:h-30 lg:w-30"
				/>
				<div class="space-y-1">
					<h3 id="download-heading">Use this data</h3>
					<p class="font-atkinson text-sepia-brown/80 text-sm leading-relaxed">
						The data powering this site is available in a clean, analyzable CSV format that you can
						use for your research, projects or explorations.
					</p>
					<Button
						target="_blank"
						size="sm"
						href="https://github.com/diagram-chasing/censor-board-cuts/tree/master/data"
						class="flex h-6 w-fit items-center"
						variant="card"
						aria-describedby="download-heading"
						>Download
						<ExternalLink class="!-mt-0.5 !size-3 !p-0" aria-hidden="true" />
					</Button>
				</div>
			</div>
			<div class="space-y-1 lg:col-span-5">
				<h3 id="contribute-heading">Add to our archive</h3>
				<p class="font-atkinson text-sepia-brown/80 text-sm leading-relaxed">
					Automated data collection ended in June 2025. Help keep this archive up to date for
					everyone. Contribute to the database on your next movie visit.
				</p>
				<Button
					size="sm"
					href="/contribute"
					class="h-6"
					variant="stamp"
					aria-describedby="contribute-heading">Find out how</Button
				>
			</div>
		</section>
	</div>
</main>
