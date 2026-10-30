"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Volume2, VolumeX } from "lucide-react";
import { playAudioFeedback } from "@/lib/sound";
import jsQR from "jsqr";
import { SCANNABLE_FORMATS, normalizeScannedPayload } from "@/lib/barcode";

type ScanMode = "qr" | "barcode";

// QR codes decode via jsQR (universal, no API support needed). Linear/2D
// barcodes decode via the native BarcodeDetector API.
const QR_FORMATS: string[] = ["qr_code"];
const BARCODE_FORMATS: string[] = SCANNABLE_FORMATS.filter((f) => f !== "qr_code");

// ── Module-level native API detection ────────────────────────────────────────
const HAS_RVFC: boolean =
  typeof window !== "undefined" &&
  "requestVideoFrameCallback" in HTMLVideoElement.prototype;

const hasNativeBarcodeDetector: boolean =
  typeof window !== "undefined" && "BarcodeDetector" in window;

const formatCache: Record<string, string[]> = {};
const getUsableFormats = async (scope: ScanMode): Promise<string[]> => {
  const wanted = scope === "qr" ? QR_FORMATS : BARCODE_FORMATS;
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
const gateStreamCache: Record<string, MediaStream> = {};

// ── Cached native QR BarcodeDetector (lazily created, reused every frame) ───
let qrDetectorInstance: any = null;
function getQrDetector(): any | null {
  if (qrDetectorInstance) return qrDetectorInstance;
  if (!hasNativeBarcodeDetector) return null;
  try {
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

interface OperatorCameraProps {
  /** When false the decode loop pauses early. */
  active?: boolean;
  onScan: (roll: string) => void;
  /** The operator's fixed gate — used to key the stream cache. */
  gateId?: string;
  /** Which scan mode the operator chose (QR-only or barcode-only). */
  initialMode?: ScanMode;
  /** Parent-controlled mode switch. */
  mode?: ScanMode;
}

export function OperatorCamera({
  active = true,
  onScan,
  gateId,
  initialMode = "qr",
  mode: modeProp,
}: OperatorCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  // Keep the selected mode in sync.
  useEffect(() => {
    if (active) {
      setMode(initialMode);
      modeRef.current = initialMode;
      hasScannedRef.current = false;
    }
  }, [active, initialMode]);

  // Parent-controlled mode switch.
  useEffect(() => {
    if (modeProp) {
      setMode(modeProp);
      modeRef.current = modeProp;
      hasScannedRef.current = false;
    }
  }, [modeProp]);

  // Detect whether the phone's browser can auto-detect barcodes natively.
  useEffect(() => {
    setBarcodeApiAvailable(hasNativeBarcodeDetector);
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    playAudioFeedback("success");
  }, [soundEnabled]);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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

  const parkStream = useCallback(() => {
    if (streamRef.current) {
      if (gateId) {
        gateStreamCache[gateId] = streamRef.current;
      }
      streamRef.current = null;
    }
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
      } catch { /* Ignore vibration error */ }
    }

    parkStream();
    onScan(scannedData);

    // Re-arm for next scan.
    hasScannedRef.current = false;
    isScanningRef.current = true;
  }, [parkStream, onScan, playBeep]);

  // jsQR fallback helper.
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

  // processFrame defined in ref to avoid stale closures.
  const processFrame = useCallback(() => {
    if (!isScanningRef.current || hasScannedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const targetWidth = video.videoWidth || 640;
    const targetHeight = video.videoHeight || 480;
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
        qrDetector
          .detect(canvas)
          .then((barcodes: Array<{ rawValue: string }>) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleSuccessScan(barcodes[0].rawValue);
              return;
            }
            runJsQrFallback(canvas, handleSuccessScan);
          })
          .catch(() => {
            runJsQrFallback(canvas, handleSuccessScan);
          });
      } else {
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

  // Keep activeRef in sync.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Keep processFrameRef in sync.
  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  const startDecodeLoop = useCallback(() => {
    if (!videoRef.current) return;

    const tick = () => {
      if (!isScanningRef.current) {
        animationFrameRef.current = null;
        return;
      }
      if (!activeRef.current) {
        animationFrameRef.current = null;
        return;
      }
      processFrameRef.current();

      if (rvfAvailableRef.current && videoRef.current) {
        (videoRef.current as any).requestVideoFrameCallback(() => tick());
      } else {
        const now = performance.now();
        if (now - lastDecodeRef.current >= 66) {
          lastDecodeRef.current = now;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    lastDecodeRef.current = 0;
    processFrameRef.current();

    if (rvfAvailableRef.current && videoRef.current) {
      (videoRef.current as any).requestVideoFrameCallback(() => tick());
    } else {
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const startCamera = useCallback(async () => {
    isScanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraState("requesting");
    setErrorMessage("");
    hasScannedRef.current = false;

    // Per-gate cache hit.
    if (gateId && gateStreamCache[gateId]) {
      const cached = gateStreamCache[gateId];
      const live = cached.getTracks().filter((t) => t.readyState === "live");
      if (live.length > 0 && videoRef.current) {
        streamRef.current = cached;
        videoRef.current.srcObject = cached;
        videoRef.current.setAttribute("playsinline", "true");
        try {
          await videoRef.current.play();
        } catch { /* autoplay blocked */ }
        setCameraState("active");
        isScanningRef.current = true;
        startDecodeLoop();
        return;
      } else {
        cached.getTracks().forEach((t) => t.stop());
        delete gateStreamCache[gateId];
      }
    }

    // Cold start.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("error");
      setErrorMessage("Live camera feed requires HTTPS or localhost.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
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
        setErrorMessage("Camera permission was denied.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware detected.");
      } else {
        setErrorMessage(error.message || "Unable to open camera.");
      }
    }
  }, [gateId, startDecodeLoop]);

  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [active, startCamera, stopCamera]);

  // Kill camera when tab hidden.
  useEffect(() => {
    if (!active) return;
    const onHidden = () => stopCamera();
    const onVisible = () => { if (active) startCamera(); };
    const onVis = () => (document.hidden ? onHidden() : onVisible());
    const onFreeze = () => stopCamera();
    const onResume = () => { if (active) startCamera(); };
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
  }, [active, startCamera, stopCamera]);

  if (!active) return null;

  return (
    <div className="relative w-full h-full bg-black">
      <canvas ref={canvasRef} className="hidden" />
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {cameraState === "active" && mode === "barcode" && !barcodeApiAvailable && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-full px-3 py-1.5 pointer-events-none">
          <span>No native barcode decoder — switch to QR</span>
        </div>
      )}

      {cameraState === "active" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
          <div className="w-40 h-40 rounded-2xl border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(52,211,153,0.35)]" />
          <p className="text-[11px] font-semibold text-white/90 bg-slate-950/70 rounded-full px-3 py-1">
            {mode === "qr" ? "Point at a QR code" : "Point at a barcode"}
          </p>
        </div>
      )}

      {cameraState === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Initializing camera...</p>
          </div>
        </div>
      )}

      {cameraState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-400">Camera Unavailable</h3>
          <p className="text-xs text-slate-400 mt-1">{errorMessage}</p>
        </div>
      )}

      {/* Sound toggle */}
      <button
        type="button"
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
        title={soundEnabled ? "Mute" : "Unmute"}
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
