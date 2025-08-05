import React from 'react';
import { QualiaState } from '../types/QualiaState';

interface DebugHUDProps {
  qualia: QualiaState;
  combo: number;
  cooldowns: { [key: string]: number };
}

export const DebugHUD: React.FC<DebugHUDProps> = ({ qualia, combo, cooldowns }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '14px',
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: '10px',
      borderRadius: '5px',
    }}>
      <div>Intensity: {qualia.intensity.toFixed(2)}</div>
      <div>Precision: {qualia.precision.toFixed(2)}</div>
      <div>Aggression: {qualia.aggression.toFixed(2)}</div>
      <div>Flow: {qualia.flow.toFixed(2)}</div>
      <div>Chaos: {qualia.chaos.toFixed(2)}</div>
      <div>Recovery: {qualia.recovery.toFixed(2)}</div>
      <div>Transcendence: {qualia.transcendence.toFixed(2)}</div>
      <div>Combo: {combo}</div>
      <div>-- Cooldowns --</div>
      {Object.entries(cooldowns).map(([ability, time]) => (
        <div key={ability}>{ability}: {time.toFixed(0)}s</div>
      ))}
    </div>
  );
};
