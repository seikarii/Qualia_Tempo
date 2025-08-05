import React from 'react';

export const Metronome: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'white',
      fontSize: '24px',
      zIndex: 1000,
    }}>
      {/* Metronome visualization will go here */}
      Metronome
    </div>
  );
};