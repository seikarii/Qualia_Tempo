/**
 * QUALIA.CODE v1.1 - Subtitles Component
 * Displays lyrics using SubtitleService for business logic.
 *
 * ARCHITECTURAL COMPLIANCE:
 * - Business logic extracted to SubtitleService
 * - Component is now a pure presenter
 * - Uses service hooks for dependency injection
 * - Direct configuration injection via useService hook
 */

import React from "react";
import { useGameStore } from "../state/useGameStore";
import { useSubtitleService, useSubtitleConfig } from "../services/hooks";
import type { LyricData } from "../types/CombatData.d";
import type { SubtitleConfig } from "../services/contracts/ISubtitleService.contracts";

interface SubtitlesProps {
  // No additional props needed - all data comes from services
}

/**
 * Subtitle display component for rendering individual lyric text
 */

const SubtitleDisplay: React.FC<{
  lyric: LyricData;
  config: SubtitleConfig;
}> = ({ lyric, config }) => (
  <div
    className="fixed left-0 right-0 flex justify-center z-40"
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
          textAlign: config.styling.textAlign as React.CSSProperties['textAlign'],
          margin: 0,
          lineHeight: 1.5
        }}
      >
        {lyric.text}
      </p>
    </div>
  </div>
);

export const Subtitles: React.FC<SubtitlesProps> = () => {
  const currentTime = useGameStore((state) => state.currentTime);
  const combatData = useGameStore((state) => state.combatData);
  const isPlaying = useGameStore((state) => state.isPlaying);

  // QUALIA.CODE: Business logic delegated to service
  const subtitleService = useSubtitleService();
  
  // QUALIA.CODE: Direct Configuration Injection - get config from container via hook
  const config = useSubtitleConfig();

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

  return <SubtitleDisplay lyric={currentLyric} config={config} />;
};
