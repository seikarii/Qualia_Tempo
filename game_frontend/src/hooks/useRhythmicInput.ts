import { useState, useEffect } from 'react';
import { EventManager } from '../events/EventManager';

export const useRhythmicInput = (isRunning: boolean, eventManager: EventManager) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [lastBeatTime, setLastBeatTime] = useState(0);
  const [bpm, setBpm] = useState(120); // Default BPM, will be updated by MusicSystem

  useEffect(() => {
    if (!isRunning) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => {
      const currentTime = performance.now();
      const beatInterval = 60 / bpm * 1000; // in ms
      const timeSinceLastBeat = currentTime - lastBeatTime;

      // Check if the click is within a rhythmic window (e.g., 100ms around the beat)
      if (Math.abs(timeSinceLastBeat % beatInterval) < 100 || Math.abs(beatInterval - (timeSinceLastBeat % beatInterval)) < 100) {
        eventManager.emit('player_dash_success', { cursorPosition }); // Pass cursorPosition
      } else {
        eventManager.emit('player_dash_fail', {});
      }
      setLastBeatTime(currentTime); // Update last beat time for next calculation
    };

    // Listen for BPM updates from MusicSystem
    eventManager.on('music_tempo_update', (data: { intensity: number; combo: number }) => {
      // Assuming music_tempo_update provides the current BPM or a factor to calculate it
      // For now, let's just use a placeholder for BPM update logic
      setBpm(120 * (1 + data.intensity * 0.5)); // Example: BPM scales with intensity
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      eventManager.off('music_tempo_update', () => {}); // Clean up event listener
    };
  }, [isRunning, lastBeatTime, bpm, eventManager, cursorPosition]); // Add cursorPosition to dependencies

  return { cursorPosition };
};
