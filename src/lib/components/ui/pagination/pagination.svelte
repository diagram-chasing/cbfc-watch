<script lang="ts">
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type $$Props = PaginationPrimitive.RootProps;
	let className: $$Props['class'] = undefined;
	export let count: $$Props['count'];
	export let perPage: $$Props['perPage'] = 10;
	export let page: $$Props['page'] = undefined;
	export let siblingCount: $$Props['siblingCount'] = 1;
	export let loop: $$Props['loop'] = false;
	export let orientation: $$Props['orientation'] = 'horizontal';
	export let onPageChange: $$Props['onPageChange'] = undefined;
	export { className as class };
</script>

<PaginationPrimitive.Root
	class={cn('mx-auto flex w-full flex-col items-center', className)}
	{count}
	{perPage}
	bind:page
	{siblingCount}
	{loop}
	{orientation}
	{onPageChange}
	{...$$restProps}
>
	<slot />
</PaginationPrimitive.Root>
