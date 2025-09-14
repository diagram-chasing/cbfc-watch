import TypesenseInstantSearchAdapter from 'typesense-instantsearch-adapter';

export function createTypesenseAdapter() {
	return new TypesenseInstantSearchAdapter({
		server: {
			nodes: [
				{
					url: window.location.origin + '/api/search'
				}
			],
			apiKey: '',
			numRetries: 16,
			useServerSideSearchCache: true,
			connectionTimeoutSeconds: 10,
			timeoutSeconds: 10
		},
		additionalSearchParameters: {
			query_by: 'name,imdb_overview,ai_cleaned_descriptions,embeddings',
			query_by_weights: '10,4,3,1',
			drop_tokens_threshold: 2,
			typo_tokens_threshold: 2,
			num_typos: 1,
			highlight_full_fields: 'name,imdb_overview,modification_descriptions',
			highlight_affix_num_tokens: 3,
			snippet_threshold: 30,
			rerank_hybrid_matches: true,
			vector_query: 'embeddings:([], k: 20)'
		}
	});
}
