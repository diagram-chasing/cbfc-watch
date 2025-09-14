<script lang="ts">
	import { page } from '$app/stores';
	import type { Film } from '$lib/types';

	// Required props
	export let title: string = '';

	// Optional props with defaults
	export let description: string = '';
	export let type: string = 'website'; // website, article, movie, etc.
	export let contentType: string = 'page'; // page, movie, search
	export let date: string = '';
	export let author: string = '';
	export let keywords: string = '';
	export let canonical: string = '';

	// Movie-specific props
	export let film: Film | null = null; // Film object for movie pages
	export let modifications: number = 0;
	export let primaryContentType: string = ''; // Primary content type from film page
	export let totalDuration: number = 0;
	export let deletions: number = 0;
	export let replacements: number = 0;
	export let actionTypesParam: string = '';

	// Site configuration
	const siteName = 'CBFC Watch';
	const defaultAuthor = 'CBFC Watch';

	// Dynamic domain detection with fallback
	$: domain = $page?.url?.origin || 'https://preview.cbfc-watch.pages.dev/';

	// Computed values
	$: fullTitle = title
		? `${title} | CBFC Watch`
		: 'CBFC Watch - Archive of film censorship in India';

	$: ogImage =
		contentType === 'movie' && film
			? `${domain}/api/og-image/${film.slug}`
			: 'https://images.cbfc.watch/og/sharecard.jpg';

	$: fullOgImageUrl = ogImage;

	$: currentUrl =
		canonical ||
		($page.url.href.startsWith('http') ? $page.url.href : `${domain}${$page.url.pathname}`);

	$: finalAuthor = author || defaultAuthor;

	$: articleType = contentType === 'movie' ? 'video.movie' : type;

	$: finalDescription =
		description ||
		(contentType === 'movie' && film
			? `${film.name} (${film.rating || 'Not Rated'}) - ${modifications || film.modifications?.length || 0} modifications by CBFC. ${film.imdbOverview || 'View censorship details and modifications.'}`
			: 'Open-source database of CBFC censorship decisions, cuts, and modifications from 2017-2025. Browse film censorship data and analysis.');

	$: movieKeywords =
		contentType === 'movie' && film
			? [
					'CBFC',
					'censorship',
					'film certification',
					'movie cuts',
					film.name?.replace(/"/g, ''),
					film.rating,
					film.language,
					...(film.imdbGenres?.split('|') || [])
				]
					.filter(Boolean)
					.join(', ')
			: '';

	$: finalKeywords =
		keywords ||
		movieKeywords ||
		'CBFC, film censorship, movie certification, India, cuts, modifications';
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={finalDescription} />

	<!-- Author and Keywords -->
	<meta name="author" content={finalAuthor} />
	<meta name="keywords" content={finalKeywords} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={articleType} />
	<meta property="og:url" content={currentUrl} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={finalDescription} />
	<meta property="og:image" content={fullOgImageUrl} />
	<meta property="og:site_name" content={siteName} />

	<!-- Movie-specific Open Graph -->
	{#if contentType === 'movie' && film}
		<meta property="video:release_date" content={film.certDate || ''} />
		{#if film.imdbDirectors}
			<meta property="video:director" content={film.imdbDirectors?.split('|')[0] || ''} />
		{/if}
		{#if film.imdbGenres}
			<meta property="video:genre" content={film.imdbGenres?.split('|')[0] || ''} />
		{/if}
	{/if}

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:url" content={currentUrl} />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={finalDescription} />
	<meta name="twitter:image" content={fullOgImageUrl} />
	<meta name="twitter:creator" content="@amanbhargava" />

	<!-- Article/Movie metadata -->
	{#if contentType === 'movie'}
		<meta property="article:section" content="Film Censorship" />
		{#if date || (film && film.certDate)}
			{@const publishDate = date || (film ? film.certDate : '') || ''}
			{#if publishDate}
				<meta property="article:published_time" content={new Date(publishDate).toISOString()} />
			{/if}
		{/if}
	{:else}
		<meta property="article:section" content="CBFC Database" />
		{#if date}
			<meta property="article:published_time" content={new Date(date).toISOString()} />
		{/if}
	{/if}
	<meta property="article:author" content={finalAuthor} />

	<!-- Structured Data -->
	{#if contentType === 'movie' && film}
		{@html `<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Movie',
			name: film.name?.replace(/"/g, '') || title,
			description: finalDescription,
			url: currentUrl,
			image: film.posterUrl || fullOgImageUrl,
			...(film.imdbDirectors && {
				director: film.imdbDirectors.split('|').map((name: string) => ({
					'@type': 'Person',
					name: name.trim()
				}))
			}),
			...(film.imdbActors && {
				actor: film.imdbActors
					.split('|')
					.slice(0, 5)
					.map((name: string) => ({
						'@type': 'Person',
						name: name.trim()
					}))
			}),
			...(film.imdbGenres && {
				genre: film.imdbGenres.split('|')
			}),
			...(film.certDate && {
				datePublished: film.certDate
			}),
			...(film.language && {
				inLanguage: film.language
			}),
			...(film.rating && {
				contentRating: `CBFC:${film.rating}`
			}),
			...(film.imdbRating && {
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: film.imdbRating,
					bestRating: '10',
					worstRating: '1'
				}
			}),
			additionalProperty: [
				{
					'@type': 'PropertyValue',
					name: 'CBFC Modifications',
					value: modifications || film.modifications?.length || 0
				},
				{
					'@type': 'PropertyValue',
					name: 'CBFC Certificate Number',
					value: film.cbfcFileNo || ''
				},
				{
					'@type': 'PropertyValue',
					name: 'Certifying Office',
					value: film.certifier || ''
				}
			]
		})}</script>`}
	{:else}
		{@html `<script type="application/ld+json">${JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: siteName,
			description: finalDescription,
			url: currentUrl,
			publisher: {
				'@type': 'Organization',
				name: 'CBFC Watch',
				description: 'Archive of film censorship in India'
			},
			potentialAction: {
				'@type': 'SearchAction',
				target: {
					'@type': 'EntryPoint',
					urlTemplate: `${domain}/search?q={search_term_string}`
				},
				'query-input': 'required name=search_term_string'
			}
		})}</script>`}
	{/if}

	<link rel="canonical" href={currentUrl} />
</svelte:head>
