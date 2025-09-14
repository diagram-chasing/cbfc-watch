<script lang="ts">
	import { page } from '$app/state';
	import Menu from './Menu.svelte';
	const items = [
		{
			label: 'Home',
			href: '/',
			variant: 'card'
		},
		{
			label: 'Search',
			href: '/search',
			variant: 'card'
		},
		{
			label: 'Stats',
			href: '/stats',
			variant: 'card'
		},
		{
			label: 'About',
			href: '/about',
			variant: 'card'
		},
		{
			label: 'Contribute',
			href: '/contribute',
			variant: 'card'
		}
	];

	let open = $state(false);
	let isHomePage = $derived(page.url.pathname === '/');
</script>

<header class=" z-10 mx-auto flex w-full items-center">
	<div class="mx-auto flex w-full items-center justify-center">
		<div
			class="{!isHomePage
				? ''
				: 'border-transparent bg-transparent'} mx-auto flex w-full max-w-4xl items-center justify-between py-4"
		>
			{#if !isHomePage}
				<!-- Logo -->
				<a href="/" class="m-0 flex items-center p-0">
					<h1
						class="font-gothic text-red m-0 p-0 text-3xl font-medium drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] sm:text-4xl md:text-4xl"
					>
						CBFC <span class="redaction-container"> Watch</span>
					</h1>
				</a>
			{:else}
				<div class="flex items-center"></div>
			{/if}

			<div class="hidden items-center gap-4 md:flex">
				<Menu {items} bind:open />
			</div>
			<div class="flex items-center md:hidden">
				<Menu {items} bind:open />
			</div>
		</div>
	</div>
</header>

<style lang="postcss">
	header {
		view-transition-name: header;
	}

	.redaction-container {
		position: relative;
		display: inline-block;
	}

	.redaction-container::after {
		content: '';
		position: absolute;
		top: 55%;
		transform: translateY(-55%);
		left: 0;
		height: 15%;
		width: 100%;
		background-color: black;
		z-index: 1;
	}
</style>
