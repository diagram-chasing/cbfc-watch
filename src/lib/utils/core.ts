/**
 * Core utilities and common functions
 */

// String utilities
export function slugify(str: string) {
	return str
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.trim();
}

export function generateFilmSlug(name: string, year?: string | number): string {
	const slugName = slugify(name);
	return year ? `${slugName}-${year}` : slugName;
}

// Base64 encoding utility
export function toBase64(data: string): string {
	if (typeof window !== 'undefined') {
		return btoa(data);
	} else {
		return Buffer.from(data).toString('base64');
	}
}

