<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { browser } from '$app/environment';
	import { Dialog as DialogPrimitive } from 'bits-ui';

	interface Props {
		id?: string;
		class?: string;
		labelText?: string;
		size?: 'normal' | 'small';
	}

	let {
		id = 'sfw-mode',
		class: className = '',
		labelText = 'SFW Mode',
		size = 'normal'
	}: Props = $props();

	let sfwMode = $state(false);
	let showDialog = $state(false);

	$effect(() => {
		if (browser) {
			sfwMode = document.cookie.includes('sfw_mode=true');
		}
	});

	function shouldShowFirstTimeDialog(): boolean {
		if (!browser) return false;

		const lastShown = document.cookie
			.split('; ')
			.find((row) => row.startsWith('sfw_dialog_shown='))
			?.split('=')[1];

		if (!lastShown) return true;

		const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
		return parseInt(lastShown) < twoWeeksAgo;
	}

	function markDialogAsShown() {
		if (browser) {
			document.cookie = `sfw_dialog_shown=${Date.now()}; path=/; max-age=31536000`;
		}
	}

	let pendingToggleValue: boolean | null = $state(null);

	function handleSfwModeChange(checked: boolean) {
		if (browser) {
			// Show dialog on first use or after 2 weeks
			if (shouldShowFirstTimeDialog()) {
				pendingToggleValue = checked;
				showDialog = true;
				markDialogAsShown();
				return; // Don't apply change yet
			}

			// Apply change immediately if no dialog needed
			applyToggleChange(checked);
		}
	}

	function applyToggleChange(checked: boolean) {
		if (browser) {
			document.cookie = `sfw_mode=${checked}; path=/; max-age=31536000`;
			window.location.reload();
		}
	}

	function handleDialogClose(open: boolean) {
		showDialog = open;

		// If dialog is being closed and we have a pending toggle value, apply it
		if (!open && pendingToggleValue !== null) {
			applyToggleChange(pendingToggleValue);
			pendingToggleValue = null;
		}
	}

	const switchClass = size === 'small' ? 'scale-75' : '';
	const labelClass = size === 'small' ? 'text-xs' : 'text-sm';
</script>

<div class="flex items-center space-x-2 {className}">
	<Switch {id} bind:checked={sfwMode} onCheckedChange={handleSfwModeChange} class={switchClass} />
	<Label for={id} class="{labelClass} text-sepia-brown font-medium">{labelText}</Label>
</div>

{#if showDialog}
	<DialogPrimitive.Root open={showDialog} onOpenChange={handleDialogClose}>
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
				style="animation-duration: 150ms; animation-timing-function: var(--ease-out-quad);"
			/>
			<DialogPrimitive.Content
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 h-fit w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sm border bg-white p-4 shadow-xl"
				style="animation-duration: 200ms; animation-timing-function: var(--ease-out-quart);"
				preventScroll={false}
			>
				<div class="mb-2 flex items-center justify-between">
					<h2 class="text-lg font-semibold">Safe Mode</h2>
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

				<div class="space-y-3">
					<p class="text-sm text-gray-600">
						Some of the analysis and sections on this site contain words and phrases which may be
						offensive, triggering, or not appropriate for a work environment.
					</p>
					<p class="text-sm text-gray-600">
						When Safe Mode is enabled, the page will reload and potentially sensitive content will
						be blurred throughout the site (yes, this may be a little ironic). You can hover over
						blurred text to reveal it if needed.
					</p>
					<p class="text-xs text-gray-500">
						This setting is saved in your browser and will be remembered across visits.
					</p>
				</div>
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	</DialogPrimitive.Root>
{/if}
