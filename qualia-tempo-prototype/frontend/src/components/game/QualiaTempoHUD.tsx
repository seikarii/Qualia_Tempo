import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QualiaState } from "../../types/contracts";
import { useGameStore } from "../../state/useGameStore";
import { useService } from "../../services/hooks";
import { TYPES } from "../../services/inversify.types";
import type { IEventBus } from "../../services/interfaces/IEventBus";
import type { PlayerActionEvent } from "../../services/EventBus";

interface MusicData {
  bpm: number;
  emotional_valence?: number;
}

interface QualiaTempoHUDProps {
  qualiaState: QualiaState;
  playerHealth: number;
  score: number;
  music_data: MusicData;
}

// Enhanced Qualia Orb Component
const QualiaOrb: React.FC<{
  intensity: number;
  color: string;
  size?: number;
  x: number;
  y: number;
  id: string;
}> = ({ intensity, color, size = 20, x, y, id }) => {
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
          duration: 60 / (120 + intensity * 60), // BPM synchronized
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};

// Neural Activity Bars Component
const NeuralActivityBars: React.FC<{ activity: number; color: string }> = ({
  activity,
  color,
}) => {
  const bars = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <div className="flex items-end space-x-1 h-16">
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className="w-2 rounded-full opacity-70"
          style={{
            background: `linear-gradient(to top, ${color}, transparent)`,
          }}
          animate={{
            height: `${20 + activity * 40 + Math.sin(Date.now() * 0.01 + bar * 0.5) * 10}px`,
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{
            height: { duration: 0.1 },
            opacity: { duration: 1, repeat: Infinity, delay: bar * 0.1 },
          }}
        />
      ))}
    </div>
  );
};

// Combo Streak Display
const ComboStreak: React.FC<{
  combo: number;
  maxCombo: number;
  isActive: boolean;
}> = ({ combo, maxCombo, isActive }) => {
  // Ensure progress is always a valid number between 0 and 1
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

      {/* Progress ring */}
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
            strokeDashoffset: 251.2 * (1 - (progress || 0)),
          }}
          animate={{
            strokeDashoffset: 251.2 * (1 - (progress || 0)),
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
    </div>
  );
};

