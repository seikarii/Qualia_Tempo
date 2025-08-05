import React, { useState, useEffect, useCallback } from 'react';
import { Game } from './components/Game';
import { DebugHUD } from './components/DebugHUD';
import { Metronome } from './components/Metronome';
import { MainMenu } from './components/MainMenu';
import { CombatSelectionMenu } from './components/CombatSelectionMenu';
import { EndOfCombatScreen } from './components/EndOfCombatScreen';
import { EventManager } from './events/EventManager';
import { GameEvent } from './events/GameEvents';
import { QualiaState as QualiaStateClass } from './ecs/components/QualiaState';
import { QualiaState as QualiaStateType } from './types/QualiaState';
import { useAbilities } from './hooks/useAbilities';

const eventManager = new EventManager();

function App() {
  const [qualiaState, setQualiaState] = useState<QualiaStateType>(new QualiaStateClass());
  const [combo, setCombo] = useState<number>(0);
  const [cooldowns, setCooldowns] = useState<{[key: string]: number}>({});
  const [playerHealth, setPlayerHealth] = useState<number>(100); // Initial player health
  const [bossHealth, setBossHealth] = useState<number>(100); // Initial boss health
  const [dashCharges, setDashCharges] = useState<number>(3); // Initial dash charges
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [showCombatSelection, setShowCombatSelection] = useState<boolean>(false);
  const [selectedCombatId, setSelectedCombatId] = useState<string | null>(null);
  const [showEndOfCombat, setShowEndOfCombat] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  const { useAbility } = useAbilities(eventManager);

  useEffect(() => {
    const handleQualiaUpdate = (newQualia: QualiaStateType) => {
      setQualiaState(newQualia);
    };

    const handleComboUpdate = (data: { combo: number }) => {
      setCombo(data.combo);
    };

    const handleAbilityCooldownUpdate = (data: { [key: string]: number }) => {
      setCooldowns(data);
    };

    const handlePlayerStateUpdate = (data: { health: number, dashCharges: number }) => {
      setPlayerHealth(data.health);
      setDashCharges(data.dashCharges);
    };

    const handleBossStateUpdate = (data: { health: number }) => {
      setBossHealth(data.health);
    };

    const handleBossDefeated = () => {
      setIsVictory(true);
      setShowEndOfCombat(true);
      setIsGameStarted(false); // Stop the game loop
    };

    eventManager.on('qualia_updated', handleQualiaUpdate);
    eventManager.on('combo_updated', handleComboUpdate);
    eventManager.on('player_ability_cooldown_updated', handleAbilityCooldownUpdate);
    eventManager.on('player_state_updated', handlePlayerStateUpdate);
    eventManager.on('boss_state_updated', handleBossStateUpdate);
    eventManager.on(GameEvent.BossDefeated, handleBossDefeated);

    return () => {
      eventManager.off('qualia_updated', handleQualiaUpdate);
      eventManager.off('combo_updated', handleComboUpdate);
      eventManager.off('player_ability_cooldown_updated', handleAbilityCooldownUpdate);
      eventManager.off('player_state_updated', handlePlayerStateUpdate);
      eventManager.off('boss_state_updated', handleBossStateUpdate);
      eventManager.off(GameEvent.BossDefeated, handleBossDefeated);
    };
  }, []);

  const handleStartGame = useCallback(() => {
    setShowCombatSelection(true);
  }, []);

  const handleCombatSelected = useCallback((combatId: string) => {
    setSelectedCombatId(combatId);
    setShowCombatSelection(false);
    setIsGameStarted(true);
    setShowEndOfCombat(false); // Hide end of combat screen if visible
  }, []);

  const handleRestartCombat = useCallback(() => {
    if (selectedCombatId) {
      setIsGameStarted(false); // Stop current game
      setShowEndOfCombat(false); // Hide end screen
      // Re-initialize game with the same combat ID
      setTimeout(() => {
        setIsGameStarted(true);
      }, 100); // Small delay to ensure state reset
    }
  }, [selectedCombatId]);

  const handleReturnToMainMenu = useCallback(() => {
    setIsGameStarted(false);
    setShowCombatSelection(false);
    setSelectedCombatId(null);
    setShowEndOfCombat(false);
  }, []);

  return (
    <>
      {!isGameStarted && !showCombatSelection && !showEndOfCombat && (
        <MainMenu onStartGame={handleStartGame} />
      )}

      {showCombatSelection && (
        <CombatSelectionMenu onCombatSelected={handleCombatSelected} />
      )}

      {isGameStarted && selectedCombatId && (
        <>
          <Game eventManager={eventManager} useAbility={useAbility} selectedCombatId={selectedCombatId} />
          <DebugHUD qualia={qualiaState} combo={combo} cooldowns={cooldowns} playerHealth={playerHealth} bossHealth={bossHealth} dashCharges={dashCharges} />
          <Metronome eventManager={eventManager} />
        </>
      )}

      {showEndOfCombat && (
        <EndOfCombatScreen
          isVictory={isVictory}
          onRestart={handleRestartCombat}
          onReturnToMenu={handleReturnToMainMenu}
        />
      )}
    </>
  );
}

export default App;
