import { useState, useCallback, useEffect } from 'react';
import { EventManager } from '../events/EventManager';
import { GameEvent } from '../events/GameEvents';
import type { AbilitiesData } from '../types/Abilities';
import { config } from '../config';

/**
 * Represents the state of an ability.
 */
interface AbilityState {
  cooldown: number;
  lastUsed: number;
}

/**
 * Represents the state of all abilities.
 */
interface Abilities {
  pause: AbilityState;
  fastForward: AbilityState;
  rewind: AbilityState;
  ultimate: AbilityState;
}

const INITIAL_COOLDOWNS: AbilitiesData = {
  pause: { id: 'pause', color: config.COLORS.LIGHT_BLUE, damage: 0, type: 'utility', cooldown: config.ABILITIES.PAUSE_COOLDOWN },
  fastForward: { id: 'fastForward', color: config.COLORS.GOLD, damage: 0, type: 'utility', cooldown: config.ABILITIES.FAST_FORWARD_COOLDOWN },
  rewind: { id: 'rewind', color: config.COLORS.LIGHT_GREEN, damage: 0, type: 'utility', cooldown: config.ABILITIES.REWIND_COOLDOWN },
  ultimate: { id: 'ultimate', color: config.COLORS.VIOLET, damage: 0, type: 'utility', cooldown: config.ABILITIES.ULTIMATE_COOLDOWN },
};

/**
 * A hook for managing abilities.
 * @param eventManager The event manager.
 * @returns An object with functions for using abilities and getting remaining cooldowns.
 */
export const useAbilities = (eventManager: EventManager) => {
  const [abilities, setAbilities] = useState<Abilities>({
    pause: { cooldown: INITIAL_COOLDOWNS.pause.cooldown, lastUsed: 0 },
    fastForward: { cooldown: INITIAL_COOLDOWNS.fastForward.cooldown, lastUsed: 0 },
    rewind: { cooldown: INITIAL_COOLDOWNS.rewind.cooldown, lastUsed: 0 },
    ultimate: { cooldown: INITIAL_COOLDOWNS.ultimate.cooldown, lastUsed: 0 },
  });

  /**
   * Checks if an ability can be used.
   * @param abilityName The name of the ability.
   * @returns True if the ability can be used, false otherwise.
   */
  const canUseAbility = useCallback((abilityName: keyof Abilities) => {
    const now = performance.now();
    return now - abilities[abilityName].lastUsed >= abilities[abilityName].cooldown;
  }, [abilities]);

  /**
   * Uses an ability.
   * @param abilityName The name of the ability.
   * @returns True if the ability was used, false otherwise.
   */
  const useAbility = useCallback((abilityName: keyof Abilities) => {
    if (!canUseAbility(abilityName)) {
      console.log(`${abilityName} is on cooldown.`);
      return false;
    }

    const now = performance.now();
    setAbilities(prev => ({
      ...prev,
      [abilityName]: { ...prev[abilityName], lastUsed: now },
    }));

    // Emit events for QualiaSystem to handle
    switch (abilityName) {
      case 'pause':
        eventManager.emit(GameEvent.PlayerAbilityPause, {});
        console.log('Ability: Pause activated!');
        break;
      case 'fastForward':
        eventManager.emit(GameEvent.PlayerAbilityFastForward, {});
        console.log('Ability: Fast Forward activated!');
        break;
      case 'rewind':
        eventManager.emit(GameEvent.PlayerAbilityRewind, {});
        console.log('Ability: Rewind activated!');
        break;
      case 'ultimate':
        eventManager.emit(GameEvent.PlayerAbilityUltimate, {});
        console.log('Ability: Ultimate activated!');
        break;
    }

    // Emit cooldown update for DebugHUD
    eventManager.emit('player_ability_cooldown_updated', { [abilityName]: INITIAL_COOLDOWNS[abilityName].cooldown / 1000 });

    return true;
  }, [canUseAbility, eventManager]);

  /**
   * Gets the remaining cooldown of an ability.
   * @param abilityName The name of the ability.
   * @returns The remaining cooldown in seconds.
   */
  const getRemainingCooldown = useCallback((abilityName: keyof Abilities) => {
    const now = performance.now();
    const elapsed = now - abilities[abilityName].lastUsed;
    const remaining = Math.max(0, abilities[abilityName].cooldown - elapsed);
    return Math.ceil(remaining / 1000); // En segundos
  }, [abilities]);

  // Update cooldowns for display every second
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCooldowns: { [key: string]: number } = {};
      (Object.keys(abilities) as Array<keyof Abilities>).forEach(abilityName => {
        currentCooldowns[abilityName] = getRemainingCooldown(abilityName);
      });
      eventManager.emit('player_ability_cooldown_updated', currentCooldowns as GameEventData['player_ability_cooldown_updated']);
    }, config.ABILITIES.DEFAULT_COOLDOWN);

    return () => clearInterval(interval);
  }, [abilities, getRemainingCooldown, eventManager]);

  return { useAbility, getRemainingCooldown };
};
