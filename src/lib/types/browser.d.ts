/**
 * Type definitions for browser-specific APIs not included in standard TypeScript
 */
interface NetworkInformation extends EventTarget {
	readonly downlink: number;
	readonly effectiveType: string;
	readonly rtt: number;
	readonly saveData: boolean;
	readonly type: string;
	onchange: EventListener;
}

// Extend the Navigator interface
interface Navigator {
	connection?: NetworkInformation;
	mozConnection?: NetworkInformation;
	webkitConnection?: NetworkInformation;
}
