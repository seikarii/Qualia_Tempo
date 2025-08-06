import { useState, useEffect } from 'react';
import { EventManager } from '../events/EventManager';
import { GameEvent } from '../events/GameEvents';
import { config } from '../config';

/**
 * A hook for handling rhythmic input.
 * @param isRunning Whether the game is running.
 * @param eventManager The event manager.
 * @returns The current cursor position.
 */
export const useRhythmicInput = (isRunning: boolean, eventManager: EventManager) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [lastBeatTime, setLastBeatTime] = useState(0);
  const [bpm, setBpm] = useState(config.RHYTHMIC_INPUT.BPM); // Default BPM, will be updated by MusicSystem

  useEffect(() => {
    if (!isRunning) return;

    /**
     * Handles the mouse move event.
     * @param e The mouse event.
     */
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    /**
     * Handles the mouse down event.
     */
    const handleMouseDown = () => {
        const currentTime = performance.now();
        // The beatInterval and rhythmicWindow should ideally come from game state or combat data
        // For now, using fixed values or values updated by the MusicSystem's Beat event
        const beatInterval = 60 / bpm * 1000; // in ms
        const timeSinceLastBeat = currentTime - lastBeatTime;

        // Check if the click is within a rhythmic window (e.g., 100ms around the beat)
        // This logic needs to account for wrapping around the beat interval
        const rhythmicWindow = config.RHYTHMIC_INPUT.TOLERANCE; // ms
        const isRhythmicallyCorrect = (
          Math.abs(timeSinceLastBeat) < rhythmicWindow ||
          Math.abs(timeSinceLastBeat - beatInterval) < rhythmicWindow ||
          Math.abs(timeSinceLastBeat + beatInterval) < rhythmicWindow
        );

        if (isRhythmicallyCorrect) {
          eventManager.emit(GameEvent.PlayerDashSuccess, { cursorPosition }); // Pass cursorPosition
        } else {
          eventManager.emit(GameEvent.PlayerDashFail, undefined);
        }
      };

      /**
       * Handles the beat event.
       * @param data The beat event data.
       */
      const handleBeat = (data: { time: number; bpm: number }) => {
          setLastBeatTime(performance.now()); // Update last beat time when a beat event is received
          setBpm(data.bpm); // Update BPM from the music system
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventManager.on(GameEvent.Beat, handleBeat as any);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseDown);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        eventManager.off(GameEvent.Beat, handleBeat);
      };
    });

  return { cursorPosition };
};
