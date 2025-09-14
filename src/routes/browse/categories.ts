export interface CategoryConfig {
	displayName: string;
	dbQuery: string;
	urlPath: string;
	description: string;
}

export interface ValueMapping {
	display: string;
	slug: string;
}

export const CATEGORY_MAPPING: Record<string, CategoryConfig> = {
	aiActionTypes: {
		displayName: 'Action Types',
		urlPath: 'actions',
		description:
			'Types of censorship actions (deletions, insertions, replacements) applied to films by CBFC',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN modifications m ON f.id = m.film_id
			JOIN modification_action_types mat ON m.id = mat.modification_id
			WHERE mat.action_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	aiMediaElements: {
		displayName: 'Media Elements',
		urlPath: 'media',
		description:
			'Specific media components (video, audio, dialogue, scenes) that were targeted for modification.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN modifications m ON f.id = m.film_id
			JOIN modification_media_elements mme ON m.id = mme.modification_id
			WHERE mme.media_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	aiContentTypes: {
		displayName: 'Content Types',
		urlPath: 'content',
		description:
			'Categories of content possibily associated with censorship (violence, language, nudity, political, etc.). This was classified by an LLM based on the original text of the modification.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN modifications m ON f.id = m.film_id
			JOIN modification_content_types mct ON m.id = mct.modification_id
			WHERE mct.content_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	aiReferences: {
		displayName: 'References',
		urlPath: 'references',
		description:
			'Cultural, political, or religious references that prompted or were mentioned in the modification. This was classified by an LLM based on the original text of the modification.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN modifications m ON f.id = m.film_id
			JOIN modification_references mr ON m.id = mr.modification_id
			WHERE mr.reference_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},

	directors: {
		displayName: 'Directors',
		urlPath: 'directors',
		description:
			'Films organized by their directors as listed in IMDB. There may be mismatches in how the data was joined to the films.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN film_directors fd ON f.id = fd.film_id
			WHERE fd.director_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	actors: {
		displayName: 'Actors',
		urlPath: 'actors',
		description:
			'Films categorized by their cast members as listed in IMDB. There may be mismatches in how the data was joined to the films.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN film_actors fa ON f.id = fa.film_id
			WHERE fa.actor_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	genres: {
		displayName: 'Genres',
		urlPath: 'genres',
		description:
			'Films grouped by IMDB genres (Action, Drama, Comedy, etc.). Analyze censorship patterns across different film genres and their certification trends over time.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN film_genres fg ON f.id = fg.film_id
			WHERE fg.genre_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	countries: {
		displayName: 'Countries',
		urlPath: 'countries',
		description:
			'Films organized by their country of origin as listed in IMDB. There may be mismatches in how the data was joined to the films.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN film_countries fc ON f.id = fc.film_id
			WHERE fc.country_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	studios: {
		displayName: 'Studios',
		urlPath: 'studios',
		description:
			'Films categorized by their production studios as listed in IMDB. There may be mismatches in how the data was joined to the films.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			JOIN film_studios fs ON f.id = fs.film_id
			WHERE fs.studio_slug = ?1
			ORDER BY f.name, f.year DESC
		`
	},
	certifiers: {
		displayName: 'Certifiers',
		urlPath: 'certifiers',
		description: 'Films grouped by the CBFC official who certified them.',
		dbQuery: `
			SELECT DISTINCT f.id, f.slug, f.name, f.year, f.language, f.poster_url
			FROM films f
			WHERE f.certifier LIKE ?1
			ORDER BY f.name, f.year DESC
		`
	}
};

// Value mappings for AI categories
const CONTENT_TYPE_MAPPINGS: Record<string, ValueMapping> = {
	profanity: { display: 'Profanity', slug: 'profanity' },
	violence: { display: 'Violence', slug: 'violence' },
	substance: { display: 'Substance Use', slug: 'substance-use' },
	sexual_suggestive: { display: 'Sexual Content', slug: 'sexual-content' },
	sexual_explicit: { display: 'Explicit Sexual Content', slug: 'explicit-sexual' },
	political: { display: 'Political', slug: 'political' },
	religious: { display: 'Religious', slug: 'religious' },
	identity_reference: { display: 'Identity References', slug: 'identity-references' },
	'violence|sexual_explicit': {
		display: 'Violence & Explicit Sexual',
		slug: 'violence-sexual-explicit'
	},
	'profanity|sexual_suggestive': { display: 'Profanity & Sexual Content', slug: 'profanity-sexual' }
};

const ACTION_TYPE_MAPPINGS: Record<string, ValueMapping> = {
	deletion: { display: 'Deletion', slug: 'deletion' },
	audio_modification: { display: 'Audio Modification', slug: 'audio-modification' },
	insertion: { display: 'Insertion', slug: 'insertion' },
	visual_modification: { display: 'Visual Modification', slug: 'visual-modification' },
	replacement: { display: 'Replace', slug: 'replacement' },
	text_modification: { display: 'Text Modification', slug: 'text-modification' },
	content_overlay: { display: 'Content Overlay', slug: 'content-overlay' }
};

const MEDIA_ELEMENT_MAPPINGS: Record<string, ValueMapping> = {
	visual_scene: { display: 'Visual Scene', slug: 'visual-scene' },
	text_dialogue: { display: 'Text & Dialogue', slug: 'text-dialogue' },
	metadata: { display: 'Metadata', slug: 'metadata' },
	music: { display: 'Music', slug: 'music' },
	other: { display: 'Other', slug: 'other' }
};

// Create reverse mapping for URL path to category ID lookup
const URL_PATH_TO_CATEGORY: Record<string, string> = {};
for (const [categoryId, config] of Object.entries(CATEGORY_MAPPING)) {
	URL_PATH_TO_CATEGORY[config.urlPath] = categoryId;
}

export function getCategoryDisplayName(categoryId: string): string {
	return CATEGORY_MAPPING[categoryId]?.displayName || categoryId;
}

export function getCategoryDescription(categoryId: string): string {
	return CATEGORY_MAPPING[categoryId]?.description || '';
}

export function getCategoryUrlPath(categoryId: string): string {
	return CATEGORY_MAPPING[categoryId]?.urlPath || categoryId;
}

export function getCategoryFromUrlPath(urlPath: string): string | null {
	return URL_PATH_TO_CATEGORY[urlPath] || null;
}

export function isValidCategory(categoryId: string): boolean {
	return categoryId in CATEGORY_MAPPING;
}

export function isValidUrlPath(urlPath: string): boolean {
	return urlPath in URL_PATH_TO_CATEGORY;
}

export function getCategoryQuery(categoryId: string): string | null {
	return CATEGORY_MAPPING[categoryId]?.dbQuery || null;
}

export function convertSlugToDisplayName(slug: string): string {
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export function convertValueToDisplayName(categoryId: string, value: string): string {
	if (categoryId === 'aiContentTypes') {
		const mapping = CONTENT_TYPE_MAPPINGS[value];
		return mapping ? mapping.display : convertSlugToDisplayName(value);
	}

	if (categoryId === 'aiActionTypes') {
		const mapping = ACTION_TYPE_MAPPINGS[value];
		return mapping ? mapping.display : convertSlugToDisplayName(value);
	}

	if (categoryId === 'aiMediaElements') {
		const mapping = MEDIA_ELEMENT_MAPPINGS[value];
		return mapping ? mapping.display : convertSlugToDisplayName(value);
	}

	return convertSlugToDisplayName(value);
}

export function getValueMapping(categoryType: string, value: string): ValueMapping {
	const mappings = {
		aiContentTypes: CONTENT_TYPE_MAPPINGS,
		aiActionTypes: ACTION_TYPE_MAPPINGS,
		aiMediaElements: MEDIA_ELEMENT_MAPPINGS
	};

	const categoryMappings = mappings[categoryType as keyof typeof mappings];
	if (!categoryMappings) {
		return {
			display: value
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			slug: value.replace(/_/g, '-').toLowerCase()
		};
	}

	return (
		categoryMappings[value] || {
			display: value
				.split('_')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			slug: value.replace(/_/g, '-').toLowerCase()
		}
	);
}

export function convertSlugToValue(categoryType: string, slug: string): string {
	const mappings = {
		aiContentTypes: CONTENT_TYPE_MAPPINGS,
		aiActionTypes: ACTION_TYPE_MAPPINGS,
		aiMediaElements: MEDIA_ELEMENT_MAPPINGS
	};

	const categoryMappings = mappings[categoryType as keyof typeof mappings];
	if (!categoryMappings) {
		return slug.replace(/-/g, '_');
	}

	for (const [key, mapping] of Object.entries(categoryMappings)) {
		if (mapping.slug === slug) {
			return key;
		}
	}

	return slug.replace(/-/g, '_');
}
