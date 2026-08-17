"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, AlertTriangle, KeyRound, ScanLine, Zap, Volume2, VolumeX, Sparkles } from "lucide-react";
import jsQR from "jsqr";

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
  const isScanningRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasScanned, setHasScanned] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context error fallback
    }
  }, [soundEnabled]);

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
    if (hasScanned || !scannedData) return;
    setHasScanned(true);
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
  }, [hasScanned, stopCamera, onScan, onClose, playBeep]);

  const processFrame = useCallback(() => {
    if (!isScanningRef.current || hasScanned) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    // Downscale scan resolution to 360x270 for smooth, non-fluctuating performance
    const targetWidth = 360;
    const targetHeight = 270;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = context.getImageData(0, 0, targetWidth, targetHeight);

    // Try jsQR first for lightweight fast execution
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data && code.data.trim().length > 0) {
      handleSuccessScan(code.data.trim());
      return;
    }

    // Secondary fallback using BarcodeDetector if available
    if ("BarcodeDetector" in window) {
      try {
        // @ts-expect-error - Web API BarcodeDetector
        const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
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
    }
  }, [handleSuccessScan, hasScanned]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("requesting");
    setErrorMessage("");
    setHasScanned(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("error");
      setErrorMessage("Live camera feed requires HTTPS or localhost browser security permissions.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraState("active");
        isScanningRef.current = true;

        // Run scanner at 5 frames per second (every 200ms) to eliminate flickering/lag!
        timerRef.current = setInterval(() => {
          processFrame();
        }, 200);
      }
    } catch (err: unknown) {
      setCameraState("error");
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied in browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware detected on this device.");
      } else {
        setErrorMessage(error.message || "Unable to open physical camera stream.");
      }
    }
  }, [processFrame, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only re-run when isOpen changes, not on every render

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Live Gate Scanner</h2>
                <p className="text-[11px] text-slate-400">JNTUH CEJ Security Verification</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                title={soundEnabled ? "Mute Scanner Audio" : "Enable Scanner Beep Sound"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>

              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Close Scanner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewfinder & Smooth Video Canvas Feed */}
          <div className="relative flex-1 bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
            <canvas ref={canvasRef} className="hidden" />

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Scanning Reticle Frame */}
            {cameraState === "active" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  <motion.div
                    className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399]"
                    animate={{ top: ["8%", "92%", "8%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <ScanLine className="w-8 h-8 text-emerald-400/40 animate-pulse" />
                </div>
              </div>
            )}

            {/* Initializing State */}
            {cameraState === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white space-y-3 p-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Initializing camera stream...</p>
              </div>
            )}

            {/* Error State */}
            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-400">Live Stream Unavailable</h3>
                  <p className="text-xs text-slate-300 max-w-xs">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Instant Scan Simulation */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Scan Simulation</span>
              </span>
              <span className="text-[10px] text-slate-500">Tap to load profile instantly</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSuccessScan("24JJ1A0501")}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scan #24JJ1A0501</span>
              </button>

              <button
                type="button"
                onClick={() => handleSuccessScan("24JJ1A0502")}
                className="py-2.5 px-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                <span>Scan #24JJ1A0502</span>
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              {onManualEntryClick && (
                <button
                  onClick={() => {
                    stopCamera();
                    onClose();
                    onManualEntryClick();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Manual Roll Entry</span>
                </button>
              )}

              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
