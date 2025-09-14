/**
 * HARK YE, WHO ENTER HERE.
 * This was meant to be for generating OG images on the fly. However, resvg-js
 * does not seem to work in the Cloudflare Workers environment. Therefore we
 * locally generate og-images using scripts/generate-og.js and upload them to R2.
 *
 * I would like to update this at some point but who knows when.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { html as toReactNode } from 'satori-html';
import FilmCard from '$lib/components/FilmSharecard.svelte';
import { render } from 'svelte/server';
import { getActionTypeClasses } from '../../film/film-display.js';
const height = 627;
const width = 1200;

// Map descriptive action type names to the keys expected by getActionTypeClasses
function mapActionTypeName(actionTypeName: string): string {
	const nameMap: Record<string, string> = {
		'Audio Mute': 'audio_mute',
		'Audio Modification': 'audio_replace',
		'Visual Blur': 'visual_blur',
		'Visual Modification': 'visual_effect',
		'Violence Removal': 'deletion',
		'Violence Modification': 'deletion',
		Deletion: 'deletion',
		Replacement: 'replacement',
		'Text Modification': 'overlay',
		'Content Overlay': 'overlay',
		Warning: 'warning_disclaimer',
		Certification: 'certification',
		Insertion: 'insertion'
	};

	return nameMap[actionTypeName] || actionTypeName.toLowerCase().replace(/\s+/g, '_');
}

// Font cache
const fontCache = new Map<string, ArrayBuffer>();

async function fetchGoogleFont(fontFamily: string, text: string): Promise<ArrayBuffer | null> {
	const cacheKey = `${fontFamily}:${text}`;

	if (fontCache.has(cacheKey)) {
		return fontCache.get(cacheKey)!;
	}

	try {
		const API = `https://fonts.googleapis.com/css2?family=${fontFamily}&text=${encodeURIComponent(text)}`;

		const css = await fetch(API, {
			headers: {
				// Make sure it returns TTF/OTF
				'User-Agent':
					'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'
			}
		}).then((res) => res.text());

		const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/);

		if (!resource) return null;

		const fontResponse = await fetch(resource[1]);
		const fontData = await fontResponse.arrayBuffer();

		fontCache.set(cacheKey, fontData);
		return fontData;
	} catch (error) {
		console.error('Failed to fetch font:', error);
		return null;
	}
}

// Helper function to get contrasting text color
function getTailwindFillColor(bgClass: string): string {
	const colorMap: Record<string, string> = {
		'bg-blue/50': '#5d98b6',
		'bg-yellow/50': '#edbb5f',
		'bg-red/50': '#db5441',
		'bg-green/50': '#8c9c74',
		'bg-sepia-dark/25': '#BFB2A2',
		'bg-sepia-med': '#F0E9E0',
		'bg-sepia-light': '#FEFBF7'
	};
	return colorMap[bgClass] || '#FEFBF7';
}

function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (remainingSeconds === 0) {
		return `${minutes}m`;
	}
	return `${minutes}m ${remainingSeconds}s`;
}

export const GET = async ({ url, fetch }) => {
	const pageType = url.searchParams.get('pageType') ?? 'movie';

	if (pageType === 'movie') {
		// Handle movie sharecard
		const title = url.searchParams.get('title') ?? 'Film Name';
		const rating = url.searchParams.get('rating') ?? '';
		const deletions = parseInt(url.searchParams.get('deletions') ?? '0');
		const replacements = parseInt(url.searchParams.get('replacements') ?? '0');
		const totalEdits = parseInt(url.searchParams.get('totalEdits') ?? '0');
		const totalDuration = parseInt(url.searchParams.get('totalDuration') ?? '0');
		const posterUrl = url.searchParams.get('posterUrl') ?? '';
		const actionTypesParam = url.searchParams.get('actionTypes') ?? '';
		const cbfcFileNo = url.searchParams.get('cbfcFileNo') ?? '';
		const primaryContentType = url.searchParams.get('primaryContentType') ?? '';

		// Parse action types from URL parameter (comma-separated name:count pairs)
		const actionTypes = actionTypesParam
			? actionTypesParam
					.split(',')
					.map((item) => {
						const [name, count] = item.split(':');
						const mappedName = mapActionTypeName(decodeURIComponent(name || ''));
						const classes = getActionTypeClasses(mappedName);
						const color = getTailwindFillColor(classes.bg);
						return {
							name: name || 'Unknown',
							value: parseInt(count || '0'),
							color
						};
					})
					.filter((item) => item.value > 0)
			: [];

		const result = render(FilmCard, {
			props: {
				filmName: title,
				rating,
				totalDuration: formatDuration(totalDuration),
				deletions,
				replacements,
				totalEdits,
				posterUrl,
				actionTypes,
				cbfcFileNo,
				primaryContentType
			}
		});

		const element = toReactNode(result.body);

		// Collect all text for font optimization - include all possible characters
		const allNumbers = '01234567+89.;:-&';
		const commonText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ';
		const specificText = `CBFC WATCH${title}DeletionsReplacementsModified${totalDuration}ms`;
		const allText = `${commonText}${allNumbers}${specificText}`;
		const leagueGothicText = `CBFC.WATCH${title}`;

		// Fetch fonts from Google Fonts - separate requests for different weights
		const leagueGothicData = await fetchGoogleFont('League+Gothic', leagueGothicText);
		const atkinsonRegularData = await fetchGoogleFont('Atkinson+Hyperlegible:wght@400', allText);
		const atkinsonBoldData = await fetchGoogleFont('Atkinson+Hyperlegible:wght@700', allText);
		const fonts: any[] = [];

		if (leagueGothicData) {
			fonts.push({
				name: 'League Gothic',
				data: leagueGothicData,
				style: 'normal',
				weight: 400
			});
		}

		if (atkinsonRegularData) {
			fonts.push({
				name: 'Atkinson Hyperlegible',
				data: atkinsonRegularData,
				style: 'normal',
				weight: 400
			});
		}

		if (atkinsonBoldData) {
			fonts.push({
				name: 'Atkinson Hyperlegible',
				data: atkinsonBoldData,
				style: 'normal',
				weight: 700
			});
		}

		const svg = await satori(element, {
			fonts,
			height,
			width
		});

		// Convert SVG to PNG using Resvg
		const resvg = new Resvg(svg, {
			fitTo: {
				mode: 'width',
				value: width
			}
		});

		const pngBuffer = resvg.render().asPng();

		return new Response(pngBuffer, {
			headers: {
				'content-type': 'image/png',
				'cache-control': 'public, max-age=3600'
			}
		});
	} else {
		// Handle other page types - placeholder for future implementation
		return new Response('Not implemented', { status: 501 });
	}
};
