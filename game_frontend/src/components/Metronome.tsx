import React, { useState, useEffect } from 'react';
import { EventManager } from '../events/EventManager';
import { GameEvent } from '../events/GameEvents';

interface MetronomeProps {
  eventManager: EventManager;
}

export const Metronome: React.FC<MetronomeProps> = ({ eventManager }) => {
  const [isBeat, setIsBeat] = useState<boolean>(false);

  useEffect(() => {
    const handleBeat = () => {
      setIsBeat(true);
      setTimeout(() => setIsBeat(false), 100); // Reset beat indicator after a short delay
    };

    eventManager.on(GameEvent.Beat, handleBeat);

    return () => {
      eventManager.off(GameEvent.Beat, handleBeat);
    };
  }, [eventManager]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      color: isBeat ? 'red' : 'white',
      fontSize: '24px',
      zIndex: 1000,
      transition: 'color 0.1s ease-in-out',
    }}>
      Metronome
    </div>
  );
};