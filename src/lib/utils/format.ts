import * as d3 from 'd3';

type FormatOptions = {
	decimals?: number;
	commas?: boolean;
	compact?: boolean;
	prefix?: string;
	suffix?: string;
	locale?: string;
	notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
	unit?: string;
	unitDisplay?: 'long' | 'short' | 'narrow';
	signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
	style?: 'decimal' | 'currency' | 'percent' | 'unit';
	currency?: string;
	minimumFractionDigits?: number;
	maximumFractionDigits?: number;
};

/**
 * Format numbers using d3 with extensive options
 * @param value - Number to format
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(value: number, options: FormatOptions = {}): string {
	const {
		decimals = 0,
		commas = true,
		compact = false,
		prefix = '',
		suffix = '',
		locale = 'en-US',
		notation = 'standard',
		unit,
		unitDisplay = 'short',
		signDisplay = 'auto',
		style = 'decimal',
		currency = 'USD',
		minimumFractionDigits,
		maximumFractionDigits
	} = options;

	// Create formatter with appropriate options
	let formatter: d3.FormatSpecifier;

	if (style === 'currency') {
		formatter = d3.formatLocale(locale).format('$,.2f');
	} else if (style === 'percent') {
		formatter = d3.formatLocale(locale).format(compact ? ',.0%' : ',.2%');
	} else if (unit) {
		// For unit formatting, we'd need Intl.NumberFormat
		// This is a simplified approach
		const numFormat = new Intl.NumberFormat(locale, {
			style: 'unit',
			unit,
			unitDisplay,
			notation,
			signDisplay,
			minimumFractionDigits: minimumFractionDigits ?? decimals,
			maximumFractionDigits: maximumFractionDigits ?? decimals
		});
		return prefix + numFormat.format(value) + suffix;
	} else {
		// Create a format string based on options
		let formatStr = '';

		if (commas) formatStr += ','; // Only add commas if commas is true

		if (compact) {
			// Use a custom compact formatter that doesn't round as aggressively
			const suffixes = ['', 'K', 'M', 'B', 'T'];
			let tier = 0;
			let scaledValue = value;

			while (Math.abs(scaledValue) >= 1000 && tier < suffixes.length - 1) {
				scaledValue /= 1000;
				tier++;
			}

			if (tier === 0) {
				return prefix + commas ? d3.format(',')(value) + suffix : value.toString() + suffix;
			}

			const precision = decimals > 0 ? decimals : scaledValue < 10 ? 1 : 0;
			const formatted = scaledValue.toFixed(precision);
			return prefix + formatted + suffixes[tier] + suffix;
		} else {
			formatStr += `.${decimals}f`; // Fixed decimals
		}

		formatter = d3.formatLocale(locale).format(formatStr);
	}

	// Apply the formatter and add prefix/suffix
	return prefix + formatter(value) + suffix;
}

/**
 * Format a date using d3
 * @param date - Date to format
 * @param format - Format string (d3 time format)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number, format = '%Y-%m-%d'): string {
	const d = date instanceof Date ? date : new Date(date);
	return d3.timeFormat(format)(d);
}

/**
 * Format date for display in Indian locale (from film-utils.ts)
 */
export function formatDateIndia(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	});
}

/**
 * Format certification date for display (from film-utils.ts)
 */
export function formatCertDate(dateString: string): string {
	if (!dateString) return 'Unknown';

	return new Date(dateString)
		.toLocaleDateString('en-IN', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
		.replace(/(\d+)\s+(\w+)\s+(\d+)/, '$1 $2, $3');
}

/**
 * Format a duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @param format - 'short' | 'long' | 'compact'
 * @returns Formatted duration string
 */
export function formatDuration(
	seconds: number,
	format: 'short' | 'long' | 'compact' = 'short'
): string {
	if (format === 'compact') {
		return d3.format('.0s')(seconds);
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (format === 'short') {
		if (hours > 0) return `${hours}h ${minutes}m`;
		if (minutes > 0) return `${minutes}m ${secs}s`;
		return `${secs}s`;
	}

	// Long format
	if (hours > 0)
		return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
	if (minutes > 0)
		return `${minutes} minute${minutes !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
	return `${secs} second${secs !== 1 ? 's' : ''}`;
}
