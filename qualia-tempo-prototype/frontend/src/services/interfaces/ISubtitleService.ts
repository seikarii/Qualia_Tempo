/**
 * QUALIA.CODE v1.1 - ISubtitleService Interface
 * Service responsible for determining subtitle display logic.
 * Extracts subtitle logic from Subtitles component for better testability.
 */

import type { LyricData } from '../../types/CombatData.d';

export interface ISubtitleService {
  /**
   * Get the current lyric that should be displayed based on time
   * @param currentTime Current game time in seconds
   * @param lyrics Array of lyric data
   * @returns Current lyric or null if none should be displayed
   */
  getCurrentLyric(currentTime: number, lyrics: LyricData[]): LyricData | null;

  /**
   * Determine if a lyric should be displayed at current time
   * @param lyric Lyric data to check
   * @param currentTime Current game time in seconds
   * @returns True if lyric should be displayed
   */
  shouldDisplayLyric(lyric: LyricData, currentTime: number): boolean;

  /**
   * Calculate subtitle display duration
   * @param lyric Lyric data
   * @returns Display duration in seconds
   */
  getDisplayDuration(lyric: LyricData): number;
}