const QualiaTempoHUD: React.FC<QualiaTempoHUDProps> = ({
  qualiaState,
  playerHealth,
  score,
  music_data,
}) => {
  // QUALIA.CODE COMPLIANT: State management via GameStateStore
  const player = useGameStore((state) => state.player);
  const eventBus = useService<IEventBus>(TYPES.IEventBus);

  // QUALIA.CODE COMPLIANT: Only trivial UI state in useState
  const [scoreChange, setScoreChange] = useState(0);
  const [lastScore, setLastScore] = useState(score);
  const [qualiaOrbs, setQualiaOrbs] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      intensity: number;
      color: string;
    }>
  >([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Enhanced score change tracking
  useEffect(() => {
    if (score !== lastScore) {
      const change = score - lastScore;
      setScoreChange(change);
      setLastScore(score);

      if (change > 0) {
        // QUALIA.CODE COMPLIANT: Emit event to update combo via EventBus/GameStateStore
        eventBus.emit<PlayerActionEvent>({
          type: "PlayerAction",
          action: "scoreIncrease",
          value: change,
          source: "QualiaTempoHUD",
        });

        // Generate qualia orb on score increase
        const newOrb = {
          id: `orb-${Date.now()}-${Math.random()}`,
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          intensity: Math.min(change / 1000, 1),
          color:
            change > 500 ? "#ff00ff" : change > 200 ? "#00ffff" : "#ffff00",
        };

        setQualiaOrbs((prev) => [...prev, newOrb]);

        // Remove orb after animation
        setTimeout(() => {
          setQualiaOrbs((prev) => prev.filter((orb) => orb.id !== newOrb.id));
        }, 2000);
      }

      // Reset animation trigger
      setTimeout(() => setScoreChange(0), 400);
    }
  }, [score, lastScore, eventBus]);

  // QUALIA.CODE COMPLIANT: Combo managed by GameStateStore, no local decay needed
  // Combo decay logic should be handled by a dedicated service via EventBus

  // Dynamic canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw neural network pattern
      ctx.strokeStyle = `rgba(0, 255, 255, ${qualiaState.flow * 0.5})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < 20; i++) {
        const x1 = Math.sin(Date.now() * 0.001 + i) * 50 + canvas.width / 2;
        const y1 = Math.cos(Date.now() * 0.001 + i) * 50 + canvas.height / 2;
        const x2 = Math.sin(Date.now() * 0.001 + i + 1) * 50 + canvas.width / 2;
        const y2 =
          Math.cos(Date.now() * 0.001 + i + 1) * 50 + canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [qualiaState.flow]);

  // Calculate dynamic colors based on qualia state
  const intensityColor = `hsl(${qualiaState.intensity * 360}, 85%, ${55 + qualiaState.intensity * 25}%)`;
  const flowColor = `hsl(${180 + qualiaState.flow * 180}, 75%, 65%)`;
  const chaosColor = `hsl(${qualiaState.chaos * 120}, 90%, ${70 + Math.sin(Date.now() * 0.01) * 15}%)`;

  return (
    <>
      {/* Enhanced Score Display with Neural Activity */}
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

        {/* Neural Activity Visualization */}
        <div className="cyber-gradient border border-cyan-300 px-4 py-2 rounded-lg">
          <NeuralActivityBars
            activity={qualiaState.intensity}
            color={intensityColor}
          />
        </div>

        {/* Score Increase Animation */}
        <AnimatePresence>
          {scoreChange > 0 && (
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
          )}
        </AnimatePresence>
      </motion.div>

      {/* Combo System - Top Center */}
      {player.combo > 0 && (
        <motion.div
          className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        >
          <div className="cyber-gradient border-2 border-yellow-400 p-4 rounded-full w-20 h-20">
            <ComboStreak
              combo={player.combo}
              maxCombo={40}
              isActive={player.combo > 10}
            />
          </div>
        </motion.div>
      )}

      {/* Enhanced Precision & Flow Indicators - Top Right */}
      <motion.div
        className="absolute top-8 right-8 z-50 space-y-4"
        animate={{
          boxShadow:
            qualiaState.precision > 0.5 ? `0 0 30px ${flowColor}` : "none",
        }}
      >
        {/* Precision Meter */}
        <div className="cyber-gradient border-2 border-purple-400 px-6 py-4 rounded-xl text-right backdrop-blur-md">
          <div className="text-2xl font-bold text-purple-400 font-['Orbitron'] mb-1">
            {(qualiaState.precision * 100).toFixed(0)}%
          </div>
          <div className="text-sm text-purple-300 font-['Orbitron'] uppercase tracking-wider mb-2">
            Precision
          </div>

          {/* Precision bar */}
          <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-pink-400"
              animate={{ width: `${qualiaState.precision * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Flow State Indicator */}
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

      {/* Health Visualization - Bottom Left */}
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

          {/* Health ring */}
          <div className="relative w-16 h-16 mx-auto">
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
                stroke={
                  playerHealth > 50
                    ? "#10B981"
                    : playerHealth > 25
                      ? "#F59E0B"
                      : "#EF4444"
                }
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2"
                initial={{
                  strokeDashoffset:
                    251.2 *
                    (1 - Math.max(0, Math.min(100, playerHealth || 0)) / 100),
                }}
                animate={{
                  strokeDashoffset:
                    251.2 *
                    (1 - Math.max(0, Math.min(100, playerHealth || 0)) / 100),
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* BPM Synchronizer - Bottom Center */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        animate={{
          scale: [0.9, 1.1, 0.9],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 60 / music_data.bpm,
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
              {music_data.bpm}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chaos Indicator - Right Side */}
      {qualiaState.chaos > 0.3 && (
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
      )}

      {/* Dynamic Qualia Orbs */}
      <div className="fixed inset-0 pointer-events-none z-30">
        {qualiaOrbs.map((orb) => (
          <QualiaOrb
            key={orb.id}
            id={orb.id}
            x={orb.x}
            y={orb.y}
            intensity={orb.intensity}
            color={orb.color}
            size={20 + orb.intensity * 30}
          />
        ))}
      </div>

      {/* Neural Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-20 opacity-30"
        width={window.innerWidth}
        height={window.innerHeight}
      />

      {/* Ambient Effects Based on Qualia State */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-25"
        animate={{
          background: `radial-gradient(circle at ${50 + qualiaState.flow * 30}% ${50 + qualiaState.intensity * 20}%, ${intensityColor}10 0%, transparent 60%)`,
        }}
        transition={{ duration: 1 }}
      />

      {/* Transcendence Ultimate Effect */}
      {qualiaState.transcendence > 0.5 && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-45"
          initial={{ opacity: 0 }}
          animate={{ opacity: qualiaState.transcendence }}
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
      )}

      {/* Enhanced CSS for transcendence effect */}
      <style>{`
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
      `}</style>
    </>
  );
};

export default QualiaTempoHUD;
