import { getLastCommitDate } from '$lib/utils/github.js';

export async function load() {
	// Fetch the commit date at build time
	const lastCommitDate = await getLastCommitDate();

	return {
		lastCommitDate
	};
}
