/**
 * QUALIA.CODE v1.1 - GameplayMechanicsService
 * Service responsible for centralizing all gameplay mechanics calculations.
 * Extracts game mechanics logic from React components for better testability and reusability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IGameplayMechanicsService } from './interfaces/IGameplayMechanicsService';
import type { 
  GameplayMechanicsConfig, 
  TimingWindows, 
  HitResult, 
  ScoreCalculationResult 
} from './contracts/IGameplayMechanicsService.contracts';
import type { NoteData } from '../types/contracts';
import type { ILogger } from './interfaces/ILogger';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class GameplayMechanicsService implements IGameplayMechanicsService {
  private readonly config: GameplayMechanicsConfig;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.GameplayMechanicsConfig) config: GameplayMechanicsConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.info('GameplayMechanicsService initialized', {
      timingWindows: this.config.timingWindows,
      scoring: this.config.scoring
    });
  }

  @logMethod
  @catchError
  calculateNoteAccuracy(currentTime: number, noteTimestamp: number): number {
    const timeDiff = Math.abs(currentTime - noteTimestamp);
    const windows = this.config.timingWindows;

    if (timeDiff <= windows.perfect) {
      return 1.0;
    }
    
    if (timeDiff <= windows.good) {
      return Math.max(0.5, 1.0 - timeDiff / windows.good);
    }
    
    if (timeDiff <= windows.miss) {
      return 0.1; // Very poor timing but not completely missed
    }
    
    return 0.0; // Complete miss
  }

  @logMethod
  @catchError
  calculateScoreForHit(accuracy: number): ScoreCalculationResult {
    const basePoints = this.config.scoring.basePointsPerHit;
    const accuracyBonus = accuracy >= 1.0 ? this.config.scoring.perfectBonus : 0;
    
    return {
      basePoints,
      accuracyBonus,
      comboMultiplier: 1.0, // Will be calculated separately with combo system
      totalPoints: basePoints + accuracyBonus
    };
  }

  @logMethod
  @catchError
  determineHitResult(accuracy: number): HitResult {
    if (accuracy >= 1.0) return 'perfect';
    if (accuracy > 0.0) return 'good';
    return 'miss';
  }

  @logMethod
  getTimingWindows(): TimingWindows {
    return { ...this.config.timingWindows };
  }

  @logMethod
  @catchError
  findNearestNote(notes: NoteData[], currentTime: number): NoteData | null {
    if (!notes || notes.length === 0) {
      return null;
    }

    return notes.reduce((closest, note) => {
      const currentDiff = Math.abs(currentTime - note.timestamp);
      const closestDiff = Math.abs(currentTime - closest.timestamp);
      return currentDiff < closestDiff ? note : closest;
    });
  }

  @logMethod
  @catchError
  calculateComboMultiplier(currentStreak: number): number {
    const thresholds = this.config.scoring.comboThresholds;
    const multipliers = this.config.scoring.comboMultipliers;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (currentStreak >= thresholds[i]) {
        return multipliers[i] || 1.0;
      }
    }
    
    return 1.0; // Base multiplier
  }
}
