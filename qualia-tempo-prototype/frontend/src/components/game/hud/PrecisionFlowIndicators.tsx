import React from "react";
import { motion } from "framer-motion";
import type { QualiaState } from "../../../types/contracts";

interface PrecisionFlowIndicatorsProps {
  qualiaState: QualiaState;
  flowColor: string;
}

export const PrecisionFlowIndicators: React.FC<PrecisionFlowIndicatorsProps> = ({
  qualiaState,
  flowColor,
}) => {
  return (
    <motion.div
      className="absolute top-8 right-8 z-50 space-y-4"
      animate={{
        boxShadow:
          qualiaState.precision > 0.5 ? `0 0 30px ${flowColor}` : "none",
      }}
    >
      <div className="cyber-gradient border-2 border-purple-400 px-6 py-4 rounded-xl text-right backdrop-blur-md">
        <div className="text-2xl font-bold text-purple-400 font-['Orbitron'] mb-1">
          {(qualiaState.precision * 100).toFixed(0)}%
        </div>
        <div className="text-sm text-purple-300 font-['Orbitron'] uppercase tracking-wider mb-2">
          Precision
        </div>
        <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-600 to-pink-400"
            animate={{ width: `${qualiaState.precision * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="cyber-gradient border-2 border-cyan-400 px-6 py-4 rounded-xl text-right backdrop-blur-md">
        <div
          className="text-2xl font-bold font-['Orbitron'] mb-1"
          style={{ color: flowColor }}
        >
          {qualiaState.flow > 0.8
            ? "FLOW"
            : qualiaState.flow > 0.5
              ? "SYNC"
              : "LOCK"}
        </div>
        <div className="text-sm text-cyan-300 font-['Orbitron'] uppercase tracking-wider">
          Neural State
        </div>
      </div>
    </motion.div>
  );
};
