import { useEffect } from 'react';
import { EventManager } from '../events/EventManager';
import { QualiaState } from '../types/QualiaState';

export const useDynamicAudio = (eventManager: EventManager, qualia: QualiaState) => {
  useEffect(() => {
    // This hook is now primarily for reacting to QualiaState changes
    // and potentially triggering non-Tone.js audio effects or visualizers.
    // Tone.js related audio is handled in MusicSystem.

    // Example: Log QualiaState changes
    // console.log("QualiaState changed in useDynamicAudio:", qualia);

    // Example: Emit an event for visual effects based on QualiaState
    // eventManager.emit('visual_effect_update', { intensity: qualia.intensity });

  }, [qualia, eventManager]);
};