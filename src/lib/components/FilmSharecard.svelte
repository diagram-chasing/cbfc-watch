<script lang="ts">
	export let filmName: string = 'Film Name';
	export let rating: string = 'U';
	export let totalDuration: string = '2m 30s';
	export let deletions: number = 0;
	export let replacements: number = 0;
	export let totalEdits: number = 0;
	export let posterUrl: string = '';
	export let actionTypes: Array<{ name: string; value: number; color: string }> = [];
	export let cbfcFileNo: string = '';
	export let primaryContentType: string = '';

	// Calculate total for proportional widths
	$: totalActions = actionTypes.reduce((sum, type) => sum + type.value, 0);

	// Dynamic font size based on title length - increased for better visibility in OG images
	$: titleFontSize =
		filmName.length > 25
			? '48px'
			: filmName.length > 20
				? '56px'
				: filmName.length > 15
					? '72px'
					: '84px';

	// Filter out zero values for cleaner display
	$: statsToShow = [
		{ label: 'Deletions', value: deletions, color: '#db5441' },
		{ label: 'Replacements', value: replacements, color: '#db5441' },
		{ label: 'Modified', value: totalDuration, color: '#db5441', isDuration: true },
		{ label: 'Total Edits', value: totalEdits || deletions + replacements, color: '#8c9c74' }
	].filter((stat) => (typeof stat.value === 'number' && stat.value > 0) || stat.isDuration);
</script>

<div
	style="position: relative; display: flex; width: 1200px; height: 627px; background-color: #FEFBF7; background-image: url('https://preview.cbfc-watch.pages.dev/hero.png'); background-size: 100% 100%; background-position: center; background-repeat: no-repeat; border: 2px solid #3C3332;"
>
	<!-- Subtle overlay to maintain readability -->
	<div
		style="position: absolute; display:flex; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(254, 251, 247, 0.93); z-index: 1;"
	></div>
	<!-- Header Section -->
	<div
		style="position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; z-index: 2;"
	>
		<!-- Top Header -->
		<div
			style="display: flex; justify-content: space-between; align-items: center; padding: 30px 150px; background-color: #F0E9E0; border-bottom: 1px solid #BFB2A2;"
		>
			<div style="display: flex; align-items: center; gap: 20px;">
				<span
					style="color: #db5441; font-size: 64px; font-family: 'League Gothic', sans-serif; font-weight: 900; text-transform: uppercase; text-shadow: 2px 2px 0px black;"
					>CBFC.WATCH</span
				>
				<div style="display: flex; flex-direction: column; gap: 2px;">
					<span
						style="font-size: 16px; font-family: 'Atkinson Hyperlegible', sans-serif; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;"
						>Open source archive of
					</span>
					<span
						style="font-size: 16px; font-family: 'Atkinson Hyperlegible', sans-serif; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;"
					>
						CBFC censorship decisions</span
					>
				</div>
			</div>
		</div>

		<!-- Main Content Area -->
		<div style="display: flex; flex: 1; padding: 50px 150px;">
			<!-- Left Content -->
			<div style="display: flex; flex-direction: column; flex: 1; gap: 25px;">
				<!-- Film Title Section -->
				<div style="display: flex; flex-direction: column; gap: 15px;">
					<div style="display: flex; align-items: center; gap: 15px; padding-bottom: 8px;">
						{#if rating}
							<div
								style="display: flex; align-items: center; justify-content: center; padding: 6px 12px; background-color: #db5441; color: white; border-radius: 4px; font-size: 18px; font-weight: bold; font-family: 'Atkinson Hyperlegible', sans-serif;"
							>
								{rating} RATED
							</div>
						{/if}
					</div>
					<h1
						style="font-size: {titleFontSize}; font-weight: 700; color: #3C3332; font-family: 'Atkinson Hyperlegible', sans-serif; line-height: 1.1; margin: 0; word-wrap: break-word; overflow-wrap: break-word;"
					>
						{filmName}
					</h1>
				</div>

				<!-- Analysis Summary -->
				<div style="display: flex; flex-direction: column; gap: 15px;">
					<div
						style="display: flex; align-items: center; gap: 15px; padding-bottom: 8px; border-bottom: 1px solid #BFB2A2;"
					>
						<span
							style="font-size: 20px; font-family: 'Atkinson Hyperlegible', sans-serif; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px;"
							>CENSORSHIP SUMMARY</span
						>
					</div>
					<div style="display: flex; gap: 8px;  justify-content: flex-start;">
						{#each statsToShow as stat}
							<div
								style="display: flex; flex-direction: column; align-items: center; padding: 12px 2px; min-width: 120px;"
							>
								<span
									style="font-size: 56px; font-weight: 700; color: {stat.color}; font-family: 'Atkinson Hyperlegible', sans-serif; line-height: 1; text-shadow: 1px 1px 2px rgba(0,0,0,0.1);"
									>{stat.isDuration ? stat.value : stat.value}</span
								>
								<span
									style="font-size: 15px; color: #3C3332; font-family: 'Atkinson Hyperlegible', sans-serif; font-weight: 900; text-transform: uppercase; margin-top: 6px; text-align: center; letter-spacing: 1px;"
									>{stat.label}</span
								>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- Right Sidebar with Poster -->
			{#if posterUrl}
				<div style="display: flex; flex-direction: column; margin-left: 30px; width: 220px;">
					<div style="position: relative; display: flex;">
						<img
							src={posterUrl}
							alt="Film Poster"
							style="display: flex; width: 220px; height: 300px; object-fit: cover; border-radius: 4px; box-shadow: 0 6px 16px rgba(0,0,0,0.15); border: 2px solid #BFB2A2;"
						/>

						<!-- Archive Classification Overlay -->
						<div
							style="position: absolute; top: 10px; left: 10px; background-color: rgba(240, 233, 224, 0.95); padding: 6px 8px; border-radius: 2px; border: 1px solid #BFB2A2; display: flex;"
						>
							<span
								style="font-size: 9px; font-family: 'Atkinson Hyperlegible', sans-serif; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 1px;"
								>ARCHIVED</span
							>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	{#if actionTypes.length > 0 && totalActions > 0}
		<div
			style="position: absolute; bottom: 0; left: 0; width: 1200px; height: 10px; display: flex; gap:6px; z-index: 3;"
		>
			{#each actionTypes as actionType}
				<div
					style="display: flex; background-color: {actionType.color}; border: 1px solid #BFB2A2; width: {(actionType.value /
						totalActions) *
						100}%; height: 10px;"
				>
					<span style="display: contents;"></span>
				</div>
			{/each}
		</div>
	{/if}
</div>
