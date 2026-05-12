<script lang="ts">
	import { Table } from '$lib/components/charts/tables';

	let { data } = $props();

	const tableData = $derived({
		search: {
			enabled: true,
			placeholder: 'Search films...',
			fields: ['name', 'language', 'rating']
		},
		sort: {
			enabled: true
		},
		pagination: {
			enabled: true,
			itemsPerPage: 50
		},
		columns: [
			{ key: 'date', label: 'Date', type: 'text', sortable: false },
			{
				key: 'name',
				label: 'Film',
				type: 'text',
				bold: true,
				isLink: true,
				linkField: 'slug',
				linkPrefix: '/film/'
			},
			{ key: 'year', label: 'Year', type: 'number', precision: 0 },
			{ key: 'language', label: 'Language', type: 'text' },
			{ key: 'rating', label: 'Rating', type: 'text' }
		],
		data: data.films || []
	});
</script>

<main class="mx-auto w-full max-w-4xl">
	<header class="mb-6">
		<h1
			class="font-gothic mb-2 text-4xl leading-tight font-bold tracking-[-0.01em] text-black sm:text-5xl md:text-6xl"
		>
			Archival Log
		</h1>
		<p class="font-atkinson max-w-2xl text-base text-gray-700">
			Films newly entered into the CBFC archive, sorted by date of certification.
		</p>
	</header>

	{#if data.error}
		<div class="border-sepia-dark rounded-xs border bg-red-50 p-2 shadow-xs">
			<p class="font-atkinson text-sm text-red-800">{data.error}</p>
		</div>
	{:else if !data.films?.length}
		<div class="border-sepia-dark bg-sepia-light rounded-xs border p-4 text-center shadow-xs">
			<p class="font-atkinson text-sepia-brown text-sm">No records found.</p>
		</div>
	{:else}
		<article class="border-sepia-dark bg-sepia-light border p-3 shadow-sm md:p-4">
			<Table data={tableData} />
		</article>
	{/if}
</main>
