import React from 'react';

interface EndOfCombatScreenProps {
  isVictory: boolean;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export const EndOfCombatScreen: React.FC<EndOfCombatScreenProps> = ({
  isVictory,
  onRestart,
  onReturnToMenu,
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontSize: '36px',
      zIndex: 3000,
    }}>
      <h1>{isVictory ? 'VICTORY!' : 'DEFEAT!'}</h1>
      <button
        onClick={onRestart}
        style={{
          padding: '15px 30px',
          fontSize: '24px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px',
          marginBottom: '10px',
        }}
      >
        Restart Combat
      </button>
      <button
        onClick={onReturnToMenu}
        style={{
          padding: '15px 30px',
          fontSize: '24px',
          backgroundColor: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Return to Main Menu
      </button>
    </div>
  );
};
