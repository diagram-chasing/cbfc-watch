<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import {
		buttonVariants,
		type ButtonVariant,
		type ButtonSize
	} from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'outline' as ButtonVariant,
		size = 'compact' as ButtonSize,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} = $props();
</script>

{#snippet Fallback()}
	<ChevronLeft class="size-4" />
	<span>Previous</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	class={cn(
		buttonVariants({
			variant,
			size,
			class: 'gap-1 pl-2.5'
		}),
		className
	)}
	children={children || Fallback}
	{...restProps}
/>
