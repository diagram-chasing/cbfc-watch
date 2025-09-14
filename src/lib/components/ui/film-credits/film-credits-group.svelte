<script lang="ts">
	import { cn } from '$lib/utils.js';
	import FilmCredit from './film-credit.svelte';
	import type { CreditItem } from './index.js';

	// Props
	export let credits: CreditItem[] = [];
	export let groupTitle: string | undefined = undefined;
	export let className: string | undefined = undefined; // For the container of individual credit items
	export let containerClass: string | undefined = undefined; // For the entire group including its title
	// This class should match the background of the direct parent card where these credits are displayed
	export let roleTextContainerBgClass: string = 'bg-zinc-900';
	export let flexWrapOnly: boolean = false;
	export let categoriesAvailability: Record<string, Record<string, boolean>> = {}; // Added prop
	// No group-level categoryId needed if passed within credit items
</script>

<div class={cn('mb-3', containerClass)}>
	{#if groupTitle}
		<h4 class="font-atkinson text-sepia-brown mb-1.5 text-sm font-semibold tracking-wide uppercase">
			{groupTitle}
		</h4>
	{/if}
	<div class={cn('space-y-0', className)}>
		{#each credits as credit}
			<FilmCredit
				role={credit.role}
				names={credit.names}
				categoryId={credit.categoryId}
				{categoriesAvailability}
				{roleTextContainerBgClass}
				{flexWrapOnly}
			/>
		{/each}
	</div>
</div>
