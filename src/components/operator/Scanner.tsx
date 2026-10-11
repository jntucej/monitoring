"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, AlertTriangle, KeyRound, ScanLine, Volume2, VolumeX, Upload, QrCode } from "lucide-react";
import { playAudioFeedback } from "@/lib/sound";
import jsQR from "jsqr";
import { SCANNABLE_FORMATS } from "@/lib/barcode";

type ScanMode = "qr" | "barcode";
type FormatScope = ScanMode | "all";

// QR codes decode via jsQR (universal, no API support needed). Linear/2D
// barcodes decode via the native BarcodeDetector API, restricted per tab so
// each mode auto-detects exactly what it's meant to catch.
const QR_FORMATS: string[] = ["qr_code"];
const BARCODE_FORMATS: string[] = SCANNABLE_FORMATS.filter((f) => f !== "qr_code");

const formatCache: Record<string, string[]> = {};
const getUsableFormats = async (scope: FormatScope) => {
  const wanted = scope === "qr" ? QR_FORMATS : scope === "barcode" ? BARCODE_FORMATS : [...SCANNABLE_FORMATS];
  const key = wanted.join(",");
  if (formatCache[key]) return formatCache[key];
  let detectorFormats: string[] = [];
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      detectorFormats = await (window as any).BarcodeDetector.getSupportedFormats();
    } catch { detectorFormats = []; }
  }
  formatCache[key] = wanted.filter((f) => detectorFormats.includes(f));
  return formatCache[key];
};

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (roll: string) => void;
  onManualEntryClick?: () => void;
}

