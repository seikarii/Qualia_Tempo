import React from "react";
import { motion } from "framer-motion";

interface HealthVisualizationProps {
  playerHealth: number;
}

/**
 * getHealthColor - Calculate health indicator color based on percentage
 * QUALIA.CODE COMPLIANT: Extract Method Pattern
 */
const getHealthColor = (health: number): string => {
  if (health > 50) return "#10B981";
  if (health > 25) return "#F59E0B";
  return "#EF4444";
};

/**
 * HealthRing - SVG circular health indicator
 * QUALIA.CODE COMPLIANT: Extract Component Pattern
 */
const HealthRing: React.FC<{ playerHealth: number }> = ({ playerHealth }) => {
  const normalizedHealth = Math.max(0, Math.min(100, playerHealth || 0)) / 100;
  const dashOffset = 251.2 * (1 - normalizedHealth);

  return (
    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="rgba(255,0,0,0.2)"
        strokeWidth="8"
      />
      <motion.circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke={getHealthColor(playerHealth)}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="251.2"
        initial={{ strokeDashoffset: dashOffset }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
};

export const HealthVisualization: React.FC<HealthVisualizationProps> = ({
  playerHealth,
}) => {
  return (
    <motion.div
      className="absolute bottom-8 left-8 z-50"
      animate={
        playerHealth < 30
          ? {
              filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
            }
          : {}
      }
      transition={{ duration: 0.5, repeat: playerHealth < 30 ? Infinity : 0 }}
    >
      <div className="cyber-gradient border-2 border-red-400 px-6 py-4 rounded-xl backdrop-blur-md">
        <div className="text-lg font-bold text-red-400 font-['Orbitron'] mb-2">
          VITALS: {playerHealth}%
        </div>

        <div className="relative w-16 h-16 mx-auto">
          <HealthRing playerHealth={playerHealth} />
        </div>
      </div>
    </motion.div>
  );
};
