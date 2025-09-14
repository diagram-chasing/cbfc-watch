<script lang="ts">
	import { Plot, BarX, Text, TickX, AxisY } from 'svelteplot';
	let {
		title,
		subtitle,
		data,
		xLabel,
		yLabel,
		yTickFormat = undefined,
		xTickFormat = undefined,
		barFill = 'var(--color-sepia-brown)',
		barStroke = 'var(--color-sepia-brown)',
		textFill = 'var(--color-sepia-light)',
		textFillMobile = 'black',
		yField = undefined,
		valueField = undefined,
		maxItems = 10
	} = $props();
	let sortedData = $derived(
		[...data]
			.sort((a, b) => {
				const getValue = (item: any) => {
					if (valueField) return item[valueField];
					return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
				};
				return getValue(a) - getValue(b);
			})
			.slice(-maxItems)
	);
</script>

<div class="w-full">
	<div class="space-y-2">
		<h3 class="font-atkinson text-md font-bold text-balance">{title}</h3>
		<p class="font-atkinson text-sm">{subtitle}</p>
	</div>
	<Plot
		height={300}
		x={{
			label: xLabel,
			tickFormat: xTickFormat,
			domain: [
				0,
				Math.max(
					...sortedData.map((d) => {
						if (valueField) return d[valueField];
						return d.total_mean || d.mean_total_secs / 60 || d.n || 0;
					})
				) * 1.3
			]
		}}
		y={{
			type: 'band',
			domain: sortedData.map((d) => {
				if (yField) return d[yField];
				return d.office || d.language || d.ai_content_types || d.pretty_name;
			}),
			label: yLabel,
			tickFormat: yTickFormat
		}}
	>
		<BarX
			data={sortedData}
			y={yField ||
				(data[0]?.office
					? 'office'
					: data[0]?.language
						? 'language'
						: data[0]?.ai_content_types
							? 'ai_content_types'
							: 'pretty_name')}
			x1="0"
			x2={(d) => {
				if (valueField) return d[valueField];
				return d.total_mean || d.mean_total_secs / 60 || d.n || 0;
			}}
			fill={barFill}
			stroke={barStroke}
		/>
		<AxisY stroke={barStroke} strokeWidth={1} />

		<Text
			data={sortedData}
			y={yField ||
				(data[0]?.office
					? 'office'
					: data[0]?.language
						? 'language'
						: data[0]?.ai_content_types
							? 'ai_content_types'
							: 'pretty_name')}
			dx={(d) => {
				const getValue = (item: any) => {
					if (valueField) return item[valueField];
					return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
				};
				const value = getValue(d);
				const maxValue = Math.max(
					...sortedData.map((item) => {
						if (valueField) return item[valueField];
						return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
					})
				);

				const relativeWidth = value / maxValue;

				// Simple threshold: if bar is less than 30% of max, put text outside
				return relativeWidth < 0.5 ? 25 : -25;
			}}
			x={(d) => {
				const getValue = (item: any) => {
					if (valueField) return item[valueField];
					return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
				};
				const value = getValue(d);
				const maxValue = Math.max(
					...sortedData.map((item) => {
						if (valueField) return item[valueField];
						return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
					})
				);

				const relativeWidth = value / maxValue;

				// If bar is small, position text at end of bar
				if (relativeWidth < 0.25) {
					return value;
				}
				// Otherwise position text inside the bar
				return value;
			}}
			text={(d) => {
				const getValue = (item: any) => {
					if (valueField) return item[valueField];
					return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
				};
				const value = getValue(d);

				// Format based on data type
				if (d.total_mean || d.mean_total_secs) {
					return value < 1 ? `${(value * 60).toFixed(0)} sec` : `${value.toFixed(1)} min`;
				}
				return value.toLocaleString();
			}}
			fontSize={12}
			fill={(d) => {
				const getValue = (item: any) => {
					if (valueField) return item[valueField];
					return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
				};
				const value = getValue(d);
				const maxValue = Math.max(
					...sortedData.map((item) => {
						if (valueField) return item[valueField];
						return item.total_mean || item.mean_total_secs / 60 || item.n || 0;
					})
				);

				const relativeWidth = value / maxValue;

				// Simple: small bars get dark text (outside), large bars get light text (inside)
				return relativeWidth < 0.5 ? textFillMobile : textFill;
			}}
		/>
	</Plot>
</div>
