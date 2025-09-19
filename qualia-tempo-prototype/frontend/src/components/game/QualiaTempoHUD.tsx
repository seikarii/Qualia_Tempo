import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QualiaState } from '../../types/contracts';

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

const QualiaTempoHUD: React.FC<QualiaTempoHUDProps> = ({ 
  qualiaState,
  playerHealth: _playerHealth, // Health now handled via global vignette effect
  score,
  music_data
}) => {
  const [scoreChange, setScoreChange] = useState(0);
  const [lastScore, setLastScore] = useState(score);

  // Track score changes for punch animation
  useEffect(() => {
    if (score !== lastScore) {
      setScoreChange(score - lastScore);
      setLastScore(score);
      
      // Reset animation trigger after animation completes
      setTimeout(() => setScoreChange(0), 300);
    }
  }, [score, lastScore]);

  // Calculate dynamic colors based on qualia state
  const intensityColor = `hsl(${qualiaState.intensity * 360}, 80%, ${60 + qualiaState.intensity * 20}%)`;
  const flowColor = `hsl(${180 + qualiaState.flow * 180}, 70%, 60%)`;
  // Note: chaosColor calculation available but used inline for performance

  return (
    <>
      {/* Dynamic Score Display - Top Left */}
      <motion.div 
        className="absolute top-6 left-6 z-50"
        animate={scoreChange > 0 ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="cyber-gradient border border-cyan-500 px-4 py-2 rounded-lg">
          <motion.div
            className="text-2xl font-bold font-['Orbitron'] neon-glow"
            style={{ color: intensityColor }}
            animate={scoreChange > 0 ? { textShadow: [
              '0 0 5px #00ffff',
              '0 0 20px #00ffff, 0 0 30px #00ffff',
              '0 0 5px #00ffff'
            ]} : {}}
          >
            {score.toLocaleString()}
          </motion.div>
          <div className="text-xs text-cyan-400 font-['Orbitron']">NEURAL SCORE</div>
        </div>
        
        {/* Score Increase Animation */}
        <AnimatePresence>
          {scoreChange > 0 && (
            <motion.div
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -30, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-green-400 font-bold"
            >
              +{scoreChange}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Health - Environmental Vignette Effect (handled in index.html) */}
      {/* Health is now represented through the health-vignette div that changes opacity based on damage */}

      {/* Combo/Performance Indicator - Top Right */}
      <motion.div 
        className="absolute top-6 right-6 z-50"
        animate={{ 
          boxShadow: qualiaState.focus_level > 0.5 ? 
            `0 0 20px ${flowColor}` : 
            'none'
        }}
      >
        <div className="cyber-gradient border border-purple-500 px-4 py-2 rounded-lg text-right">
          <div className="text-lg font-bold text-purple-400 font-['Orbitron']">
            PRECISION: {(qualiaState.focus_level * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-purple-300 font-['Orbitron']">
            NEURAL SYNC
          </div>
        </div>
      </motion.div>

      {/* Qualia Flow Tracers - Environmental Effect */}
      {qualiaState.flow > 0.3 && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: qualiaState.flow }}
        >
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-20 bg-gradient-to-b from-transparent via-cyan-400 to-transparent"
              style={{
                left: `${20 + i * 30}%`,
                top: '50%',
              }}
              animate={{
                y: [-100, window.innerHeight + 100],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "linear",
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Chaos Glitch Effects */}
      {qualiaState.chaos > 0.4 && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-40"
          animate={{
            filter: [
              'none',
              'hue-rotate(90deg) saturate(2)',
              'hue-rotate(180deg) saturate(1.5)',
              'none'
            ],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Digital noise overlay */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.3'/%3E%3C/svg%3E")`,
              animation: `chaosGlitch ${0.8 / qualiaState.chaos}s infinite`,
            }}
          />
        </motion.div>
      )}

      {/* Central Rhythm Pulse - BPM Synchronized */}
      <motion.div
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50"
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 60 / music_data.bpm,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="w-16 h-16 rounded-full border-2 border-cyan-400"
          style={{
            background: `radial-gradient(circle, ${intensityColor} 0%, transparent 70%)`,
            boxShadow: `0 0 30px ${intensityColor}`,
          }}
        />
      </motion.div>

      {/* Intensity-Based Ambient Glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-20"
        animate={{
          background: `radial-gradient(circle at 50% 50%, ${intensityColor}15 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Custom Keyframes for Chaos Effect */}
      <style>{`
        @keyframes chaosGlitch {
          0% { transform: translate(0, 0); }
          10% { transform: translate(-2px, 2px); }
          20% { transform: translate(2px, -2px); }
          30% { transform: translate(-2px, -2px); }
          40% { transform: translate(2px, 2px); }
          50% { transform: translate(-1px, 1px); }
          60% { transform: translate(1px, -1px); }
          70% { transform: translate(-1px, -1px); }
          80% { transform: translate(1px, 1px); }
          90% { transform: translate(0, -1px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </>
  );
};

export default QualiaTempoHUD;
