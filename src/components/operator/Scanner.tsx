"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, AlertTriangle, KeyRound, Volume2, VolumeX, Upload, ArrowLeftRight } from "lucide-react";
import { playAudioFeedback } from "@/lib/sound";
import jsQR from "jsqr";
import { SCANNABLE_FORMATS, normalizeScannedPayload } from "@/lib/barcode";

type ScanMode = "qr" | "barcode";
type FormatScope = ScanMode | "all";

// QR codes decode via jsQR (universal, no API support needed). Linear/2D
// barcodes decode via the native BarcodeDetector API, restricted per tab so
// each mode auto-detects exactly what it's meant to catch.
const QR_FORMATS: string[] = ["qr_code"];
const BARCODE_FORMATS: string[] = SCANNABLE_FORMATS.filter((f) => f !== "qr_code");

// ── Module-level native API detection ────────────────────────────────────────
// requestVideoFrameCallback is the most efficient way to sync to decoded
// video frames; fall back to a ~15fps rAF tick when unavailable.
const HAS_RVFC: boolean =
  typeof window !== "undefined" &&
  "requestVideoFrameCallback" in HTMLVideoElement.prototype;

const hasNativeBarcodeDetector: boolean =
  typeof window !== "undefined" && "BarcodeDetector" in window;

const formatCache: Record<string, string[]> = {};
const getUsableFormats = async (scope: FormatScope) => {
  const wanted = scope === "qr" ? QR_FORMATS : scope === "barcode" ? BARCODE_FORMATS : [...SCANNABLE_FORMATS];
  const key = wanted.join(",");
  if (formatCache[key]) return formatCache[key];
  let detectorFormats: string[] = [];
  if (hasNativeBarcodeDetector) {
    try {
      detectorFormats = await (window as any).BarcodeDetector.getSupportedFormats();
    } catch { detectorFormats = []; }
  }
  formatCache[key] = wanted.filter((f) => detectorFormats.includes(f));
  return formatCache[key];
};

// ── Per-gate camera stream cache ──────────────────────────────────────────────
// The operator is pinned to a fixed gate (user.gateId). When they flip between
// the desk's gate views / reopen the scanner, the browser already knows the
// camera is allowed, so reuse the live MediaStream keyed by gate instead of
// calling getUserMedia again (avoids the permission-prompt flicker and the
// ~400ms device re-open cost). The stream is only reclaimed on full unload.
const gateStreamCache: Record<string, MediaStream> = {};

// ── Cached native QR BarcodeDetector (lazily created, reused every frame) ───
let qrDetectorInstance: any = null;
function getQrDetector(): any | null {
  if (qrDetectorInstance) return qrDetectorInstance;
  if (!hasNativeBarcodeDetector) return null;
  try {
    // Confirm qr_code is actually supported before constructing; on some
    // engines BarcodeDetector exists but doesn't support qr_code.
    // We defer the supported-formats check to the call site (async); this
    // just caches the constructor so we don't re-instantiate every frame.
    qrDetectorInstance = new (window as any).BarcodeDetector({ formats: QR_FORMATS });
    return qrDetectorInstance;
  } catch {
    return null;
  }
}

// Cached native barcode detector (barcode mode)
let barcodeDetectorInstance: any = null;
function getBarcodeDetector(): any | null {
  if (barcodeDetectorInstance) return barcodeDetectorInstance;
  if (!hasNativeBarcodeDetector) return null;
  try {
    barcodeDetectorInstance = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS });
    return barcodeDetectorInstance;
  } catch {
    return null;
  }
}

