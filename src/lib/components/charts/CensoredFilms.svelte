<script>
	import { Table } from '$lib/components/charts/tables';
	import * as Select from '$lib/components/ui/select/index.js';
	import topCensoredFilms from '$lib/data/charts/top_censored_films.json';

	let {
		title = 'Most Heavily Censored Films',
		subtitle = 'Films with the most content removed by CBFC offices'
	} = $props();

	let selectedOffice = $state('Mumbai');

	// Get unique offices for the select dropdown
	const uniqueOffices = [...new Set(topCensoredFilms.map((film) => film.Office))].sort();

	// Filter films by selected office
	const filteredFilms = $derived.by(() => {
		return topCensoredFilms.filter((film) => film.Office === selectedOffice);
	});

	// Convert time removed to numeric values for heatmap (parse "26m 22s" format)
	const dataWithNumericValues = $derived(
		filteredFilms.map((film) => {
			const timeStr = film['Time Removed'];
			const match = timeStr.match(/(\d+)m\s*(\d+)s/);
			const minutes = match ? parseInt(match[1]) : 0;
			const seconds = match ? parseInt(match[2]) : 0;
			const totalMinutes = minutes + seconds / 60;

			return {
				...film,
				'Duration Value': totalMinutes // For sorting and heatmap
			};
		})
	);

	const tableData = $derived.by(() => ({
		source: null, // Remove source for compact display
		data: dataWithNumericValues,
		columns: [
			{
				key: 'Office',
				label: 'Office',
				type: 'text',
				align: 'left'
			},
			{
				key: 'Film Name',
				label: 'Film',
				type: 'text',
				align: 'left',
				isLink: true,
				linkField: 'Slug',
				linkPrefix: '/film/'
			},
			{
				key: 'Time Removed',
				label: 'Duration',
				type: 'text',
				align: 'right',
				showBar: true,
				barColor: 'red',
				colorScale: 'cbfc_red',
				sortKey: 'Duration Value' // Use numeric value for sorting
			}
		],
		sort: {
			enabled: true,
			defaultColumn: 'Time Removed',
			defaultDirection: 'desc'
		},
		search: {
			enabled: false
		}
	}));
</script>

<div class="w-full">
	<div class="mb-3 flex items-center justify-between">
		<h3 class="font-atkinson text-md font-bold text-balance">{title}</h3>
		<Select.Root type="single" bind:value={selectedOffice}>
			<Select.Trigger class="bg-sepia-brown text-alabaster h-6 w-full max-w-[180px] rounded-xs">
				{selectedOffice}
			</Select.Trigger>
			<Select.Content class="bg-sepia-brown  text-alabaster">
				{#each uniqueOffices as office}
					<Select.Item class="hover:rounded-xs" value={office} label={office}>{office}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<p class="font-atkinson text-sm text-balance">{subtitle}</p>
	{#key selectedOffice}
		<Table data={tableData} />
	{/key}
</div>
