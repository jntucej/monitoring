"use client";

import React from "react";

export function GlassDeviceFallback() {
  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 border border-white/10 bg-white/5 backdrop-blur-md">
      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
        <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-300">Device Hardware Fallback</p>
      <p className="text-xs text-slate-500">Live camera stream or optical scanner initializing...</p>
    </div>
  );
}

export default GlassDeviceFallback;
