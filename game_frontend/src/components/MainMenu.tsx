import { MenuContainer } from './MenuContainer';

interface MainMenuProps {
  onStartGame: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  return (
    <MenuContainer title="Qualia Tempo">
      <button
        onClick={onStartGame}
        style={{
          padding: '15px 30px',
          fontSize: '24px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginTop: '20px',
        }}
      >
        Start Game
      </button>
      {/* Add other menu options here */}
    </MenuContainer>
  );
};
