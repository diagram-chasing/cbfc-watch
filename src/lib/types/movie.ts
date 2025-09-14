export interface MovieBasic {
	id: string;
	name: string;
	fullName: string;
	language: string;
	duration: number;
	rating: string;
	certDate: string;
	languageCount?: number;
	cbfc_file_no?: string;
	languages?: string[];
	imdbTitle?: string;
	imdbRating?: string;
	imdbVotes?: string;
	imdbRuntime?: string;
	imdbLanguages?: string;
	imdbReleaseDate?: string;
	imdbWriters?: string;
}

export interface MovieModification {
	cutNo: string;
	description: string;
	cleanedDescription: string;
	deletedSecs: number;
	replacedSecs: number;
	insertedSecs: number;
	totalModifiedSecs: number;
	aiActionTypes?: string;
	aiContentTypes?: string;
	aiMediaElements?: string;
	aiReason?: string;
	censoredItemIndex?: string;
	censoredContent?: string;
	censoredReference?: string;
	censoredAction?: string;
	censoredContentTypes?: string;
	censoredMediaElement?: string;
	censoredReplacement?: string;
}

export interface MovieDetail extends MovieBasic {
	certNo: string;
	applicant: string;
	certifier: string;
	modifications: MovieModification[];
	poster_url?: string;
}

export interface RawMovieData {
	id: string;
	certificate_id: string;
	movie_name: string;
	language: string;
	duration_secs: string;
	description: string;
	cleaned_description: string;
	cut_no: string;
	deleted_secs: string;
	replaced_secs: string;
	inserted_secs: string;
	total_modified_time_secs: string;
	cert_date: string;
	cert_no: string;
	applicant: string;
	certifier: string;
	rating: string;
	cbfc_file_no: string;
	ai_cleaned_description?: string;
	ai_reference?: string;
	ai_action?: string;
	ai_content_types?: string;
	ai_media_element?: string;
	imdb_id?: string;
	imdb_title?: string;
	imdb_year?: string;
	imdb_genres?: string;
	imdb_rating?: string;
	imdb_directors?: string;
	imdb_actors?: string;
	imdb_countries?: string;
	imdb_overview?: string;
	imdb_poster_url?: string;
}
