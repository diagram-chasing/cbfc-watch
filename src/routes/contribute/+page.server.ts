import type { PageServerLoad, Actions } from './$types.js';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { contributionSchema } from './schema';

export const prerender = false;
export const load: PageServerLoad = async () => {
	return {
		form: await superValidate(zod(contributionSchema))
	};
};

export const actions: Actions = {
	default: async (event) => {
		const form = await superValidate(event, zod(contributionSchema));
		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		// Save form data to CloudFlare KV with UNIX timestamp as key
		try {
			const timestamp = Date.now().toString();
			const contributionData = {
				...form.data
			};

			await event.platform?.env.CBFC_CONTRIBUTIONS_KV.put(timestamp, JSON.stringify(contributionData), {
				metadata: {
					contributorName: form.data.contributorName || 'Anonymous',
					certificateUrl: form.data.url
				}
			});

			console.log('Form data saved to KV:', { key: timestamp, data: contributionData });
		} catch (error) {
			console.error('Failed to save contribution to KV:', error);
			return fail(500, {
				form,
				error: 'Failed to save contribution. Please try again.'
			});
		}

		return {
			form
		};
	}
};
