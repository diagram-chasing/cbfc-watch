<script>
	import Seal from '$lib/assets/dc.webp';
	import Button from './ui/button/button.svelte';
	import DateStamp from './DateStamp.svelte';
	let { lastCommitDate = 'Recently' } = $props();
</script>

<footer class="border-sepia-dark bg-sepia-light mt-2 border-t px-4 py-2 md:py-0 lg:px-0">
	<div class="mx-auto max-w-4xl py-4 md:py-8">
		<div class="grid grid-cols-4 items-end gap-4 md:grid-cols-12 md:gap-6">
			<div class="col-span-3 md:col-span-4">
				<h2
					class="font-gothic text-red m-0 p-0 text-4xl font-medium drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] md:text-3xl"
				>
					CBFC WATCH
				</h2>
				<div class="font-atkinson pt-1 text-sm leading-snug text-gray-800">
					An open-source database of film censorship decisions by India's Central Board of Film
					Certification, tracking cuts and modifications from 2017-2025.
				</div>
			</div>

			<!-- Action buttons -->
			<div class="col-span-full md:col-span-2">
				<div class="flex gap-2 md:flex-col">
					<Button variant="stamp" href="/contribute" size="sm">Contribute to archive</Button>
					<Button
						variant="blue"
						href="https://diagramchasing.fun"
						size="sm"
						target="_blank"
						rel="noopener noreferrer"
					>
						Support our work
					</Button>
				</div>
			</div>

			<!-- Navigation links -->
			<div class="col-span-3 md:col-span-2">
				<nav>
					<ul class="font-atkinson flex gap-2 text-sm text-gray-800 md:flex-col">
						<li>
							<a href="/" class="underline underline-offset-2 transition-colors hover:text-black"
								>About</a
							>
						</li>

						<li>
							<a
								href="https://github.com/diagramchasing/cbfc-watch"
								target="_blank"
								rel="noopener noreferrer"
								class="underline underline-offset-2 transition-colors hover:text-black"
							>
								GitHub
							</a>
						</li>
						<li>
							<a
								href="mailto:contact@diagramchasing.fun"
								class="underline underline-offset-2 transition-colors hover:text-black"
							>
								Contact
							</a>
						</li>
					</ul>
				</nav>
			</div>

			<div class="col-span-4">
				<div
					class=" flex flex-row-reverse items-center justify-end gap-3 md:flex-row md:justify-between"
				>
					<div class="font-atkinson flex flex-col gap-1 md:items-end md:justify-end">
						<p class=" w-2/3 text-sm text-pretty text-gray-600 md:w-full md:text-right md:text-xs">
							An independent research project from
						</p>
						<Button
							variant="outline"
							href="https://diagramchasing.fun"
							class="border-sepia-brown/20 mt-1 w-fit  py-1 text-xs"
							size="smallest"
							target="_blank"
							rel="noopener noreferrer"
						>
							Diagram Chasing
						</Button>
					</div>

					<a href="https://diagramchasing.fun"
						><img
							src={Seal}
							alt="Diagram Chasing logo"
							class="max-w-[100px] object-contain md:max-w-[110px]"
						/></a
					>
				</div>
			</div>
		</div>

		<div class="border-sepia-dark mt-6 border-t pt-4">
			<div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
				<div class="font-atkinson text-xs text-gray-600">
					© {new Date().getFullYear()} Diagram Chasing. MIT license.
				</div>
				<div class="font-atkinson flex items-center gap-2 text-xs text-gray-600">
					<span
						>Data updated <DateStamp
							date={lastCommitDate}
							colorScheme="custom"
							minAngle={1}
							classNames="text-[10px]"
							seed={59345789347}
							colors={['#4B5563', '#4B5563', '#1F2937']}
						/>
					</span>
				</div>
			</div>
		</div>
	</div>
</footer>
