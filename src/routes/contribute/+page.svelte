<script lang="ts">
	import { Camera, Upload, CheckCircle, MapPin, QrCode, X, Loader2, Trash2 } from 'lucide-svelte';
	import * as Form from '$lib/components/ui/form';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import SEO from '$lib/components/SEO.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { contributionSchema, type ContributionSchema } from './schema';
	import type { PageData } from './$types.js';
	import { toast } from 'svelte-sonner';
	import { fly, scale } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';
	import {
		isValidCBFCUrl,
		selectBackCamera,
		shouldProcessScan,
		getCameraErrorMessage
	} from '$lib/utils/qrScanner';

	import ClearPicture from '$lib/assets/clear-picture.webp';
	import Certificates from '$lib/assets/censor-certificate.jpg';
	import CBFCWatch from '$lib/assets/cbfc-watch.webp';

	let { data }: { data: PageData } = $props();

	// Submission state management (single URL mode)
	let isSubmitting = $state(false);
	let isSuccess = $state(false);
	let buttonVariant = $derived(() => {
		if (isSuccess) return 'green';
		return 'default';
	});

	// Bulk QR Mode state management
	let isBulkModeOpen = $state(false);
	let scannedUrls = $state<string[]>([]);
	let isScanning = $state(false);
	let isBulkSubmitting = $state(false);
	let html5QrCode: Html5Qrcode | null = null;
	let scannerReaderElement: HTMLElement | null = null;

	// Track which URLs are currently being submitted (for individual feedback)
	let submissionStates = $state<Record<string, 'pending' | 'submitting' | 'success' | 'error'>>({});

	// Prevent rapid re-scanning of the same QR code
	let lastScannedUrl = '';
	let lastScanTime = 0;

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

	// ===== BULK QR MODE FUNCTIONS =====

	/**
	 * Initialize and start the QR scanner
	 * The scanner continuously scans without stopping after each successful read
	 */
	async function startScanner() {
		if (!scannerReaderElement || isScanning) return;

		try {
			// Initialize Html5Qrcode instance
			html5QrCode = new Html5Qrcode('qr-reader', { verbose: false });
			isScanning = true;

			// Get the best camera (back camera on mobile)
			const cameraId = await selectBackCamera();

			// Configure scanner with continuous scanning enabled
			const config = {
				fps: 30, // Higher FPS for faster scanning
				qrbox: 250, // Scanner viewfinder size
				aspectRatio: 1.0
			};

			// Start scanning - onScanSuccess will be called for each successful scan
			await html5QrCode.start(cameraId, config, onScanSuccess, onScanError);

			console.log('[Scanner] Started successfully');
		} catch (err: any) {
			console.error('[Scanner] Error starting:', err);
			isScanning = false;
			const errorMsg = getCameraErrorMessage(err);
			toast.error('Camera Error', {
				description: errorMsg,
				duration: 5000
			});
		}
	}

	/**
	 * Handle successful QR code scan
	 * This is called continuously for each detected QR code
	 */
	function onScanSuccess(decodedText: string, decodedResult: Html5QrcodeResult) {
		console.log('[Scanner] QR detected:', decodedText);

		// Check cooldown to prevent rapid re-scanning
		if (!shouldProcessScan(decodedText, lastScannedUrl, lastScanTime, 2000)) {
			console.log('[Scanner] Cooldown active, ignoring');
			return;
		}

		// Update last scan tracking
		lastScannedUrl = decodedText;
		lastScanTime = Date.now();

		// Validate CBFC URL using utility function
		if (!isValidCBFCUrl(decodedText)) {
			console.log('[Scanner] Invalid CBFC URL');
			toast.error('Invalid QR Code', {
				description: 'This is not a valid CBFC certificate URL',
				duration: 2000,
				unstyled: true,
				classes: {
					toast: 'bg-red w-fit gap-2 py-2 px-4 flex items-center justify-center text-white',
					description: 'text-sm'
				}
			});
			return;
		}

		// Check for duplicates
		if (scannedUrls.includes(decodedText)) {
			console.log('[Scanner] Duplicate URL');
			toast.warning('Duplicate URL', {
				description: 'This certificate has already been scanned',
				duration: 2000
			});
			return;
		}

		// Add the URL to our collection
		scannedUrls = [...scannedUrls, decodedText];
		submissionStates[decodedText] = 'pending';

		console.log('[Scanner] URL added successfully. Total:', scannedUrls.length);

		// Show success toast with URL count
		toast.success(`Certificate ${scannedUrls.length} added`, {
			description: 'Point camera at next QR code',
			duration: 1500,
			unstyled: true,
			classes: {
				toast: 'bg-sepia-brown w-fit gap-2 py-2 px-4 flex items-center justify-center',
				description: 'text-sm'
			}
		});
	}

	/**
	 * Handle scan errors (most are just "no QR code in view" - we can ignore these)
	 */
	function onScanError(errorMessage: string) {
		// Silently ignore NotFoundException errors - they just mean no QR code is visible
		if (!errorMessage.includes('NotFoundException')) {
			console.warn('[Scanner] Error:', errorMessage);
		}
	}

	/**
	 * Stop the QR scanner and clean up resources
	 */
	async function stopScanner() {
		if (html5QrCode && isScanning) {
			try {
				await html5QrCode.stop();
				await html5QrCode.clear();
			} catch (err) {
				console.error('Error stopping scanner:', err);
			}
		}
		isScanning = false;
		html5QrCode = null;
	}

	/**
	 * Remove a URL from the scanned list
	 */
	function removeUrl(url: string) {
		scannedUrls = scannedUrls.filter((u) => u !== url);
		delete submissionStates[url];
	}

	/**
	 * Clear all scanned URLs
	 */
	function clearAllUrls() {
		scannedUrls = [];
		submissionStates = {};
	}

	/**
	 * Submit all scanned URLs as individual API requests
	 * This handles the sequential submission with progress tracking
	 */
	async function submitBulkUrls() {
		if (scannedUrls.length === 0) return;

		isBulkSubmitting = true;
		const total = scannedUrls.length;
		let successCount = 0;
		let failCount = 0;

		// Create a loading toast that we'll update with progress
		const submissionToastId = toast.loading(`Submitting 1 of ${total}...`, {
			duration: Infinity // Keep toast visible until we manually dismiss it
		});

		// Submit each URL individually
		for (let i = 0; i < scannedUrls.length; i++) {
			const url = scannedUrls[i];
			const currentNum = i + 1;

			// Update toast with current progress
			toast.loading(`Submitting ${currentNum} of ${total}...`, {
				id: submissionToastId
			});

			// Mark this URL as currently submitting
			submissionStates[url] = 'submitting';

			try {
				// Make the API request
				const formData = new FormData();
				formData.append('url', url);
				// Note: contributorName is optional - we could add a field for this in bulk mode

				const response = await fetch('?', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					submissionStates[url] = 'success';
					successCount++;
				} else {
					submissionStates[url] = 'error';
					failCount++;
				}
			} catch (error) {
				console.error('Submission error for URL:', url, error);
				submissionStates[url] = 'error';
				failCount++;
			}

			// Small delay between requests to avoid overwhelming the server
			if (i < scannedUrls.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 300));
			}
		}

		// All submissions complete - update final toast
		isBulkSubmitting = false;

		if (failCount === 0) {
			// Perfect success
			toast.success(`All ${total} URLs submitted!`, {
				id: submissionToastId,
				description: 'Thank you for your contribution',
				duration: 3000,
				unstyled: true,
				classes: {
					toast: 'bg-sepia-brown w-fit gap-2 py-2 px-4 flex items-center justify-center',
					description: 'text-sm'
				}
			});

			// Close modal and reset after short delay
			setTimeout(() => {
				closeBulkMode();
			}, 1500);
		} else if (successCount === 0) {
			// Total failure
			toast.error('All submissions failed', {
				id: submissionToastId,
				description: 'Please try again later',
				duration: 3000,
				unstyled: true,
				classes: {
					toast: 'bg-red w-fit gap-2 py-2 px-4 flex items-center justify-center text-white',
					description: 'text-sm'
				}
			});
		} else {
			// Partial success
			toast.warning(`Submitted ${successCount} of ${total} URLs. ${failCount} failed.`, {
				id: submissionToastId,
				description: 'Some submissions could not be completed',
				duration: 5000
			});

			// Remove successfully submitted URLs from the list
			scannedUrls = scannedUrls.filter((url) => submissionStates[url] !== 'success');
		}
	}

	/**
	 * Open the bulk QR mode dialog and start the scanner
	 */
	async function openBulkMode() {
		isBulkModeOpen = true;
		// Reset scan tracking
		lastScannedUrl = '';
		lastScanTime = 0;
		// Wait for the dialog to render before starting scanner
		setTimeout(() => {
			startScanner();
		}, 300);
	}

	/**
	 * Close the bulk mode dialog and clean up
	 */
	async function closeBulkMode() {
		await stopScanner();
		isBulkModeOpen = false;

		// Clear data after modal close animation
		setTimeout(() => {
			clearAllUrls();
			lastScannedUrl = '';
			lastScanTime = 0;
		}, 300);
	}

	// Clean up scanner when component is destroyed
	onDestroy(() => {
		stopScanner();
	});

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

				<!-- Bulk QR Mode Trigger Button -->
				<div class="border-sepia-dark mt-4 border-t pt-4">
					<Button
						variant="outline"
						onclick={openBulkMode}
						class="font-atkinson h-12 w-full text-base font-medium"
					>
						<QrCode class="mr-2 h-5 w-5" />
						Scan Multiple QR Codes
					</Button>
					<p class="font-atkinson mt-2 text-center text-xs text-gray-600">
						Scan multiple certificates in one session
					</p>
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

