import React from 'react';
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
  playerHealth,
  score,
  music_data
}) => {
  const qualiaColor = `hsl(${qualiaState.intensity * 360}, 80%, 60%)`;

  return (
    <>
      <div className="absolute top-5 left-5 text-white text-2xl font-bold">
        SCORE: {score.toLocaleString()}
      </div>

      <div className="absolute top-5 right-5 text-white text-xl">
        HEALTH: {playerHealth}%
      </div>

      <div className="absolute top-[60px] left-5 text-white text-sm">
        <div>Intensity: {(qualiaState.intensity * 100).toFixed(1)}%</div>
        <div>Flow: {(qualiaState.flow * 100).toFixed(1)}%</div>
        <div>Precision: {(qualiaState.focus_level * 100).toFixed(1)}%</div>
      </div>

      <div 
        className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[60px] h-[60px] rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle, ${qualiaColor} 0%, transparent 70%)`,
          animation: `pulse ${60 / music_data.bpm}s infinite ease-in-out`,
        }}
      >
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.8) translateX(-50%); opacity: 0.7; }
            50% { transform: scale(1.2) translateX(-50%); opacity: 1; }
            100% { transform: scale(0.8) translateX(-50%); opacity: 0.7; }
          }
        `}</style>
      </div>
    </>
  );
};

export default QualiaTempoHUD;
