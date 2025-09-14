export const FIELD_ALIASES: Record<string, string> = {
	name: 'name',
	title: 'name',
	film: 'name',
	movie: 'name',

	language: 'language',
	lang: 'language',

	year: 'year',
	date: 'year',

	rating: 'rating',
	cert: 'rating',

	// IMDB fields
	genre: 'imdb_genres',
	genres: 'imdb_genres',

	director: 'imdb_directors',
	directors: 'imdb_directors',

	actor: 'imdb_actors',
	actors: 'imdb_actors',
	cast: 'imdb_actors',

	country: 'imdb_countries',
	countries: 'imdb_countries',

	imdb: 'imdb_rating',
	score: 'imdb_rating',

	// Censorship fields
	mods: 'modification_count',
	modifications: 'modification_count',
	cuts: 'modification_count',

	action: 'ai_actions',
	actions: 'ai_actions',
	censor: 'ai_actions',

	content: 'ai_content_types',
	tag: 'ai_content_types',

	// Analytics & Discovery fields
	popularity: 'popularity_score',
	popular: 'popularity_score',

	clicks: 'click_count',

	poster: 'has_poster',

	certified: 'cert_date_timestamp',
	cert_date: 'cert_date_timestamp',

	released: 'imdb_release_date',
	release_date: 'imdb_release_date'
};

// All facetable fields for InstantSearch configuration
export const FACETABLE_FIELDS = [
	'language',
	'imdb_genres',
	'imdb_directors',
	'imdb_actors',
	'imdb_countries',
	'ai_actions',
	'ai_content_types',
	'rating',
	'year',
	'modification_count',
	'imdb_rating',
	'imdb_votes',
	'popularity_score',
	'click_count',
	'has_poster',
	'cert_date_timestamp',
	'imdb_release_date'
];

export const SEARCH_EXAMPLES = [
	{ query: 'language:malayalam', description: 'Malayalam films' },
	{ query: 'actor:fahadh*', description: 'Actors starting with "fahadh"' },
	{ query: 'year:>2020', description: 'Films after 2020' },
	{ query: 'genre:thriller', description: 'Thriller films' },
	{ query: 'director:"anurag kashyap"', description: 'Films by specific director' },
	{ query: 'rating:A', description: 'Adult rated films' },
	{ query: 'imdb:>8.0', description: 'High IMDB rated films' },
	{ query: 'modifications:>5', description: 'Films with many cuts' },
	{ query: 'action:"delete"', description: 'Films with deletions' },
	{ query: 'content:violence', description: 'Films with violent content' },
	{ query: 'popularity:>0.5', description: 'Popular films' },
	{ query: 'poster:true', description: 'Films with posters' },
	{ query: 'country:india', description: 'Indian films' },
	{ query: 'lang:hindi year:2023', description: 'Recent Hindi films' },
	{ query: 'love actor:mammootty', description: 'Text + field search' },
	{ query: 'genre:comedy rating:U', description: 'Family comedies' }
];

export function getTypesenseField(userField: string): string {
	return FIELD_ALIASES[userField.toLowerCase()] || userField;
}
