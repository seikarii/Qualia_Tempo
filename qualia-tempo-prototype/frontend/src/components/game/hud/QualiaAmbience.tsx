import React from "react";
import { motion } from "framer-motion";
import type { QualiaState } from "../../../types/contracts";

interface QualiaAmbienceProps {
  qualiaState: QualiaState;
  intensityColor: string;
}

/**
 * TranscendenceStyles - CSS keyframes for transcendence animation
 * QUALIA.CODE COMPLIANT: Extract Constant Pattern
 */
const TRANSCENDENCE_STYLES = `
  @keyframes transcendencePulse {
    0%, 100% { 
      filter: blur(1px) brightness(1) contrast(1);
      transform: scale(1);
    }
    50% { 
      filter: blur(2px) brightness(1.5) contrast(1.2);
      transform: scale(1.02);
    }
  }
`;

/**
 * TranscendenceOverlay - Transcendence visual effect layer
 * QUALIA.CODE COMPLIANT: Extract Component Pattern
 */
const TranscendenceOverlay: React.FC<{ transcendence: number }> = ({ transcendence }) => (
  <motion.div
    className="fixed inset-0 pointer-events-none z-45"
    initial={{ opacity: 0 }}
    animate={{ opacity: transcendence }}
    exit={{ opacity: 0 }}
  >
    <div
      className="w-full h-full"
      style={{
        background: `
          radial-gradient(circle at 25% 25%, rgba(255,0,255,0.2) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(0,255,255,0.2) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(255,255,0,0.1) 0%, transparent 70%)
        `,
        filter: "blur(1px)",
        animation: "transcendencePulse 2s ease-in-out infinite",
      }}
    />
  </motion.div>
);

export const QualiaAmbience: React.FC<QualiaAmbienceProps> = ({
  qualiaState,
  intensityColor,
}) => {
  return (
    <>
      <motion.div
        className="fixed inset-0 pointer-events-none z-25"
        animate={{
          background: `radial-gradient(circle at ${50 + qualiaState.flow * 30}% ${50 + qualiaState.intensity * 20}%, ${intensityColor}10 0%, transparent 60%)`,
        }}
        transition={{ duration: 1 }}
      />

      {qualiaState.transcendence > 0.5 && (
        <TranscendenceOverlay transcendence={qualiaState.transcendence} />
      )}

      <style>{TRANSCENDENCE_STYLES}</style>
    </>
  );
};
