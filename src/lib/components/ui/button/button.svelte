<script lang="ts" module>
	import type { WithElementRef } from 'bits-ui';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'ring-offset-background focus-visible:ring-ring inline-flex font-atkinson items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
		variants: {
			variant: {
				default:
					'bg-gradient-to-b from-red to-[#c44a39] border-[#b43f30] border text-alabaster shadow-sm hover:from-red hover:to-[#ba4637]',

				yellow:
					'bg-gradient-to-b from-[var(--color-yellow)] to-[#d4a646] border-[#ba9139] border text-[var(--color-black)] shadow-sm hover:from-[var(--color-yellow)] hover:to-[#c99c41]',

				black:
					'bg-gradient-to-b from-[var(--color-black)] to-[#1e2936] border-[#0e161f] border text-alabaster shadow-sm hover:from-[var(--color-black)] hover:to-[#283440]',

				blue: 'bg-gradient-to-b from-[var(--color-blue)] to-[#4a89a7] border-[#3d7186] border text-white shadow-sm hover:from-[var(--color-blue)] hover:to-[#447d99]',

				green:
					'bg-gradient-to-b from-[var(--color-green)] to-[#7d8b67] border-[#6b7859] border text-alabaster shadow-sm hover:from-[var(--color-green)] hover:to-[#738161]',

				stamp:
					"bg-black text-alabaster border border-black rounded-none relative after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none hover:bg-[#0e161f]",

				card: 'bg-white border border-sepia-dark text-sepia-brown shadow-xs text-sm hover:bg-alabaster/90',

				title:
					'bg-red text-alabaster border-[1px] border-black shadow-inner font-gothic uppercase tracking-tight hover:bg-[#c44a39]',

				outline: 'border border-black/60 bg-transparent text-[var(--color-black)] hover:bg-black/5',

				ghost: 'hover:bg-black/5 text-[var(--color-black)]',

				link: 'text-red underline-offset-4 hover:underline p-0 h-auto font-medium',

				secondary:
					'bg-sepia-light text-[var(--color-black)] border border-[var(--color-black)]/20 hover:bg-sepia-med/90',

				destructive:
					'bg-gradient-to-b from-red to-[#c44a39] border-[#b43f30] border text-alabaster shadow-sm hover:from-red hover:to-[#ba4637]'
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 px-3 text-xs',
				lg: 'h-11 px-8 text-base',
				icon: 'h-10 w-10 p-0',
				xs: 'h-7 rounded-none px-2 text-xs',
				compact: 'h-8 px-3 text-xs',
				smallest: 'h-5 px-1 text-[10px]',

				// Custom retro-inspired size
				retro: 'h-10 px-4 py-3 text-[17px] leading-none'
			},
			rounded: {
				none: 'rounded-none',
				sm: 'rounded-sm',
				md: 'rounded-md',
				lg: 'rounded-lg',
				full: 'rounded-full'
			},
			grain: {
				true: "after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none relative",
				false: ''
			},
			hover: {
				true: 'hover:shadow-[inset_0_0_2px_rgba(255,255,255,0.3),0_1px_2px_rgba(0,0,0,0.4)]',
				false: ''
			},
			active: {
				true: 'active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.4)]',
				false: ''
			}
		},
		compoundVariants: [
			// Add grain effect to specific variants by default
			{
				variant: 'default',
				grain: undefined,
				class:
					"after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none relative"
			},
			{
				variant: 'destructive',
				grain: undefined,
				class:
					"after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none relative"
			},
			{
				variant: 'yellow',
				grain: undefined,
				class:
					"after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none relative"
			},
			{
				variant: 'title',
				grain: undefined,
				class:
					"after:content-[''] after:absolute after:inset-0 after:bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url%28%23noise%29%22%20opacity%3D%220.05%22%2F%3E%3C%2Fsvg%3E')] after:mix-blend-mode-overlay after:pointer-events-none relative"
			},

			// Default to rounded-none for a more retro look
			{ rounded: undefined, class: 'rounded-none' }
		],
		defaultVariants: {
			variant: 'default',
			size: 'default',
			rounded: 'none',
			hover: true,
			active: true
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a bind:this={ref} class={cn(buttonVariants({ variant, size }), className)} {href} {...restProps}>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
