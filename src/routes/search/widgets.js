import { refinementList, sortBy, stats, configure } from 'instantsearch.js/es/widgets';
import { mappings } from './mappings.js';
import { FACETABLE_FIELDS } from './search-fields';

// CSS classes
export const CSS_CLASSES = {
	refinementList: {
		list: 'refinement-list-container space-y-0.5 max-h-32 overflow-y-auto',
		label:
			'flex items-center gap-1.5 px-2 py-1 text-xs text-gray-700 hover:bg-sepia-med rounded cursor-pointer transition-colors',
		checkbox: 'text-blue w-3 h-3 ',
		count: 'text-[10px] text-gray-500 bg-sepia-brown/10 rounded-xs py-0.5 px-1.5 ml-auto font-mono'
	},
	stats: {
		text: ' text-[10px] text-gray-500 font-mono'
	},
	sortBy: {
		select:
			'block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-hidden focus:ring-1 focus:ring-blue focus:border-blue bg-white text-gray-700'
	}
};

// Sort options
export const SORT_OPTIONS = [
	{ label: 'Relevance', value: 'films' },
	{ label: 'Most Votes', value: 'films/sort/imdb_votes:desc' },
	{ label: 'Fewest Votes', value: 'films/sort/imdb_votes:asc' },
	{ label: 'Highest Rated', value: 'films/sort/imdb_rating:desc' },
	{ label: 'Lowest Rated', value: 'films/sort/imdb_rating:asc' },
	{ label: 'Most Modifications', value: 'films/sort/modification_count:desc' },
	{ label: 'Fewest Modifications', value: 'films/sort/modification_count:asc' },
	{ label: 'Recently Certified', value: 'films/sort/cert_date_timestamp:desc' },
	{ label: 'Oldest Certified', value: 'films/sort/cert_date_timestamp:asc' }
];

// Filter configurations
export const FILTER_CONFIGS = [
	{ id: 'language-filter', attribute: 'language', limit: 15, title: 'Language' },
	{
		id: 'ai-actions-filter',
		attribute: 'ai_actions',
		mapping: mappings.aiActionTypes,
		limit: 8,
		title: 'Censor Actions'
	},
	{
		id: 'ai-content-types-filter',
		attribute: 'ai_content_types',
		mapping: mappings.aiContentTypes,
		limit: 8,
		title: 'Content Type'
	},
	{ id: 'genre-filter', attribute: 'imdb_genres', limit: 12, title: 'Genre' }
];

// Standard refinement widget factory
export function createRefinementWidget(config, containerId) {
	const baseConfig = {
		container: `#${containerId}`,
		attribute: config.attribute,
		limit: config.limit,
		operator: /** @type {'or'} */ ('or'),
		cssClasses: CSS_CLASSES.refinementList
	};

	if (config.mapping) {
		return refinementList({
			...baseConfig,
			transformItems: (items) => {
				return items.map((item) => ({
					...item,
					label: config.mapping[item.value] || item.value
				}));
			},
			templates: {
				item: ({ label, count, isRefined, url, value }) => {
					const displayLabel = config.mapping[value] || label || value;
					return `
                        <a href="${url}" class="${CSS_CLASSES.refinementList.label}">
                            <input type="checkbox"
                                   class="${CSS_CLASSES.refinementList.checkbox}"
                                   ${isRefined ? 'checked' : ''}
                                   readonly>
                            <span class="flex-1">${displayLabel}</span>
                            <span class="${CSS_CLASSES.refinementList.count}">${count}</span>
                        </a>
                    `;
				}
			}
		});
	}

	return refinementList(baseConfig);
}

// Widget factory
export function createSearchWidgets() {
	return [
		stats({
			container: '#stats',
			cssClasses: CSS_CLASSES.stats
		}),

		sortBy({
			container: '#sort-by',
			items: SORT_OPTIONS,
			cssClasses: CSS_CLASSES.sortBy
		}),

		configure({
			hitsPerPage: 20,
			facets: [],
			disjunctiveFacets: FACETABLE_FIELDS
		}),

		...FILTER_CONFIGS.map((config) => createRefinementWidget(config, config.id)),
		...FILTER_CONFIGS.map((config) => createRefinementWidget(config, `${config.id}-mobile`))
	];
}
