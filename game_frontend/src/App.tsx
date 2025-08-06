import { useState, useEffect, useCallback } from 'react';
import { Game } from './components/Game';
import { DebugHUD } from './components/DebugHUD';
import { Metronome } from './components/Metronome';
import { MainMenu } from './components/MainMenu';
import { CombatSelectionMenu } from './components/CombatSelectionMenu';
import { EndOfCombatScreen } from './components/EndOfCombatScreen';
import { EventManager } from './events/EventManager';
import { GameEvent } from './events/GameEvents';
import type { QualiaState as QualiaStateType } from './types/QualiaState';



import { useAbilities } from './hooks/useAbilities';
import { config } from './config';

const eventManager = new EventManager();

/**
 * The main application component.
 * @returns The main application component.
 */
function App() {
  const [qualiaState, setQualiaState] = useState<QualiaStateType>({
    name: 'QualiaState', intensity: 0, precision: 0, aggression: 0, flow: 0, chaos: 0, recovery: 0, transcendence: 0,
  });
  const [combo, setCombo] = useState<number>(config.APP.INITIAL_COMBO);
  const [cooldowns, setCooldowns] = useState<{[key: string]: number}>({});
  const [playerHealth, setPlayerHealth] = useState<number>(config.APP.INITIAL_HEALTH); // Initial player health
  const [bossHealth, setBossHealth] = useState<number>(config.APP.INITIAL_BOSS_HEALTH); // Initial boss health
  const [dashCharges, setDashCharges] = useState<number>(config.APP.INITIAL_DASH_COMBO); // Initial dash charges
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [showCombatSelection, setShowCombatSelection] = useState<boolean>(false);
  const [selectedCombatId, setSelectedCombatId] = useState<string | null>(null);
  const [showEndOfCombat, setShowEndOfCombat] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  const { useAbility } = useAbilities(eventManager);

  useEffect(() => {
    /**
     * Handles the Qualia update event.
     * @param newQualia The new Qualia state.
     */
    const handleQualiaUpdate = (newQualia: QualiaStateType) => {
      setQualiaState(newQualia);
    };

    /**
     * Handles the combo update event.
     * @param data The event data.
     */
    const handleComboUpdate = (data: { combo: number }) => {
      setCombo(data.combo);
    };

    /**
     * Handles the ability cooldown update event.
     * @param data The event data.
     */
    const handleAbilityCooldownUpdate = (data: { [key: string]: number }) => {
      setCooldowns(data);
    };

    /**
     * Handles the player state update event.
     * @param data The event data.
     */
    const handlePlayerStateUpdate = (data: { health: number, dashCharges: number }) => {
      setPlayerHealth(data.health);
      setDashCharges(data.dashCharges);
    };

    /**
     * Handles the boss state update event.
     * @param data The event data.
     */
    const handleBossStateUpdate = (data: { health: number }) => {
      setBossHealth(data.health);
    };

    /**
     * Handles the boss defeated event.
     */
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

  /**
   * Handles the start game event.
   */
  const handleStartGame = useCallback(() => {
    setShowCombatSelection(true);
  }, []);

  /**
   * Handles the combat selected event.
   * @param combatId The ID of the selected combat.
   */
  const handleCombatSelected = useCallback((combatId: string) => {
    setSelectedCombatId(combatId);
    setShowCombatSelection(false);
    setIsGameStarted(true);
    setShowEndOfCombat(false); // Hide end of combat screen if visible
  }, []);

  /**
   * Handles the restart combat event.
   */
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

  /**
   * Handles the return to main menu event.
   */
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
          <Game eventManager={eventManager} useAbility={useAbility as (abilityName: string) => boolean} selectedCombatId={selectedCombatId} />
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
