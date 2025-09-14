import type { PageLoad } from './$types';
import type { Film, Modification } from '$lib/types';
import { slugify } from '$lib/utils/core';
import { getDisplayFilm } from '../film-processing';
import { browser } from '$app/environment';

export const prerender = false;
export const ssr = true;

interface APIModification {
	id: number;
	description: string | null;
	ai_description: string | null;
	cut_no: number | null;
	deleted_secs: number | null;
	replaced_secs: number | null;
	inserted_secs: number | null;
	ai_action_types: string | null;
	ai_content_types: string | null;
	ai_media_elements: string | null;
	ai_references: string | null;
}

interface APIFilmVersion {
	id: string;
	language: string | null;
	cert_date: string | null;
	cbfc_file_no: string | null;
	certifier: string | null;
	modifications: APIModification[];
	analysis?: AnalysisData;
}

interface AnalysisData {
	model_type: string;
	violence_modifications: number;
	violence_peer_median: number;
	sensitive_content_modifications: number;
	sensitive_content_peer_median: number;
	political_religious_modifications: number;
	political_religious_peer_median: number;
	disclaimers_added: number;
	disclaimers_peer_median: number;
}

interface APIFilmResponse {
	slug: string | null;
	name: string;
	year: number | null;
	duration: number | null;
	rating: string | null;
	poster_url: string | null;
	imdb_id: string | null;
	imdb_rating: number | null;
	imdb_votes: string | null;
	imdb_overview: string | null;
	imdb_genres: string | null;
	imdb_directors: string | null;
	imdb_actors: string | null;
	imdb_countries: string | null;
	imdb_languages: string | null;
	imdb_studios: string | null;
	views: number | null;
	versions: APIFilmVersion[];
	categories: Record<string, string[]>;
}

export interface CoreFilmData {
	currentFilm: Film | null;
	filmsByLanguage: Record<string, Film> | null;
	categoriesAvailability: Record<string, Record<string, boolean>>;
	error?: { message: string; status: number };
	slug: string;
}

const createErrorResponse = (message: string, status: number, slug: string): CoreFilmData => ({
	currentFilm: null,
	filmsByLanguage: null,
	categoriesAvailability: {},
	error: { message, status },
	slug
});

const mapModification = (mod: APIModification): Modification => ({
	cutNo: mod.cut_no?.toString() || '',
	description: mod.description || '',
	aiDescription: mod.ai_description || undefined,
	deletedSecs: mod.deleted_secs || 0,
	replacedSecs: mod.replaced_secs || 0,
	insertedSecs: mod.inserted_secs || 0,
	totalModifiedSecs: (mod.deleted_secs || 0) + (mod.replaced_secs || 0) + (mod.inserted_secs || 0),
	aiActionTypes: mod.ai_action_types || undefined,
	aiContentTypes: mod.ai_content_types || undefined,
	aiMediaElements: mod.ai_media_elements || undefined,
	aiReferences: mod.ai_references || undefined
});

const createFilm = (
	version: APIFilmVersion,
	apiData: APIFilmResponse,
	categoriesAvailability: Record<string, Record<string, boolean>>
): Film => {
	const film: Film = {
		id: version.id,
		name: apiData.name,
		slug: apiData.slug || '',
		language: version.language!,
		rating: apiData.rating || '',
		modifications: version.modifications.map(mapModification)
	};

	const optionalFields = {
		...(apiData.year && { year: apiData.year }),
		...(apiData.duration && { duration: apiData.duration }),
		...(apiData.poster_url && { posterUrl: apiData.poster_url }),
		...(apiData.imdb_id && { imdbId: apiData.imdb_id }),
		...(apiData.imdb_rating && { imdbRating: apiData.imdb_rating.toString() }),
		...(apiData.imdb_votes && { imdbVotes: apiData.imdb_votes }),
		...(apiData.imdb_overview && { imdbOverview: apiData.imdb_overview }),
		...(apiData.imdb_genres && { imdbGenres: apiData.imdb_genres }),
		...(apiData.imdb_directors && { imdbDirectors: apiData.imdb_directors }),
		...(apiData.imdb_actors && { imdbActors: apiData.imdb_actors }),
		...(apiData.imdb_countries && { imdbCountries: apiData.imdb_countries }),
		...(apiData.imdb_languages && { imdbLanguages: apiData.imdb_languages }),
		...(apiData.imdb_studios && { imdbStudios: apiData.imdb_studios }),
		...(version.cert_date && { certDate: version.cert_date }),
		...(version.cbfc_file_no && { cbfcFileNo: version.cbfc_file_no }),
		...(version.certifier && { certifier: version.certifier }),
		...(apiData.views && { views: apiData.views })
	};

	Object.assign(film, optionalFields, {
		languageCount: apiData.versions.length,
		_categoryAvailability: categoriesAvailability,
		analysis: version.analysis
	});

	return film;
};

const selectLanguage = (
	langParam: string | null,
	filmsByLanguage: Record<string, Film>
): string => {
	const slugifiedLangParam = langParam ? slugify(langParam) : null;
	const requestedLanguage = slugifiedLangParam
		? Object.keys(filmsByLanguage).find((langKey) => slugify(langKey) === slugifiedLangParam)
		: undefined;

	if (requestedLanguage && filmsByLanguage[requestedLanguage]) {
		return requestedLanguage;
	}

	const sortedByModifications = Object.entries(filmsByLanguage).sort(
		([, a], [, b]) => (b.modifications?.length || 0) - (a.modifications?.length || 0)
	);

	return (
		sortedByModifications[0]?.[0] ||
		(filmsByLanguage['English'] ? 'English' : Object.keys(filmsByLanguage)[0])
	);
};

export const load: PageLoad = async ({ params, fetch, url }) => {
	const slug = params.slug;
	const langParam = browser ? url.searchParams.get('lang') : null;

	try {
		const response = await fetch(`/api/films/slug/${slug}`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
			const coreData = createErrorResponse(
				errorData.error || `Error ${response.status}: ${response.statusText}`,
				response.status,
				slug
			);
			return { coreData };
		}

		const apiData: APIFilmResponse = await response.json();
		const categoriesAvailability = generateCategoriesAvailability(apiData.categories);
		const filmsByLanguage: Record<string, Film> = {};

		for (const version of apiData.versions) {
			if (version.language) {
				filmsByLanguage[version.language] = createFilm(version, apiData, categoriesAvailability);
			}
		}

		const selectedLanguage = selectLanguage(langParam, filmsByLanguage);
		const currentFilm = selectedLanguage ? getDisplayFilm(selectedLanguage, filmsByLanguage) : null;

		const coreData: CoreFilmData = {
			currentFilm,
			filmsByLanguage,
			categoriesAvailability,
			error: currentFilm
				? undefined
				: {
						message: 'Could not determine initial film version for display.',
						status: 500
					},
			slug
		};

		return { coreData };
	} catch (error) {
		console.error(`Error fetching film data for slug ${slug}:`, error);
		const coreData = createErrorResponse('Error loading film data', 500, slug);
		return { coreData };
	}
};

// Helper function to generate categoriesAvailability structure
function generateCategoriesAvailability(
	categories: Record<string, string[]>
): Record<string, Record<string, boolean>> {
	const result: Record<string, Record<string, boolean>> = {};

	for (const [category, values] of Object.entries(categories)) {
		result[category] = {};
		for (const value of values) {
			result[category][value] = true;
		}
	}

	return result;
}
