<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { formatDuration } from '$lib/utils/format';
	import { getActionTypeClasses, formatActionType } from '../../film-display';
	import { generateExternalLinks } from '../../external-links';
	import { ChevronDown, ChevronUp, Timer } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	interface Modification {
		cutNo: string;
		description: string;
		aiDescription?: string;
		deletedSecs: number;
		replacedSecs: number;
		insertedSecs: number;
		totalModifiedSecs: number;
		aiActionTypes?: string;
		aiContentTypes?: string;
		aiMediaElements?: string;
		aiReason?: string;
		censoredItemIndex?: string;
		censoredContent?: string;
		censoredReference?: string;
		censoredAction?: string;
		censoredContentTypes?: string;
		censoredMediaElement?: string;
		censoredReplacement?: string;
	}

	interface Film {
		id: string;
		name: string;
		fullName?: string;
		language: string;
		rating: string;
		duration?: number;
		certDate?: string;
		certNo?: string;
		applicant?: string;
		certifier?: string;
		cbfc_file_no?: string;
		modifications: Modification[];
		year?: string | number;
		posterUrl?: string;
	}

	interface Props {
		film: Film;
	}

	let { film }: Props = $props();

	let previousModificationsSignature = $state('');

	$effect(() => {
		// Create a signature based on film language and modification IDs to detect actual content changes
		const currentSignature = `${film.language}-${film.modifications?.map((m) => m.cutNo).join(',') || ''}`;

		// Only show toast if signature actually changed (not initial load)
		if (previousModificationsSignature && currentSignature !== previousModificationsSignature) {
			// Show Sonner toast - use unique modifications count to match header display
			const uniqueModifications = [
				...new Map(film.modifications.map((mod) => [mod.cutNo, mod])).values()
			];
			const modCount = uniqueModifications.length;
			toast.success(`Switched to ${film.language}`, {
				description: `${modCount} modification${modCount !== 1 ? 's' : ''}`,
				duration: 1000,
				unstyled: true,
				classes: {
					toast: 'bg-sepia-brown w-fit gap-2 py-2 px-4 flex items-center justify-center',
					description: 'text-sm'
				}
			});
		}

		previousModificationsSignature = currentSignature;
	});

	// Accordion toggle state
	let allExpanded = $state(false);
	let tableContainer: HTMLElement;

	// Toggle all accordions
	function toggleAllAccordions() {
		allExpanded = !allExpanded;

		// Use querySelector to find all details elements in the table
		if (tableContainer) {
			const allDetails = tableContainer.querySelectorAll('details');
			allDetails.forEach((details) => {
				details.open = allExpanded;
			});
		}
	}
</script>

