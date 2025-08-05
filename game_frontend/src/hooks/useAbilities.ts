import { useState, useCallback } from 'react';
import { EventManager } from '../events/EventManager';

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

const INITIAL_COOLDOWNS = {
  pause: 5000, // 5 segundos
  fastForward: 10000, // 10 segundos
  rewind: 15000, // 15 segundos
  ultimate: 30000, // 30 segundos
};

export const useAbilities = (eventManager: EventManager) => {
  const [abilities, setAbilities] = useState<Abilities>({
    pause: { cooldown: INITIAL_COOLDOWNS.pause, lastUsed: 0 },
    fastForward: { cooldown: INITIAL_COOLDOWNS.fastForward, lastUsed: 0 },
    rewind: { cooldown: INITIAL_COOLDOWNS.rewind, lastUsed: 0 },
    ultimate: { cooldown: INITIAL_COOLDOWNS.ultimate, lastUsed: 0 },
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
        eventManager.emit('player_ability_pause', {});
        console.log('Ability: Pause activated!');
        break;
      case 'fastForward':
        eventManager.emit('player_ability_fast_forward', {});
        console.log('Ability: Fast Forward activated!');
        break;
      case 'rewind':
        eventManager.emit('player_ability_rewind', {});
        console.log('Ability: Rewind activated!');
        break;
      case 'ultimate':
        eventManager.emit('player_ability_ultimate', {});
        console.log('Ability: Ultimate activated!');
        break;
    }
    return true;
  }, [canUseAbility, eventManager]);

  // Calcular cooldowns restantes para el HUD
  const getRemainingCooldown = useCallback((abilityName: keyof Abilities) => {
    const now = performance.now();
    const elapsed = now - abilities[abilityName].lastUsed;
    const remaining = Math.max(0, abilities[abilityName].cooldown - elapsed);
    return Math.ceil(remaining / 1000); // En segundos
  }, [abilities]);

  return { useAbility, getRemainingCooldown };
};
