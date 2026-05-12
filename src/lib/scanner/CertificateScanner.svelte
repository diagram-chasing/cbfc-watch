<script lang="ts">
	import { onDestroy } from 'svelte';
	import { BarcodeDetector } from 'barcode-detector/ponyfill';
	import { Flashlight, FlashlightOff, Camera as CameraIcon } from 'lucide-svelte';
	import { getCameraErrorMessage } from '$lib/utils/qrScanner';

	type Props = {
		onScan: (decodedText: string) => void;
		onError?: (message: string) => void;
		paused?: boolean;
	};

	let { onScan, onError, paused = false }: Props = $props();

	let videoEl: HTMLVideoElement | null = $state(null);
	let stream: MediaStream | null = null;
	let track: MediaStreamTrack | null = null;
	let detector: BarcodeDetector | null = null;
	let rafId: number | null = null;
	let mounted = true;

	let status: 'idle' | 'starting' | 'ready' | 'error' = $state('idle');
	let zoomCaps = $state<{ min: number; max: number; step: number } | null>(null);
	let zoom = $state(1);
	let torchSupported = $state(false);
	let torchOn = $state(false);
	let focusPulse = $state<{ x: number; y: number; key: number } | null>(null);

	// Pinch tracking
	const activePointers = new Map<number, { x: number; y: number }>();
	let pinchStartDistance = 0;
	let pinchStartZoom = 1;
	let tapStart: { x: number; y: number; t: number } | null = null;

	$effect(() => {
		if (paused) {
			void stop();
		} else if (status === 'idle' || status === 'error') {
			void start();
		}
	});

	async function start() {
		if (!videoEl || status === 'starting' || status === 'ready') return;
		status = 'starting';

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('Camera not supported. Please use HTTPS or a modern browser.');
			}

			stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: { ideal: 'environment' },
					width: { ideal: 1920 },
					height: { ideal: 1080 },
					frameRate: { ideal: 30 }
				}
			});

			if (!mounted) {
				stream.getTracks().forEach((t) => t.stop());
				return;
			}

			videoEl.srcObject = stream;
			await videoEl.play().catch(() => {});

			track = stream.getVideoTracks()[0] ?? null;
			applyAdvancedCameraDefaults();
			readCapabilities();

			detector = new BarcodeDetector({ formats: ['qr_code'] });

			status = 'ready';
			loop();
		} catch (err: unknown) {
			status = 'error';
			const msg = getCameraErrorMessage(err);
			onError?.(msg);
		}
	}

	function applyAdvancedCameraDefaults() {
		if (!track) return;
		const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
			focusMode?: string[];
			exposureMode?: string[];
			whiteBalanceMode?: string[];
		};
		const advanced: MediaTrackConstraintSet[] = [];
		if (caps.focusMode?.includes('continuous')) advanced.push({ focusMode: 'continuous' } as any);
		if (caps.exposureMode?.includes('continuous'))
			advanced.push({ exposureMode: 'continuous' } as any);
		if (caps.whiteBalanceMode?.includes('continuous'))
			advanced.push({ whiteBalanceMode: 'continuous' } as any);
		if (advanced.length) {
			track.applyConstraints({ advanced }).catch(() => {});
		}
	}

	function readCapabilities() {
		if (!track) return;
		const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
			zoom?: { min: number; max: number; step: number };
			torch?: boolean;
		};
		if (caps.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > caps.zoom.min) {
			zoomCaps = { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 };
			const settings = track.getSettings?.() as MediaTrackSettings & { zoom?: number };
			zoom = settings?.zoom ?? caps.zoom.min;
		} else {
			zoomCaps = null;
		}
		torchSupported = caps.torch === true;
	}

	function loop() {
		if (!mounted || status !== 'ready') return;
		rafId = requestAnimationFrame(async () => {
			if (paused || !videoEl || !detector || videoEl.readyState < 2) {
				loop();
				return;
			}
			try {
				const codes = await detector.detect(videoEl);
				if (codes.length > 0 && codes[0].rawValue) {
					onScan(codes[0].rawValue);
				}
			} catch {
				// per-frame decode errors are normal; ignore
			}
			loop();
		});
	}

	async function stop() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		if (stream) {
			stream.getTracks().forEach((t) => t.stop());
			stream = null;
		}
		if (videoEl) {
			videoEl.srcObject = null;
		}
		track = null;
		detector = null;
		zoomCaps = null;
		torchSupported = false;
		torchOn = false;
		status = 'idle';
	}

	async function setZoom(value: number) {
		if (!track || !zoomCaps) return;
		const clamped = Math.max(zoomCaps.min, Math.min(zoomCaps.max, value));
		zoom = clamped;
		try {
			await track.applyConstraints({ advanced: [{ zoom: clamped } as any] });
		} catch {
			/* ignore */
		}
	}

	async function toggleTorch() {
		if (!track || !torchSupported) return;
		const next = !torchOn;
		try {
			await track.applyConstraints({ advanced: [{ torch: next } as any] });
			torchOn = next;
		} catch {
			torchSupported = false;
		}
	}

	async function tapFocus(clientX: number, clientY: number) {
		if (!track || !videoEl) return;
		const rect = videoEl.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
		focusPulse = { x, y, key: Date.now() };
		setTimeout(() => {
			if (focusPulse && focusPulse.key === focusPulse?.key) focusPulse = null;
		}, 800);
		try {
			await track.applyConstraints({
				advanced: [{ pointsOfInterest: [{ x, y }], focusMode: 'single-shot' } as any]
			});
			setTimeout(() => {
				track
					?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
					.catch(() => {});
			}, 2500);
		} catch {
			/* capability absent — continuous focus still active */
		}
	}

	function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
		return Math.hypot(a.x - b.x, a.y - b.y);
	}

	function onPointerDown(e: PointerEvent) {
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
		activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (activePointers.size === 1) {
			tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
		} else if (activePointers.size === 2) {
			const [a, b] = Array.from(activePointers.values());
			pinchStartDistance = distance(a, b);
			pinchStartZoom = zoom;
			tapStart = null;
		}
	}

	function onPointerMove(e: PointerEvent) {
		if (!activePointers.has(e.pointerId)) return;
		activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (activePointers.size >= 2 && zoomCaps) {
			const [a, b] = Array.from(activePointers.values());
			const d = distance(a, b);
			if (pinchStartDistance > 0) {
				const ratio = d / pinchStartDistance;
				const range = zoomCaps.max - zoomCaps.min;
				const next = pinchStartZoom + (ratio - 1) * range;
				void setZoom(next);
			}
			tapStart = null;
		} else if (activePointers.size === 1 && tapStart) {
			if (Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 10) {
				tapStart = null;
			}
		}
	}

	function onPointerUp(e: PointerEvent) {
		const had = activePointers.get(e.pointerId);
		activePointers.delete(e.pointerId);
		if (
			activePointers.size === 0 &&
			tapStart &&
			had &&
			performance.now() - tapStart.t < 400 &&
			Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) < 10
		) {
			void tapFocus(e.clientX, e.clientY);
		}
		tapStart = null;
	}

	onDestroy(() => {
		mounted = false;
		void stop();
	});
