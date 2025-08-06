import type { AbilitiesData } from '../types/Abilities';
import { config } from '../config';

/**
 * Data for all abilities in the game.
 */
export const abilitiesData: AbilitiesData = {
    pause: { id: 'pause', color: config.COLORS.LIGHT_BLUE, damage: 0, type: 'utility' },
    fastForward: { id: 'fastForward', color: config.COLORS.GOLD, damage: 0, type: 'utility' },
    rewind: { id: 'rewind', color: config.COLORS.LIGHT_GREEN, damage: 0, type: 'utility' },
    ultimate: { id: 'ultimate', color: config.COLORS.VIOLET, damage: 0, type: 'utility' },
};
