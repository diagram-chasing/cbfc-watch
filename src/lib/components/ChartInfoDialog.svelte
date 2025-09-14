<script lang="ts">
	import { Info } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface ChartInfoDialogProps {
		title: string;
		description: string;
		chart: Snippet;
		onOpenChange?: (open: boolean) => void;
	}

	let { title, description, chart, onOpenChange }: ChartInfoDialogProps = $props();
</script>

<DialogPrimitive.Root {onOpenChange}>
	<DialogPrimitive.Trigger>
		<Button
			variant="ghost"
			size="icon"
			class="h-fit w-fit rounded-full p-0 text-gray-500 hover:text-gray-700"
			aria-label="Show chart information"
			title="Learn more about this chart"
		>
			<Info class="size-4" />
		</Button>
	</DialogPrimitive.Trigger>

	<DialogPrimitive.Portal>
		<DialogPrimitive.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
			style="animation-duration: 150ms; animation-timing-function: var(--ease-out-quad);"
		/>
		<DialogPrimitive.Content
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95  fixed top-1/2 left-1/2 z-50 h-fit w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-sm border bg-white p-4 shadow-xl"
			style="animation-duration: 200ms; animation-timing-function: var(--ease-out-quart);"
			preventScroll={false}
		>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-lg font-semibold">{title}</h2>
				<DialogPrimitive.Close
					class="rounded-sm opacity-70 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</DialogPrimitive.Close>
			</div>

			<p class="mb-4 text-sm text-gray-600">{description}</p>

			<div class="rounded-md">
				{@render chart()}
			</div>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