interface ScannerModalProps {
  isOpen: boolean;
  /**
   * When false the decode loop pauses early (no jsQR work per frame).
   * The parent uses this to stop decoding while a scan is being confirmed.
   */
  active?: boolean;
  onClose: () => void;
  onScan: (roll: string) => void;
  onManualEntryClick?: () => void;
  /** The operator's fixed gate — used to key the stream cache; no UI picking. */
  gateId?: string;
  /** Which scan mode the operator chose before opening (QR-only or barcode-only). */
  initialMode?: ScanMode;
  /**
   * Parent-controlled mode. When present and different from the internal mode
   * state, the internal mode switches in place (no unmount/restart of the
   * decode loop). The parent's bottom mode-bar uses this instead of re-
   * seeding initialMode. Keeps the camera stream warm across switches.
   */
  mode?: ScanMode;
}

export function Scanner({
  isOpen,
  active = true,
  onClose,
  onScan,
  onManualEntryClick,
  gateId,
  initialMode = "qr",
  mode: modeProp,
}: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const hasScannedRef = useRef<boolean>(false);
  const processFrameRef = useRef<() => void>(() => {});
  const lastDecodeRef = useRef<number>(0);
  const activeRef = useRef<boolean>(active);
  const rvfAvailableRef = useRef<boolean>(HAS_RVFC);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mode, setMode] = useState<ScanMode>(initialMode);
  const modeRef = useRef<ScanMode>(initialMode);
  const [barcodeApiAvailable, setBarcodeApiAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep the selected mode in sync with the mode the operator chose before
  // opening the modal (the viewfinder's Scan QR / Scan Barcode buttons).
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      modeRef.current = initialMode;
      hasScannedRef.current = false;
    }
  }, [isOpen, initialMode]);

  // Parent-controlled mode switch (no unmount, stream stays warm).
  useEffect(() => {
    if (modeProp) switchMode(modeProp);
  }, [modeProp]);

  // Detect whether the phone's browser can auto-detect barcodes natively.
  useEffect(() => {
    setBarcodeApiAvailable(hasNativeBarcodeDetector);
  }, []);

  const switchMode = useCallback((next: ScanMode) => {
    setMode(next);
    modeRef.current = next;
    hasScannedRef.current = false;
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    playAudioFeedback("success");
  }, [soundEnabled]);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Return the stream to the per-gate cache (don't stop the track — that's
    // what lets the next open on the same gate skip permission + device re-open).
    if (streamRef.current) {
      if (gateId) {
        gateStreamCache[gateId] = streamRef.current;
      } else {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("idle");
  }, [gateId]);

  /**
   * Park the live stream in the per-gate cache WITHOUT clearing
   * videoRef.srcObject and WITHOUT stopping the decode loop.  The stream stays
   * warm on the <video> element; the loop continues ticking (paused by the
   * parent via active=false).  Used after a successful scan so the camera is
   * instantly available for the next scan.
   */
  const parkStream = useCallback(() => {
    if (streamRef.current) {
      if (gateId) {
        gateStreamCache[gateId] = streamRef.current;
      }
      streamRef.current = null;
      // NOTE: videoRef.current.srcObject is deliberately left intact so the
      // <video> element keeps showing the live feed (stream is not stopped).
    }
    // Decode loop stays alive; hasScannedRef re-arms on the next frame.
    isScanningRef.current = true;
  }, [gateId]);

  const handleSuccessScan = useCallback((rawScannedData: string) => {
    const scannedData = normalizeScannedPayload(rawScannedData);
    if (hasScannedRef.current || !scannedData) return;
    hasScannedRef.current = true;

    playBeep();

    if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([100, 50, 100]);
      } catch {
        // Ignore vibration error
      }
    }

    // Park the stream (camera stays warm, decode loop keeps ticking, paused
    // by the parent via active=false).  Fire onScan + onClose immediately.
    parkStream();
    onScan(scannedData);
    onClose();

    // Re-arm: the next frame will process again even though the stream is
    // parked (active gate from the parent will flip back to true on reopen).
    hasScannedRef.current = false;
    isScanningRef.current = true;
  }, [parkStream, onScan, onClose, playBeep]);

  const handleImageFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage("Invalid file type. Please upload a PNG, JPEG, or WEBP image.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    // Limit file size to 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage("Image is too large. Please upload an image smaller than 5MB.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const decodeQR = typeof jsQR === "function" ? jsQR : (jsQR as any).default;
          if (decodeQR) {
            try {
              const code = decodeQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              const roll = normalizeScannedPayload(code?.data || "");
              if (roll) {
                playBeep();
                if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
                  window.navigator.vibrate([100, 50, 100]);
                }
                stopCamera();
                onScan(roll);
                onClose();
                return;
              }
            } catch (err) {
              console.error("jsQR upload process error:", err);
            }
          }

          // Browser BarcodeDetector fallback
          if (hasNativeBarcodeDetector) {
            getUsableFormats("all").then((usableFormats) => {
              if (usableFormats.length === 0) return;
              try {
                const detector = new (window as any).BarcodeDetector({ formats: [...usableFormats] });
                detector
                  .detect(canvas)
                  .then((barcodes: Array<{ rawValue: string }>) => {
                    const roll = normalizeScannedPayload(barcodes?.[0]?.rawValue || "");
                    if (roll) {
                      playBeep();
                      stopCamera();
                      onScan(roll);
                      onClose();
                    } else {
                      setErrorMessage("Could not detect any QR/Barcode in the uploaded image. Please try a clearer picture.");
                    }
                  })
                  .catch(() => {
                    setErrorMessage("Could not detect any QR/Barcode in the uploaded image. Please try a clearer picture.");
                  });
              } catch {
                // fallback
              }
            });
          } else {
            setErrorMessage("Could not decode code from the uploaded image. Please make sure it is centered and clear.");
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [playBeep, stopCamera, onClose, onScan]);

  // jsQR fallback helper (sync — called synchronously in the QR path when the
  // native detector returned nothing or threw for this frame).
  const runJsQrFallback = useCallback((canvas: HTMLCanvasElement, onSuccess: (raw: string) => void) => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const decodeQR = typeof jsQR === "function" ? jsQR : (jsQR as any).default;
    if (!decodeQR) return;
    try {
      const code = decodeQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code && code.data && code.data.trim().length > 0) {
        onSuccess(code.data.trim());
      }
    } catch (err) {
      console.error("jsQR fallback error:", err);
    }
  }, []);

  // processFrame defined and stored in ref to avoid stale closures.
  //
  // QR path: try the cached native BarcodeDetector first (async, non-blocking),
  // fall back to jsQR when the detector is absent or returns nothing for this
  // frame.  Barcode path: use the cached native detector for 1D/2D formats.
  const processFrame = useCallback(() => {
    if (!isScanningRef.current || hasScannedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const targetWidth = video.videoWidth || 640;
    const targetHeight = video.videoHeight || 480;
    // Downscale to 640px wide before decoding — ~4x faster, still decodes
    // 20cm QR codes and most 1D barcodes comfortably.
    const DECODE_WIDTH = 640;
    const scale = Math.min(1, DECODE_WIDTH / targetWidth);
    canvas.width = Math.round(targetWidth * scale);
    canvas.height = Math.round(targetHeight * scale);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    const activeMode = modeRef.current;

    // ── QR mode ───────────────────────────────────────────────────────────────
    if (activeMode === "qr") {
      const qrDetector = getQrDetector();
      if (qrDetector) {
        // Native async path (non-blocking): fires .detect(canvas) and
        // processes results in a promise — the decode loop continues.
        qrDetector
          .detect(canvas)
          .then((barcodes: Array<{ rawValue: string }>) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleSuccessScan(barcodes[0].rawValue);
              return;
            }
            // No native hit → fall back to jsQR for this frame.
            runJsQrFallback(canvas, handleSuccessScan);
          })
          .catch(() => {
            // Native detector threw → fall back to jsQR.
            runJsQrFallback(canvas, handleSuccessScan);
          });
      } else {
        // No native QR detector available — pure jsQR path.
        runJsQrFallback(canvas, handleSuccessScan);
      }
      return;
    }

    // ── Barcode mode (1D / 2D, not QR) ──────────────────────────────────────
    if (activeMode === "barcode") {
      const barcodeDetector = getBarcodeDetector();
      if (barcodeDetector) {
        barcodeDetector
          .detect(canvas)
          .then((barcodes: Array<{ rawValue: string }>) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleSuccessScan(barcodes[0].rawValue);
            }
          })
          .catch(() => {});
      }
    }
  }, [handleSuccessScan, runJsQrFallback]);

  // Keep activeRef in sync so the decode tick always sees the latest value.
  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      lastDecodeRef.current = 0;
    }
  }, [active]);

  // Keep processFrameRef in sync so the decode tick always calls the latest.
  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  /**
   * Decode loop.
   *
   *  • Native path (rVFC): every call to requestVideoFrameCallback fires
   *    exactly once per decoded video frame (~30–60fps on a phone).  No
   *    time gate needed — processFrame runs on every frame.
   *
   *  • rAF fallback (~15fps): gate with lastDecodeRef ≥ 66ms so we don't
   *    run jsQR on every rAF tick (~16ms).
   */
  const startDecodeLoop = useCallback(() => {
    if (!videoRef.current) return;

    const tick = () => {
      if (!isScanningRef.current) {
        animationFrameRef.current = null;
        return;
      }
      // When the parent disables decoding (active=false) bail out early and
      // release the RAF/rVFC so no frame work happens.
      if (!activeRef.current) {
        animationFrameRef.current = null;
        return;
      }
      processFrameRef.current();

      if (rvfAvailableRef.current && videoRef.current) {
        // Native: next decoded video frame.
        (videoRef.current as any).requestVideoFrameCallback(() => tick());
      } else {
        // Fallback: ~15fps rAF gate.
        const now = performance.now();
        if (now - lastDecodeRef.current >= 66) {
          lastDecodeRef.current = now;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    // Fire the first tick immediately so the first frame is processed the
    // moment it arrives — no debounce delay on startup.
    lastDecodeRef.current = 0;
    processFrameRef.current();

    if (rvfAvailableRef.current && videoRef.current) {
      // rVFC path: schedule on the next decoded frame.
      (videoRef.current as any).requestVideoFrameCallback(() => tick());
    } else {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Stop the current loop but DON'T stop the track if we have a cached
    // stream for this gate — we'll reuse it below.
    isScanningRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraState("requesting");
    setErrorMessage("");
    hasScannedRef.current = false;

    // 1. Per-gate cache hit: stream is already open, skip permission + device
    //    re-open entirely. ~0ms to first frame vs ~400ms cold start.
    if (gateId && gateStreamCache[gateId]) {
      const cached = gateStreamCache[gateId];
      const live = cached.getTracks().filter((t) => t.readyState === "live");
      if (live.length > 0 && videoRef.current) {
        streamRef.current = cached;
        videoRef.current.srcObject = cached;
        videoRef.current.setAttribute("playsinline", "true");
        try {
          await videoRef.current.play();
        } catch { /* autoplay blocked; state still active */ }
        setCameraState("active");
        isScanningRef.current = true;
        startDecodeLoop();
        return;
      } else {
        // cached stream is stale — stop it and fall through to cold start
        cached.getTracks().forEach((t) => t.stop());
        delete gateStreamCache[gateId];
      }
    }

    // 2. Cold start: request camera with facingMode environment + low-res
    //    constraint first for the fastest possible start on phones.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("error");
      setErrorMessage("Live camera feed requires HTTPS or localhost browser security permissions.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        // 640x480 environment — fastest opening path; QR decodes fine at
        // this resolution (processFrame downscales to 640px anyway).
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e1) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }
      // Retry/unmount (stopCamera) can run between the getUserMedia await and
      // here — stopCamera clears streamRef; if it fired, the start is stale.
      // Park the new stream in the per-gate cache (don't leak the device) and
      // return without starting a decode loop.
      if (!streamRef.current) {
        if (gateId) gateStreamCache[gateId] = stream;
        else stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraState("active");
        isScanningRef.current = true;
        startDecodeLoop();
      }
    } catch (err: unknown) {
      setCameraState("error");
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Please allow camera access in browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware detected on this device.");
      } else {
        setErrorMessage(error.message || "Unable to open camera stream.");
      }
    }
  }, [gateId, startDecodeLoop]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };

  }, [isOpen, startCamera, stopCamera]);

  // Kill camera + decode loop when tab hidden (battery, privacy
  // indicator, dead-stream-on-return). pagehide covers iOS tab suspension.
  useEffect(() => {
    if (!isOpen) return;
    const onHidden = () => stopCamera();
    const onVisible = () => { if (isOpen) startCamera(); };
    const onVis = () => (document.hidden ? onHidden() : onVisible());
    const onFreeze = () => stopCamera();
    const onResume = () => { if (isOpen) startCamera(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHidden);
    document.addEventListener("freeze", onFreeze as EventListener);
    document.addEventListener("resume", onResume as EventListener);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHidden);
      document.removeEventListener("freeze", onFreeze as EventListener);
      document.removeEventListener("resume", onResume as EventListener);
    };

  }, [isOpen, startCamera, stopCamera]);

  // On full unmount (gate change / page leave) drop cached streams —
  // keeps the memory footprint bounded across sessions.
  useEffect(() => {
    return () => {
      // Only drop if we're actually unmounting, not just closing the modal
      // (stopCamera already handles the close case). If the modal is still
      // open with this gate's live stream, leave it alone — closing the
      // modal will park it back in the cache for the next session.
      if (gateId && gateStreamCache[gateId] && gateStreamCache[gateId] !== streamRef.current) {
        gateStreamCache[gateId].getTracks().forEach((t) => t.stop());
        delete gateStreamCache[gateId];
      }
    };
  }, [gateId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {gateId ? `Gate ${gateId}` : "Scanner"}
                </h2>
                <p className="text-[11px] text-slate-400">Auto-detecting · no re-prompt</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title={soundEnabled ? "Mute" : "Unmute"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode indicator — the mode was chosen by the viewfinder button the
              operator tapped; the link just flips to the other mode. */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2.5">
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {mode === "qr" ? "QR-only mode" : "Barcode-only mode"}
            </span>
            <button
              type="button"
              onClick={() => switchMode(mode === "qr" ? "barcode" : "qr")}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {mode === "qr" ? "Switch to Barcode" : "Switch to QR"}
            </button>
          </div>

          {/* Camera viewfinder */}
          <div className="relative w-full h-[320px] sm:h-[400px] bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

            {/* Barcode tab: warn when the phone's browser can't decode 1D/2D
                natively so the operator knows live auto-detect won't match. */}
            {cameraState === "active" && mode === "barcode" && !barcodeApiAvailable && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-full px-3 py-1.5 pointer-events-none">
                <AlertTriangle className="w-3 h-3" />
                <span>No native barcode decoder in this browser — switch to QR or Upload below</span>
              </div>
            )}

            {cameraState === "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                <div className="w-40 h-40 rounded-2xl border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.35)]" />
                <p className="text-[11px] font-semibold text-white/90 bg-slate-950/70 rounded-full px-3 py-1">
                  {mode === "qr"
                    ? "Point at a QR code — auto-detecting"
                    : "Point at a barcode (1D/2D) — auto-detecting"}
                </p>
              </div>
            )}
            {cameraState === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white space-y-3 p-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Initializing camera...</p>
              </div>
            )}

            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-amber-400">Camera Unavailable</h3>
                <p className="text-xs text-slate-300 max-w-xs">{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 bg-slate-900 border-t border-slate-800">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Upload QR Image</span>
                </button>
                {onManualEntryClick && (
                  <button
                    type="button"
                    onClick={() => { stopCamera(); onClose(); onManualEntryClick(); }}
                    className="w-full sm:flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Manual Entry</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { stopCamera(); onClose(); }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-bold"
              >
                Cancel & Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
