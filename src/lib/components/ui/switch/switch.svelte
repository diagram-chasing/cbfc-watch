<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	type $$Props = SwitchPrimitive.Props;
	type $$Events = SwitchPrimitive.Events;

	let className: $$Props['class'] = undefined;
	export let checked: $$Props['checked'] = undefined;
	export { className as class };
</script>

<SwitchPrimitive.Root
	bind:checked
	class={cn(
		'focus-visible:ring-ring focus-visible:ring-offset-background peer data-[state=checked]:from-red data-[state=unchecked]:bg-sepia-med inline-flex h-4 w-9 shrink-0 cursor-pointer items-center rounded-none border border-black shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#b43f30] data-[state=checked]:bg-gradient-to-b data-[state=checked]:to-[#c44a39] data-[state=unchecked]:border-[var(--color-black)]/20',
		className
	)}
	{...$$restProps}
	on:click
	on:keydown
>
	<SwitchPrimitive.Thumb
		class={cn(
			'pointer-events-none block h-3 w-3 rounded-none bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5'
		)}
	/>
</SwitchPrimitive.Root>
