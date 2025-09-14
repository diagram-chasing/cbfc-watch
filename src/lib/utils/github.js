/**
 * Fetch the last commit date for the data.csv file from GitHub
 * This runs at build time to get static data
 */
export async function getLastCommitDate() {
	try {
		const response = await fetch(
			'https://api.github.com/repos/diagram-chasing/censor-board-cuts/commits?path=data/data.csv&per_page=1',
			{
				headers: {
					'User-Agent': 'cbfc-watch-build'
				}
			}
		);

		if (response.ok) {
			const commits = await response.json();
			if (commits.length > 0) {
				const commitDate = new Date(commits[0].commit.committer.date);
				return commitDate.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric'
				});
			}
		}
		return 'Recently';
	} catch (error) {
		console.error('Failed to fetch commit data during build:', error);
		return 'Recently';
	}
}
