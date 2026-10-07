"use client";

import { useState } from "react";
import { LucideIcon, ArrowUpRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { CountUp, SineWaveLoader } from "@/components/shared/CountUp";
import { GlossyFloatingContainer } from "@/components/shared/GlossyFloatingContainer";
import { Modal } from "@/components/ui/modal";
import { useGlass } from "@/context/GlassContext";

interface StatCardProps {
  label: string;
  emoji?: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  onClick?: () => void;
  index?: number;
  isLoading?: boolean;
}

export function StatCard({ label, emoji, value, icon: Icon, color, trend, onClick, index = 0, isLoading = false }: StatCardProps) {
  const { isLiveLoading } = useGlass();
  const [showModal, setShowModal] = useState(false);
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  const isNumeric = !isNaN(numericValue);
  const activeLoading = isLoading || isLiveLoading;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <GlossyFloatingContainer floatDelay={index * 0.4} floatDistance={-6}>
        <motion.div
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          onClick={handleClick}
          className="group relative overflow-hidden bg-[var(--bg-surface)] rounded-xl sm:rounded-2xl border border-[var(--border)] hover:border-indigo-500/50 p-3.5 sm:p-5 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10"
          title={`Click to view context & breakdown for ${label}`}
        >
          {/* Reactive Ambient Back Glow */}
          <div
            className="absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"
            style={{ backgroundColor: color }}
          />

          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            <div
              className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-sm"
              style={{ backgroundColor: `${color}18`, color }}
            >
              <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider truncate">
                  <span className="sm:hidden text-base">{emoji}</span>
                  <span className="hidden sm:inline">{emoji ? `${emoji} ${label}` : label}</span>
                </p>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
              <div className="kpi-number text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] mt-0.5 sm:mt-1">
                {activeLoading ? (
                  <SineWaveLoader />
                ) : isNumeric ? (
                  <CountUp value={numericValue} />
                ) : (
                  value
                )}
              </div>
              {trend ? (
                <p className="text-[10px] sm:text-xs font-medium text-[var(--text-muted)] mt-0.5 sm:mt-1 truncate">{trend}</p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </GlossyFloatingContainer>

      {/* Built-in Metric Context Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={`${label} — Live Context & Analytics`}
          size="md"
        >
          <div className="space-y-4 p-1">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: `${color}20`, color }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{label}</h4>
                <div className="text-2xl font-black text-[var(--text-primary)] mt-0.5">
                  {isNumeric ? <CountUp value={numericValue} /> : value}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                <Activity className="w-4 h-4 text-emerald-400" /> Live Metric Analysis
              </div>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {trend ? `Current telemetry status: ${trend}. ` : ""}
                This floating stat container monitors real-time activity across campus gates. All values update live via automated terminal scanning streams.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}