<!-- Bulk QR Code Scanning Dialog -->
<Dialog.Root open={isBulkModeOpen} onOpenChange={(open) => !open && closeBulkMode()}>
	<Dialog.Content class="max-h-[85vh] max-w-3xl p-4 overflow-hidden sm:p-6">
		<Dialog.Header class="space-y-1">
			<Dialog.Title class="font-gothic text-xl font-medium sm:text-2xl">
				Bulk QR Scanner
			</Dialog.Title>
			<Dialog.Description class="font-atkinson text-xs text-gray-600 sm:text-sm">
				Scan multiple certificates continuously
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Left: Scanner View -->
			<div class="flex flex-col">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="font-atkinson text-xs font-semibold text-gray-900 sm:text-sm">Camera</h3>
					{#if isScanning}
						<Badge variant="default" class="h-5 bg-green text-[10px] text-white">
							<div class="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white"></div>
							Active
						</Badge>
					{/if}
				</div>

				<!-- QR Scanner Container -->
				<div
					class="border-sepia-dark relative flex aspect-square items-center justify-center overflow-hidden border bg-black"
				>
					<!-- Scanner element - html5-qrcode will render the video feed here -->
					<div id="qr-reader" bind:this={scannerReaderElement} class="h-full w-full"></div>

					<!-- Scanner overlay instructions (shown when not scanning) -->
					{#if !isScanning}
						<div class="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
							<div class="text-center text-white">
								<Camera class="mx-auto mb-2 h-8 w-8 opacity-60 sm:h-10 sm:w-10" />
								<p class="font-atkinson text-xs sm:text-sm">Initializing camera...</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Scanner Instructions -->
				<div class="bg-sepia-light mt-2 p-2">
					<p class="font-atkinson text-[10px] leading-tight text-gray-700 sm:text-xs">
						<strong>Tip:</strong> Point camera at each QR code. Scanner runs continuously.
					</p>
				</div>
			</div>

			<!-- Right: Scanned URLs List -->
			<div class="flex flex-col">
				<div class="mb-2 flex items-center justify-between">
					<h3 class="font-atkinson text-xs font-semibold text-gray-900 sm:text-sm">
						Certificates ({scannedUrls.length})
					</h3>
					{#if scannedUrls.length > 0 && !isBulkSubmitting}
						<Button
							variant="ghost"
							size="sm"
							onclick={clearAllUrls}
							class="h-6 px-2 text-[10px] text-red hover:text-red sm:text-xs"
						>
							<Trash2 class="mr-0.5 h-3 w-3" />
							Clear
						</Button>
					{/if}
				</div>

				<!-- Scanned URLs ScrollArea -->
				<ScrollArea class="border-sepia-dark h-80 flex-1 border bg-white sm:h-96">
					<div class="space-y-1.5 p-2">
						{#if scannedUrls.length === 0}
							<div class="flex h-full items-center justify-center py-8 text-center">
								<div>
									<QrCode class="text-sepia-dark mx-auto mb-1.5 h-8 w-8 opacity-40" />
									<p class="font-atkinson text-sepia-dark text-xs opacity-60">No certificates yet</p>
									<p class="font-atkinson text-sepia-dark mt-0.5 text-[10px] opacity-50">
										Scan your first QR code
									</p>
								</div>
							</div>
						{:else}
							{#each scannedUrls as url, index}
								<div
									class="bg-sepia-light border-sepia-dark group relative flex items-center gap-2 border p-2 transition-all"
									class:opacity-50={submissionStates[url] === 'submitting' ||
										submissionStates[url] === 'success'}
								>
									<!-- URL Number Badge -->
									<div
										class="bg-sepia-brown text-sepia-light flex h-5 w-5 flex-shrink-0 items-center justify-center text-[10px] font-bold"
									>
										{index + 1}
									</div>

									<!-- URL Content -->
									<div class="min-w-0 flex-1">
										<p class="font-atkinson break-all text-[10px] text-gray-700">
											{new URL(url).hostname}
										</p>
										<p class="font-atkinson mt-0.5 break-all text-[9px] text-gray-500 leading-tight">
											{url.substring(0, 50)}{url.length > 50 ? '...' : ''}
										</p>
									</div>

									<!-- Status/Action -->
									<div class="flex-shrink-0">
										{#if submissionStates[url] === 'submitting'}
											<Loader2 class="text-sepia-brown h-3.5 w-3.5 animate-spin" />
										{:else if submissionStates[url] === 'success'}
											<CheckCircle class="h-3.5 w-3.5 text-green-600" />
										{:else if submissionStates[url] === 'error'}
											<Badge variant="destructive" class="h-4 px-1.5 text-[9px]">Error</Badge>
										{:else if !isBulkSubmitting}
											<Button
												variant="ghost"
												size="icon"
												onclick={() => removeUrl(url)}
												class="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
											>
												<X class="h-2.5 w-2.5" />
											</Button>
										{/if}
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</ScrollArea>
			</div>
		</div>

		<!-- Dialog Footer with Submit Button -->
		<Dialog.Footer class="mt-4">
			<div class="flex w-full flex-col gap-2 sm:flex-row">
				<Button
					variant="outline"
					onclick={closeBulkMode}
					disabled={isBulkSubmitting}
					class="font-atkinson h-9 w-full text-sm sm:w-auto"
				>
					{isBulkSubmitting ? 'Close when done' : 'Cancel'}
				</Button>
				<Button
					variant="default"
					onclick={submitBulkUrls}
					disabled={scannedUrls.length === 0 || isBulkSubmitting}
					class="font-atkinson h-9 w-full flex-1 text-sm sm:w-auto"
				>
					{#if isBulkSubmitting}
						<Loader2 class="mr-2 h-3.5 w-3.5 animate-spin" />
						Submitting...
					{:else if scannedUrls.length === 0}
						Submit
					{:else}
						<Upload class="mr-2 h-3.5 w-3.5" />
						Submit {scannedUrls.length}
					{/if}
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
