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
	let cameraPermissionState = $state<'prompt' | 'granted' | 'denied'>('prompt');
	let isRequestingPermission = $state(false);

	const SCAN_COOLDOWN = 2000;

	function isValidCBFCUrl(url: string): boolean {
		try {
			const urlObj = new URL(url);
			return urlObj.hostname === 'www.ecinepramaan.gov.in';
		} catch {
			return false;
		}
	}

	async function startScanning() {
		errorMessage = '';
		isRequestingPermission = true;

		try {
			// Request camera permission
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' }
			});
			stream.getTracks().forEach(track => track.stop());
			cameraPermissionState = 'granted';
		} catch (permErr: any) {
			isRequestingPermission = false;
			if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
				errorMessage = 'Camera permission denied. Please allow camera access and try again.';
				cameraPermissionState = 'denied';
			} else if (permErr.name === 'NotFoundError' || permErr.name === 'DevicesNotFoundError') {
				errorMessage = 'No camera found. Please connect a camera and try again.';
			} else {
				errorMessage = `Camera error: ${permErr.message || 'Unknown error'}`;
			}
			console.error('Camera permission error:', permErr);
			return;
		}

		isRequestingPermission = false;
		isScanning = true;
		await tick(); // Wait for DOM to render

		try {
			html5QrCode = new Html5Qrcode('qr-reader');
			await html5QrCode.start(
				{ facingMode: 'environment' },
				{ fps: 10, qrbox: { width: 250, height: 250 } },
				(decodedText) => {
					const now = Date.now();
					if (decodedText === lastScannedUrl && now - lastScanTime < SCAN_COOLDOWN) return;
					if (!isValidCBFCUrl(decodedText)) {
						errorMessage = 'Invalid QR code. Must be from www.ecinepramaan.gov.in';
						setTimeout(() => errorMessage = '', 3000);
						return;
					}
					if (scannedUrls.some((item) => item.url === decodedText)) {
						errorMessage = 'This URL has already been scanned';
						setTimeout(() => errorMessage = '', 3000);
						return;
					}
					const newUrl: ScannedURL = { id: crypto.randomUUID(), url: decodedText, timestamp: now };
					scannedUrls = [...scannedUrls, newUrl];
					onUrlsScanned = scannedUrls;
					lastScannedUrl = decodedText;
					lastScanTime = now;
					errorMessage = '';
				},
				() => {} // Ignore decode errors
			);
		} catch (err: any) {
			console.error('Failed to start scanning:', err);
			errorMessage = `Failed to start scanner: ${err.message || 'Unknown error'}`;
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
	<div class="border-sepia-dark bg-sepia-light flex items-center justify-between border p-4">
		<div class="flex-1">
			<h3 class="font-atkinson text-sepia-brown text-lg font-semibold">QR Bulk Scan Mode</h3>
			<p class="font-atkinson text-sm text-gray-600">
				Scan multiple QR codes in one session
			</p>
			{#if cameraPermissionState === 'prompt' && !isScanning && !isRequestingPermission}
				<p class="font-atkinson mt-1 text-xs text-gray-500">
					📷 Camera permission will be requested when you start scanning
				</p>
			{:else if cameraPermissionState === 'denied'}
				<p class="font-atkinson mt-1 text-xs text-red-600">
					⚠️ Camera access denied. Please enable in browser settings.
				</p>
			{/if}
		</div>
		<button
			type="button"
			onclick={() => (isScanning ? stopScanning() : startScanning())}
			disabled={isRequestingPermission || cameraPermissionState === 'denied'}
			class="bg-sepia-brown hover:bg-sepia-dark flex items-center gap-2 px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
		>
			{#if isRequestingPermission}
				<div
					class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
				></div>
				Requesting...
			{:else if isScanning}
				<X class="h-5 w-5" />
				Stop Scanning
			{:else}
				<Camera class="h-5 w-5" />
				Start Scanning
			{/if}
		</button>
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="border border-red-300 bg-red-50 p-4 text-red-700">
			<div class="flex items-start gap-2">
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0" />
				<div class="flex-1">
					<p class="font-atkinson text-sm font-semibold">{errorMessage}</p>
					{#if cameraPermissionState === 'denied' || errorMessage.includes('permission') || errorMessage.includes('denied')}
						<div class="font-atkinson mt-2 text-xs">
							<p class="mb-1 font-medium">How to enable camera access:</p>
							<ul class="ml-4 list-disc space-y-0.5">
								<li>Click the camera icon in your browser's address bar</li>
								<li>Select "Allow" for camera access</li>
								<li>Refresh the page if needed</li>
								<li>Alternatively, use Manual Entry mode to paste URLs directly</li>
							</ul>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Scanner View -->
	{#if isScanning}
		<div class="border-sepia-dark overflow-hidden border bg-black">
			<div id="qr-reader" bind:this={scannerElement}></div>
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
			<p class="font-atkinson text-sepia-brown mb-2 font-semibold">Ready to scan</p>
			<p class="font-atkinson text-sm text-gray-600">
				Click "Start Scanning" to begin scanning QR codes
			</p>
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
