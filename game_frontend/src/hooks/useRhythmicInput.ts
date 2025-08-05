import { useState, useEffect, useCallback } from 'react';
import { EventManager } from '../events/EventManager';
import { GameEvent } from '../events/GameEvents';

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
      const rhythmicWindow = 100; // ms
      const isRhythmicallyCorrect = (
        Math.abs(timeSinceLastBeat % beatInterval) < rhythmicWindow ||
        Math.abs(beatInterval - (timeSinceLastBeat % beatInterval)) < rhythmicWindow
      );

      if (isRhythmicallyCorrect) {
        eventManager.emit(GameEvent.PlayerDashSuccess, { cursorPosition }); // Pass cursorPosition
      } else {
        eventManager.emit(GameEvent.PlayerDashFail, {});
      }
      // setLastBeatTime(currentTime); // No longer needed, as we listen to Beat event
    };

    const handleMouseDown = () => {
        const currentTime = performance.now();
        // The beatInterval and rhythmicWindow should ideally come from game state or combat data
        // For now, using fixed values or values updated by the MusicSystem's Beat event
        const beatInterval = 60 / bpm * 1000; // in ms
        const timeSinceLastBeat = currentTime - lastBeatTime;

        // Check if the click is within a rhythmic window (e.g., 100ms around the beat)
        // This logic needs to account for wrapping around the beat interval
        const rhythmicWindow = 100; // ms
        const isRhythmicallyCorrect = (
          Math.abs(timeSinceLastBeat) < rhythmicWindow ||
          Math.abs(timeSinceLastBeat - beatInterval) < rhythmicWindow ||
          Math.abs(timeSinceLastBeat + beatInterval) < rhythmicWindow
        );

        if (isRhythmicallyCorrect) {
          eventManager.emit(GameEvent.PlayerDashSuccess, { cursorPosition }); // Pass cursorPosition
        } else {
          eventManager.emit(GameEvent.PlayerDashFail, {});
        }
      };

      const handleBeat = (data: { time: number; bpm: number }) => {
          setLastBeatTime(performance.now()); // Update last beat time when a beat event is received
          setBpm(data.bpm); // Update BPM from the music system
      };

      eventManager.on(GameEvent.Beat, handleBeat);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseDown);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        eventManager.off(GameEvent.Beat, handleBeat);
      };
    }, [isRunning, lastBeatTime, bpm, eventManager, cursorPosition]);

  return { cursorPosition };
};
