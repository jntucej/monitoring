"use client";

import { useState, useEffect } from "react";
import { motion, useTransform, type MotionValue, useReducedMotion } from "framer-motion";

export interface VisualProps {
  progress: MotionValue<number>;
  hovered: boolean;
  clicked: boolean;
  accent: string;
}

/* ─────────────────────────────── 01 · Gate ─────────────────────────────── */
export function GateVisual({ progress, hovered, clicked, accent }: VisualProps) {
  const draw = useTransform(progress, [0.1, 0.5], [0, 1]);
  const spread = useTransform(progress, [0.15, 0.55], [0, 15]);
  const hover = hovered ? 18 : 0;
  const click = clicked ? 4 : 0;
  const extra = hover + click;
  const leftX = useTransform(spread, (v) => -v - extra);
  const rightX = useTransform(spread, (v) => v + extra);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!clicked) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [clicked]);

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.g style={{ x: leftX }}>
        <motion.line
          x1="60"
          y1="20"
          x2="60"
          y2="140"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            pathLength: draw,
            opacity: useTransform(draw, [0, 1], [0, 0.8]),
          }}
        />
      </motion.g>
      <motion.g style={{ x: rightX }}>
        <motion.line
          x1="140"
          y1="20"
          x2="140"
          y2="140"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            pathLength: draw,
            opacity: useTransform(draw, [0, 1], [0, 0.8]),
          }}
        />
      </motion.g>
      <motion.g style={{ opacity: draw }}>
        <motion.circle
          cx="100"
          cy="80"
          r="3"
          fill={accent}
          animate={
            pulse
              ? { scale: [1, 2.4, 1], opacity: [0.95, 0.4, 0.95] }
              : { scale: 1, opacity: 0.95 }
          }
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ transformOrigin: "100px 80px" }}
        />
        {pulse && (
          <motion.circle
            cx="100"
            cy="80"
            r="3"
            fill="none"
            stroke={accent}
            strokeWidth="1"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ transformOrigin: "100px 80px" }}
          />
        )}
      </motion.g>
    </svg>
  );
}

