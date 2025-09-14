import { z } from 'zod';

export const contributionSchema = z.object({
	url: z
		.string()
		.refine(
			(url) => {
				try {
					const urlObj = new URL(url);
					return urlObj.hostname === 'www.ecinepramaan.gov.in';
				} catch {
					return false;
				}
			},
			{ message: 'URL must be from www.ecinepramaan.gov.in' }
		),
	contributorName: z.string().optional()
});

export type ContributionSchema = typeof contributionSchema;
