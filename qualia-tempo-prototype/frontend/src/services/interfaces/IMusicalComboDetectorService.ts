/**
 * IMusicalComboDetectorService
 * Musical key sequence detection (Phase 4)
 * 
 * PURPOSE: Detect musical combo patterns from player input (Q-E-R-T-F-G-C)
 * STATUS: 🔮 FUTURE (v2 - RUTA.md Phase 4)
 * IMPLEMENTATION: Pending Phase 4
 */

export interface MusicalSequence {
  keys: string[];
  timestamp: number;
  isValid: boolean;
  harmonicScore?: number;
}

export interface IMusicalComboDetectorService {
  /**
   * Initialize combo detector
   */
  initialize(): void;

  /**
   * Record a key press in the sequence
   * @param key - Musical key (q, e, r, t, f, g, c)
   */
  recordKeyPress(key: string): void;

  /**
   * Get current active sequence
   */
  getCurrentSequence(): MusicalSequence | null;

  /**
   * Check if a sequence is a valid combo
   */
  isValidCombo(sequence: string[]): boolean;

  /**
   * Clear current sequence
   */
  clearSequence(): void;

  /**
   * Get cooldown remaining (ms)
   */
  getCooldownRemaining(): number;

  /**
   * Update detector configuration
   */
  updateConfig(config: Partial<Record<string, unknown>>): void;

  /**
   * Cleanup service resources
   */
  cleanup(): void;
}
