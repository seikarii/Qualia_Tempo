import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralActivityBars } from "./NeuralActivityBars";

interface ScoreDisplayProps {
  score: number;
  scoreChange: number;
  intensityColor: string;
  intensity: number;
  currentTime: number;
}

/**
 * ScoreDisplay Component
 * 
 * QUALIA.CODE COMPLIANT: Stateless presentational component
 * Displays score with neural activity visualization
 */
/**
 * ScoreChangePopup - Animated score increment indicator
 * QUALIA.CODE COMPLIANT: Extract Component Pattern
 */
const ScoreChangePopup: React.FC<{ scoreChange: number }> = ({ scoreChange }) => {
  if (scoreChange <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      animate={{
        opacity: 0,
        y: -60,
        scale: 1.5,
        x: Math.random() * 40 - 20,
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none"
    >
      <div
        className="text-2xl font-bold neon-glow"
        style={{ color: scoreChange > 1000 ? "#ff00ff" : "#00ffff" }}
      >
        +{scoreChange}
      </div>
    </motion.div>
  );
};

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score,
  scoreChange,
  intensityColor,
  intensity,
  currentTime,
}) => {
  return (
    <motion.div
      className="absolute top-8 left-8 z-50 flex items-center space-x-6"
      animate={
        scoreChange > 0
          ? {
              scale: [1, 1.1, 1],
              filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"],
            }
          : {}
      }
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="cyber-gradient border-2 border-cyan-400 px-6 py-4 rounded-xl backdrop-blur-md">
        <motion.div
          className="text-3xl font-bold font-['Orbitron'] neon-glow-strong"
          style={{ color: intensityColor }}
        >
          {score.toLocaleString()}
        </motion.div>
        <div className="text-sm text-cyan-300 font-['Orbitron'] uppercase tracking-wider">
          Neural Score
        </div>
      </div>

      <div className="cyber-gradient border border-cyan-300 px-4 py-2 rounded-lg">
        <NeuralActivityBars
          activity={intensity}
          color={intensityColor}
          currentTime={currentTime}
        />
      </div>

      <AnimatePresence>
        <ScoreChangePopup scoreChange={scoreChange} />
      </AnimatePresence>
    </motion.div>
  );
};
