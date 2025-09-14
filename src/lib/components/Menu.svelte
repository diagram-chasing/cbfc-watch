<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import XIcon from '@lucide/svelte/icons/x';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { page } from '$app/stores';
	import SafeMode from '$lib/components/SafeMode.svelte';

	interface NavItem {
		label: string;
		href: string;
		variant: string;
	}

	interface Props {
		items: NavItem[];
		open?: boolean;
		onToggle?: () => void;
		onClose?: () => void;
	}

	let { items, open = $bindable(false), onToggle, onClose }: Props = $props();

	function getVariant(item: NavItem) {
		return $page.url.pathname === item.href
			? 'stamp'
			: typeof item.variant === 'string'
				? item.variant
				: 'card';
	}

	function toggleSidebar() {
		open = !open;
		onToggle?.();
	}

	function closeSidebar() {
		open = false;
		onClose?.();
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeSidebar();
		}
	}
</script>

<!-- Desktop Navigation -->
<nav class="navigation-unified hidden items-center space-x-1 md:ml-auto md:flex">
	{#each items as item}
		<Button variant={getVariant(item)} size="sm" href={item.href}>
			{item.label}
		</Button>
	{/each}
</nav>

<!-- Mobile Menu Button -->
<Button
	variant="stamp"
	size="compact"
	class="ml-auto md:hidden"
	onclick={toggleSidebar}
	aria-label="Open menu"
>
	<MenuIcon class="size-5" />
</Button>

<!-- Mobile Sidebar overlay -->
{#if open}
	<div
		class="fixed inset-0 z-50 bg-black/50"
		onclick={handleOverlayClick}
		onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
		role="button"
		tabindex="-1"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Mobile Sidebar -->
<div
	class="grain-effect fixed top-0 right-0 z-50 h-full w-2/3 transform border-l border-gray-200/60 bg-white/95 shadow-2xl transition-transform duration-300 ease-in-out {open
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<!-- Header with close button -->
	<div
		class="relative flex items-center justify-between border-b border-gray-200/60 bg-white/50 p-4 md:p-6"
	>
		<SafeMode id="sfw-mode-menu" labelText="Safe mode" />
		<Button variant="secondary" size="sm" onclick={closeSidebar} class="hover:bg-gray-100/80">
			<XIcon class="h-4 w-4" />
		</Button>
	</div>

	<!-- Navigation -->
	<nav class=" space-y-4 p-2">
		<div class="mb-6">
			<div class="space-y-2">
				{#each items as item}
					<div class="group">
						<Button
							variant={$page.url.pathname === item.href ? 'stamp' : 'outline'}
							size="default"
							href={item.href}
							class="h-14 w-full justify-start gap-4 {$page.url.pathname === item.href
								? ''
								: 'border-gray-200/60 bg-white/50 shadow-xs backdrop-blur-xs transition-all duration-200 group-hover:shadow-sm hover:border-gray-300 hover:bg-gray-50/80'}"
							onclick={closeSidebar}
						>
							<div class="flex-1 text-left">
								<span
									class="font-atkinson block font-medium {$page.url.pathname === item.href
										? 'text-white'
										: 'text-black'}">{item.label}</span
								>
							</div>
						</Button>
					</div>
				{/each}
			</div>
		</div>
	</nav>
</div>
