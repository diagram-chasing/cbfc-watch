export { default as FilmCredit } from './film-credit.svelte';
export { default as FilmCreditsGroup } from './film-credits-group.svelte';

// Define credit item type for consistency
export interface CreditItem {
	role?: string;
	names: string[];
	categoryId?: string;
}
