import type { AbilitiesData } from '../types/Abilities';
import { config } from '../config';

/**
 * Data for all abilities in the game.
 */
export const abilitiesData: AbilitiesData = {
    pause: { id: 'pause', color: config.COLORS.LIGHT_BLUE, damage: 0, type: 'utility', cooldown: config.ABILITIES.PAUSE_COOLDOWN },
    fastForward: { id: 'fastForward', color: config.COLORS.GOLD, damage: 0, type: 'utility', cooldown: config.ABILITIES.FAST_FORWARD_COOLDOWN },
    rewind: { id: 'rewind', color: config.COLORS.LIGHT_GREEN, damage: 0, type: 'utility', cooldown: config.ABILITIES.REWIND_COOLDOWN },
    ultimate: { id: 'ultimate', color: config.COLORS.VIOLET, damage: 0, type: 'utility', cooldown: config.ABILITIES.ULTIMATE_COOLDOWN },
};
