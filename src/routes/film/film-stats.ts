import type { Film, Modification } from '$lib/types';

export function getUniqueModifications(film: Film | null): Modification[] {
	if (!film?.modifications) return [];
	return [...new Map(film.modifications.map((mod) => [mod.cutNo, mod])).values()];
}

export function computeTotalModifiedDuration(modifications: Modification[]): number {
	return modifications.reduce((sum, mod) => sum + (mod.totalModifiedSecs || 0), 0);
}

export function computeActionTypesData(
	modifications: Modification[]
): Array<{ name: string; value: number; category: string }> {
	if (!modifications) return [];

	const actionTypeCounts: Record<string, number> = {};

	modifications.forEach((mod) => {
		if (mod.aiActionTypes) {
			const actionTypes = mod.aiActionTypes.includes(';')
				? mod.aiActionTypes.split(';')
				: [mod.aiActionTypes];

			actionTypes.forEach((actionType) => {
				const trimmed = actionType.trim();
				if (trimmed) {
					actionTypeCounts[trimmed] = (actionTypeCounts[trimmed] || 0) + 1;
				}
			});
		}
	});

	return Object.entries(actionTypeCounts)
		.map(([name, value]) => ({
			name,
			value,
			category: name
		}))
		.sort((a, b) => b.value - a.value);
}

export function countDeletions(actionTypesData: { name: string; value: number }[]): number {
	let count = 0;
	const deletionActions = ['deletion', 'violence removal', 'violence modification'];
	for (const action of actionTypesData) {
		if (deletionActions.includes(action.name.toLowerCase())) {
			count += action.value;
		}
	}
	return count;
}

export function countReplacements(actionTypesData: { name: string; value: number }[]): number {
	let count = 0;
	const replacementActions = ['replacement', 'audio modification'];
	for (const action of actionTypesData) {
		if (replacementActions.includes(action.name.toLowerCase())) {
			count += action.value;
		}
	}
	return count;
}

export function getActionTypesParam(
	actionTypesData: Array<{ name: string; value: number }>
): string {
	const actionTypeStats = actionTypesData.reduce((acc: Record<string, number>, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {});
	return Object.entries(actionTypeStats)
		.map(([name, count]) => `${encodeURIComponent(name)}:${count}`)
		.join(',');
}

export function computeContentTypesData(
	modifications: Modification[]
): Array<{ name: string; value: number }> {
	if (!modifications) return [];

	const contentTypeCounts: Record<string, number> = {};

	modifications.forEach((mod) => {
		if (mod.aiContentTypes) {
			const contentTypes = mod.aiContentTypes.includes(';')
				? mod.aiContentTypes.split(';')
				: [mod.aiContentTypes];

			contentTypes.forEach((contentType) => {
				const trimmed = contentType.trim();
				if (trimmed) {
					contentTypeCounts[trimmed] = (contentTypeCounts[trimmed] || 0) + 1;
				}
			});
		}
	});

	return Object.entries(contentTypeCounts)
		.map(([name, value]) => ({
			name,
			value
		}))
		.sort((a, b) => b.value - a.value);
}
