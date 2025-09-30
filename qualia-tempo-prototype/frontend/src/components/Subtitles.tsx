/**
 * QUALIA.CODE v1.1 - Subtitles Component
 * Displays lyrics using SubtitleService for business logic.
 * 
 * ARCHITECTURAL COMPLIANCE:
 * - Business logic extracted to SubtitleService
 * - Component is now a pure presenter
 * - Uses service hooks for dependency injection
 */

import React from "react";
import { useGameStore } from "../state/useGameStore";
import { useSubtitleService } from "../services/hooks";
import type { LyricData } from "../types/CombatData.d";

interface SubtitlesProps {
  className?: string;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ className = "" }) => {
  const currentTime = useGameStore((state) => state.currentTime);
  const combatData = useGameStore((state) => state.combatData);
  const isPlaying = useGameStore((state) => state.isPlaying);
  
  // QUALIA.CODE: Business logic delegated to service
  const subtitleService = useSubtitleService();

  // Early return if no data or not playing
  if (!combatData || !isPlaying || !combatData.lyrics) {
    return null;
  }

  // QUALIA.CODE: Logic moved to SubtitleService
  const currentLyric: LyricData | null = subtitleService.getCurrentLyric(
    currentTime, 
    combatData.lyrics
  );

  if (!currentLyric) {
    return null;
  }

  // Get styling configuration from service
  const config = subtitleService.getConfig();

  return (
    <div
      className={`fixed left-0 right-0 flex justify-center z-40 ${className}`}
      style={{ bottom: `${config.positioning.bottom}px` }}
    >
      <div 
        style={{
          backgroundColor: config.styling.backgroundColor,
          borderRadius: config.styling.borderRadius,
          padding: config.styling.padding,
          maxWidth: config.positioning.maxWidth
        }}
      >
        <p 
          style={{
            color: config.styling.color,
            fontSize: config.styling.fontSize,
            fontWeight: config.styling.fontWeight,
            textAlign: config.styling.textAlign as any,
            margin: 0,
            lineHeight: 1.5
          }}
        >
          {currentLyric.text}
        </p>
      </div>
    </div>
  );
};
