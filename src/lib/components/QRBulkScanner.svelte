<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { Html5Qrcode } from 'html5-qrcode';
	import { Camera, X, Trash2, CheckCircle, AlertCircle } from 'lucide-svelte';

	interface ScannedURL {
		id: string;
		url: string;
		timestamp: number;
	}

	let {
		onUrlsScanned = $bindable([])
	}: {
		onUrlsScanned?: ScannedURL[];
	} = $props();

	let isScanning = $state(false);
	let scannedUrls = $state<ScannedURL[]>([]);
	let html5QrCode: Html5Qrcode | null = $state(null);
	let lastScannedUrl = $state('');
	let lastScanTime = $state(0);
	let errorMessage = $state('');
	let successMessage = $state('');
	let cameraPermissionState = $state<'prompt' | 'granted' | 'denied'>('prompt');
	let isRequestingPermission = $state(false);

	const SCAN_COOLDOWN = 2000;

	function isValidCBFCUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname === 'www.ecinepramaan.gov.in' || urlObj.hostname === 'ecinepramaan.gov.in';
		} catch {
			// If not a valid URL, check if it contains the domain
			return url.includes('ecinepramaan.gov.in');
		}
	}

	async function startScanning() {
		errorMessage = '';
		successMessage = '';
		isRequestingPermission = true;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } }
			});
			stream.getTracks().forEach(track => track.stop());
			cameraPermissionState = 'granted';
		} catch (permErr: any) {
			isRequestingPermission = false;
			if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
				errorMessage = 'Camera permission denied. Please allow camera access.';
				cameraPermissionState = 'denied';
			} else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
				errorMessage = 'No camera found.';
			} else {
				errorMessage = `Camera error: ${permErr.message}`;
			}
			return;
		}

		isRequestingPermission = false;
		isScanning = true;
		await tick();

		try {
			html5QrCode = new Html5Qrcode('qr-reader');
			await html5QrCode.start(
				{ facingMode: { ideal: 'environment' } },
				{ fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
				(decodedText) => {
					const now = Date.now();
					if (decodedText === lastScannedUrl && now - lastScanTime < SCAN_COOLDOWN) return;

					if (!isValidCBFCUrl(decodedText)) {
						errorMessage = '❌ Invalid QR - must be from ecinepramaan.gov.in';
						setTimeout(() => errorMessage = '', 3000);
						return;
					}

					if (scannedUrls.some((item) => item.url === decodedText)) {
						errorMessage = '⚠️ Already scanned this URL';
						setTimeout(() => errorMessage = '', 3000);
						return;
					}

					const newUrl: ScannedURL = { id: crypto.randomUUID(), url: decodedText, timestamp: now };
					scannedUrls = [...scannedUrls, newUrl];
					onUrlsScanned = scannedUrls;
					lastScannedUrl = decodedText;
					lastScanTime = now;

					successMessage = `✓ Scanned! (${scannedUrls.length} total)`;
					errorMessage = '';
					setTimeout(() => successMessage = '', 2000);

					// Vibrate on success (mobile)
					if (navigator.vibrate) navigator.vibrate(200);
				},
				() => {}
			);
		} catch (err: any) {
			errorMessage = `Scanner error: ${err.message}`;
			isScanning = false;
		}
	}

	async function stopScanning() {
		if (html5QrCode && isScanning) {
			try {
				await html5QrCode.stop();
				html5QrCode.clear();
			} catch (err) {
				console.error('Failed to stop scanning:', err);
			}
		}
		isScanning = false;
		html5QrCode = null;
	}

	function removeUrl(id: string) {
		scannedUrls = scannedUrls.filter((item) => item.id !== id);
		onUrlsScanned = scannedUrls;
	}

	function clearAll() {
		scannedUrls = [];
		onUrlsScanned = [];
	}

	onDestroy(() => {
		stopScanning();
	});
</script>

