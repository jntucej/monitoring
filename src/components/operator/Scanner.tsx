"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, AlertTriangle, KeyRound, ScanLine } from "lucide-react";
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
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasScanned, setHasScanned] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
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

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.height = video.videoHeight;
    canvas.width = video.videoWidth;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // 1. Try native BarcodeDetector API if available
    if ("BarcodeDetector" in window) {
      try {
        // @ts-expect-error - BarcodeDetector is a web standard in modern browsers
        const barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
        barcodeDetector
          .detect(canvas)
          .then((barcodes: Array<{ rawValue: string }>) => {
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleSuccessScan(barcodes[0].rawValue);
              return;
            } else {
              fallbackJsQRScan(imageData);
            }
          })
          .catch(() => {
            fallbackJsQRScan(imageData);
          });
      } catch {
        fallbackJsQRScan(imageData);
      }
    } else {
      fallbackJsQRScan(imageData);
    }
  }, []);

  const fallbackJsQRScan = (imageData: ImageData) => {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data && code.data.trim().length > 0) {
      handleSuccessScan(code.data.trim());
    } else {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleSuccessScan = (scannedData: string) => {
    if (hasScanned) return;
    setHasScanned(true);

    // Haptic feedback if available
    if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(100);
      } catch {
        // Ignore vibration errors
      }
    }

    stopCamera();
    onScan(scannedData);
    onClose();
  };

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("requesting");
    setErrorMessage("");
    setHasScanned(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("error");
      setErrorMessage("Camera access is not supported by your browser or environment (requires HTTPS or localhost).");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: unknown) {
      setCameraState("error");
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Camera permission was denied. Please grant camera access in browser settings.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage("No camera hardware found on this device.");
      } else {
        setErrorMessage(error.message || "Failed to initialize camera.");
      }
    }
  }, [scanFrame, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

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
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Scan Student ID</h2>
                <p className="text-[11px] text-slate-400">Live Camera QR Scanner</p>
              </div>
            </div>
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

          {/* Viewfinder Video Container */}
          <div className="relative flex-1 bg-black aspect-[4/3] flex items-center justify-center overflow-hidden">
            {/* Hidden canvas for decoding frames */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Live Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Reticle / Target Overlay */}
            {cameraState === "active" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56 border-2 border-emerald-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Animated scanning laser line */}
                  <motion.div
                    className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399]"
                    animate={{ top: ["8%", "92%", "8%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <ScanLine className="w-8 h-8 text-emerald-400/30" />
                </div>
              </div>
            )}

            {/* Requesting Camera Loading State */}
            {cameraState === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white space-y-3 p-4 text-center">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Requesting camera permission...</p>
              </div>
            )}

            {/* Error / Permission Denied State */}
            {cameraState === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-rose-400">Camera Unavailable</h3>
                  <p className="text-xs text-slate-300 max-w-xs">{errorMessage}</p>
                </div>

                <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Camera Again</span>
                  </button>

                  {onManualEntryClick && (
                    <button
                      onClick={() => {
                        stopCamera();
                        onClose();
                        onManualEntryClick();
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Enter Roll Number Instead</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer controls & hint */}
          <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
            <p className="text-center text-[11px] text-slate-400">
              Align student QR code within the frame to automatically verify pass.
            </p>

            <div className="flex gap-2">
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
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
