<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { tv, type VariantProps } from 'tailwind-variants';
	import { slugify } from '$lib/utils/core';
	import { getCategoryUrlPath, getValueMapping } from '../../../../routes/browse/categories';

	// Define credit variations
	const filmCreditVariants = tv({
		base: 'inline-flex items-center justify-between w-full font-atkinson',
		variants: {
			variant: {
				default: 'text-gray-400',
				filled: 'bg-neutral-800 text-white',
				outlined: 'border border-sepia-brown text-gray-300'
			},
			size: {
				default: 'text-sm',
				sm: 'text-xs',
				lg: 'text-base'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	// Define props
	export let role: string | undefined = undefined;
	export let names: string[] = [];
	export let variant: VariantProps<typeof filmCreditVariants>['variant'] = 'default';
	export let size: VariantProps<typeof filmCreditVariants>['size'] = 'default';
	export let className: string | undefined = undefined;
	export let roleTextContainerBgClass: string = 'bg-zinc-900'; // Defaulting to a common dark bg
	export let flexWrapOnly: boolean = false;

	// Added props for conditional linking
	export let categoriesAvailability: Record<string, Record<string, boolean>> = {};
	export let categoryId: string | undefined = undefined;

	// Base classes for the items (link or span)
	const itemBaseStyle =
		'inline-block rounded-[3px] px-[6px] py-[2px] text-[10px] leading-tight shadow-xs sm:text-[11px]';

	// Classes for clickable links
	const linkSpecificStyle =
		'border border-sepia-brown/50 bg-sepia-med text-sepia-brown transition-colors hover:bg-sepia-dark/50 hover:text-sepia-red';

	// Classes for non-clickable (disabled) items - visually distinct
	const disabledSpecificStyle =
		'border border-sepia-brown/30 bg-gray-200 text-black/60 opacity-90 cursor-default';

	// Helper function to get display name and slug for a value
	function getDisplayInfo(name: string) {
		if (categoryId && ['aiContentTypes', 'aiActionTypes', 'aiMediaElements'].includes(categoryId)) {
			const mapping = getValueMapping(categoryId, name);
			return {
				display: mapping.display,
				slug: mapping.slug
			};
		}
		// For other categories, use original logic
		return {
			display: name,
			slug: slugify(name)
		};
	}
</script>

{#if flexWrapOnly}
	<div class="flex flex-wrap gap-1.5 pb-1">
		{#each names as name, i (name + '-' + i)}
			{@const { display, slug } = getDisplayInfo(name)}
			{#if categoryId}
				<a
					href={`/browse/${getCategoryUrlPath(categoryId)}/${encodeURIComponent(slug)}`}
					class="{itemBaseStyle} {linkSpecificStyle}"
				>
					{display}
				</a>
			{:else}
				<span class="{itemBaseStyle} {disabledSpecificStyle}">
					{display}
				</span>
			{/if}
		{/each}
	</div>
{:else}
	<div class="clearfix mb-2.5">
		<!-- Role Column -->
		<div
			class="border-sepia-dark relative float-left w-[35%] border-b border-dotted pb-0.5 sm:w-36"
		>
			<span
				class="{roleTextContainerBgClass} text-sepia-brown relative top-[0.4em] pr-1 text-[10px] leading-none font-medium tracking-wide uppercase sm:top-[0.45em] sm:text-[11px]"
			>
				{role || ''}
			</span>
		</div>

		<!-- Names Column -->
		<div class=" ml-[calc(35%+0.5rem)] sm:ml-[calc(9rem+0.75rem)]">
			<div class=" inline-block align-bottom">
				{#each names as name, i (name + '-' + i)}
					{@const { display, slug } = getDisplayInfo(name)}
					{#if categoryId}
						<a
							href={`/browse/${getCategoryUrlPath(categoryId)}/${encodeURIComponent(slug)}`}
							class="{itemBaseStyle} {linkSpecificStyle} font-atkinson mr-1.5 mb-1"
						>
							{display}
						</a>
					{:else}
						<span class="{itemBaseStyle} {disabledSpecificStyle} font-atkinson mr-1.5 mb-1">
							{display}
						</span>
					{/if}
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.clearfix::after {
		content: '';
		clear: both;
		display: table;
	}
</style>
