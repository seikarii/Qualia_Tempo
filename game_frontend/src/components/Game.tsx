import React, { useState, useEffect, useRef } from 'react';
import { DebugHUD } from './DebugHUD';
import { Metronome } from './Metronome';
import { startGame, stopGame } from '../game';
import type { QualiaState as QualiaStateType } from '../types/QualiaState';
import { EventManager } from '../events/EventManager';

import { useRhythmicInput } from '../hooks/useRhythmicInput';

const useAbility = (eventManager: EventManager) => {
  const getRemainingCooldown = (abilityName: string) => {
    return 0;
  };
  return { getRemainingCooldown };
};





interface GameProps {
  eventManager: EventManager;
  useAbility: (abilityName: string) => boolean;
  selectedCombatId: string;
}

const gameContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#1a1a1a',
  position: 'relative',
  overflow: 'hidden',
  cursor: 'crosshair',
};

export const Game: React.FC<GameProps> = ({ eventManager, useAbility, selectedCombatId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qualia, setQualia] = useState<QualiaStateType>({
    name: 'QualiaState', intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0,
  });
  const [combo, setCombo] = useState(0);
  const [bossHealth, setBossHealth] = useState(0);

  const handleBossStateUpdate = (data: { health: number }) => setBossHealth(data.health);
  const handleComboUpdate = (data: { combo: number }) => setCombo(data.combo);

  // Pass eventManager to hooks
  useRhythmicInput(true, eventManager); // isRunning is always true when game is active
  const { getRemainingCooldown } = useAbility(eventManager);

  const cooldowns = {
    pause: getRemainingCooldown('pause'),
    fastForward: getRemainingCooldown('fastForward'),
    rewind: getRemainingCooldown('rewind'),
    ultimate: getRemainingCooldown('ultimate'),
  };

  useEffect(() => {
    if (canvasRef.current) {
      startGame(canvasRef.current, eventManager, useAbility, selectedCombatId);

      // Subscribe to Qualia updates
      import { useRhythmicInput } from '../hooks/useRhythmicInput';

const useAbilityCooldowns = (eventManager: EventManager) => {
  const getRemainingCooldown = (abilityName: string) => {
    // Placeholder for actual cooldown logic
    console.log(eventManager, abilityName); // Use eventManager and abilityName to avoid unused variable warning
    return 0;
  };
  return { getRemainingCooldown };
};


interface GameProps {
  eventManager: EventManager;
  useAbility: (abilityName: string) => boolean;
  selectedCombatId: string;
}

const gameContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  backgroundColor: '#1a1a1a',
  position: 'relative',
  overflow: 'hidden',
  cursor: 'crosshair',
};

export const Game: React.FC<GameProps> = ({ eventManager, useAbility, selectedCombatId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qualia, setQualia] = useState<QualiaStateType>({
    name: 'QualiaState', intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0,
  });
  const [combo, setCombo] = useState(0);
  const [bossHealth, setBossHealth] = useState(0);

  const handleBossStateUpdate = (data: { health: number }) => setBossHealth(data.health);
  const handleComboUpdate = (data: { combo: number }) => setCombo(data.combo);

  // Pass eventManager to hooks
  useRhythmicInput(true, eventManager); // isRunning is always true when game is active
  const { getRemainingCooldown } = useAbilityCooldowns(eventManager);

  const cooldowns = {
    pause: getRemainingCooldown('pause'),
    fastForward: getRemainingCooldown('fastForward'),
    rewind: getRemainingCooldown('rewind'),
    ultimate: getRemainingCooldown('ultimate'),
  };

  useEffect(() => {
    if (canvasRef.current) {
      startGame(canvasRef.current, eventManager, useAbility, selectedCombatId);

      // Subscribe to Qualia updates
      eventManager.on('qualia_updated', (newQualia: QualiaStateType) => {
        setQualia(newQualia);
        // Assuming combo is part of qualia_updated event or derived from it
        // If not, a separate event for combo updates would be needed
        // For now, let's assume QualiaState has a currentCombo property
        // setCombo(newQualia.currentCombo);
      });

      // Subscribe to Boss health updates
      eventManager.on('boss_state_updated', handleBossStateUpdate);
      eventManager.on('combo_updated', handleComboUpdate);
    }

    return () => {
      stopGame();
      eventManager.off('qualia_updated', setQualia);
      eventManager.off('boss_state_updated', handleBossStateUpdate);
      eventManager.off('combo_updated', handleComboUpdate);
    };
  }, [eventManager, useAbility, selectedCombatId]);

  

  return (
    <div style={gameContainerStyle}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <DebugHUD qualia={qualia} combo={combo} cooldowns={cooldowns} playerHealth={0} bossHealth={0} dashCharges={0} />
      <Metronome eventManager={eventManager} />
      <div style={{ position: 'fixed', top: 10, right: 10, color: 'white', fontSize: '24px' }}>
        Boss Health: {bossHealth.toFixed(0)}
      </div>
    </div>
  );
};


      // Subscribe to Boss health updates
      eventManager.on('boss_state_updated', handleBossStateUpdate);
      eventManager.on('combo_updated', handleComboUpdate);
    }

    return () => {
      stopGame();
      eventManager.off('qualia_updated', setQualia);
      eventManager.off('boss_state_updated', handleBossStateUpdate);
      eventManager.off('combo_updated', handleComboUpdate);
    };
  }, [eventManager, useAbility, selectedCombatId]);

  

  return (
    <div style={gameContainerStyle}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      <DebugHUD qualia={qualia} combo={combo} cooldowns={cooldowns} playerHealth={0} bossHealth={0} dashCharges={0} />
      <Metronome eventManager={eventManager} />
      <div style={{ position: 'fixed', top: 10, right: 10, color: 'white', fontSize: '24px' }}>
        Boss Health: {bossHealth.toFixed(0)}
      </div>
    </div>
  );
};