import React from "react";
import { motion } from "framer-motion";

interface QualiaOrbProps {
  intensity: number;
  color: string;
  size?: number;
  x: number;
  y: number;
  id: string;
}

/**
 * QualiaOrb Component
 * 
 * QUALIA.CODE COMPLIANT: Stateless presentational component
 * Receives all visual properties pre-calculated
 */
export const QualiaOrb: React.FC<QualiaOrbProps> = ({ 
  intensity, 
  color, 
  size = 20, 
  x, 
  y, 
  id 
}) => {
  const pulseSpeed = 60 / (120 + intensity * 60);

  return (
    <motion.div
      key={id}
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: intensity }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          boxShadow: `0 0 ${size}px ${color}`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          filter: [
            `hue-rotate(0deg) brightness(1)`,
            `hue-rotate(30deg) brightness(1.5)`,
            `hue-rotate(0deg) brightness(1)`,
          ],
        }}
        transition={{
          duration: pulseSpeed,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};