<div bind:this={tableContainer}>
	{#if !film.modifications || film.modifications.length === 0}
		<div class="bg-alabaster/50 p-6 text-center text-sm text-gray-600 italic">
			No modifications recorded for this film.
		</div>
	{:else}
		<!-- Modifications table -->
		<div
			class="border-sepia-dark border-t-sepia-brown font-atkinson relative z-10 rounded-xs border shadow-md"
		>
			<Table.Root class="w-full">
				<Table.Header class="bg-sepia-brown">
					<Table.Row>
						<!-- <Table.Head class="p-1.5 text-left font-medium text-sepia-light">No.</Table.Head> -->
						<Table.Head
							class="text-sepia-light hidden px-2 text-left text-[10px] font-medium sm:table-cell sm:p-2.5 lg:p-2.5 lg:text-sm"
							>Action</Table.Head
						>
						<Table.Head
							class="text-sepia-light p-2.5 text-left text-[10px] font-medium lg:text-sm"
							style="width: auto;"
						>
							<div class="flex items-center gap-2">
								<button
									onclick={toggleAllAccordions}
									class="border-sepia-light/30 hover:bg-sepia-light/90 bg-sepia-light text-sepia-brown flex size-5 items-center justify-center rounded border transition-colors lg:size-6"
									aria-label={allExpanded ? 'Collapse all descriptions' : 'Expand all descriptions'}
								>
									{#if !allExpanded}
										<ChevronUp class="h-3 w-3" />
									{:else}
										<ChevronDown class="h-3 w-3" />
									{/if}
								</button>
								Description
							</div>
						</Table.Head>
						<Table.Head
							class="text-sepia-light flex w-20 items-center justify-end gap-1 p-2.5 text-[10px] font-medium whitespace-nowrap sm:w-24 lg:text-sm"
						>
							{@const uniqueModifications = [
								...new Map(film.modifications.map((mod) => [mod.cutNo, mod])).values()
							]}
							{@const totalDuration = uniqueModifications.reduce(
								(sum, mod) => sum + (mod.totalModifiedSecs || 0),
								0
							)}
							<Timer class="size-3 lg:size-4" />
							{formatDuration(totalDuration, 'short')}
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each [...new Map(film.modifications.map( (mod) => [mod.cutNo, mod] )).values()] as mod (mod.cutNo)}
						<Table.Row class="bg-sepia-light even:bg-sepia-med hover:bg-sepia-dark/20">
							<Table.Cell class="hidden px-2 py-3 text-left sm:table-cell sm:px-3 lg:px-3">
								{#if mod.aiActionTypes}
									<div class="flex flex-wrap justify-start gap-1">
										{#if mod.aiActionTypes.includes(';')}
											{#each [...new Set(mod.aiActionTypes.split(';'))] as actionType}
												{@const classes = getActionTypeClasses(actionType)}
												<span
													class="!first-letter:uppercase h-fit rounded-sm border px-1 text-[10px] font-normal text-nowrap lg:text-xs {classes.bg} {classes.border} {classes.text}"
												>
													{formatActionType(actionType)}
												</span>
											{/each}
										{:else}
											{@const classes = getActionTypeClasses(mod.aiActionTypes)}
											<span
												class="!first-letter:uppercase h-fit rounded-sm border px-1 text-[10px] font-normal text-nowrap lg:text-xs {classes.bg} {classes.border} {classes.text}"
											>
												{formatActionType(mod.aiActionTypes)}
											</span>
										{/if}
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell class="px-3 py-3 text-left">
								<div class="w-full">
									<!-- Show action tags on mobile -->
									{#if mod.aiActionTypes}
										<div class="mb-2 flex flex-wrap justify-start gap-1 sm:hidden">
											{#if mod.aiActionTypes.includes(';')}
												{#each [...new Set(mod.aiActionTypes.split(';'))] as actionType}
													{@const classes = getActionTypeClasses(actionType)}
													<span
														class="!first-letter:uppercase h-fit rounded-sm border px-1 text-[9px] font-normal break-words {classes.bg} {classes.border} {classes.text}"
													>
														{formatActionType(actionType)}
													</span>
												{/each}
											{:else}
												{@const classes = getActionTypeClasses(mod.aiActionTypes)}
												<span
													class="!first-letter:uppercase h-fit rounded-sm border px-1 text-[9px] font-normal break-words {classes.bg} {classes.border} {classes.text}"
												>
													{formatActionType(mod.aiActionTypes)}
												</span>
											{/if}
										</div>
									{/if}
									{#if mod.aiDescription}
										<details>
											<summary
												class="marker:text-sepia-brown hover:text-sepia-brown cursor-pointer text-sm text-gray-700 select-none"
											>
												{mod.aiDescription}
											</summary>
											<p class="mt-1 text-[11px] text-gray-500">{mod.description}</p>
										</details>
									{:else}
										{mod.description}
									{/if}
								</div>
							</Table.Cell>

							<Table.Cell
								class="w-20 px-3 py-3 text-right text-[11px] whitespace-nowrap sm:w-24 lg:text-sm"
							>
								{formatDuration(mod.totalModifiedSecs || 0, 'short')}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>
<p class="font-atkinson mt-2 text-sm text-gray-700">
	Modification summaries are processed by an LLM. For the original modification descriptions, click
	on the row to expand or visit the
	<span class="inline md:hidden">E-Cinepramaan</span>
	<a
		href={generateExternalLinks(film).eCinepramaan}
		class="hidden font-bold underline md:inline"
		target="_blank">E-Cinepramaan</a
	>
	page for this film.
</p>
