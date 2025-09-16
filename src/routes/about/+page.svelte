<script lang="ts">
	import SEO from '$lib/components/SEO.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import Seal from '$lib/assets/dc.webp';
	import { ExternalLink } from 'lucide-svelte';

	const faqItems = [
		{
			question: 'What is the purpose of this project?',
			answer:
				'To create a comprehensive, publicly accessible dataset of film censorship actions by the Central Board of Film Certification (CBFC) in India, to enable research and analysis.'
		},
		{
			question: 'Why is this data not regularly updated?',
			answer:
				'The automated data collection process was disrupted by technical changes in how the Censor Board publish information on the official <a href="https://www.ecinepramaan.gov.in/" target="_blank" rel="noopener noreferrer">ECinePramaan</a> portal. The project now functions as an archive of films from before the technical change (mid-2025) and films <a href="/contribute" target="_blank" rel="noopener noreferrer">contributed by users</a>.'
		},
		{
			question: 'How can I contribute to the project?',
			answer:
				'Volunteers are welcome to help expand the dataset. If you are interested in contributing, please check the <a href="/contribute" target="_blank" rel="noopener noreferrer">contribute page</a>. You can also reach out at <a href="mailto:hello@diagramchasing.fun" target="_blank" rel="noopener noreferrer">hello@diagramchasing.fun</a>'
		}
	];

	const changelogItems = [
		{
			date: '2025-09-16',
			type: 'correction',
			description:
				'Data was updated on Tuesday 16th September, 3:00 PM to correct for a data preprocessing error, which erroneously filtered out some data from being including in the summaries. <a href="https://github.com">The correction is viewable here</a>. This has been corrected. '
		}
	];

	const textStyles = 'font-atkinson text-base leading-relaxed text-gray-700';
	const linkStyles = 'text-blue font-medium hover:underline';
	const creditLinkStyles =
		'font-medium underline decoration-1 underline-offset-2 transition-colors hover:text-black';
	const sectionHeadingStyles =
		'font-atkinson text-sepia-brown text-xs font-semibold tracking-wide uppercase';
</script>

<SEO
	title="About"
	description="Learn about CBFC Watch - an independent research project exploring film censorship in India with a searchable database of nearly 18,000 films from 2017-2025."
	keywords="CBFC Watch about, film censorship research, India movie database, censorship analysis project, CBFC transparency"
/>

