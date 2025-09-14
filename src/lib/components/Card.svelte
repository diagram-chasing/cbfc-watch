<script lang="ts">
	import { slugify } from '$lib/utils/core';
	import type { Film } from '$lib/types';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { Film as FilmIcon } from 'lucide-svelte';

	interface Props {
		title?: string;
		year?: string;
		posterUrl?: string;
		href?: string;
		languageCount?: number;
		languages?: string[];
		film?: Film | null;
		variant?: 'compact' | 'standard' | 'list' | 'search';
		searchMatch?: { field: string; snippet: string } | null;
		loading?: boolean;
		onclick?: () => void;
		onmouseenter?: (event: { slug: string }) => void;
	}

	let {
		title = '',
		year = '',
		posterUrl = '',
		href = '#',
		languageCount = 0,
		languages = [],
		film = null,
		variant = 'standard',
		searchMatch = null,
		loading = false,
		onclick,
		onmouseenter
	}: Props = $props();

	let imageLoaded = $state(false);

	const effectiveTitle = $derived(film?.name || title);
	const effectiveYear = $derived(film?.year?.toString() || year);
	const effectiveLanguageCount = $derived(
		film?.languageCount ??
			(Array.isArray(film?.languages) && film.languages.length > 0
				? film.languages.length
				: Array.isArray(languages) && languages.length > 0
					? languages.length
					: languageCount)
	);

	const effectivePosterUrl = $derived(film?.posterUrl || posterUrl);

	const optimizedPosterUrl = $derived.by(() => {
		if (!effectivePosterUrl?.startsWith('http')) return effectivePosterUrl;

		switch (variant) {
			case 'compact':
				// For compact cards: max 200px width, preserve aspect ratio
				return effectivePosterUrl.replace(/@\.jpg$/, '@._V1_QL100_UX200_.jpg');
			case 'standard':
				// For standard cards: max 300px width, preserve aspect ratio
				return effectivePosterUrl.replace(/@\.jpg$/, '@._V1_QL80_UX300_.jpg');
			default:
				// Fallback for any other variant
				return effectivePosterUrl.replace(/@\.jpg$/, '@._V1_QL75_UX250_.jpg');
		}
	});

	const optimizedSmallPosterUrl = $derived(
		effectivePosterUrl?.startsWith('http')
			? effectivePosterUrl.replace(/@\.jpg$/, '@._V1_QL80_UX40_.jpg')
			: effectivePosterUrl
	);

	function handleMouseOver() {
		const slugToDispatch = film?.slug;
		if (slugToDispatch && onmouseenter) {
			onmouseenter({ slug: slugToDispatch });
		}
	}

	function handleClick() {
		if (onclick) {
			onclick();
		}
	}

	const formattedTitle = $derived((effectiveTitle || '').trim().replace(/^['"]+|['"]+$/g, ''));

	const titleLimit = $derived(variant === 'compact' ? 18 : variant === 'list' ? 40 : 28);
	const truncatedTitle = $derived(
		formattedTitle.length > titleLimit
			? formattedTitle.substring(0, titleLimit).trim() + '...'
			: formattedTitle
	);

	const transitionId = $derived(slugify(effectiveTitle));
	const viewTransitionName = $derived(`card-${transitionId}`);

	const primaryLanguage = $derived(languages);
	const languageDisplay = $derived(
		effectiveLanguageCount > 1 ? `${effectiveLanguageCount} langs` : primaryLanguage || 'Unknown'
	);

	function handleImageLoad() {
		imageLoaded = true;
	}

	function handleImageError() {
		imageLoaded = false;
	}
</script>

{#if variant === 'compact'}
	{#if loading}
		<!-- Compact skeleton -->
		<div class="group block w-full">
			<div class="bg-sepia-light relative overflow-hidden p-1">
				<Skeleton class="aspect-2/3 w-full rounded-xs" />
			</div>
		</div>
	{:else}
		<!-- Compact variant: Minimalist poster with title overlay -->
		<a
			{href}
			class="group block w-full"
			onclick={handleClick}
			onmouseover={handleMouseOver}
			onfocus={handleMouseOver}
		>
			<div
				class="bg-sepia-light relative overflow-hidden p-1"
				style="view-transition-name: {viewTransitionName};"
			>
				<!-- Poster with flexible aspect ratio -->
				<div class="bg-sepia-med relative aspect-2/3 w-full overflow-hidden">
					{#if effectivePosterUrl && effectivePosterUrl.trim() !== ''}
						<!-- Placeholder -->
						<div
							class="from-sepia-med to-sepia-dark absolute inset-0 flex items-center justify-center bg-linear-to-br"
						>
							<div class="text-sepia-brown animate-pulse text-center">
								<!-- <div class="text-2xl opacity-60"><FilmIcon /></div> -->
								<div class="text-xs font-medium">{truncatedTitle}</div>
							</div>
						</div>
						<!-- Actual image -->
						<img
							src={optimizedPosterUrl}
							alt={`${effectiveTitle} poster`}
							class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-90"
							style="opacity: {imageLoaded ? 1 : 0}; view-transition-name: {viewTransitionName};"
							loading="lazy"
							decoding="async"
							onload={handleImageLoad}
							onerror={handleImageError}
						/>
					{:else}
						<div
							class="from-sepia-med to-sepia-dark flex h-full w-full items-center justify-center bg-linear-to-br"
						>
							<div class="text-sepia-brown text-center">
								<div class="text-xs font-medium">No Poster</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</a>
	{/if}
{:else if variant === 'list'}
	{#if loading}
		<!-- List skeleton -->
		<div class="group border-sepia-dark bg-sepia-light flex w-full items-center gap-2 border p-1">
			<Skeleton class="h-12 w-8 shrink-0 rounded-xs" />
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton class="h-4 w-48 rounded" />
				<Skeleton class="h-3 w-24 rounded" />
			</div>
			<Skeleton class="h-4 w-4 rounded" />
		</div>
	{:else}
		<!-- List variant: Horizontal layout with cinema aesthetic -->
		<a
			{href}
			class="group border-sepia-dark bg-sepia-light hover:border-sepia-brown/50 hover:bg-sepia-med flex w-full items-center gap-2 border p-1 transition-all"
			onclick={handleClick}
			onmouseover={handleMouseOver}
			onfocus={handleMouseOver}
		>
			<!-- Small poster thumbnail -->
			<div class="bg-sepia-med h-12 w-8 shrink-0 overflow-hidden">
				{#if effectivePosterUrl && effectivePosterUrl.trim() !== ''}
					<img
						src={optimizedSmallPosterUrl}
						alt={`${effectiveTitle} poster`}
						class="h-full w-full object-cover"
						style="view-transition-name: {viewTransitionName};"
						loading="lazy"
						decoding="async"
					/>
				{:else}
					<div class="bg-sepia-med flex h-full w-full items-center justify-center">
						<span class="text-sepia-brown text-xs">
							<FilmIcon />
						</span>
					</div>
				{/if}
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1 space-y-1">
				<div class="flex flex-col items-start justify-between">
					<h3
						class="font-atkinson text-sepia-brown text-sm font-bold group-hover:text-black"
						title={formattedTitle}
					>
						{truncatedTitle}
						<span class="text-sepia-brown/80 text-xs font-medium">({effectiveYear})</span>
					</h3>
					<div class="font-atkinson text-sepia-brown/80 mt-1 flex items-center gap-3 text-xs">
						<span class="font-atkinson font-medium">{languageDisplay}</span>
					</div>
				</div>
			</div>

			<!-- Arrow indicator -->
			<div class="text-sepia-brown/60 group-hover:text-sepia-brown shrink-0 transition-colors">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path>
				</svg>
			</div>
		</a>
	{/if}
{:else if variant === 'search'}
	{#if loading}
		<!-- Search skeleton -->
		<div class="group border-sepia-dark bg-sepia-light flex w-full items-center gap-3 border p-2">
			<Skeleton class="h-16 w-12 shrink-0 rounded-xs" />
			<div class="min-w-0 flex-1 space-y-2">
				<Skeleton class="h-4 w-56 rounded" />
				<Skeleton class="h-3 w-40 rounded" />
			</div>
			<Skeleton class="h-4 w-4 rounded" />
		</div>
	{:else}
		<!-- Search variant: Compact layout with highlighted search context -->
		<a
			{href}
			class="group border-sepia-dark bg-sepia-light hover:border-sepia-brown/50 hover:bg-sepia-med flex w-full items-center gap-3 border p-2 transition-all"
			onclick={handleClick}
			onmouseover={handleMouseOver}
			onfocus={handleMouseOver}
		>
			<!-- Small poster thumbnail -->
			<div class="bg-sepia-med h-16 w-12 shrink-0 overflow-hidden">
				{#if effectivePosterUrl && effectivePosterUrl.trim() !== ''}
					<img
						src={optimizedSmallPosterUrl}
						alt={`${effectiveTitle} poster`}
						class="h-full w-full object-cover"
						style="view-transition-name: {viewTransitionName};"
						loading="lazy"
						decoding="async"
					/>
				{:else}
					<div class="bg-sepia-med flex h-full w-full items-center justify-center">
						<span class="text-sepia-brown text-sm"> <FilmIcon /></span>
					</div>
				{/if}
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1 space-y-1">
				<div class="flex flex-col items-start justify-between">
					<h3
						class="font-atkinson text-sepia-brown text-sm font-bold group-hover:text-black"
						title={formattedTitle}
					>
						{truncatedTitle}
						<span class="text-sepia-brown/80 text-xs font-medium">({effectiveYear})</span>
					</h3>

					{#if searchMatch}
						<div class="text-sepia-brown/90 mt-1 text-xs">
							<span class="relative italic first-letter:uppercase">
								<div
									class="from-sepia-light group-hover:from-sepia-med absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r to-transparent transition-all"
								></div>
								<div
									class="from-sepia-light group-hover:from-sepia-med absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l to-transparent transition-all"
								></div>
								<span class="relative">
									{@html searchMatch.snippet}
								</span>
							</span>
						</div>
					{:else}
						<div class="font-atkinson text-sepia-brown/80 mt-1 flex items-center gap-3 text-xs">
							<span class="font-atkinson font-medium">{languageDisplay}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Arrow indicator -->
			<div class="text-sepia-brown/60 group-hover:text-sepia-brown shrink-0 transition-colors">
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
					></path>
				</svg>
			</div>
		</a>
	{/if}
{:else if loading}
	<!-- Standard skeleton -->
	<div class="group block w-full">
		<div class="border-sepia-dark bg-sepia-light overflow-hidden border">
			<Skeleton class="border-sepia-dark aspect-2/3 w-full border-b" />
			<div class="bg-sepia-light space-y-2 p-2">
				<Skeleton class="h-4 w-32 rounded" />
				<div class="flex items-center justify-between">
					<Skeleton class="h-5 w-12 rounded" />
					<Skeleton class="h-4 w-16 rounded" />
				</div>
			</div>
		</div>
	</div>
{:else}
	<a
		{href}
		class="group block w-full"
		onclick={handleClick}
		onmouseover={handleMouseOver}
		onfocus={handleMouseOver}
	>
		<div
			class="border-sepia-dark bg-sepia-light group-hover:border-sepia-brown overflow-hidden border transition-all group-hover:shadow-xs"
			style="view-transition-name: {viewTransitionName};"
		>
			<!-- Poster -->
			<div class="border-sepia-dark relative aspect-2/3 w-full overflow-hidden border-b">
				{#if effectivePosterUrl && effectivePosterUrl.trim() !== ''}
					<!-- Placeholder -->
					<div
						class="from-sepia-med to-sepia-dark absolute inset-0 flex items-center justify-center bg-linear-to-br"
					>
						<div class="text-sepia-brown animate-pulse text-center">
							<div class="text-3xl opacity-60"><FilmIcon /></div>
							<div class="text-sm font-medium">{truncatedTitle}</div>
						</div>
					</div>
					<!-- Actual image -->
					<img
						src={optimizedPosterUrl}
						alt={`${effectiveTitle} poster`}
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
						style="opacity: {imageLoaded ? 1 : 0}; view-transition-name: {viewTransitionName};"
						loading="lazy"
						decoding="async"
						onload={handleImageLoad}
						onerror={handleImageError}
					/>
				{:else}
					<div
						class="from-sepia-med to-sepia-dark flex h-full w-full items-center justify-center bg-linear-to-br"
					>
						<div class="text-sepia-brown text-center">
							<div class="text-3xl opacity-60">🎬</div>
							<div class="text-sm font-medium">No Poster</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Info footer -->
			<div class="bg-sepia-light p-2">
				<h3 class="font-atkinson text-sepia-brown font-medium" title={formattedTitle}>
					{truncatedTitle}
				</h3>
				<div class="text-sepia-brown/80 mt-1 flex items-center justify-between text-sm">
					{#if effectiveYear}
						<span class="bg-sepia-brown text-sepia-light rounded px-1.5 py-0.5 text-xs font-medium">
							{effectiveYear}
						</span>
					{/if}
					<span class="font-medium">{languageDisplay}</span>
				</div>
			</div>
		</div>
	</a>
{/if}

<style>
	a {
		text-decoration: none;
	}

	a:focus {
		outline: 2px solid var(--color-sepia-brown);
		outline-offset: 2px;
	}

	.group {
		transition: all 150ms ease-in-out;
	}
</style>
