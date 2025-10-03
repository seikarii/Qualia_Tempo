import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface NeuralActivityBarsProps {
  activity: number;
  color: string;
  currentTime: number;
}

/**
 * NeuralActivityBars Component
 * 
 * QUALIA.CODE COMPLIANT: Stateless presentational component
 * Visualizes neural activity with animated bars
 */
export const NeuralActivityBars: React.FC<NeuralActivityBarsProps> = ({
  activity,
  color,
  currentTime,
}) => {
  const bars = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <div className="flex items-end space-x-1 h-16">
      {bars.map((bar) => {
        const height = 20 + activity * 40 + Math.sin(currentTime * 0.01 + bar * 0.5) * 10;
        
        return (
          <motion.div
            key={bar}
            className="w-2 rounded-full opacity-70"
            style={{
              background: `linear-gradient(to top, ${color}, transparent)`,
            }}
            animate={{
              height: `${height}px`,
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              height: { duration: 0.1 },
              opacity: { duration: 1, repeat: Infinity, delay: bar * 0.1 },
            }}
          />
        );
      })}
    </div>
  );
};