<main class="mb-8 min-h-screen w-full max-w-3xl space-y-8 text-gray-900 md:px-0">
	<!-- Hero Section -->
	<section aria-label="About hero section">
		<div class="grain-effect">
			<div class="space-y-6 px-2 py-4 md:px-0">
				<h1
					class="font-gothic text-4xl leading-tight font-bold tracking-[-0.01em] text-black sm:text-5xl md:text-6xl"
					style="text-wrap: balance;"
				>
					About CBFC Watch
				</h1>

				<div class="max-w-3xl space-y-4">
					<p class={textStyles} style="text-wrap: pretty;">
						<strong>CBFC Watch</strong> is an independent research project dedicated to exploring
						film censorship actions in India. It is the first public, searchable database of
						censorship information for nearly <strong>18,000 films</strong> released between 2017 and
						2025.
					</p>

					<p class={textStyles} style="text-wrap: pretty;">
						The project was created to make this data available as a resource for filmmakers,
						journalists, researchers, and the public. Initially intended as a live tracker, the
						project now exists as a historical archive due to changes in how the Censor Board
						publishes information.
					</p>

					<p class={textStyles} style="text-wrap: pretty;">
						<code class="bg-sepia-brown text-sepia-light rounded-xs px-1 text-sm">#CBFCWatch</code>
						was originally used by Aroon Deep (journalist at The Hindu) for his work sharing film censorship
						information on social media. We are grateful for his permission to use the name.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Methodology -->
	<section class="space-y-2">
		<h2 class="text-lg font-bold">Methodology</h2>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-6">
			<div class="col-span-1 md:col-span-5">
				<p class="font-atkinson text-sm leading-relaxed text-gray-700">
					Python scripts were used to fetch film censorship details from the
					<a
						href="https://www.ecinepramaan.gov.in/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}
					>
						ECinePramaan portal
					</a>. Raw modification logs were cleaned and structured using the
					<a
						href="https://deepmind.google/technologies/gemini/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}
					>
						Google Gemini Flash
					</a>
					Large Language Model (LLM). This structured censorship data was then joined with IMDb listings
					to add contextual information including film cast, crew, and posters. The accuracy of the IMDb
					join varies as it relies on automated name matching between the IMDb film name and the CBFC
					film name. The explorer is built with
					<a
						href="https://kit.svelte.dev/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}>SvelteKit</a
					>
					and hosted on
					<a
						href="https://pages.cloudflare.com/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}>Cloudflare Pages</a
					>, with data stored in
					<a
						href="https://developers.cloudflare.com/d1/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}
					>
						Cloudflare D1
					</a>. Search is powered by a self-hosted
					<a
						href="https://typesense.org/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}
					>
						Typesense
					</a>
					instance with semantic search enabled. Data visualizations are rendered using
					<a
						href="https://svelteplot.dev/"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}
					>
						Svelteplot
					</a>.
					<a
						href="https://github.com/diagram-chasing/cbfc-watch"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}>Code</a
					>
					is available under the MIT license.
					<a
						href="https://github.com/diagram-chasing/censor-board-cuts"
						target="_blank"
						rel="noopener noreferrer"
						class={linkStyles}>Data</a
					> is available under the ODbL License.
				</p>
				<p class="font-atkinson mt-1 text-sm leading-relaxed text-gray-500">
					Claude AI was used for assistance developing certain components of this explorer.
				</p>
			</div>

			<div class="col-span-1 flex flex-col space-y-2 md:justify-center">
				<Button
					href="https://github.com/diagram-chasing/censor-board-cuts"
					class="inline-flex h-10 justify-between px-3"
					variant="card"
				>
					Data <ExternalLink class="!size-3" />
				</Button>
				<Button
					href="https://github.com/diagram-chasing/cbfc-watch"
					class="inline-flex h-10 justify-between px-3"
					variant="card"
				>
					Code <ExternalLink class="!size-3" />
				</Button>
			</div>
		</div>
	</section>

	<!-- Credits Section -->
	<section class="border-sepia-dark relative border bg-white p-4 shadow-xs md:p-6">
		<h2 class="sr-only">Credits and Attribution</h2>

		<!-- Mobile Layout -->
		<div class="mb-6 space-y-4 md:hidden">
			<a href="https://diagramchasing.fun" class="block w-fit">
				<img
					src={Seal}
					alt="Official Diagram Chasing Seal"
					class="h-20 opacity-90 transition-opacity hover:opacity-100"
				/>
			</a>

			<div class="space-y-3">
				<div class="space-y-1">
					<h3 class={sectionHeadingStyles}>Designed and Developed by</h3>
					<p class="font-atkinson text-sm text-gray-800">
						<a href="https://aman.bh" class={creditLinkStyles}>Aman Bhargava</a>
						and
						<a href="https://github.com/Vonter" class={creditLinkStyles}>Vivek Matthew</a>
					</p>
				</div>

				<div class="space-y-1">
					<h3 class={sectionHeadingStyles}>Illustrations</h3>
					<p class="font-atkinson text-sm text-gray-800">
						<a href="https://reechik.com" class={creditLinkStyles}>Reechik Bannerjee</a>
					</p>
				</div>
			</div>
		</div>

		<!-- Desktop Layout -->
		<div class="hidden pb-4 md:block">
			<div class="space-y-3 pr-16">
				<div class="space-y-1">
					<h3 class={sectionHeadingStyles}>Designed and Developed by</h3>
					<p class="font-atkinson text-sm text-gray-800">
						<a href="https://aman.bh" class={creditLinkStyles}>Aman Bhargava</a>
						and
						<a href="https://github.com/Vonter" class={creditLinkStyles}>Vivek Matthew</a>
					</p>
				</div>

				<div class="space-y-1">
					<h3 class={sectionHeadingStyles}>Illustrations</h3>
					<p class="font-atkinson text-sm text-gray-800">
						<a href="https://reechik.com" class={creditLinkStyles}>Reechik Bannerjee</a>
					</p>
				</div>
			</div>

			<a href="https://diagramchasing.fun" class="absolute top-3 right-3 block">
				<img
					src={Seal}
					alt="Official Diagram Chasing Seal"
					class="h-24 opacity-90 transition-opacity hover:opacity-100"
				/>
			</a>
		</div>

		<!-- Footer -->
		<footer class="border-sepia-dark -mx-4 -mb-4 border-t bg-gray-50 p-2 md:-mx-6 md:-mb-6 md:px-6">
			<p
				class="font-atkinson text-start text-xs font-medium tracking-wide text-gray-600 uppercase md:text-end"
			>
				<a href="https://diagramchasing.fun">A Diagram Chasing Production</a>
			</p>
		</footer>
	</section>

	<!-- Changelog Section -->
	<section class="space-y-6">
		<h2 class="font-gothic text-4xl font-medium tracking-tight text-black">Changelog</h2>

		<div class="space-y-3">
			{#each changelogItems as change}
				<article
					class={`border-sepia-dark space-y-2 border p-4 shadow-sm ${change.type === 'correction' ? 'border-red-200 bg-red-50' : 'bg-white'}`}
				>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							{#if change.type === 'correction'}
								<span
									class="rounded-xs border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-medium tracking-wide text-red-800 uppercase"
								>
									Correction
								</span>
							{/if}
							<h3 class="font-atkinson text-sepia-brown font-semibold">
								{new Date(change.date).toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric'
								})}
							</h3>
						</div>
						<time class="font-atkinson text-xs font-medium tracking-wide text-gray-500 uppercase">
							{change.date}
						</time>
					</div>
					<p class="font-atkinson text-sm leading-relaxed text-gray-700">
						{@html change.description}
					</p>
				</article>
			{/each}
		</div>
	</section>
	<!-- FAQ Section -->
	<section class="space-y-6">
		<h2 class="font-gothic text-4xl font-medium tracking-tight text-black">
			Frequently Asked Questions
		</h2>

		<div class="space-y-3">
			{#each faqItems as faq}
				<article class="border-sepia-dark space-y-2 border bg-white p-4 shadow-sm">
					<h3 class="font-atkinson text-sepia-brown font-semibold">
						{faq.question}
					</h3>
					<p class="font-atkinson text-sm leading-relaxed text-gray-700">
						{@html faq.answer}
					</p>
				</article>
			{/each}
		</div>
	</section>
</main>
