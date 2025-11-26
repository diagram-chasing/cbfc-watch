import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';
import type { Action } from 'svelte/action';
import {
	selectBackCamera,
	isCameraSupported,
	getCameraErrorMessage,
	type QRScannerConfig,
	DEFAULT_SCANNER_CONFIG
} from '$lib/utils/qrScanner';

export interface QRScannerOptions {
	config?: QRScannerConfig;
	autoStart?: boolean;
	isActive?: boolean;
	onScanSuccess: (decodedText: string, result: Html5QrcodeResult) => void;
	onScanFailure?: (error: string) => void;
	onStateChange?: (state: ScannerState) => void;
	onError?: (error: string) => void;
}

export type ScannerState = 'idle' | 'initializing' | 'scanning' | 'stopping' | 'error';

/**
 * Custom Svelte action for QR code scanning
 *
 * Usage:
 * ```svelte
 * <div use:qrScanner={{
 *   config: { fps: 10 },
 *   onScanSuccess: handleScan,
 *   onStateChange: (state) => scannerState = state
 * }}></div>
 * ```
 */
export const qrScanner: Action<HTMLDivElement, QRScannerOptions> = (node, options) => {
	let scanner: Html5Qrcode | null = null;
	let currentState: ScannerState = 'idle';

	const updateState = (newState: ScannerState) => {
		currentState = newState;
		options?.onStateChange?.(newState);
	};

	const handleScanFailure = (error: string) => {
		// Silently ignore decode errors - they happen constantly while scanning
		options?.onScanFailure?.(error);
	};

	async function start() {
		console.log('[QR Scanner Action] start() called, currentState:', currentState);
		if (currentState !== 'idle' && currentState !== 'error') {
			console.log('[QR Scanner Action] Not idle, skipping start');
			return;
		}

		updateState('initializing');

		try {
			// Check for camera support
			if (!isCameraSupported()) {
				throw new Error('Camera not supported. Please use HTTPS or a modern browser.');
			}

			// Ensure the node has an ID BEFORE initializing scanner
			if (!node.id) {
				node.id = `qr-scanner-${Math.random().toString(36).substr(2, 9)}`;
			}
			console.log('[QR Scanner Action] Node ID:', node.id);

			// Get camera ID
			const cameraId = await selectBackCamera();
			console.log('[QR Scanner Action] Camera ID:', cameraId);

			// Initialize scanner
			if (!scanner) {
				console.log('[QR Scanner Action] Creating new Html5Qrcode instance');
				scanner = new Html5Qrcode(node.id, {
					verbose: false
				});
			}

			// Start scanning
			console.log('[QR Scanner Action] Starting scanner...');
			await scanner.start(
				cameraId,
				{ ...DEFAULT_SCANNER_CONFIG, ...options.config },
				options.onScanSuccess,
				handleScanFailure
			);

			console.log('[QR Scanner Action] Scanner started successfully');
			updateState('scanning');
		} catch (err: any) {
			console.error('[QR Scanner Action] Failed to start scanner:', err);
			const errorMessage = getCameraErrorMessage(err);
			options?.onError?.(errorMessage);
			updateState('error');
		}
	}

	async function stop() {
		if (currentState !== 'scanning' || !scanner) {
			return;
		}

		updateState('stopping');

		try {
			await scanner.stop();
			updateState('idle');
		} catch (err) {
			console.error('Failed to stop scanner:', err);
			updateState('idle');
		}
	}

	async function cleanup() {
		if (scanner) {
			try {
				if (currentState === 'scanning') {
					await scanner.stop();
				}
				scanner.clear();
			} catch (err) {
				console.error('Cleanup error:', err);
			}
		}
	}

	// Auto-start if enabled (unless isActive is explicitly provided)
	if (options.isActive === undefined) {
		// No isActive control, auto-start by default
		if (options.autoStart !== false) {
			start();
		}
	} else if (options.isActive) {
		// isActive is true, start immediately
		start();
	}

	return {
		update(newOptions: QRScannerOptions) {
			const wasActive = options.isActive;
			options = newOptions;

			// Handle isActive changes
			if (newOptions.isActive !== undefined && newOptions.isActive !== wasActive) {
				if (newOptions.isActive) {
					start();
				} else {
					stop();
				}
			}
		},
		destroy() {
			cleanup();
		}
	};
};

/**
 * Creates a controller for programmatically controlling the scanner
 */
export function createScannerController() {
	let startFn: (() => Promise<void>) | null = null;
	let stopFn: (() => Promise<void>) | null = null;

	return {
		setCallbacks(start: () => Promise<void>, stop: () => Promise<void>) {
			startFn = start;
			stopFn = stop;
		},
		async start() {
			await startFn?.();
		},
		async stop() {
			await stopFn?.();
		}
	};
}
