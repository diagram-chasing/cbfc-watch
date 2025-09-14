import type { PageLoad } from './$types';

// Enable prerendering for the home page (will be built at deploy time)
export const prerender = true;
export const ssr = true;

export const load = (async ({ fetch }) => {
	try {
		// Set a timeout to prevent long-running fetch operations
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		// Use Promise.all with a timeout to fetch all resources in parallel
		const [summaryStatsResponse, currentMoviesResponse] = await Promise.all([
			fetch('/summary_stats.json', {
				priority: 'high',
				signal: controller.signal
			}),
			fetch('/current_movies.json', {
				priority: 'high',
				signal: controller.signal
			})
		]).catch((err) => {
			console.error('Error fetching data:', err);
			return [null, null, null]; // Return nulls to handle in the next step
		});

		clearTimeout(timeoutId);

		// Skip further processing if we couldn't load the essential data
		if (!summaryStatsResponse) {
			return {
				films: [],
				topLanguages: [],
				allCounts: { all: 0, modifications: 0 },
				lastUpdated: null,
				currentMovies: []
			};
		}

		if (!summaryStatsResponse.ok) {
			console.warn('Data responses not OK:', summaryStatsResponse.status);
			return {
				films: [],
				topLanguages: [],
				allCounts: { all: 0, modifications: 0 },
				lastUpdated: null,
				currentMovies: []
			};
		}

		// Parse JSON in parallel as well, with error handling
		let summaryStats,
			currentMovies = [];
		try {
			[summaryStats] = await Promise.all([summaryStatsResponse.json()]);

			// Handle current movies separately since it might fail
			if (currentMoviesResponse && currentMoviesResponse.ok) {
				currentMovies = await currentMoviesResponse.json();
			}
		} catch (parseError) {
			console.error('Error parsing JSON:', parseError);
			return {
				films: [],
				topLanguages: [],
				allCounts: { all: 0, modifications: 0 },
				lastUpdated: null,
				currentMovies: []
			};
		}

		// Format the stats object with safe defaults
		const topLanguages = Array.isArray(summaryStats?.topLanguages) ? summaryStats.topLanguages : [];

		const allCounts = summaryStats?.allCounts || {
			all: 0,
			modifications: 0
		};

		// Get the last updated date from summary stats
		const lastUpdated = summaryStats?.lastUpdated || null;

		// Process current movies data with randomization
		let processedCurrentMovies = [];
		if (Array.isArray(currentMovies)) {
			// Process all movies
			const allMovies = currentMovies.map((movie: any) => ({
				id: movie.id,
				name: movie.nameFull || movie.name,
				language: movie.language || movie.bmsLanguage,
				year: movie.year,
				rating: movie.rating || movie.bmsRating,
				slug: movie.slug,
				bmsGenre: movie.bmsGenre,
				bmsDuration: movie.bmsDuration,
				bmsId: movie.bmsId,
				posterUrl: movie.posterUrl || '',
				bmsApiRatings: movie.bmsApiRatings || {},
				modifications: [], // Required by Film type
				popularityScore: movie.popularityScore || 0
			}));

			// Shuffle array using Fisher-Yates algorithm
			const shuffled = [...allMovies];
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}

			// Take a random subset (30-50 movies per page load)
			const subsetSize = Math.floor(Math.random() * 21) + 30; // 30-50 movies
			processedCurrentMovies = shuffled.slice(0, subsetSize);
		}

		return {
			summaryStats,
			topLanguages,
			allCounts,
			lastUpdated,
			currentMovies: processedCurrentMovies
		};
	} catch (err) {
		console.error('Error loading home page data:', err);
		// Return fallback data to ensure the page always renders
		return {
			summaryStats: [],
			topLanguages: [],
			allCounts: { all: 0, modifications: 0 },
			lastUpdated: null,
			currentMovies: []
		};
	}
}) satisfies PageLoad;