<div class="space-y-4">
	<!-- Scanner Controls -->
	<div class="border-sepia-dark bg-sepia-light flex items-center justify-between gap-4 border p-4">
		<div class="flex-1">
			<h3 class="font-atkinson text-sepia-brown text-lg font-semibold">QR Bulk Scan</h3>
			<p class="font-atkinson text-sm text-gray-600">
				{#if isScanning}
					<span class="text-sepia-brown font-semibold">📹 Scanning... Point camera at QR codes</span>
				{:else}
					Scan multiple certificates in one session
				{/if}
			</p>
		</div>
		<button
			type="button"
			onclick={() => (isScanning ? stopScanning() : startScanning())}
			disabled={isRequestingPermission}
			class="bg-sepia-brown hover:bg-sepia-dark flex items-center gap-2 px-4 py-3 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isRequestingPermission}
				<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
			{:else if isScanning}
				<X class="h-5 w-5" />
				Stop
			{:else}
				<Camera class="h-5 w-5" />
				Start
			{/if}
		</button>
	</div>

	<!-- Success Message -->
	{#if successMessage}
		<div class="bg-sepia-brown animate-pulse border-green-700 flex items-center gap-2 border p-3 text-white">
			<CheckCircle class="h-5 w-5 flex-shrink-0" />
			<p class="font-atkinson text-sm font-semibold">{successMessage}</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if errorMessage}
		<div class="flex items-center gap-2 border border-red-300 bg-red-50 p-3 text-red-700">
			<AlertCircle class="h-5 w-5 flex-shrink-0" />
			<p class="font-atkinson text-sm font-semibold">{errorMessage}</p>
		</div>
	{/if}

	<!-- Scanner View -->
	{#if isScanning}
		<div class="border-sepia-dark relative overflow-hidden border bg-black">
			<div id="qr-reader"></div>
			<div class="bg-sepia-brown absolute bottom-0 left-0 right-0 p-3 text-center text-white">
				<p class="font-atkinson text-sm font-semibold">
					{scannedUrls.length} URL{scannedUrls.length !== 1 ? 's' : ''} scanned • Point at QR code
				</p>
			</div>
		</div>
	{/if}

	<!-- Scanned URLs List -->
	{#if scannedUrls.length > 0}
		<div class="border-sepia-dark border bg-white">
			<div class="bg-sepia-light border-sepia-dark flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-2">
					<CheckCircle class="text-sepia-brown h-5 w-5" />
					<h4 class="font-atkinson text-sepia-brown font-semibold">
						Scanned URLs ({scannedUrls.length})
					</h4>
				</div>
				<button
					type="button"
					onclick={clearAll}
					class="hover:text-sepia-dark flex items-center gap-1 text-sm text-gray-600 transition-colors"
				>
					<Trash2 class="h-4 w-4" />
					Clear All
				</button>
			</div>

			<div class="max-h-96 overflow-y-auto">
				{#each scannedUrls as item (item.id)}
					<div
						class="border-sepia-dark flex items-start justify-between gap-4 border-b p-4 last:border-b-0"
					>
						<div class="flex-1 overflow-hidden">
							<p class="font-atkinson break-all text-sm text-gray-700">
								{item.url}
							</p>
							<p class="font-atkinson mt-1 text-xs text-gray-500">
								Scanned {new Date(item.timestamp).toLocaleTimeString()}
							</p>
						</div>
						<button
							type="button"
							onclick={() => removeUrl(item.id)}
							class="text-sepia-brown hover:text-sepia-dark flex-shrink-0 transition-colors"
							aria-label="Remove URL"
						>
							<X class="h-5 w-5" />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if !isScanning && scannedUrls.length === 0}
		<div class="border-sepia-dark bg-sepia-light border p-8 text-center">
			<Camera class="text-sepia-brown mx-auto mb-3 h-12 w-12 opacity-50" />
			<p class="font-atkinson text-sepia-brown mb-1 font-semibold">Ready to scan</p>
			<p class="font-atkinson text-sm text-gray-600">Click "Start" to begin</p>
		</div>
	{/if}
</div>

<style>
	:global(#qr-reader) {
		border: none !important;
	}

	:global(#qr-reader video) {
		width: 100% !important;
		height: auto !important;
	}

	:global(#qr-reader__scan_region) {
		border: none !important;
	}

	:global(#qr-reader__dashboard_section_csr) {
		display: none !important;
	}
</style>
