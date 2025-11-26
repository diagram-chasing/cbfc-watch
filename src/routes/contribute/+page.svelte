<script lang="ts">
	import { Camera, Upload, CheckCircle, MapPin, QrCode, X, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-svelte';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import SEO from '$lib/components/SEO.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { superForm, type Infer, type SuperValidated } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { contributionSchema, type ContributionSchema } from './schema';
	import type { PageData } from './$types.js';
	import { toast } from 'svelte-sonner';
	import { fly, scale, slide } from 'svelte/transition';
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

	// Detect mobile device
	let isMobile = $state(false);

	// QR Mode state management
	let isQRMode = $state(false);
	let scannedUrls = $state<string[]>([]);
	let isScanning = $state(false);
	let isBulkSubmitting = $state(false);
	let html5QrCode: Html5Qrcode | null = null;
	let scannerReaderElement: HTMLElement | null = null;
	let isUrlListExpanded = $state(false);

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

			// Reset scanned URLs after successful submission
			setTimeout(() => {
				clearAllUrls();
				isQRMode = false;
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
	 * Toggle QR mode on/off
	 */
	async function toggleQRMode() {
		isQRMode = !isQRMode;

		if (isQRMode) {
			// Reset scan tracking
			lastScannedUrl = '';
			lastScanTime = 0;
			// Wait for the scanner element to render before starting
			setTimeout(() => {
				startScanner();
			}, 300);
		} else {
			await stopScanner();
			// Optionally clear scanned URLs when switching modes
			// clearAllUrls();
		}
	}

	// Detect mobile device and set default mode
	onMount(() => {
		// Detect mobile using media query (more reliable than user agent)
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		isMobile = mediaQuery.matches;

		// Set QR mode as default for mobile devices
		if (isMobile) {
			isQRMode = true;
			// Start scanner after DOM is ready
			setTimeout(() => {
				startScanner();
			}, 300);
		}

		// Listen for viewport changes
		const handleResize = (e: MediaQueryListEvent | MediaQueryList) => {
			isMobile = e.matches;
		};

		mediaQuery.addEventListener('change', handleResize);

		return () => {
			mediaQuery.removeEventListener('change', handleResize);
		};
	});

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
		<div class="bg-sepia-light border-sepia-dark border-b p-4 sm:p-6">
			<h2 class="font-gothic text-sepia-brown text-2xl sm:text-3xl font-medium tracking-tight">
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

		<div class="p-4 sm:p-6">
			<!-- Mode Toggle -->
			<div class="bg-sepia-light border-sepia-dark mb-6 flex items-center justify-between border p-3">
				<div class="flex items-center gap-2">
					<QrCode class="text-sepia-brown h-5 w-5" />
					<Label class="font-atkinson text-sm font-semibold">
						{isQRMode ? 'QR Scanner Mode' : 'Manual Entry Mode'}
					</Label>
				</div>
				<Switch checked={isQRMode} onCheckedChange={toggleQRMode} />
			</div>

			<!-- Mobile: QR Scanner First (appears at top on mobile) -->
			<!-- Desktop: Manual Form First (appears at top on desktop) -->
			<div class="space-y-6">
				<!-- Manual Entry Form (shown first on desktop, second on mobile) -->
				<div class:order-2={isQRMode} class:order-1={!isQRMode} class="md:order-1">
					{#if !isQRMode}
						<form method="POST" use:enhance class="space-y-6" enctype="multipart/form-data" transition:slide>
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
							<div class="pt-2">
								<Form.Button
									type="submit"
									variant={buttonVariant()}
									disabled={isSubmitting || isSuccess}
									class="font-atkinson h-12 sm:h-14 w-full text-base sm:text-lg font-semibold tracking-wide transition-all duration-300 ease-out"
								>
									{#if isSuccess}
										<div in:scale={{ duration: 200, start: 0.8 }} class="flex items-center">
											<CheckCircle class="mr-3 h-4 sm:h-5 w-4 sm:w-5" />
											Success!
										</div>
									{:else if isSubmitting}
										<div in:fly={{ y: -10, duration: 200 }} class="flex items-center">
											<div
												class="mr-3 h-4 sm:h-5 w-4 sm:w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
											></div>
											Submitting...
										</div>
									{:else}
										<div class="flex items-center">
											<Upload class="mr-3 h-4 sm:h-5 w-4 sm:w-5" />
											Submit Contribution
										</div>
									{/if}
								</Form.Button>
							</div>
						</form>
					{/if}
				</div>

				<!-- OR Divider -->
				{#if !isQRMode}
					<div class="relative md:order-2">
						<div class="absolute inset-0 flex items-center">
							<div class="border-sepia-dark w-full border-t"></div>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-white px-2 text-gray-500">Or use QR scanner</span>
						</div>
					</div>
				{/if}

				<!-- QR Scanner Section (shown first on mobile when active, last on desktop) -->
				<div class:order-1={isQRMode} class:order-3={!isQRMode} class="md:order-3">
					{#if isQRMode}
						<div class="space-y-4" transition:slide>
							<!-- Scanner Container -->
							<div class="border-sepia-dark relative border bg-black">
								<div id="qr-reader" bind:this={scannerReaderElement} class="aspect-square w-full"></div>

								{#if !isScanning}
									<div class="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
										<div class="text-center text-white">
											<Camera class="mx-auto mb-2 h-10 w-10 opacity-60" />
											<p class="font-atkinson text-sm">Initializing camera...</p>
										</div>
									</div>
								{/if}
							</div>

							<!-- Scanner Status & Controls -->
							<div class="bg-sepia-light border-sepia-dark flex items-center justify-between border p-3">
								<div class="flex items-center gap-3">
									{#if isScanning}
										<Badge variant="default" class="bg-green text-white">
											<div class="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-white"></div>
											Active
										</Badge>
									{/if}
									<div class="flex items-center gap-2">
										<span class="font-atkinson text-sm font-semibold">Scanned:</span>
										<Badge variant="outline" class="bg-sepia-brown text-sepia-light font-bold">
											{scannedUrls.length}
										</Badge>
									</div>
								</div>
								{#if scannedUrls.length > 0}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => (isUrlListExpanded = !isUrlListExpanded)}
										class="h-8 px-2 text-xs"
									>
										{isUrlListExpanded ? 'Hide' : 'View'}
										{#if isUrlListExpanded}
											<ChevronUp class="ml-1 h-3 w-3" />
										{:else}
											<ChevronDown class="ml-1 h-3 w-3" />
										{/if}
									</Button>
								{/if}
							</div>

							<!-- Expandable URL List -->
							{#if isUrlListExpanded && scannedUrls.length > 0}
								<div class="border-sepia-dark border" transition:slide>
									<ScrollArea class="h-60">
										<div class="space-y-2 p-3">
											{#each scannedUrls as url, index}
												<div
													class="bg-sepia-light border-sepia-dark group flex items-center gap-2 border p-2 text-xs"
													class:opacity-50={submissionStates[url] === 'submitting' ||
														submissionStates[url] === 'success'}
												>
													<!-- Number Badge -->
													<div
														class="bg-sepia-brown text-sepia-light flex h-5 w-5 flex-shrink-0 items-center justify-center text-[10px] font-bold"
													>
														{index + 1}
													</div>

													<!-- URL -->
													<div class="min-w-0 flex-1">
														<p class="font-atkinson truncate text-xs text-gray-700">
															{url.substring(0, 60)}{url.length > 60 ? '...' : ''}
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
																<X class="h-3 w-3" />
															</Button>
														{/if}
													</div>
												</div>
											{/each}
										</div>
									</ScrollArea>

									{#if scannedUrls.length > 0 && !isBulkSubmitting}
										<div class="bg-sepia-light border-sepia-dark flex justify-end border-t p-2">
											<Button
												variant="ghost"
												size="sm"
												onclick={clearAllUrls}
												class="h-7 px-2 text-xs text-red hover:text-red"
											>
												<Trash2 class="mr-1 h-3 w-3" />
												Clear All
											</Button>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Submit Button (Always Visible) -->
							<Button
								variant="default"
								onclick={submitBulkUrls}
								disabled={scannedUrls.length === 0 || isBulkSubmitting}
								class="font-atkinson h-12 sm:h-14 w-full text-base sm:text-lg font-semibold"
							>
								{#if isBulkSubmitting}
									<Loader2 class="mr-2 h-4 sm:h-5 w-4 sm:w-5 animate-spin" />
									Submitting...
								{:else if scannedUrls.length === 0}
									<Upload class="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
									Submit Scanned Certificates
								{:else}
									<Upload class="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
									Submit {scannedUrls.length} Certificate{scannedUrls.length !== 1 ? 's' : ''}
								{/if}
							</Button>

							<!-- Scanner Tip -->
							<div class="bg-sepia-light p-3">
								<p class="font-atkinson text-xs leading-relaxed text-gray-700">
									<strong>Tip:</strong> Point your camera at each QR code. The scanner runs continuously
									and will automatically add valid certificates.
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<div class="border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
			<p class="font-atkinson text-center text-xs sm:text-sm text-gray-600">
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