</script>

<div class="scanner-root relative h-full w-full overflow-hidden bg-black select-none">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoEl}
		class="absolute inset-0 h-full w-full object-cover"
		playsinline
		muted
		autoplay
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
	></video>

	<!-- Aiming guide -->
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		<div class="scanner-reticle h-3/5 w-3/5 max-w-[320px]"></div>
	</div>

	<!-- Tap-to-focus pulse -->
	{#if focusPulse}
		{#key focusPulse.key}
			<div
				class="focus-pulse pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2"
				style="left: {focusPulse.x * 100}%; top: {focusPulse.y * 100}%;"
			></div>
		{/key}
	{/if}

	<!-- Top status -->
	{#if status !== 'ready'}
		<div class="absolute inset-0 flex items-center justify-center bg-black/80">
			<div class="text-center text-white">
				<CameraIcon class="mx-auto mb-2 h-8 w-8 animate-pulse opacity-80" />
				<p class="font-atkinson text-sm">
					{status === 'error' ? 'Camera unavailable' : 'Starting camera…'}
				</p>
			</div>
		</div>
	{/if}

	<!-- Controls -->
	{#if status === 'ready'}
		{#if zoomCaps}
			<div
				class="absolute right-3 top-1/2 flex h-1/2 max-h-[260px] -translate-y-1/2 flex-col items-center gap-2 rounded-full bg-black/45 px-2 py-3 backdrop-blur-sm"
			>
				<button
					type="button"
					class="text-xs font-bold text-white/90 tabular-nums"
					onclick={() => setZoom(Math.min(zoomCaps!.max, zoom + (zoomCaps!.step || 0.5)))}
					aria-label="Zoom in"
				>
					+
				</button>
				<input
					type="range"
					class="zoom-slider"
					min={zoomCaps.min}
					max={zoomCaps.max}
					step={zoomCaps.step}
					value={zoom}
					oninput={(e) => setZoom(parseFloat((e.target as HTMLInputElement).value))}
					aria-label="Zoom"
				/>
				<button
					type="button"
					class="text-xs font-bold text-white/90 tabular-nums"
					onclick={() => setZoom(Math.max(zoomCaps!.min, zoom - (zoomCaps!.step || 0.5)))}
					aria-label="Zoom out"
				>
					−
				</button>
				<span class="text-[10px] text-white/80 tabular-nums">{zoom.toFixed(1)}×</span>
			</div>
		{/if}

		{#if torchSupported}
			<button
				type="button"
				onclick={toggleTorch}
				class="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
				aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}
				aria-pressed={torchOn}
			>
				{#if torchOn}
					<Flashlight class="h-5 w-5" />
				{:else}
					<FlashlightOff class="h-5 w-5" />
				{/if}
			</button>
		{/if}
	{/if}
</div>

<style>
	.scanner-reticle {
		aspect-ratio: 1;
		border-radius: 12px;
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
		outline: 2px solid rgba(255, 255, 255, 0.65);
		outline-offset: -2px;
	}

	.focus-pulse {
		border: 2px solid #fff;
		border-radius: 50%;
		animation: focus-pulse 0.7s ease-out forwards;
	}

	@keyframes focus-pulse {
		0% {
			transform: translate(-50%, -50%) scale(1.4);
			opacity: 0;
		}
		30% {
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.5;
		}
	}

	.zoom-slider {
		appearance: none;
		-webkit-appearance: none;
		writing-mode: vertical-lr;
		direction: rtl;
		width: 4px;
		flex: 1;
		background: rgba(255, 255, 255, 0.35);
		border-radius: 999px;
		touch-action: none;
	}
	.zoom-slider::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}
	.zoom-slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #fff;
		border: 2px solid rgba(0, 0, 0, 0.3);
		cursor: pointer;
	}
</style>
