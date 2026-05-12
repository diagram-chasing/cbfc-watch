import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	try {
		const db = platform?.env?.DB;

		if (!db) {
			return json({ films: [], totalCount: 0 }, { status: 404 });
		}

		const results = await db
			.prepare(
				`
			SELECT slug, name, year, language, rating, cert_date
			FROM films
			WHERE cert_date IS NOT NULL
			ORDER BY cert_date DESC
			LIMIT 1000
		`
			)
			.all();

		const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		const formatDate = (iso: unknown) => {
			const m = String(iso ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
			if (!m) return '';
			return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
		};

		const films = (results.results || []).map((f: any) => ({
			...f,
			date: formatDate(f.cert_date)
		}));

		return json({ films, totalCount: films.length });
	} catch (e) {
		console.error('Error fetching changelog:', e);
		return json({ error: 'Failed to load data' }, { status: 500 });
	}
};
