import React, { useState, useEffect, useRef } from 'react';
import { DebugHUD } from './DebugHUD';
import { Metronome } from './Metronome';
import { startGame, stopGame, eventManager } from '../game';
import { QualiaState } from '../ecs/components/QualiaState';

import { useRhythmicInput } from '../hooks/useRhythmicInput';
import { useAbilities } from '../hooks/useAbilities';

const gameContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#1a1a1a',
  position: 'relative',
  overflow: 'hidden',
  cursor: 'crosshair',
};

export const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qualia, setQualia] = useState<QualiaState>({
    name: 'QualiaState', intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0,
  });
  const [combo, setCombo] = useState(0);
  const [bossHealth, setBossHealth] = useState(0);

  // Pass eventManager to hooks
  useRhythmicInput(true, eventManager); // isRunning is always true when game is active
  const { getRemainingCooldown } = useAbilities(eventManager); // Pass eventManager

  useEffect(() => {
    if (canvasRef.current) {
      startGame(canvasRef.current);

      // Subscribe to Qualia updates
      eventManager.on('qualia_updated', (newQualia: QualiaState) => {
        setQualia(newQualia);
        // Assuming combo is part of qualia_updated event or derived from it
        // If not, a separate event for combo updates would be needed
        // For now, let's assume QualiaState has a currentCombo property
        // setCombo(newQualia.currentCombo); 
      });

      // Subscribe to Boss health updates
      eventManager.on('boss_health_updated', (data: { health: number }) => {
        setBossHealth(data.health);
      });

      // Subscribe to combo updates (if separate from QualiaState)
      eventManager.on('combo_updated', (data: { combo: number }) => {
        setCombo(data.combo);
      });
    }

    return () => {
      stopGame();
      eventManager.off('qualia_updated');
      eventManager.off('boss_health_updated');
      eventManager.off('combo_updated');
    };
  }, []);

  const cooldowns = {
    pause: getRemainingCooldown('pause'),
    fastForward: getRemainingCooldown('fastForward'),
    rewind: getRemainingCooldown('rewind'),
    ultimate: getRemainingCooldown('ultimate'),
  };

  return (
    <div style={gameContainerStyle}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <DebugHUD qualia={qualia} combo={combo} cooldowns={cooldowns} />
      <Metronome />
      <div style={{ position: 'fixed', top: 10, right: 10, color: 'white', fontSize: '24px' }}>
        Boss Health: {bossHealth.toFixed(0)}
      </div>
    </div>
  );
};
