import React from "react";
import {
  useGameStore,
  useQualiaState,
  useGameStats,
} from "../state/useGameStore";
import { useConfiguration } from "../services/hooks";

interface HUDProps {
  className?: string;
}

export const HUD: React.FC<HUDProps> = ({ className = "" }) => {
  const player = useGameStore((state) => state.player);
  const isPlaying = useGameStore((state) => state.isPlaying);
  const currentTime = useGameStore((state) => state.currentTime);
  const qualiaState = useQualiaState();
  const stats = useGameStats();
  const configService = useConfiguration();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 ${className}`}>
      {/* Game Status Bar */}
      <div className="flex justify-between items-center bg-black bg-opacity-70 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-6">
          {/* Player Stats */}
          <div className="text-white">
            <div className="text-2xl font-bold">Combo: {player.combo}</div>
            <div className="text-sm">
              Score: {player.score.toLocaleString()}
            </div>
          </div>

          {/* Accuracy */}
          <div className="text-white">
            <div className="text-lg">
              Accuracy: {stats.accuracy.toFixed(1)}%
            </div>
            <div className="text-sm">
              Streak: {stats.currentStreak} (Best: {stats.maxStreak})
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Game Time */}
          <div className="text-white text-lg">{formatTime(currentTime)}</div>

          {/* Game Status */}
          <div
            className={`px-3 py-1 rounded ${isPlaying ? "bg-green-600" : "bg-red-600"} text-white`}
          >
            {isPlaying ? "PLAYING" : "PAUSED"}
          </div>
        </div>
      </div>

      {/* Qualia State Visualization */}
      {configService.isLoaded() && (
        <div className="bg-black bg-opacity-70 rounded-lg p-4">
          <h3 className="text-white text-lg font-bold mb-3">
            🧠 Qualia State (Debug)
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <QualiaBar
              label="Intensity"
              value={qualiaState.intensity}
              color="purple"
            />
            <QualiaBar
              label="Precision"
              value={qualiaState.focus_level}
              color="blue"
            />
            <QualiaBar label="Flow" value={qualiaState.flow} color="cyan" />
            <QualiaBar
              label="Aggression"
              value={qualiaState.aggression}
              color="red"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <QualiaBar label="Chaos" value={qualiaState.chaos} color="orange" />
            <QualiaBar
              label="Recovery"
              value={qualiaState.recovery}
              color="green"
            />
            <QualiaBar
              label="Transcendence"
              value={qualiaState.transcendence}
              color="gold"
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface QualiaBarProps {
  label: string;
  value: number;
  color: string;
}

const QualiaBar: React.FC<QualiaBarProps> = ({ label, value, color }) => {
  const percentage = Math.round(value * 100);

  const colorClasses = {
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    green: "bg-green-500",
    gold: "bg-yellow-500",
  };

  return (
    <div className="text-white">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-200 ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
