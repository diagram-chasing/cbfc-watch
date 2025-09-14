<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import {
		type Props,
		buttonVariants,
		type ButtonVariant,
		type ButtonSize
	} from '$lib/components/ui/button/index.js';

	let {
		ref = $bindable(null),
		class: className,
		size = 'compact' as ButtonSize,
		isActive = false,
		activeVariant = 'default' as ButtonVariant,
		inactiveVariant = 'outline' as ButtonVariant,
		page,
		children,
		...restProps
	}: PaginationPrimitive.PageProps &
		Props & {
			isActive: boolean;
			activeVariant?: ButtonVariant;
			inactiveVariant?: ButtonVariant;
		} = $props();
</script>

{#snippet Fallback()}
	{page.value}
{/snippet}

<PaginationPrimitive.Page
	bind:ref
	{page}
	class={cn(
		buttonVariants({
			variant: isActive ? activeVariant : inactiveVariant,
			size
		}),
		className
	)}
	children={children || Fallback}
	{...restProps}
/>
