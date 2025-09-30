/**
 * QUALIA.CODE v1.1 - IGameplayMechanicsService Interface
 * Service responsible for centralizing all gameplay mechanics calculations.
 * Extracts game mechanics logic from React components for better testability and reusability.
 */

import type { TimingWindows, HitResult, ScoreCalculationResult } from '../contracts/IGameplayMechanicsService.contracts';
import type { NoteData } from '../../types/contracts';

export interface IGameplayMechanicsService {
  /**
   * Calculate note timing accuracy based on current time and note timestamp
   * @param currentTime Current game time in milliseconds
   * @param noteTimestamp Note timestamp in milliseconds
   * @returns Accuracy value between 0.0 and 1.0
   */
  calculateNoteAccuracy(currentTime: number, noteTimestamp: number): number;

  /**
   * Calculate score for a note hit based on accuracy
   * @param accuracy Accuracy value between 0.0 and 1.0
   * @returns Score calculation result with points and multipliers
   */
  calculateScoreForHit(accuracy: number): ScoreCalculationResult;

  /**
   * Determine hit result category based on accuracy
   * @param accuracy Accuracy value between 0.0 and 1.0
   * @returns Hit result category
   */
  determineHitResult(accuracy: number): HitResult;

  /**
   * Get timing windows configuration for note hitting
   * @returns Timing windows configuration
   */
  getTimingWindows(): TimingWindows;

  /**
   * Find the nearest note to current time for hit detection
   * @param notes Array of note data
   * @param currentTime Current game time in seconds
   * @returns Nearest note or null if no notes available
   */
  findNearestNote(notes: NoteData[], currentTime: number): NoteData | null;

  /**
   * Calculate combo multiplier based on current streak
   * @param currentStreak Current hit streak count
   * @returns Combo multiplier value
   */
  calculateComboMultiplier(currentStreak: number): number;
}
