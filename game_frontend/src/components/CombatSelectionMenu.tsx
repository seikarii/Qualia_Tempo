import { MenuContainer } from './MenuContainer';

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
    <MenuContainer title="Select Combat">
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
    </MenuContainer>
  );
};
