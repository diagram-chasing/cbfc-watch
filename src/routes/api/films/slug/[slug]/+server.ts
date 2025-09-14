import type { RequestHandler } from '@sveltejs/kit';
import type { D1Database } from '@cloudflare/workers-types';

interface Modification {
	id: number;
	film_id?: string;
	cut_no: number | null;
	description: string | null;
	ai_description: string | null;
	deleted_secs: number | null;
	replaced_secs: number | null;
	inserted_secs: number | null;
	ai_action_types: string | null;
	ai_content_types: string | null;
	ai_media_elements: string | null;
	ai_references: string | null;
}

interface FilmVersion {
	id: string;
	language: string | null;
	cert_date: string | null;
	cbfc_file_no: string | null;
	certifier: string | null;
	modifications: Modification[];
	categories: Record<string, string[]>;
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

interface FilmDetail {
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
	versions: FilmVersion[];
	categories: Record<string, string[]>;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const { slug } = params;
	const db = platform?.env?.DB as D1Database;

	if (!slug || !db) {
		return new Response(JSON.stringify({ error: 'Missing slug or database' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const film = await fetchFilmData(db, slug);
		return film
			? new Response(JSON.stringify(film), { headers: { 'Content-Type': 'application/json' } })
			: new Response(JSON.stringify({ error: 'Film not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

async function fetchFilmData(db: D1Database, slug: string): Promise<FilmDetail | null> {
	const [films, mods, cats, analysis] = await Promise.all([
		db.prepare('SELECT * FROM films WHERE slug = ?1').bind(slug).all(),
		db
			.prepare(
				'SELECT m.* FROM modifications m JOIN films f ON m.film_id = f.id WHERE f.slug = ?1 ORDER BY m.cut_no'
			)
			.bind(slug)
			.all(),
		db
			.prepare(
				'SELECT fc.category_type, fc.category_value, f.id as film_id FROM film_categories fc JOIN films f ON fc.film_id = f.id WHERE f.slug = ?1'
			)
			.bind(slug)
			.all(),
		db
			.prepare(
				'SELECT a.*, f.language FROM analysis_results a JOIN films f ON a.film_id = f.id AND a.language = f.language WHERE f.slug = ?1'
			)
			.bind(slug)
			.all()
	]);

	if (!films.success || !films.results?.length) return null;

	const modsByFilm = new Map<string, Modification[]>();
	(mods.results || []).forEach((mod: any) => {
		if (!modsByFilm.has(mod.film_id)) modsByFilm.set(mod.film_id, []);
		modsByFilm.get(mod.film_id)!.push(mod);
	});

	const categories = new Map<string, Set<string>>();
	(cats.results || []).forEach((cat: any) => {
		if (!categories.has(cat.category_type)) categories.set(cat.category_type, new Set());
		categories.get(cat.category_type)!.add(cat.category_value);
	});

	// Create map of analysis data by film_id and language
	const analysisByFilmAndLang = new Map<string, AnalysisData>();
	(analysis.results || []).forEach((analysisRecord: any) => {
		const key = `${analysisRecord.film_id}-${analysisRecord.language}`;
		analysisByFilmAndLang.set(key, {
			model_type: analysisRecord.model_type,
			violence_modifications: analysisRecord.violence_modifications,
			violence_peer_median: analysisRecord.violence_peer_median,
			sensitive_content_modifications: analysisRecord.sensitive_content_modifications,
			sensitive_content_peer_median: analysisRecord.sensitive_content_peer_median,
			political_religious_modifications: analysisRecord.political_religious_modifications,
			political_religious_peer_median: analysisRecord.political_religious_peer_median,
			disclaimers_added: analysisRecord.disclaimers_added,
			disclaimers_peer_median: analysisRecord.disclaimers_peer_median
		});
	});

	const versions = films.results.map((film: any) => {
		const analysisKey = `${film.id}-${film.language}`;
		return {
			id: film.id,
			language: film.language,
			cert_date: film.cert_date,
			cbfc_file_no: film.cbfc_file_no,
			certifier: film.certifier,
			modifications: modsByFilm.get(film.id) || [],
			categories: {},
			analysis: analysisByFilmAndLang.get(analysisKey)
		};
	});

	const allCategories: Record<string, string[]> = {};
	categories.forEach((values, type) => (allCategories[type] = Array.from(values)));

	versions.forEach((version) => {
		const aiCats = extractAiCategories(version.modifications);
		Object.entries(aiCats).forEach(([type, values]) => {
			if (!allCategories[type]) allCategories[type] = [];
			values.forEach((value) => {
				if (!allCategories[type].includes(value)) allCategories[type].push(value);
			});
		});
	});

	const base = films.results[0];

	return {
		...base,
		versions,
		categories: allCategories
	} as FilmDetail;
}

function extractAiCategories(modifications: Modification[]): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	const fields = [
		['ai_action_types', 'ACTION_TYPES'],
		['ai_content_types', 'CONTENT_TYPES'],
		['ai_media_elements', 'MEDIA_ELEMENTS'],
		['ai_references', 'REFERENCES']
	];

	modifications.forEach((mod) => {
		fields.forEach(([field, key]) => {
			const value = (mod as any)[field];
			if (value?.trim()) {
				if (!result[key]) result[key] = [];
				value
					.split('|')
					.filter(Boolean)
					.forEach((item: string) => {
						if (!result[key].includes(item)) result[key].push(item);
					});
			}
		});
	});

	return result;
}
