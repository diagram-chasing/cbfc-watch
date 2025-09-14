<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type $$Props = AccordionPrimitive.ContentProps;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<AccordionPrimitive.Content
	class={cn('overflow-hidden text-sm transition-all', className)}
	{...$$restProps}
>
	<div class="pt-0 pb-4">
		<slot />
	</div>
</AccordionPrimitive.Content>
