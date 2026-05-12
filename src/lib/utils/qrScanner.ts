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
 * Gets a user-friendly error message for common camera errors
 */
export function getCameraErrorMessage(error: unknown): string {
	const err = error as { name?: string; message?: string } | null;
	if (!err) return 'Failed to start scanner. Please refresh and try again.';
	if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
		return 'Camera permission denied. Please allow camera access and try again.';
	}
	if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
		return 'No camera found. Please check your device.';
	}
	if (err.name === 'NotReadableError') {
		return 'Camera is in use by another app. Please close other apps and try again.';
	}
	if (err.message) return err.message;
	return 'Failed to start scanner. Please refresh and try again.';
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
