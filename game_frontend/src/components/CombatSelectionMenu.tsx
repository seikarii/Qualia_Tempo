import React from 'react';

interface CombatSelectionMenuProps {
  onCombatSelected: (combatId: string) => void;
}

export const CombatSelectionMenu: React.FC<CombatSelectionMenuProps> = ({ onCombatSelected }) => {
  // Dummy combat data for now
  const availableCombats = [
    { id: 'Boss1', name: 'The Conductor' },
    { id: 'Boss2', name: 'The Virtuoso' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontSize: '24px',
      zIndex: 2000,
    }}>
      <h1>Select Combat</h1>
      {
        availableCombats.map((combat) => (
          <button
            key={combat.id}
            onClick={() => onCombatSelected(combat.id)}
            style={{
              padding: '10px 20px',
              fontSize: '20px',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '10px',
            }}
          >
            {combat.name}
          </button>
        ))
      }
    </div>
  );
};
