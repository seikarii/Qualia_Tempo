import React from "react";
import { motion } from "framer-motion";

interface ChaosIndicatorProps {
  chaos: number;
  chaosColor: string;
}

export const ChaosIndicator: React.FC<ChaosIndicatorProps> = ({
  chaos,
  chaosColor,
}) => {
  if (chaos <= 0.3) return null;

  return (
    <motion.div
      className="absolute right-8 top-1/2 transform -translate-y-1/2 z-40"
      animate={{
        x: [0, 5, -5, 0],
        filter: [
          "hue-rotate(0deg)",
          "hue-rotate(180deg)",
          "hue-rotate(360deg)",
        ],
      }}
      transition={{ duration: 0.3, repeat: Infinity }}
    >
      <div className="text-6xl opacity-60" style={{ color: chaosColor }}>
        ⚡
      </div>
    </motion.div>
  );
};
