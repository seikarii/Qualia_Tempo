import { useState, useCallback, useEffect } from 'react';
import { EventManager } from '../events/EventManager';
import { GameEvent } from '../events/GameEvents';
import { AbilitiesData } from '../types/Abilities';

interface AbilityState {
  cooldown: number;
  lastUsed: number;
}

interface Abilities {
  pause: AbilityState;
  fastForward: AbilityState;
  rewind: AbilityState;
  ultimate: AbilityState;
}

const INITIAL_COOLDOWNS: AbilitiesData = {
  pause: { id: 'pause', color: '#ADD8E6', damage: 0, type: 'utility', cooldown: 5000 }, // 5 segundos
  fastForward: { id: 'fastForward', color: '#FFD700', damage: 0, type: 'utility', cooldown: 10000 }, // 10 segundos
  rewind: { id: 'rewind', color: '#90EE90', damage: 0, type: 'utility', cooldown: 15000 }, // 15 segundos
  ultimate: { id: 'ultimate', color: '#EE82EE', damage: 0, type: 'utility', cooldown: 30000 }, // 30 segundos
};

export const useAbilities = (eventManager: EventManager) => {
  const [abilities, setAbilities] = useState<Abilities>({
    pause: { cooldown: INITIAL_COOLDOWNS.pause.cooldown, lastUsed: 0 },
    fastForward: { cooldown: INITIAL_COOLDOWNS.fastForward.cooldown, lastUsed: 0 },
    rewind: { cooldown: INITIAL_COOLDOWNS.rewind.cooldown, lastUsed: 0 },
    ultimate: { cooldown: INITIAL_COOLDOWNS.ultimate.cooldown, lastUsed: 0 },
  });

  const canUseAbility = useCallback((abilityName: keyof Abilities) => {
    const now = performance.now();
    return now - abilities[abilityName].lastUsed >= abilities[abilityName].cooldown;
  }, [abilities]);

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
    eventManager.emit('player_ability_cooldown_updated', { abilityId: abilityName, cooldownTime: INITIAL_COOLDOWNS[abilityName].cooldown / 1000 });

    return true;
  }, [canUseAbility, eventManager]);

  // Calcular cooldowns restantes para el HUD
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
      eventManager.emit('player_ability_cooldown_updated', currentCooldowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [abilities, getRemainingCooldown, eventManager]);

  return { useAbility, getRemainingCooldown };
};
