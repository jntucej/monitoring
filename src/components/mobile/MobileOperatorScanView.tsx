"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  AlertTriangle,
  Volume2,
  VolumeX,
  Upload,
  Zap,
  ArrowRightLeft,
  UserCheck,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import jsQR from "jsqr";
import { useOperatorStore } from "@/stores/operatorStore";
import { useToast } from "@/components/ui/toast";

export function MobileOperatorScanView() {
  const {
    state: scanState,
    currentStudent,
    selectedDirection,
    error,
    startScan,
    setDirection,
    confirmScan,
    cancelScan,
    reset,
    todaysStats,
  } = useOperatorStore();

  const { addToast } = useToast();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraState, setCameraState] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playBeep = useCallback((type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type === "success" ? "sine" : "sawtooth";
      osc.frequency.setValueAtTime(type === "success" ? 880 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === "success" ? 0.15 : 0.3));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (type === "success" ? 0.15 : 0.3));
    } catch {}
  }, [soundEnabled]);

  const triggerHaptic = useCallback((pattern: number[]) => {
    if (typeof window !== "undefined" && "navigator" in window && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch {}
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setCameraState("idle");
  }, []);

  const processFrame = useCallback(() => {
    if (!videoRef.current || videoRef.current.readyState !== HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        let scannedValue = code.data.trim();
        try {
          const parsed = JSON.parse(scannedValue);
          if (parsed.roll) scannedValue = parsed.roll;
        } catch {}

        playBeep("success");
        triggerHaptic([100, 50, 100]);
        stopCamera();
        startScan(scannedValue);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [playBeep, triggerHaptic, stopCamera, startScan]);

  const launchCamera = useCallback(async () => {
    setCameraState("requesting");
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setCameraState("active");
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err: unknown) {
      setCameraState("error");
      const msg = err instanceof Error ? err.message : "Failed to access rear camera.";
      setErrorMessage(msg);
      playBeep("error");
      triggerHaptic([200, 100, 200]);
    }
  }, [processFrame, playBeep, triggerHaptic]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            let scannedValue = code.data.trim();
            try {
              const parsed = JSON.parse(scannedValue);
              if (parsed.roll) scannedValue = parsed.roll;
            } catch {}
            playBeep("success");
            triggerHaptic([100, 50, 100]);
            startScan(scannedValue);
          } else {
            addToast({ variant: "error", title: "QR Unreadable", message: "No valid QR code found in uploaded image." });
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] max-w-lg mx-auto bg-slate-950 text-white relative overflow-hidden select-none">
      {/* Top Header & Today's Gate Stats */}
      <div className="p-4 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between z-10">
        <div>
          <h1 className="text-base font-black tracking-wide text-emerald-400">MAIN GATE #1</h1>
          <p className="text-xs text-slate-400">Gate Operator Station</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono text-emerald-400 font-bold block">
              IN: {todaysStats?.entries ?? 0}
            </span>
            <span className="text-xs font-mono text-amber-400 font-bold block">
              OUT: {todaysStats?.exits ?? 0}
            </span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? "Mute scanner sound" : "Enable scanner sound"}
            className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 active:scale-95 transition-transform"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Main Viewfinder / Scanner Container */}
      <div className="relative flex-1 bg-slate-950 flex flex-col justify-center items-center overflow-hidden">
        {isCameraActive ? (
          <div className="relative w-full h-full">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Visual Crosshair HUD Overlay */}
            <div className="absolute inset-0 border-[3px] border-emerald-500/30 m-8 rounded-3xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              </div>
              <motion.div
                animate={{ y: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-full h-1 bg-emerald-400 shadow-[0_0_15px_#10b981]"
              />
              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>

            <button
              onClick={stopCamera}
              className="absolute top-4 right-4 px-4 py-2.5 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700 text-xs font-bold text-slate-200 active:scale-95"
            >
              Cancel Camera
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
              <Camera className="w-12 h-12 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scanner Ready</h2>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Position student QR code inside scanner target or launch live camera view.
              </p>
            </div>
            <button
              onClick={launchCamera}
              className="w-full min-h-[52px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Zap className="w-5 h-5 text-slate-950 fill-current" />
              <span>Launch Camera Scanner</span>
            </button>

            <div className="flex gap-2 w-full pt-2">
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload Image</span>
              </button>
            </div>
          </div>
        )}
        {/* Error Overlay with Instant Retry */}
        <AnimatePresence>
          {(cameraState === "error" || scanState === "error") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-x-4 bottom-4 p-5 bg-rose-950/95 border-2 border-rose-500/50 rounded-2xl backdrop-blur-xl z-30 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-rose-200">Scan Error / Access Denied</h3>
                  <p className="text-xs text-rose-300/80 mt-1">{error?.message || errorMessage || "Invalid student barcode or outpass expired."}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { reset(); launchCamera(); }}
                  className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Scan
                </button>
                <button
                  onClick={() => reset()}
                  className="px-4 min-h-[44px] rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Bottom Sheet */}
      <AnimatePresence>
        {(scanState === "confirming" || scanState === "detecting") && currentStudent && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="absolute inset-x-0 bottom-0 bg-slate-900 border-t-2 border-emerald-500 rounded-t-3xl p-6 z-40 space-y-5 shadow-2xl"
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto" />
            <div className="flex items-center gap-4">
              <img
                src={currentStudent.photo || "/avatar-placeholder.png"}
                alt={currentStudent.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{currentStudent.name}</h3>
                <p className="text-xs font-mono text-emerald-400">{currentStudent.roll}</p>
                <p className="text-xs text-slate-400">{currentStudent.department} • Hostel {currentStudent.hostelBlock || "N/A"}</p>
              </div>
            </div>

            {/* Direction Selection */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDirection("IN")}
                className={`min-h-[48px] rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                  selectedDirection === "IN" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="w-4 h-4" /> ENTRY (IN)
              </button>
              <button
                type="button"
                onClick={() => setDirection("OUT")}
                className={`min-h-[48px] rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                  selectedDirection === "OUT" ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" /> EXIT (OUT)
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => confirmScan(addToast)}
                className="flex-1 min-h-[52px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-5 h-5" /> Confirm Pass
              </button>
              <button
                type="button"
                onClick={() => cancelScan()}
                className="min-h-[52px] px-5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs active:scale-95"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
