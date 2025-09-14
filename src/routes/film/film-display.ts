import type { Film } from '$lib/types';

type ActionStyle = {
	bg: string;
	border: string;
	text: string;
};

type StyleMap = {
	[key: string]: ActionStyle;
};

export const getActionTypeClasses = (() => {
	const audioStyle: ActionStyle = {
		bg: 'bg-blue/50',
		border: 'border-blue',
		text: 'text-sepia-brown'
	};

	const visualStyle: ActionStyle = {
		bg: 'bg-yellow/50',
		border: 'border-yellow',
		text: 'text-sepia-brown'
	};

	const contentModStyle: ActionStyle = {
		bg: 'bg-red/50',
		border: 'border-red',
		text: 'text-sepia-brown'
	};

	const insertionStyle: ActionStyle = {
		bg: 'bg-green/50',
		border: 'border-green',
		text: 'text-sepia-brown'
	};

	const otherStyle: ActionStyle = {
		bg: 'bg-sepia-dark/25',
		border: 'border-sepia-dark',
		text: 'text-sepia-brown'
	};

	const disclaimerStyle: ActionStyle = {
		bg: 'bg-sepia-med',
		border: 'border-sepia-brown',
		text: 'text-sepia-brown'
	};

	const defaultStyle: ActionStyle = {
		bg: 'bg-sepia-light',
		border: 'border-sepia-brown',
		text: 'text-sepia-brown'
	};

	const styleMap: StyleMap = {
		// Audio-related
		audio_mute: audioStyle,
		audio_level: audioStyle,
		audio_replace: audioStyle,
		audio_effect: audioStyle,

		// Visual-related
		visual_blur: visualStyle,
		visual_censor: visualStyle,
		visual_effect: visualStyle,
		visual_adjust: visualStyle,
		visual_framerate: visualStyle,

		// Content modification
		deletion: contentModStyle,
		replacement: contentModStyle,
		reduction: contentModStyle,
		insertion: insertionStyle,

		// Other types
		overlay: otherStyle,
		translation: otherStyle,
		spacing: otherStyle,
		warning_disclaimer: disclaimerStyle,
		certification: disclaimerStyle,

		default: defaultStyle
	};

	return (actionType: string): ActionStyle => {
		const normalizedType = actionType.toLowerCase().trim();
		return styleMap[normalizedType] || styleMap.default;
	};
})();

export function formatActionType(actionType: string): string {
	const mappings: Record<string, string> = {
		deletion: 'Deletion',
		audio_modification: 'Audio Mod.',
		insertion: 'Insertion',
		visual_modification: 'Visual Mod.',
		replacement: 'Replace',
		text_modification: 'Text Mod.',
		content_overlay: 'Content Overlay'
	};

	return (
		mappings[actionType] ||
		actionType
			.split('_')
			.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ')
	);
}

// Helper functions for modifications data
export function getDistributionForTab(
	modificationData: any,
	film: Film,
	tab: 'rating' | 'language'
): number[] {
	if (!modificationData || !film) return [];

	if (tab === 'rating' && film.rating && modificationData.byRating[film.rating]) {
		return modificationData.byRating[film.rating].distribution;
	} else if (tab === 'language' && film.language && modificationData.byLanguage[film.language]) {
		return modificationData.byLanguage[film.language].distribution;
	}

	return modificationData.overall.distribution;
}

export function getCurrentRange(
	modificationData: any,
	film: Film,
	tab: 'rating' | 'language'
): [number, number] {
	if (!modificationData || !film) return [0, 100];

	if (tab === 'rating' && film.rating && modificationData.byRating[film.rating]) {
		return modificationData.byRating[film.rating].range;
	} else if (tab === 'language' && film.language && modificationData.byLanguage[film.language]) {
		return modificationData.byLanguage[film.language].range;
	}

	// Fallback to overall
	return modificationData.overall.range;
}

export function getCurrentCounts(
	modificationData: any,
	film: Film,
	tab: 'rating' | 'language'
): number[] {
	if (!modificationData || !film) return [];

	if (tab === 'rating' && film.rating && modificationData.byRating[film.rating]) {
		return modificationData.byRating[film.rating].counts || [];
	} else if (tab === 'language' && film.language && modificationData.byLanguage[film.language]) {
		return modificationData.byLanguage[film.language].counts || [];
	}

	// Fallback to overall
	return modificationData.overall.counts || [];
}

// CBFC Regional Office mapping
const CBFC_REGIONAL_OFFICES = {
	'1': 'Mumbai',
	'2': 'Bangalore',
	'3': 'Chennai',
	'4': 'Cuttack',
	'5': 'Delhi',
	'6': 'Guwahati',
	'7': 'Hyderabad',
	'8': 'Kolkata',
	'9': 'Thiruvananthapuram'
};

/**
 * Parses a CBFC certificate ID and returns its structure and meaning
 */
export function parseCertificateId(certificateId: string) {
	if (!certificateId || certificateId.length < 16) {
		return { isValid: false, error: 'Invalid certificate ID format' };
	}

	const prefix = certificateId.substring(0, 4);
	const regionCode = certificateId.substring(4, 5);
	const separator = certificateId.substring(5, 6);
	const yearCode = certificateId.substring(6, 10);
	const sequenceNumber = certificateId.substring(10);

	// Validate format
	if (prefix !== '1000' || separator !== '0') {
		return { isValid: false, error: 'Invalid certificate ID format' };
	}

	// Calculate actual year
	const actualYear = parseInt(yearCode) - 900;

	// Get region name
	const regionName =
		CBFC_REGIONAL_OFFICES[regionCode as keyof typeof CBFC_REGIONAL_OFFICES] || 'Unknown';

	return {
		isValid: true,
		prefix,
		regionCode,
		regionName,
		separator,
		yearCode,
		year: actualYear,
		sequenceNumber,
		humanReadable: `Certificate issued by ${regionName} office in ${actualYear}`
	};
}