/* ─────────────────────────────── 02 · Scan ─────────────────────────────── */
export function ScanVisual({ progress, hovered, clicked, accent }: VisualProps) {
  const draw = useTransform(progress, [0.1, 0.45], [0, 1]);
  const sweep = useTransform(progress, [0.2, 0.75], [50, 110]);
  const tick = useTransform(progress, [0.7, 0.9], [0, 1]);
  const [resweep, setResweep] = useState(0);

  useEffect(() => {
    if (!clicked) return;
    setResweep((n) => n + 1);
  }, [clicked]);

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.rect
        x="45"
        y="50"
        width="110"
        height="60"
        rx="8"
        fill="none"
        stroke={accent}
        strokeOpacity="0.35"
        strokeWidth="1"
        style={{ opacity: draw }}
        animate={hovered ? { y: 48 } : { y: 50 }}
        transition={{ duration: 0.5 }}
      />
      <motion.rect
        x="45"
        width="110"
        height="1.6"
        fill={accent}
        fillOpacity="0.85"
        style={{ y: sweep, opacity: draw }}
      />
      <motion.path
        d="M 92 80 L 100 88 L 112 76"
        stroke={accent}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pathLength: tick, opacity: tick }}
      />
      {resweep > 0 && (
        <motion.rect
          key={resweep}
          x="45"
          width="110"
          height="1.6"
          fill={accent}
          fillOpacity="0.95"
          initial={{ y: 50, opacity: 0.9 }}
          animate={{ y: 110, opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}

/* ─────────────────────────────── 03 · Pass ─────────────────────────────── */
const STOPS = [
  { x: 50, role: "Teacher" },
  { x: 100, role: "Warden" },
  { x: 150, role: "Principal" },
];

export function PassVisual({ progress, hovered, clicked, accent }: VisualProps) {
  const draw = useTransform(progress, [0.1, 0.75], [0, 1]);
  const labelsOn = useTransform(draw, [0.6, 1], [0, 1]);

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.line
        x1="50"
        y1="80"
        x2="150"
        y2="80"
        stroke={accent}
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeDasharray="3 6"
        style={{ pathLength: draw }}
      />
      {STOPS.map((s, i) => {
        const appear = useTransform(draw, [i * 0.3, i * 0.3 + 0.3], [0, 1]);
        const isLast = i === STOPS.length - 1;
        const highlight = clicked && isLast;
        const focus = hovered && !clicked ? 1 : 0;

        return (
          <g key={s.x}>
            <motion.circle
              cx={s.x}
              cy={80}
              r={6 + (highlight ? 3 : focus * 1.5)}
              fill={accent}
              style={{ opacity: appear }}
              animate={{ fillOpacity: highlight ? 1 : 0.75 }}
              transition={{ duration: 0.4 }}
            />
            <motion.text
              x={s.x}
              y="105"
              textAnchor="middle"
              fill={accent}
              fillOpacity={0.7}
              fontSize="8"
              letterSpacing="0.5"
              style={{ opacity: labelsOn }}
            >
              {s.role}
            </motion.text>
          </g>
        );
      })}
      {clicked && (
        <motion.text
          x="100"
          y="132"
          textAnchor="middle"
          fill={accent}
          fillOpacity="0.85"
          fontSize="8"
          letterSpacing="0.6"
          initial={{ opacity: 0, y: 138 }}
          animate={{ opacity: 1, y: 132 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          APPROVED
        </motion.text>
      )}
    </svg>
  );
}

/* ─────────────────────────────── 04 · Approval ─────────────────────────── */
export function ApprovalVisual({
  progress,
  hovered,
  clicked,
  accent,
}: VisualProps) {
  const draw = useTransform(progress, [0.1, 0.55], [0, 1]);
  const sealIn = useTransform(progress, [0.55, 0.85], [0, 1]);
  const sealScale = useTransform(sealIn, [0, 1], [0.4, 1]);

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.path
        d="M 40 100 C 60 60, 70 120, 90 80 S 120 100, 130 70"
        stroke={accent}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        style={{
          pathLength: draw,
          opacity: useTransform(draw, [0, 1], [0, 0.9]),
        }}
      />
      <motion.g
        style={{
          scale: sealScale,
          transformOrigin: "150px 70px",
          opacity: sealIn,
        }}
        animate={hovered ? { scale: 1.08 } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <circle
          cx="150"
          cy="70"
          r="14"
          fill="none"
          stroke={accent}
          strokeWidth="1.2"
          strokeOpacity="0.85"
        />
        <motion.path
          d="M 144 70 L 148 74 L 156 64"
          stroke={accent}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pathLength: useTransform(sealIn, [0.3, 1], [0, 1]) }}
        />
      </motion.g>
      {clicked && (
        <motion.text
          x="100"
          y="135"
          textAnchor="middle"
          fill={accent}
          fillOpacity="0.85"
          fontSize="8"
          letterSpacing="0.6"
          initial={{ opacity: 0, y: 141 }}
          animate={{ opacity: 1, y: 135 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          SIGNED · HASHED
        </motion.text>
      )}
    </svg>
  );
}

/* ─────────────────────────────── 05 · Return ───────────────────────────── */
export function ReturnVisual({ progress, hovered, clicked, accent }: VisualProps) {
  const top = useTransform(progress, [0.1, 0.5], [0, 1]);
  const bottom = useTransform(progress, [0.35, 0.75], [0, 1]);
  const glow = hovered ? 0.95 : 0.65;

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.path
        d="M 30 70 L 170 70"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        style={{
          pathLength: top,
          opacity: useTransform(top, [0, 1], [0, glow]),
        }}
      />
      <motion.path
        d="M 150 62 L 170 70 L 150 78"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: top }}
      />
      <motion.path
        d="M 170 100 L 30 100"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        style={{
          pathLength: bottom,
          opacity: useTransform(bottom, [0, 1], [0, glow]),
        }}
      />
      <motion.path
        d="M 50 92 L 30 100 L 50 108"
        stroke={accent}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: bottom }}
      />
      {clicked && (
        <motion.text
          x="100"
          y="135"
          textAnchor="middle"
          fill={accent}
          fillOpacity="0.9"
          fontSize="8"
          letterSpacing="0.7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          WELCOME BACK
        </motion.text>
      )}
    </svg>
  );
}

/* ─────────────────────────────── 06 · Quiet ────────────────────────────── */
export function QuietVisual({ progress, hovered, clicked, accent }: VisualProps) {
  const reduce = useReducedMotion();
  const draw = useTransform(progress, [0.1, 0.5], [0, 1]);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (clicked) setBurst((n) => n + 1);
  }, [clicked]);

  return (
    <svg viewBox="0 0 200 160" className="h-full w-full">
      <motion.circle
        cx="100"
        cy="80"
        r="4"
        fill={accent}
        style={{ opacity: draw }}
      />
      {!reduce &&
        [0, 1].map((i) => (
          <motion.circle
            key={`base-${i}`}
            cx="100"
            cy="80"
            r="10"
            fill="none"
            stroke={accent}
            strokeWidth="0.9"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 4.5], opacity: [0.5, 0] }}
            transition={{
              duration: 3.2,
              delay: i * 1.4 + 0.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ transformOrigin: "100px 80px" }}
          />
        ))}
      {hovered && !reduce && (
        <motion.circle
          cx="100"
          cy="80"
          r="10"
          fill="none"
          stroke={accent}
          strokeWidth="1"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: [1, 3], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          style={{ transformOrigin: "100px 80px" }}
        />
      )}
      {burst > 0 &&
        !reduce &&
        [0, 1, 2].map((i) => (
          <motion.circle
            key={`b-${burst}-${i}`}
            cx="100"
            cy="80"
            r="10"
            fill="none"
            stroke={accent}
            strokeWidth="1"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: [1, 5], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, delay: i * 0.18, ease: "easeOut" }}
            style={{ transformOrigin: "100px 80px" }}
          />
        ))}
    </svg>
  );
}
