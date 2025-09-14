<script lang="ts">
	import { Camera, Upload, CheckCircle, MapPin } from 'lucide-svelte';
	import * as Form from '$lib/components/ui/form';
	import SEO from '$lib/components/SEO.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { contributionSchema, type ContributionSchema } from './schema';
	import type { PageData } from './$types.js';
	import { toast } from 'svelte-sonner';
	import { fly, scale } from 'svelte/transition';

	import ClearPicture from '$lib/assets/clear-picture.webp';
	import Certificates from '$lib/assets/censor-certificate.jpg';
	import CBFCWatch from '$lib/assets/cbfc-watch.webp';

	let { data }: { data: PageData } = $props();

	// Submission state management
	let isSubmitting = $state(false);
	let isSuccess = $state(false);
	let buttonVariant = $derived(() => {
		if (isSuccess) return 'green';
		return 'default';
	});

	const form = superForm(data.form, {
		validators: zodClient(contributionSchema),
		onSubmit: () => {
			isSubmitting = true;
			isSuccess = false;
		},
		onResult: ({ result }) => {
			isSubmitting = false;
			if (result.type === 'success') {
				isSuccess = true;
				toast.success('Contribution submitted successfully!', {
					description: 'Thank you for helping expand our database.',
					duration: 3000,
					unstyled: true,
					classes: {
						toast: 'bg-sepia-brown w-fit gap-2 py-2 px-4 flex items-center justify-center',
						description: 'text-sm'
					}
				});
				// Reset states after 5 seconds
				setTimeout(() => {
					isSuccess = false;
				}, 5000);
			} else if (result.type === 'failure') {
				toast.error('Submission failed', {
					description: 'Please check your input and try again.',
					duration: 3000,
					unstyled: true,
					classes: {
						toast: 'bg-red w-fit gap-2 py-2 px-4 flex items-center justify-center text-white',
						description: 'text-sm'
					}
				});
			}
		}
	});

	const { form: formData, enhance } = form;

	interface Step {
		number: number;
		title: string;
		icon?: any;
		iconLabel?: string;
		description: string;
		details: string[] | null;
		image?: string;
		align?: string;
	}

	const steps: Step[] = [
		{
			number: 1,
			title: 'Find Certificates at Your Cinema',
			icon: MapPin,
			iconLabel: 'Cinema certificate display',
			description:
				'Look for CBFC certificates at theaters - near ticket counters, entrance areas, or promotional displays. You might have to move around, this might not be very obviously visible. You can also ask the staff.',
			details: null,
			image: Certificates,
			align: 'object-center'
		},
		{
			number: 2,
			title: 'Scan the Certificate',
			icon: Camera,
			iconLabel: 'Clear photo of certificate',
			description:
				'Each certificate has a QR code on it. This is the most important part! Scan the QR code with your phone and wait for the URL to open. You should be redirected to the E-Cinepramaan page for this particular movie. Copy this URL.',
			image: ClearPicture,
			details: null,
			align: 'object-right scale-150'
		},
		{
			number: 3,
			title: 'Upload via Our Form',

			description:
				'Submit this URL on the form above. You may optionally submit your name so we can credit you on our website.',
			details: null
		},
		{
			number: 4,
			title: 'We Process & Archive',
			icon: CheckCircle,
			iconLabel: 'Archive integration',
			description:
				"We review, digitize, and integrate your contribution into the public archive. Your contribution will also be backed up to the Internet Archive. Just by submitting this URL, you've helped increase the size of this archive and keep it up to date!",
			details: null,
			image: CBFCWatch,
			align: 'object-top'
		}
	];
</script>

<SEO
	title="Contribute Data"
	description="Help expand the CBFC Watch database. Submit CBFC censorship records, film certificates, and modification details to support transparency in Indian film censorship."
	keywords="contribute CBFC data, submit film certificates, censorship records, film database contribution, CBFC transparency"
/>

