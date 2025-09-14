<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<article class="relative mx-auto max-w-4xl">
	<!-- Single Unified Layout -->
	<section class="layout-container flex flex-col gap-4 border-t border-black pt-2">
		<!-- Top Section: Poster and Metadata -->
		<section class="grid grid-cols-1 gap-2 md:grid-cols-6 md:gap-2">
			<!-- Mobile layout with grid -->
			<section
				class="relative grid grid-cols-2 grid-rows-3 justify-start gap-1 md:hidden"
				style="container-type: inline-size;"
			>
				<!-- Area 1: Poster section (row-span-3, col 1) -->
				<section class="row-span-3 max-w-[200px]">
					<figure class="mx-auto w-full space-y-2 border border-black p-2">
						<!-- Movie Title Skeleton -->
						<header class="lightning text-white">
							<section class="grain-effect relative h-12 w-full">
								<Skeleton class="h-full w-full bg-black" />
							</section>
						</header>

						<!-- Poster Skeleton -->
						<Skeleton class="mt-2 aspect-2/3 border border-black bg-gray-200 shadow-xs" />
					</figure>
				</section>

				<!-- Area 2: Charts section (row-span-3, col 2) -->
				<section
					class="row-span-3 flex h-full w-full flex-col space-y-2 rounded-sm bg-white p-3 shadow-xs"
				>
					<Skeleton class="h-full w-full" />
				</section>

				<!-- Area 3: Overview section (row-start-4, col-span-2) -->
				<section
					class="col-span-2 row-start-4 rounded-sm border border-black/50 bg-white p-3 shadow-xs"
				>
					<header class="flex flex-col gap-2 font-bold text-gray-500 uppercase">
						<div class="bg-black px-2 py-1">
							<Skeleton class="mx-auto h-3 w-16 bg-gray-400" />
						</div>
						<div
							class="mx-auto flex w-full flex-row items-start justify-between text-sm text-black"
						>
							<div class="flex w-full flex-wrap items-center justify-between gap-2">
								<Skeleton class="h-3 w-12" />
								<Skeleton class="h-4 w-14 bg-yellow-200" />
							</div>
						</div>
					</header>
					<div class="mt-2">
						<Skeleton class="mb-1 h-3 w-20 bg-gray-300" />
						<Skeleton class="h-[100px] w-full bg-gray-200" />
					</div>
					<!-- Metadata grid -->
					<div class="mt-2 grid grid-cols-1 gap-2 text-left text-[12px]">
						<!-- Release Info -->
						<div>
							<Skeleton class="mb-1 h-3 w-24 bg-gray-300" />
							<Skeleton class="h-3 w-20 bg-gray-200" />
						</div>
						<!-- Director -->
						<div>
							<Skeleton class="mb-1 h-3 w-16 bg-gray-300" />
							<Skeleton class="h-3 w-32 bg-gray-200" />
						</div>
						<!-- Cast -->
						<div>
							<Skeleton class="mb-1 h-3 w-10 bg-gray-300" />
							<Skeleton class="h-3 w-36 bg-gray-200" />
						</div>
						<!-- Genres -->
						<div class="flex flex-wrap gap-1.5">
							{#each Array(3) as _}
								<Skeleton class="h-4 w-14 bg-gray-200" />
							{/each}
						</div>
					</div>
				</section>
			</section>

			<!-- Title and Poster - Desktop layout -->
			<section class="hidden md:col-span-2 md:block">
				<figure
					class="border-sepia-dark -xs mx-auto w-full space-y-2 border bg-white p-2 md:max-w-[550px]"
				>
					<!-- Movie Title Skeleton -->
					<header class="lightning text-white">
						<section class=" relative mb-2 h-12 w-full">
							<Skeleton class="-xs h-full w-full bg-black" />
						</section>
					</header>

					<!-- Poster Skeleton -->
					<Skeleton class="-xs mt-2 aspect-2/3 bg-gray-200 shadow-xs" />
				</figure>
			</section>

			<!-- Movie Metadata - Full width on mobile, 4 cols on desktop -->
			<section class="hidden md:col-span-4 md:flex md:flex-col md:space-y-2">
				<!-- Metadata bar: Duration, Language, Rating -->
				<section class="flex h-full flex-col space-y-2">
					<!-- <header class="flex border border-black/50 bg-white/20 font-bold text-gray-500 uppercase">
						<ul
							class="mx-auto flex w-full flex-row items-center justify-between border border-black/10 bg-white p-2 text-sm text-black"
						>
							<li class="z-10 flex items-center gap-1.5">
								<Skeleton class="h-4 w-16  bg-gray-200" />
							</li>
							<li class="z-10 flex flex-col gap-1 bg-black px-2">
								<Skeleton class="h-4 w-16 " />
							</li>
							<li class="z-10 flex items-center gap-1.5">
								<Skeleton class="h-4 w-10  bg-gray-200" />
							</li>
						</ul>
					</header> -->

					<!-- Film Details Section -->
					<section class="border-sepia-dark -xs flex h-full flex-col border bg-white p-3 shadow-xs">
						<!-- Synopsis Section -->
						<Skeleton class="-sm mb-3 h-20 w-full bg-gray-200" />

						<!-- Two column layout for metadata -->
						<div class="grid h-full grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-4">
							<!-- Left Column -->
							<Skeleton class="-sm h-full w-full space-y-3 bg-gray-200" />

							<!-- Right Column -->
							<Skeleton class="-sm h-full w-full space-y-3 bg-gray-200" />
						</div>

						<!-- CBFC Details -->
						<!-- <div class="mt-4 border-t border-gray-200 pt-3">
							<Skeleton class="mb-2 h-3 w-32  bg-gray-300" />
							<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
								<div class="flex items-center">
									<Skeleton class="mr-2 h-3 w-24  bg-gray-300" />
									<Skeleton class="h-3 w-20  bg-gray-200" />
								</div>
								<div class="flex items-center">
									<Skeleton class="mr-2 h-3 w-12  bg-gray-300" />
									<Skeleton class="h-3 w-24  bg-gray-200" />
								</div>
							</div>
						</div> -->

						<!-- View Stats -->
						<!-- <div class="mt-3 border-t border-gray-200 pt-3">
							<div class="flex items-center justify-between">
								<Skeleton class="h-3 w-12  bg-gray-300" />
								<Skeleton class="h-4 w-16 -full bg-gray-200 px-2 py-0.5" />
							</div>
						</div> -->
					</section>
				</section>
			</section>
		</section>

		<!-- Certificate Details and Modifications -->
		<section class="grid grid-cols-1 gap-2 md:grid-cols-6">
			<!-- Certificate Details Sidebar -->
			<aside class="hidden w-full md:col-span-2 md:block">
				<section class="block md:sticky md:top-0">
					<!-- Certificate Card -->
					<article
						class="border-sepia-dark bg-sepia-light -b-sm md:-sm relative mx-auto flex h-fit w-full flex-col overflow-hidden border p-2 shadow-md md:mt-2 md:max-w-sm"
					>
						<!-- Filing Card Content -->
						<Skeleton class="flex h-24 w-full flex-col justify-between gap-2 bg-gray-200 p-2" />
					</article>
				</section>
			</aside>

			<!-- Modifications Section -->
			<section class="relative overflow-hidden md:col-span-4 md:-mt-7">
				<section class="mx-auto max-w-4xl">
					<div class="-tab relative z-10 mx-auto h-8 w-36 bg-gray-500"></div>

					<!-- Modifications Table Skeleton -->
					<div class="border-sepia-dark bg-sepia-light -b-sm w-full overflow-hidden border p-0">
						<table class="h-56 w-full border-collapse">
							<thead>
								<tr class="border-sepia-dark bg-sepia-light text-sepia-dark border-b text-xs">
									{#each Array(3) as _}
										<th class="p-2 text-left">
											<Skeleton class="h-3 w-16  bg-gray-300" />
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each Array(2) as _, i}
									<tr
										class={'border-sepia-dark/30 border-b ' +
											(i % 2 === 0 ? 'bg-sepia-light/80' : 'bg-sepia-light/50')}
									>
										<td class="p-2">
											<Skeleton class="h-12 w-8  bg-gray-200" />
										</td>
										<td class="p-2">
											<Skeleton class="h-12 w-56  bg-gray-200" />
										</td>
										<td class="p-2">
											<Skeleton class="h-12 w-20  bg-gray-200" />
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</section>

				<!-- Browse More By Section -->
				<section
					class="border-sepia-dark bg-sepia-light text-sepia-brown -sm mt-3 flex flex-col space-y-2 border p-3 shadow-md sm:p-2"
				>
					<Skeleton class="mb-2 h-3 w-32  bg-gray-300 pb-2" />

					<!-- Action Types -->
					<div class="mb-2">
						<Skeleton class="mb-1 h-3 w-24  bg-gray-300" />
						<div class="mt-1 flex flex-wrap gap-1">
							{#each Array(5) as _}
								<Skeleton class="h-6 w-20  bg-gray-200" />
							{/each}
						</div>
					</div>

					<!-- Media Elements -->
					<div class="mb-2">
						<Skeleton class="mb-1 h-3 w-28  bg-gray-300" />
						<div class="mt-1 flex flex-wrap gap-1">
							{#each Array(4) as _}
								<Skeleton class="h-6 w-24  bg-gray-200" />
							{/each}
						</div>
					</div>

					<hr class="border-sepia-dark/60 my-6" />

					<!-- Content Types & References -->
					<div class="mb-2">
						<Skeleton class="mb-1 h-3 w-36  bg-gray-300" />
						<div class="mt-1 flex flex-wrap gap-1">
							{#each Array(6) as _}
								<Skeleton class="h-6 w-20  bg-gray-200" />
							{/each}
						</div>
					</div>

					<!-- Film Credits Groups - Simplified -->
					{#each Array(4) as _}
						<div class="mb-2">
							<Skeleton class="mb-1 h-3 w-20  bg-gray-300" />
							<div class="mt-1 flex flex-wrap gap-1">
								{#each Array(3) as _}
									<Skeleton class="h-6 w-24  bg-gray-200" />
								{/each}
							</div>
						</div>
					{/each}
				</section>
			</section>

			<!-- Mobile certification details -->
			<section class="my-3 block md:hidden">
				<article
					class="border-sepia-dark bg-sepia-light -b-sm md:-sm relative mx-auto flex h-fit w-full flex-col overflow-hidden border p-2 shadow-md md:mt-2 md:max-w-sm"
				>
					<!-- Filing Card Content -->
					<Skeleton class="flex h-24 w-full flex-col justify-between gap-2 bg-gray-200 p-2" />
				</article>
			</section>
		</section>
	</section>
</article>

<style>
	/* Lightning header style */
	.lightning {
		display: flex;
		justify-content: center;
		position: relative;
		margin: 0 auto;
		width: 100%;
	}

	.lightning > * {
		margin: 0;
		display: flex;
		justify-content: center;
		flex-direction: column;
		background: var(--dominant-color, #2c3e50);
		font-size: clamp(0.8rem, 100cqi, 1.5em);
		font-weight: 700;
		color: var(--text-color, white);
		text-transform: uppercase;
		line-height: 1.2;
		text-align: center;
		font-family: 'Sentient-Variable', serif !important;
		text-shadow:
			var(--color-black, black) 0px 0px 0px,
			var(--color-black, black) 0.669131px 0.743145px 0px,
			var(--color-black, black) 1.33826px 1.48629px 0px,
			var(--color-black, black) 2.00739px 2.22943px 0px;
	}

	/* Rounded tab */
	.-tab {
		--r: 18px; /* control the radius */
		line-height: 1.8; /* control the height */
		padding-inline: 0.5em;
		border-inline: var(--r) solid #0000;
		border-radius: calc(2 * var(--r)) calc(2 * var(--r)) 0 0 / var(--r);
		mask:
			radial-gradient(var(--r) at var(--r) 0, #0000 98%, #000 101%) calc(-1 * var(--r)) 100%/100%
				var(--r) repeat-x,
			conic-gradient(#000 0 0) padding-box;
		background: var(--color-sepia-brown, #8b4513) border-box;
		width: 200px;
		padding: 0em 1em;
		text-transform: uppercase;
		text-align: center;
	}
</style>
