export interface FieldQuery {
	field: string;
	operator: string;
	value: string | number;
	raw: string;
}

export interface ParsedQuery {
	textQuery: string;
	fieldQueries: FieldQuery[];
	hasFieldTargeting: boolean;
}

/**
 * Parse search query - extract field:value patterns with robust error handling
 */
export function parseQuery(input: string): ParsedQuery {
	if (!input?.trim()) {
		return { textQuery: '', fieldQueries: [], hasFieldTargeting: false };
	}

	try {
		// Match field:value patterns (handles wildcards, operators, and quoted values)
		const fieldPattern =
			/(\w+):((?:"[^"]*")|(?:[^\s]+(?:\*)?)|(?:[><=!]+\d+(?:\.\d+)?)|(?:\[[^\]]+\]))/g;

		const fieldQueries: FieldQuery[] = [];
		let textQuery = input;

		let match;
		while ((match = fieldPattern.exec(input)) !== null) {
			try {
				const [fullMatch, field, value] = match;

				// Skip if field or value is undefined/empty
				if (!field || !value) {
					continue;
				}

				// Determine operator
				let operator = '=';
				let processedValue: string | number = value;

				// Handle quoted values
				if (value.startsWith('"') && value.endsWith('"')) {
					processedValue = value.slice(1, -1); // Remove quotes
				} else if (value.endsWith('*')) {
					operator = 'CONTAINS';
					processedValue = value.slice(0, -1);
				} else if (/^[><=!]+/.test(value)) {
					const opMatch = value.match(/^([><=!]+)/);
					if (opMatch) {
						operator = opMatch[1];
						const numValue = parseFloat(value.replace(/^[><=!]+/, ''));
						processedValue = isNaN(numValue) ? value.replace(/^[><=!]+/, '') : numValue;
					}
				}

				// Only add valid field queries
				if (field && processedValue !== null && processedValue !== undefined) {
					fieldQueries.push({
						field: field.toLowerCase(),
						operator,
						value: processedValue,
						raw: fullMatch
					});

					// Remove from text query only if successfully parsed
					textQuery = textQuery.replace(fullMatch, '').trim();
				}
			} catch (fieldError) {
				// If individual field parsing fails, skip this match but continue
				console.warn('Failed to parse field query:', match, fieldError);
				continue;
			}
		}

		// Clean up text query
		textQuery = textQuery.replace(/\s+/g, ' ').trim();

		return {
			textQuery,
			fieldQueries,
			hasFieldTargeting: fieldQueries.length > 0
		};
	} catch (error) {
		// If entire parsing fails, return as plain text query
		console.warn('Search query parsing failed, falling back to text search:', error);
		return {
			textQuery: input.trim(),
			fieldQueries: [],
			hasFieldTargeting: false
		};
	}
}
