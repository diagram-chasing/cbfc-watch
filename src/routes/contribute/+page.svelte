<script lang="ts">
	import { Camera, Upload, CheckCircle, MapPin, QrCode } from 'lucide-svelte';
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
	import QRBulkScanner from '$lib/components/QRBulkScanner.svelte';

	import ClearPicture from '$lib/assets/clear-picture.webp';
	import Certificates from '$lib/assets/censor-certificate.jpg';
	import CBFCWatch from '$lib/assets/cbfc-watch.webp';

	let { data }: { data: PageData } = $props();

	// Mode selection
	let showScanner = $state(false);
	let showGuide = $state(false);

	// Bulk scanning state
	interface ScannedURL {
		id: string;
		url: string;
		timestamp: number;
	}
	let scannedUrls = $state<ScannedURL[]>([]);
	let isBulkSubmitting = $state(false);
	let bulkSubmitSuccess = $state(false);
	let bulkSubmitProgress = $state({ current: 0, total: 0 });

	// Submission state management
	let isSubmitting = $state(false);
	let isSuccess = $state(false);
	let buttonVariant = $derived(() => {
		if (isSuccess || bulkSubmitSuccess) return 'green';
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

	// Bulk submission handler
	async function handleBulkSubmit() {
		const urlsToSubmit = scannedUrls;
		const manualUrl = $formData.url?.trim();

		// Check if we have anything to submit
		if (urlsToSubmit.length === 0 && !manualUrl) {
			toast.error('Nothing to submit', {
				description: 'Please scan QR codes or enter a URL.',
				duration: 3000,
				unstyled: true,
				classes: {
					toast: 'bg-red w-fit gap-2 py-2 px-4 flex items-center justify-center text-white',
					description: 'text-sm'
				}
			});
			return;
		}

		// Add manual URL to submission list if provided
		const allUrls = [...urlsToSubmit];
		if (manualUrl) {
			allUrls.push({ id: crypto.randomUUID(), url: manualUrl, timestamp: Date.now() });
		}

		isBulkSubmitting = true;
		bulkSubmitSuccess = false;
		bulkSubmitProgress = { current: 0, total: allUrls.length };

		let successCount = 0;
		let failCount = 0;

		const contributorName = $formData.contributorName || undefined;

		// Submit each URL individually
		for (let i = 0; i < allUrls.length; i++) {
			bulkSubmitProgress.current = i + 1;

			try {
				const response = await fetch('?/default', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({
						url: allUrls[i].url,
						contributorName: contributorName || ''
					})
				});

				if (response.ok) {
					successCount++;
				} else {
					failCount++;
				}
			} catch (error) {
				console.error('Failed to submit URL:', error);
				failCount++;
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		isBulkSubmitting = false;

		if (failCount === 0) {
			bulkSubmitSuccess = true;
			toast.success(`Successfully submitted ${successCount} contribution${successCount > 1 ? 's' : ''}!`, {
				description: 'Thank you for helping expand our database.',
				duration: 3000,
				unstyled: true,
				classes: {
					toast: 'bg-sepia-brown w-fit gap-2 py-2 px-4 flex items-center justify-center',
					description: 'text-sm'
				}
			});

			// Clear everything after successful submission
			scannedUrls = [];
			$formData.url = '';

			setTimeout(() => {
				bulkSubmitSuccess = false;
			}, 5000);
		} else {
			toast.error(`Submitted ${successCount} of ${allUrls.length} URLs`, {
				description: `${failCount} submission(s) failed. Please try again.`,
				duration: 5000,
				unstyled: true,
				classes: {
					toast: 'bg-red w-fit gap-2 py-2 px-4 flex items-center justify-center text-white',
					description: 'text-sm'
				}
			});
		}
	}

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
				'Each certificate has a QR code on it. This is the most important part! You can either use our built-in QR Bulk Scan mode above (recommended for multiple certificates) or scan the QR code with your phone and copy the ecinepramaan.gov.in URL manually.',
			image: ClearPicture,
			details: null,
			align: 'object-right scale-150'
		},
		{
			number: 3,
			title: 'Submit Your Findings',

			description:
				'Use the form above to submit. Choose "Manual Entry" for single URLs or "QR Bulk Scan" to scan and submit multiple certificates at once. You may optionally provide your name for attribution.',
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
	<div class="border-sepia-dark border bg-white p-4">
		<div class="mb-3 flex items-center gap-2">
			<div
				class="bg-sepia-brown text-sepia-light flex h-6 w-6 flex-shrink-0 items-center justify-center text-sm font-bold"
			>
				{step.number}
			</div>
			<h4 class="font-atkinson text-sepia-brown text-sm font-bold">{step.title}</h4>
		</div>

		{#if step.image}
			<div
				class="bg-sepia-med border-sepia-dark mb-3 flex h-32 items-center justify-center overflow-hidden border"
			>
				<img
					src={step.image}
					alt={step.iconLabel}
					class="h-full w-full object-cover {step.align ? step.align : 'object-center'}"
				/>
			</div>
		{/if}

		<p class="font-atkinson text-sm leading-relaxed text-gray-600">
			{step.description}
		</p>
	</div>
{/snippet}

<svelte:head>
	<title>Contribute to CBFC Watch</title>
	<meta
		name="description"
		content="Help us preserve film censorship history by contributing certificates from your local cinema."
	/>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-6 px-2 py-6 md:px-0 md:py-8">
	<!-- Quick Actions - Payment App Style -->
	{#if currentMode === 'select'}
		<section class="space-y-6">
			<!-- Simple Header -->
			<div class="text-center">
				<h1 class="font-gothic text-sepia-brown mb-2 text-3xl font-bold md:text-4xl">
					Contribute a Certificate
				</h1>
				<p class="font-atkinson text-gray-600">
					Choose how you'd like to submit CBFC certificate URLs
				</p>
			</div>

			<!-- Primary Action Cards -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- QR Scan Card -->
				<button
					type="button"
					onclick={() => (currentMode = 'bulk')}
					class="border-sepia-dark hover:bg-sepia-light group flex flex-col items-center gap-4 border bg-white p-8 text-center transition-all hover:shadow-md"
				>
					<div class="bg-sepia-brown flex h-16 w-16 items-center justify-center">
						<QrCode class="h-8 w-8 text-white" />
					</div>
					<div>
						<h3 class="font-atkinson text-sepia-brown mb-1 text-xl font-bold">Scan QR Codes</h3>
						<p class="font-atkinson text-sm text-gray-600">
							Use your camera to scan multiple certificates at once
						</p>
					</div>
					<div class="bg-sepia-brown text-sepia-light px-4 py-2 text-sm font-semibold">
						Recommended
					</div>
				</button>

				<!-- Manual Entry Card -->
				<button
					type="button"
					onclick={() => (currentMode = 'manual')}
					class="border-sepia-dark hover:bg-sepia-light group flex flex-col items-center gap-4 border bg-white p-8 text-center transition-all hover:shadow-md"
				>
					<div class="bg-sepia-brown flex h-16 w-16 items-center justify-center">
						<Upload class="h-8 w-8 text-white" />
					</div>
					<div>
						<h3 class="font-atkinson text-sepia-brown mb-1 text-xl font-bold">Paste URL</h3>
						<p class="font-atkinson text-sm text-gray-600">
							Enter certificate URLs manually one at a time
						</p>
					</div>
				</button>
			</div>

			<!-- Quick Guide Toggle -->
			<div class="text-center">
				<button
					type="button"
					onclick={() => (showGuide = !showGuide)}
					class="font-atkinson text-sepia-brown hover:text-sepia-dark text-sm underline transition-colors"
				>
					{showGuide ? '↑ Hide' : '↓ Show'} how this works
				</button>
			</div>
		</section>
	{/if}

	<!-- Contribution Form - Shown when mode selected -->
	{#if currentMode !== 'select'}
		<section class="border-sepia-dark border bg-white shadow-md">
			<!-- Header with back button -->
			<div class="bg-sepia-light border-sepia-dark flex items-center justify-between border-b p-4">
				<button
					type="button"
					onclick={() => (currentMode = 'select')}
					class="hover:text-sepia-dark flex items-center gap-2 text-sm transition-colors"
				>
					<span class="text-xl">←</span> Back
				</button>
				<h2 class="font-atkinson text-sepia-brown text-lg font-semibold">
					{currentMode === 'bulk' ? 'QR Bulk Scan' : 'Manual Entry'}
				</h2>
				<div class="w-16"></div>
			</div>

			<div class="p-6">
				{#if currentMode === 'manual'}
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
				{:else}
					<!-- Bulk QR Scanning Mode -->
					<div class="space-y-6">
					<!-- Contributor Name (shared across both modes) -->
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
							We'll credit you for all contributions in this session if you provide your name
						</Form.Description>
						<Form.FieldErrors class="font-atkinson text-sm text-red-600" />
					</Form.Field>

					<!-- QR Bulk Scanner Component -->
					<QRBulkScanner bind:onUrlsScanned={scannedUrls} />

					<!-- Bulk Submit Button -->
					{#if scannedUrls.length > 0}
						<div class="pt-4">
							<button
								type="button"
								onclick={handleBulkSubmit}
								disabled={isBulkSubmitting || bulkSubmitSuccess}
								class="font-atkinson h-14 w-full text-lg font-semibold tracking-wide transition-all duration-300 ease-out {buttonVariant() ===
								'green'
									? 'bg-green-600 hover:bg-green-700 text-white'
									: 'bg-sepia-brown hover:bg-sepia-dark text-white'} disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if bulkSubmitSuccess}
									<div in:scale={{ duration: 200, start: 0.8 }} class="flex items-center justify-center">
										<CheckCircle class="mr-3 h-5 w-5" />
										Success!
									</div>
								{:else if isBulkSubmitting}
									<div in:fly={{ y: -10, duration: 200 }} class="flex items-center justify-center">
										<div
											class="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
										></div>
										Submitting... ({bulkSubmitProgress.current}/{bulkSubmitProgress.total})
									</div>
								{:else}
									<div class="flex items-center justify-center">
										<Upload class="mr-3 h-5 w-5" />
										Submit {scannedUrls.length} Contribution{scannedUrls.length > 1 ? 's' : ''}
									</div>
								{/if}
							</button>
						</div>
						{/if}
					</div>
				{/if}
			</div>

			<div class="border-t border-gray-200 bg-gray-50 p-4">
				<p class="font-atkinson text-center text-sm text-gray-600">
					By submitting, you agree to let us process and archive your contribution for public research
					access.
				</p>
			</div>
		</section>
	{/if}

	<!-- Context Section - Collapsible or Always Visible -->
	{#if showGuide || currentMode === 'select'}
		<section class="space-y-6">
			<!-- Why We Need This -->
			{#if currentMode === 'select'}
				<div class="border-sepia-dark border bg-white p-6">
					<h3 class="font-atkinson text-sepia-brown mb-3 text-lg font-semibold">
						Why we need your help
					</h3>
					<div class="font-atkinson space-y-3 text-sm leading-relaxed text-gray-700">
						<p>
							Our automated data collection from the CBFC has been disrupted. The good news is the
							data still exists—it's printed on certificates that theaters display for every film.
						</p>
						<p>
							<strong>That's where you come in!</strong> Next time you're at the movies, you can help
							preserve this important censorship data for public access.
						</p>
					</div>
				</div>
			{/if}

			<!-- Process Steps -->
			<div id="how-to-contribute" class="space-y-4">
				<h3 class="font-atkinson text-sepia-brown mb-4 text-center text-xl font-semibold">
					How to Contribute
				</h3>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each steps as step}
						{@render stepCard(step)}
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>