export function Scanner({
  isOpen,
  onClose,
  onScan,
  onManualEntryClick,
}: ScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const hasScannedRef = useRef<boolean>(false);
  const processFrameRef = useRef<() => void>(() => {});

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mode, setMode] = useState<ScanMode>("qr");
  const modeRef = useRef<ScanMode>("qr");
  const [barcodeApiAvailable, setBarcodeApiAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Detect whether the phone's browser can auto-detect barcodes natively.
  // QR is always auto-detectable via jsQR; 1D/2D barcodes need the native
  // BarcodeDetector API (Chromium-based phones). Told to the user so they
  // aren't staring at a live feed that never matches.
  useEffect(() => {
    setBarcodeApiAvailable(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const switchMode = useCallback((next: ScanMode) => {
    setMode(next);
    modeRef.current = next;
    hasScannedRef.current = false;
  }, []);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    // ponytail: shared AudioContext via lib — per-call `new AudioContext()`
    // leaks contexts (browser cap ~6) and silences later scans.
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState("idle");
  }, []);

  const handleSuccessScan = useCallback((scannedData: string) => {
    if (hasScannedRef.current || !scannedData) return;
    hasScannedRef.current = true;
    isScanningRef.current = false;

    playBeep();

    if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
      try {
        window.navigator.vibrate([100, 50, 100]);
      } catch {
        // Ignore vibration error
      }
    }

    stopCamera();
    onScan(scannedData);
    onClose();
  }, [stopCamera, onScan, onClose, playBeep]);

  const handleImageFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload a PNG, JPEG, or WEBP image.");
      if (event.target) {
        event.target.value = "";
      }
      return;
    }

    // Limit file size to 5MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert("Image is too large. Please upload an image smaller than 5MB.");
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
              if (code && code.data && code.data.trim().length > 0) {
                playBeep();
                if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
                  window.navigator.vibrate([100, 50, 100]);
                }
                stopCamera();
                onScan(code.data.trim());
                onClose();
                return;
              }
            } catch (err) {
              console.error("jsQR upload process error:", err);
            }
          }
          
          // Browser BarcodeDetector fallback
    if ("BarcodeDetector" in window) {
      getUsableFormats("all").then((usableFormats) => {
        if (usableFormats.length === 0) return;
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: [...usableFormats] });
          barcodeDetector
            .detect(canvas)
            .then((barcodes: Array<{ rawValue: string }>) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                playBeep();
                stopCamera();
                onScan(barcodes[0].rawValue.trim());
                onClose();
              } else {
                alert("Could not detect any QR/Barcode in the uploaded image. Please try a clearer picture.");
              }
            })
            .catch(() => {
              alert("Could not detect any QR/Barcode in the uploaded image. Please try a clearer picture.");
            });
        } catch {
          // fallback
        }
      });
    } else {
      alert("Could not decode code from the uploaded image. Please make sure it is centered and clear.");
    }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [playBeep, stopCamera, onClose, onScan]);

  // processFrame defined and stored in ref to avoid stale closures
  const processFrame = useCallback(() => {
    if (!isScanningRef.current || hasScannedRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const targetWidth = video.videoWidth || 640;
    const targetHeight = video.videoHeight || 480;
    // ponytail: downscale to 640px wide before jsQR — ~4x faster, still
    // decodes 20cm QR codes. See tick throttle above.
    const DECODE_WIDTH = 640;
    const scale = Math.min(1, DECODE_WIDTH / targetWidth);
    canvas.width = Math.round(targetWidth * scale);
    canvas.height = Math.round(targetHeight * scale);

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);

    const decodeQR = typeof jsQR === "function" ? jsQR : (jsQR as any).default;
    const activeMode = modeRef.current;

    // QR tab: jsQR decodes QR codes universally (works even when the native
    // BarcodeDetector API is absent). Barcode tab is handled by the native
    // detector below, restricted to linear/2D formats so it won't match QR.
    if (activeMode === "qr" && decodeQR) {
      try {
        const code = decodeQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && code.data.trim().length > 0) {
          handleSuccessScan(code.data.trim());
          return;
        }
      } catch (err) {
        console.error("jsQR process frame error:", err);
      }
    }

    // Barcode tab: native detector auto-detecting 1D + 2D barcodes.
    if (activeMode === "barcode" && "BarcodeDetector" in window) {
      getUsableFormats("barcode").then((usableFormats) => {
        if (usableFormats.length === 0) return;
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({ formats: [...usableFormats] });
          barcodeDetector
            .detect(canvas)
            .then((barcodes: Array<{ rawValue: string }>) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleSuccessScan(barcodes[0].rawValue);
              }
            })
            .catch(() => {});
        } catch {
          // Fallback catch
        }
      });
    }
  }, [handleSuccessScan]);

  // Keep ref in sync so setInterval always calls latest version
  useEffect(() => {
    processFrameRef.current = processFrame;
  }, [processFrame]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("requesting");
    setErrorMessage("");
    hasScannedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("error");
      setErrorMessage("Live camera feed requires HTTPS or localhost browser security permissions.");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
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
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraState("active");
        isScanningRef.current = true;

        // ponytail: throttle decode to ~10fps + downscale to 640px wide.
        // Full-res jsQR at rAF cadence costs 40-80ms/frame (heat + jank);
        // QR codes don't move fast enough to need 60fps. ~4x faster decode.
        const lastTickRef = { current: 0 };
        const tick = () => {
          if (!isScanningRef.current) return;
          const elapsed = performance.now() - lastTickRef.current;
          if (elapsed >= 100) {
            lastTickRef.current = performance.now();
            processFrameRef.current();
          }
          animationFrameRef.current = requestAnimationFrame(tick);
        };
        animationFrameRef.current = requestAnimationFrame(tick);
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
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ponytail: kill camera + decode loop when tab hidden (battery, privacy
  // indicator, dead-stream-on-return). pagehide covers iOS tab suspension.
  // Issue #384: also handle freeze/resume (Chrome/Android screen lock) and
  // visibilitychange for iOS screen-lock (power button). The original code
  // only listened to visibilitychange + pagehide, missing the screen-lock case
  // where the camera stream stays open draining battery.
  useEffect(() => {
    if (!isOpen) return;
    const onHidden = () => stopCamera();
    const onVisible = () => { if (isOpen) startCamera(); };
    const onVis = () => (document.hidden ? onHidden() : onVisible());
    // freeze fires on Chrome/Android screen lock; resume fires on unlock
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
                <h2 className="text-sm font-bold text-white">QR Scanner</h2>
                <p className="text-[11px] text-slate-400">Institutional Gate Verification</p>
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

          {/* Mode tabs — QR vs Barcode, separate, both auto-detect from the phone camera */}
          <div className="flex border-b border-slate-800 bg-slate-900/60">
            <button
              type="button"
              onClick={() => switchMode("qr")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
                mode === "qr"
                  ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-400 hover:text-white border-b-2 border-transparent"
              }`}
            >
              <QrCode className="w-4 h-4" />
              QR
            </button>
            <button
              type="button"
              onClick={() => switchMode("barcode")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${
                mode === "barcode"
                  ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                  : "text-slate-400 hover:text-white border-b-2 border-transparent"
              }`}
            >
              <ScanLine className="w-4 h-4" />
              Barcode
            </button>
          </div>

          {/* Camera viewfinder */}
          <div className="relative w-full h-[320px] sm:h-[400px] bg-black flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />

            {/* Barcode tab: warn when the phone's browser can't decode 1D/2D
                natively so the operator knows live auto-detect won't match —
                they can still use the QR tab or the image upload path. */}
            {cameraState === "active" && mode === "barcode" && !barcodeApiAvailable && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/40 rounded-full px-3 py-1.5 pointer-events-none">
                <AlertTriangle className="w-3 h-3" />
                <span>No native barcode decoder in this browser — try the QR tab or Upload below</span>
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload QR Image</span>
                </button>
                {onManualEntryClick && (
                  <button
                    onClick={() => { stopCamera(); onClose(); onManualEntryClick(); }}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>Manual Entry</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 text-xs font-bold"
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
