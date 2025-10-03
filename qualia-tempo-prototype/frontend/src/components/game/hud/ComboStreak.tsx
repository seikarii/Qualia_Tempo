import React from "react";
import { motion } from "framer-motion";

interface ComboStreakProps {
  combo: number;
  maxCombo: number;
  isActive: boolean;
}

/**
 * ComboStreak Component
 * 
 * QUALIA.CODE COMPLIANT: Stateless presentational component
 * Displays combo counter with progress ring
 */
/**
 * ComboProgressRing - SVG progress indicator for combo counter
 * QUALIA.CODE COMPLIANT: Extract Component Pattern
 */
const ComboProgressRing: React.FC<{ progress: number }> = ({ progress }) => (
  <motion.svg
    className="absolute inset-0 w-full h-full -rotate-90"
    viewBox="0 0 100 100"
  >
    <circle
      cx="50"
      cy="50"
      r="40"
      fill="none"
      stroke="rgba(255,255,0,0.2)"
      strokeWidth="3"
    />
    <motion.circle
      cx="50"
      cy="50"
      r="40"
      fill="none"
      stroke="url(#comboGradient)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeDasharray="251.2"
      initial={{
        strokeDashoffset: 251.2 * (1 - (progress ?? 0)),
      }}
      animate={{
        strokeDashoffset: 251.2 * (1 - (progress ?? 0)),
      }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
    <defs>
      <linearGradient id="comboGradient" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffff00" />
        <stop offset="50%" stopColor="#ff8800" />
        <stop offset="100%" stopColor="#ff0044" />
      </linearGradient>
    </defs>
  </motion.svg>
);

export const ComboStreak: React.FC<ComboStreakProps> = ({ combo, maxCombo, isActive }) => {
  const progress = Math.min(Math.max((combo || 0) / (maxCombo || 1), 0), 1);

  return (
    <div className="relative">
      <motion.div
        className="text-4xl font-bold font-['Orbitron'] text-center"
        animate={
          isActive
            ? {
                scale: [1, 1.2, 1],
                textShadow: [
                  "0 0 5px #ffff00",
                  "0 0 25px #ffff00, 0 0 35px #ff8800",
                  "0 0 5px #ffff00",
                ],
              }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        <span className="text-yellow-400">{combo}</span>
        <span className="text-yellow-300 text-lg ml-1">x</span>
      </motion.div>

      <ComboProgressRing progress={progress} />
    </div>
  );
};
