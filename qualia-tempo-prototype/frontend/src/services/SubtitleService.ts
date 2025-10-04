/**
 * QUALIA.CODE v1.1 - SubtitleService
 * Service responsible for determining subtitle display logic.
 * Extracts subtitle logic from Subtitles component for better testability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { ISubtitleService } from './interfaces/ISubtitleService';
import type { SubtitleConfig } from './contracts/ISubtitleService.contracts';
import type { LyricData } from '../types/CombatData.d';
import type { ILogger } from './interfaces/ILogger';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class SubtitleService implements ISubtitleService {
  private readonly config: SubtitleConfig;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.SubtitleConfig) config: SubtitleConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.info('SubtitleService initialized', {
      displayDuration: this.config.displayDuration,
      maxLines: this.config.maxLines
    });
  }

  @logMethod
  @catchError
  getCurrentLyric(currentTime: number, lyrics: LyricData[]): LyricData | null {
    if (!lyrics || lyrics.length === 0) {
      return null;
    }

    // Find the most recent lyric that should be displayed
    let currentLyric: LyricData | null = null;
    
    for (const lyric of lyrics) {
      if (lyric.timestamp <= currentTime) {
        currentLyric = lyric;
      } else {
        break; // Lyrics should be in chronological order
      }
    }

    // Check if the lyric should still be displayed
    if (currentLyric && this.shouldDisplayLyric(currentLyric, currentTime)) {
      return currentLyric;
    }

    return null;
  }

  @logMethod
  @catchError
  shouldDisplayLyric(lyric: LyricData, currentTime: number): boolean {
    const timeSinceStart = currentTime - lyric.timestamp;
    const displayDuration = this.getDisplayDuration(lyric);
    
    return timeSinceStart >= 0 && timeSinceStart <= displayDuration;
  }

  @logMethod
  @catchError
  getDisplayDuration(lyric: LyricData): number {
    // Use configured display duration as base, but could be extended
    // based on lyric length or other factors in the future
    const baseDisplay = this.config.displayDuration;
    
    // Optional: Extend display time for longer lyrics
    const wordCount = lyric.text.split(' ').length;
    const readingTimeBonus = Math.max(0, (wordCount - 5) * 0.2); // 0.2s per word over 5 words
    
    return baseDisplay + readingTimeBonus;
  }
}
