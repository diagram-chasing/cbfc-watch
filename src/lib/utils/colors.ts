import { extractColors } from 'extract-colors';

// Add a cache for color information to prevent duplicate processing
const colorCache = new Map<string, { dominantColor: string; textColor: string }>();

// Calculate text color based on background brightness
function getTextColor(color: string): string {
	// Check if color is HSL format
	if (color.startsWith('hsl')) {
		// Parse HSL values
		const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
		if (match) {
			// We mainly care about lightness for text contrast
			const lightness = parseInt(match[3]);
			return lightness > 60 ? 'text-black' : 'text-white';
		}
	} else if (color.startsWith('#')) {
		// Original hex handling
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		const brightness = (r * 299 + g * 587 + b * 114) / 1000;
		return brightness > 198 ? 'text-black' : 'text-white';
	}

	// Default to white text if color format is unknown
	return 'text-white';
}

// Convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
	// Convert hex to rgb
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return { h: 0, s: 0, l: 0 };

	let r = parseInt(result[1], 16) / 255;
	let g = parseInt(result[2], 16) / 255;
	let b = parseInt(result[3], 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0,
		s = 0,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h = Math.round(h * 60);
	}

	s = Math.round(s * 100);
	l = Math.round(l * 100);

	return { h, s, l };
}

// Soften color by reducing saturation and adjusting lightness
function softenColor(hexColor: string): string {
	const hsl = hexToHSL(hexColor);

	// Reduce saturation by 40%
	const softSaturation = Math.min(Math.round(hsl.s * 0.6), 55);

	// Adjust lightness to be more moderate (40-70% range)
	let softLightness = hsl.l;
	if (softLightness < 40) softLightness = 40 + softLightness * 0.2;
	if (softLightness > 70) softLightness = 70 - (softLightness - 70) * 0.2;

	return `hsl(${hsl.h}, ${softSaturation}%, ${Math.round(softLightness)}%)`;
}

// Darken color for better white text contrast
function darkenColor(hexColor: string): string {
	const hsl = hexToHSL(hexColor);

	// Maintain or slightly increase saturation for richer colors
	const darkSaturation = Math.min(Math.round(hsl.s * 5.2), 55);

	// Adjust lightness to be darker (15-45% range) for good white text contrast
	let darkLightness = hsl.l;
	if (darkLightness > 45) darkLightness = 15 + (darkLightness - 45) * 0.5;
	if (darkLightness < 15) darkLightness = 10;

	return `hsl(${hsl.h}, ${darkSaturation}%, ${Math.round(darkLightness)}%)`;
}

async function getColorInfo(url: string, variant: 'soft' | 'dark' = 'soft') {
	// Create cache key with variant
	const cacheKey = `${url}-${variant}`;

	// Check if we already have the color in cache
	if (colorCache.has(cacheKey)) {
		return colorCache.get(cacheKey);
	}

	try {
		const colors = await extractColors(url, {
			pixels: 10000,
			distance: 0.1,
			saturationDistance: 0.1,
			lightnessDistance: 0.1,
			hueDistance: 0.1
		});

		if (colors && colors.length > 0) {
			const processedColor =
				variant === 'dark' ? darkenColor(colors[0].hex) : softenColor(colors[0].hex);

			const result = {
				dominantColor: processedColor,
				textColor: getTextColor(processedColor)
			};

			// Store in cache for future use
			colorCache.set(cacheKey, result);
			return result;
		}
	} catch (error) {
		// Handle CORS errors and other extraction failures gracefully
		console.warn(`Could not extract colors from ${url}:`, error);
		return null;
	}

	return null;
}

// Add a method to preload colors for a batch of images
async function preloadColors(urls: string[]): Promise<void> {
	// Process in parallel using Promise.all for better performance
	await Promise.all(
		urls.map(async (url) => {
			if (!colorCache.has(url)) {
				try {
					await getColorInfo(url);
				} catch (err) {
					console.error(`Error preloading colors for ${url}:`, err);
				}
			}
		})
	);
}

export { getTextColor, softenColor, darkenColor, getColorInfo, preloadColors };
