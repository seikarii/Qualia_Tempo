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
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: '#fff',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        SCORE: {score.toLocaleString()}
      </div>

      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        color: '#fff',
        fontSize: '20px'
      }}>
        HEALTH: {playerHealth}%
      </div>

      <div style={{
        position: 'absolute',
        top: 60,
        left: 20,
        color: '#fff',
        fontSize: '14px'
      }}>
        <div>Intensity: {(qualiaState.intensity * 100).toFixed(1)}%</div>
        <div>Flow: {(qualiaState.flow * 100).toFixed(1)}%</div>
        <div>Precision: {(qualiaState.precision * 100).toFixed(1)}%</div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${qualiaColor} 0%, transparent 70%)`,
        animation: `pulse ${60 / music_data.bpm}s infinite ease-in-out`,
        opacity: 0.7
      }}>
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.8); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.8); opacity: 0.7; }
          }
        `}</style>
      </div>
    </>
  );
};

export default QualiaTempoHUD;
