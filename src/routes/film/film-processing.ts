import type { Film } from '$lib/types';

export const LANGUAGE_SPECIFIC_FIELDS: (keyof Film)[] = [
	'id',
	'language',
	'name',
	'nameFull',
	'rating',
	'certDate',
	'cbfcFileNo',
	'certNo',
	'applicant',
	'certifier',
	'modifications',
	'_categoryAvailability'
];

export const BASE_METADATA_FIELDS: (keyof Film)[] = [
	'slug',
	'year',
	'duration',
	'posterUrl',
	'imdbId',
	'imdbTitle',
	'imdbReleaseYear',
	'imdbGenres',
	'imdbRating',
	'imdbVotes',
	'imdbDirectors',
	'imdbActors',
	'imdbRuntime',
	'imdbCountries',
	'imdbLanguages',
	'imdbOverview',
	'imdbReleaseDate',
	'imdbWriters',
	'imdbStudios'
];

/**
 * Prepares a display-ready film object for a specific language, merging data appropriately.
 * @param targetLanguage The desired language for the film.
 * @param allVersionsForSlug A record containing all available language versions for this film slug.
 * @returns A consolidated Film object for display, or null if no versions are available.
 */
export function getDisplayFilm(
	targetLanguage: string,
	allVersionsForSlug: Record<string, Film>
): Film | null {
	// Quick validation
	if (!allVersionsForSlug || Object.keys(allVersionsForSlug).length === 0) {
		return null;
	}

	// Get the target language version or fallback to first available
	const selectedVersion =
		allVersionsForSlug[targetLanguage] ||
		allVersionsForSlug['English'] ||
		Object.values(allVersionsForSlug)[0];

	if (!selectedVersion) return null;

	// Start with a copy of the selected version
	const displayFilm: Film = { ...selectedVersion };

	// Look for English version for fallback fields
	const englishVersion = allVersionsForSlug['English'];

	// Fill in any missing base metadata from English version
	if (englishVersion && englishVersion !== selectedVersion) {
		BASE_METADATA_FIELDS.forEach((field) => {
			if (!displayFilm[field] && englishVersion[field]) {
				displayFilm[field] = englishVersion[field];
			}
		});
	}

	// Special case for poster: if still missing, take from any version
	if (!displayFilm.posterUrl) {
		for (const version of Object.values(allVersionsForSlug)) {
			if (version.posterUrl) {
				displayFilm.posterUrl = version.posterUrl;
				break;
			}
		}
	}

	const languages = Object.keys(allVersionsForSlug);
	(displayFilm as any).languages = languages;
	(displayFilm as any).languageCount = languages.length;

	return displayFilm;
}
