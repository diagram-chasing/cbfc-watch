export interface AnalysisData {
	model_type: string;
	violence_modifications: number;
	violence_peer_median: number;
	sensitive_content_modifications: number;
	sensitive_content_peer_median: number;
	political_religious_modifications: number;
	political_religious_peer_median: number;
	disclaimers_added: number;
	disclaimers_peer_median: number;
	film_id?: string;
	created_at?: string;
}

export interface Film {
	id: string;
	slug: string;
	name: string;
	nameFull?: string;
	certDate?: string;
	language: string;
	languages?: string[];
	languageCount?: number;
	duration?: number;
	year?: number | string;
	rating: string;
	cbfcFileNo?: string;
	certNo?: string;
	applicant?: string;
	certifier?: string;
	modifications: Modification[];
	posterUrl?: string;
	imdbDirectors?: string;
	imdbActors?: string;
	imdbGenres?: string;
	imdbCountries?: string;
	imdbStudios?: string;
	imdbOverview?: string;
	imdbRating?: string;
	imdbVotes?: string;
	imdbReleaseDate?: string;
	imdbWriters?: string;
	imdbLanguages?: string;
	imdbRuntime?: string;
	imdbTitle?: string;
	imdbReleaseYear?: string;
	imdbId?: string;
	views?: number;
	analysis?: AnalysisData;
	_categoryAvailability?: Record<string, Record<string, boolean>>;
}

export interface Language {
	name: string;
	count: number;
}

export interface Stats {
	topLanguages: Language[];
	allCounts: {
		all: number;
		modifications: number;
	};
}

export interface HomePageData {
	films: Film[];
	topLanguages: Language[];
	allCounts: {
		all: number;
		modifications: number;
	};
}

export interface Modification {
	cutNo: string;
	description: string;
	cleanedDescription?: string;
	deletedSecs: number;
	replacedSecs: number;
	insertedSecs: number;
	totalModifiedSecs: number;
	aiActionTypes?: string;
	aiContentTypes?: string;
	aiMediaElements?: string;
	aiReason?: string;
	aiReferences?: string;
	aiDescription?: string;
	censoredItemIndex?: string;
	censoredContent?: string;
	censoredReference?: string;
	censoredAction?: string;
	censoredContentTypes?: string;
	censoredMediaElement?: string;
	censoredReplacement?: string;
}
