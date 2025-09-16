import React from "react";
import { useGameStore } from "../state/useGameStore";
import { LyricData } from "../types/CombatData.d";

interface SubtitlesProps {
  className?: string;
}

export const Subtitles: React.FC<SubtitlesProps> = ({ className = "" }) => {
  const currentTime = useGameStore((state) => state.currentTime);
  const combatData = useGameStore((state) => state.combatData);
  const isPlaying = useGameStore((state) => state.isPlaying);

  const getCurrentLyric = (): LyricData | null => {
    if (!combatData || !isPlaying) return null;

    // Find the most recent lyric that should be displayed
    let currentLyric: LyricData | null = null;
    for (const lyric of combatData.lyrics) {
      if (lyric.timestamp <= currentTime) {
        currentLyric = lyric;
      } else {
        break; // Lyrics should be in chronological order
      }
    }

    // Only show lyric if it's within 3 seconds of its timestamp
    if (currentLyric && currentTime - currentLyric.timestamp <= 3.0) {
      return currentLyric;
    }

    return null;
  };

  const currentLyric = getCurrentLyric();

  if (!currentLyric) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-0 right-0 flex justify-center z-40 ${className}`}
    >
      <div className="bg-black bg-opacity-80 rounded-lg px-8 py-4 max-w-4xl">
        <p className="text-white text-2xl font-bold text-center leading-relaxed">
          {currentLyric.text}
        </p>
      </div>
    </div>
  );
};
