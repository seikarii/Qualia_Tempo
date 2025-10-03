import React from "react";
import { motion } from "framer-motion";

interface BPMSynchronizerProps {
  bpm: number;
  intensityColor: string;
}

export const BPMSynchronizer: React.FC<BPMSynchronizerProps> = ({
  bpm,
  intensityColor,
}) => {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50"
      animate={{
        scale: [0.9, 1.1, 0.9],
        opacity: [0.8, 1, 0.8],
      }}
      transition={{
        duration: 60 / bpm,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="cyber-gradient border-2 border-yellow-400 p-4 rounded-full backdrop-blur-md">
        <div
          className="w-12 h-12 rounded-full border-2 border-yellow-400 flex items-center justify-center"
          style={{
            background: `radial-gradient(circle, ${intensityColor}40 0%, transparent 70%)`,
            boxShadow: `0 0 20px ${intensityColor}`,
          }}
        >
          <div className="text-yellow-400 font-bold text-xs">
            {bpm}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
