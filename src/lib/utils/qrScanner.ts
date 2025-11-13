import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';

export interface ScannedURL {
	id: string;
	url: string;
	timestamp: number;
}

export interface QRScannerConfig {
	fps?: number;
	qrbox?: number | { width: number; height: number };
	aspectRatio?: number;
}

export const DEFAULT_SCANNER_CONFIG: QRScannerConfig = {
	fps: 30,
	qrbox: 250,
	aspectRatio: 1.0
};

/**
 * Validates if a URL is a valid CBFC certificate URL
 */
export function isValidCBFCUrl(url: string): boolean {
	try {
		const urlObj = new URL(url);
		return (
			urlObj.hostname === 'www.ecinepramaan.gov.in' ||
			urlObj.hostname === 'ecinepramaan.gov.in'
		);
	} catch {
		return url.includes('ecinepramaan.gov.in');
	}
}

/**
 * Selects the back camera from available devices, with fallbacks
 */
export async function selectBackCamera(): Promise<string | { facingMode: string }> {
	try {
		const cameras = await Html5Qrcode.getCameras();
		if (!cameras || cameras.length === 0) {
			throw new Error('No cameras found');
		}

		// Try to find back camera by label
		const backCamera = cameras.find(
			(camera) =>
				camera.label.toLowerCase().includes('back') ||
				camera.label.toLowerCase().includes('rear') ||
				camera.label.toLowerCase().includes('environment')
		);

		if (backCamera) {
			return backCamera.id;
		}

		// If multiple cameras, prefer the last one (usually back camera)
		if (cameras.length > 1) {
			return cameras[cameras.length - 1].id;
		}

		// Fallback to facingMode constraint
		return { facingMode: 'environment' };
	} catch (err) {
		console.warn('Failed to get cameras, using facingMode fallback:', err);
		return { facingMode: 'environment' };
	}
}

/**
 * Checks if camera API is supported
 */
export function isCameraSupported(): boolean {
	return !!(navigator.mediaDevices?.getUserMedia);
}

/**
 * Gets a user-friendly error message for common camera errors
 */
export function getCameraErrorMessage(error: any): string {
	if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
		return '📷 Camera permission denied. Please allow camera access and try again.';
	} else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
		return '📷 No camera found. Please check your device.';
	} else if (error.name === 'NotReadableError') {
		return '📷 Camera is in use by another app. Please close other apps and try again.';
	} else if (error.message) {
		return error.message;
	}
	return '❌ Failed to start scanner. Please refresh and try again.';
}

/**
 * Creates a new scanned URL entry
 */
export function createScannedURL(url: string): ScannedURL {
	return {
		id: crypto.randomUUID(),
		url,
		timestamp: Date.now()
	};
}

/**
 * Checks if a scan should be processed based on cooldown
 */
export function shouldProcessScan(
	decodedText: string,
	lastScannedUrl: string,
	lastScanTime: number,
	cooldownMs: number = 2000
): boolean {
	const now = Date.now();
	return !(decodedText === lastScannedUrl && now - lastScanTime < cooldownMs);
}