{#snippet stepCard(step: Step)}
	<div class="border-sepia-dark border bg-white p-4 shadow-xs">
		<div class="mb-3 flex items-center gap-2">
			<div
				class="bg-sepia-brown text-sepia-light flex h-6 w-6 items-center justify-center text-sm font-bold"
			>
				{step.number}
			</div>
			<h3 class="font-atkinson text-sepia-brown text-sm font-bold">{step.title}</h3>
		</div>

		{#if step.image}
			<div
				class="bg-sepia-med border-sepia-dark mb-3 flex h-92 items-center justify-center overflow-hidden border"
			>
				{#if step.image}
					<img
						src={step.image}
						alt={step.iconLabel}
						class="h-full w-full border border-black object-cover {step.align
							? step.align
							: 'object-center'}"
					/>
				{:else}
					<div class="text-center">
						<svelte:component
							this={step.icon}
							class="text-sepia-brown mx-auto mb-1 h-6 w-6 opacity-60"
						/>
						<span class="font-atkinson text-sepia-brown text-xs opacity-80">
							{step.iconLabel}
						</span>
					</div>
				{/if}
			</div>
		{/if}

		<p
			class="font-atkinson text-base leading-relaxed text-gray-600 md:text-base"
			class:mb-2={step.details}
		>
			{step.description}
		</p>

		{#if step.details}
			<div class="flex flex-wrap gap-1 text-xs text-gray-500">
				{#each step.details as detail, index}
					{#if index > 0}<span>•</span>{/if}
					<span>{detail}</span>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}

<svelte:head>
	<title>Contribute to CBFC Watch</title>
	<meta
		name="description"
		content="Help us preserve film censorship history by contributing certificates from your local cinema."
	/>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-4">
	<section class="relative" aria-label="Statistics hero section">
		<div class="relative mx-auto max-w-6xl">
			<div class="grain-effect">
				<div class="px-2 py-4 md:px-0">
					<!-- Title -->
					<h1
						class="font-gothic mb-6 text-4xl leading-tight font-bold tracking-[-0.01em] text-black sm:text-5xl md:text-6xl"
						style="text-wrap: balance;"
					>
						Contribute to the Archive
					</h1>

					<!-- Context paragraph -->
					<div class="max-w-2xl">
						<p
							class="font-atkinson text-base leading-relaxed text-gray-700"
							style="text-wrap: pretty;"
						>
							As of June 2025, our methodology for collecting data from the Central Board of Film
							Certification (CBFC) has been disrupted. Due to a significant overhaul of the CBFC's
							public-facing systems, our automated data retrieval processes are no longer
							functional.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section>
		<div class="columns-1 space-y-6 px-2 md:columns-2 md:px-0">
			<p class="font-atkinson text-base leading-relaxed text-gray-700" style="text-wrap: pretty;">
				While we try to work on engineering a new solution to ensure continuity, we're pivoting to a
				crowdsourced methodology. The good news is the raw data still exists in the wild; it's
				printed on the CBFC certificates that theaters are required to display for every film
				running in it.
			</p>
			<p class="font-atkinson text-base leading-relaxed text-gray-700" style="text-wrap: pretty;">
				<strong>That's where you come in!</strong> The next time you go to the movies, you can be a data
				contributor. By sending us a clear photo of the film's certificate, you can help us fill in the
				gaps. These contributions will allow us to process, verify, and publish this important data for
				open access.
			</p>
		</div>
	</section>

	<!-- Contribution Form -->
	<section class="border-sepia-dark border bg-white shadow-md">
		<div class="bg-sepia-light border-sepia-dark border-b p-6">
			<h2 class="font-gothic text-sepia-brown text-3xl font-medium tracking-tight">
				Submit Your Contribution
			</h2>
			<p class="font-atkinson mt-2 text-sm text-gray-700 md:text-base">
				Scan a CBFC certificate you found at a cinema and help us archive it for everyone to use.
			</p>
			<p class="font-atkinson mt-3 text-sm">
				<a
					href="#how-to-contribute"
					class="text-sepia-brown hover:text-sepia-dark underline transition-colors"
				>
					→ See how to contribute guide below
				</a>
			</p>
		</div>

		<div class="p-6">
			<form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data">
				<!-- URL with Form validation -->
				<Form.Field {form} name="url" class="space-y-3">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label class="font-atkinson text-sm font-semibold text-gray-900 md:text-base"
								>QR Code URL *</Form.Label
							>
							<Input
								{...props}
								bind:value={$formData.url}
								type="url"
								placeholder="https://www.ecinepramaan.gov.in/cbfc/?a=Certificate_Detail&i=..."
								class="font-atkinson focus:border-sepia-brown focus:ring-sepia-brown focus:ring-opacity-20 h-12 border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:ring-2 md:text-base"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description class="font-atkinson text-sm text-gray-600">
						Scan the QR code on the certificate and paste the ecinepramaan.gov.in URL here
					</Form.Description>
					<Form.FieldErrors class="font-atkinson text-sm text-red-600" />
				</Form.Field>

				<!-- Contributor Name with Form validation -->
				<Form.Field {form} name="contributorName" class="space-y-3">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label class="font-atkinson text-sm font-semibold text-gray-900 md:text-base"
								>Your Name (Optional)</Form.Label
							>
							<Input
								{...props}
								bind:value={$formData.contributorName}
								placeholder="Enter your name for attribution"
								class="font-atkinson focus:border-sepia-brown focus:ring-sepia-brown focus:ring-opacity-20 h-12 border-gray-300 bg-white text-sm placeholder:text-gray-400 focus:ring-2 md:text-base"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description class="font-atkinson text-sm text-gray-600">
						We'll credit you for your contribution if you provide your name
					</Form.Description>
					<Form.FieldErrors class="font-atkinson text-sm text-red-600" />
				</Form.Field>

				<!-- Submit Button -->
				<div class="pt-4">
					<Form.Button
						type="submit"
						variant={buttonVariant()}
						disabled={isSubmitting || isSuccess}
						class="font-atkinson h-14 w-full text-lg font-semibold tracking-wide transition-all duration-300 ease-out"
					>
						{#if isSuccess}
							<div in:scale={{ duration: 200, start: 0.8 }} class="flex items-center">
								<CheckCircle class="mr-3 h-5 w-5" />
								Success!
							</div>
						{:else if isSubmitting}
							<div in:fly={{ y: -10, duration: 200 }} class="flex items-center">
								<div
									class="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
								></div>
								Submitting...
							</div>
						{:else}
							<div class="flex items-center">
								<Upload class="mr-3 h-5 w-5" />
								Submit Contribution
							</div>
						{/if}
					</Form.Button>
				</div>
			</form>
		</div>

		<div class="border-t border-gray-200 bg-gray-50 p-4">
			<p class="font-atkinson text-center text-sm text-gray-600">
				By submitting, you agree to let us process and archive your contribution for public research
				access.
			</p>
		</div>
	</section>

	<!-- Process Steps -->
	<section id="how-to-contribute" class="mt-12 mb-8">
		<h2 class="font-gothic mb-4 text-center text-4xl font-medium tracking-tight text-black">
			How to Contribute
		</h2>

		<div class="grid grid-cols-1 gap-4">
			{#each steps as step}
				{@render stepCard(step)}
			{/each}
		</div>
	</section>
</div>
