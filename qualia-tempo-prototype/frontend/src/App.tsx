import React from "react";
import { Subtitles } from "./components/Subtitles";
import QualiaTempoGame from "./components/game/QualiaTempoGame";
import { useGameStore } from "./state/useGameStore";
import { useServices } from "./services/hooks";

interface BaseEvent {
  type: string;
  timestamp: Date;
  source?: string;
  metadata?: Record<string, any>;
}

interface PlayerActionEvent extends BaseEvent {
  type: "PlayerAction";
  action: "Dash" | "HitNote" | "MissNote" | "FastForward" | "Rewind" | "StartGame" | "PauseGame" | "ResetGame";
  context?: Record<string, any>;
}

const App: React.FC = () => {
  const [backendConnected, setBackendConnected] = React.useState(true); // Start as true - trust the initialization
  const [isLoading, setIsLoading] = React.useState(false); // No loading since initialization is complete

  const isPlaying = useGameStore((state: any) => state.isPlaying);
  const services = useServices();
  const eventBus = services.eventBus;
  const backendSync = services.backendSync;

  React.useEffect(() => {
    const checkConnection = () => {
      try {
        // Use BackendSyncService to check connection status
        const connected = backendSync.isBackendConnected();
        setBackendConnected(connected);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to check backend connection:", error);
        setBackendConnected(false);
        setIsLoading(false);
      }
    };

    // Check immediately but trust the initial state
    checkConnection();

    // Recheck connection every 10 seconds (less aggressive)
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [backendSync]);

  const handleStartGame = () => {
    if (backendConnected) {
      // Emit PlayerAction event for start game
      eventBus.emit<PlayerActionEvent>({
        type: "PlayerAction",
        action: "StartGame",
        source: "App",
      });
      console.log("🎮 Game Start Requested via EventBus!");
    }
  };

  const handleStopGame = () => {
    // Emit PlayerAction event for pause game
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "PauseGame",
      source: "App",
    });
    console.log("⏸️ Game Pause Requested via EventBus");
  };

  const handleResetGame = () => {
    // Emit PlayerAction event for reset game
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "ResetGame",
      source: "App",
    });
    console.log("🔄 Game Reset Requested via EventBus");
  };

  const handleGameAction = (action: string, data: any) => {
    // Handle actions from QualiaTempoGame
    console.log(`🎮 Game Action: ${action}`, data);
    
    switch (action) {
      case 'hit_note':
        eventBus.emit<PlayerActionEvent>({
          type: "PlayerAction",
          action: "HitNote",
          source: "QualiaTempoGame",
          context: data
        });
        break;
      case 'miss_note':
        eventBus.emit<PlayerActionEvent>({
          type: "PlayerAction", 
          action: "MissNote",
          source: "QualiaTempoGame",
          context: data
        });
        break;
      case 'pause_game':
        handleStopGame();
        break;
      case 'reset_game':
        handleResetGame();
        break;
      default:
        console.warn(`Unknown game action: ${action}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading Qualia Tempo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(119,198,255,0.3),transparent_50%)]" />
      </div>

      {/* Subtitles Component */}
      <Subtitles />

      {/* Game Content Area */}
      <div className="relative z-10 flex items-center justify-center h-screen w-full">
        {!backendConnected ? (
          <div className="text-center p-8 bg-black bg-opacity-70 rounded-lg">
            <h1 className="text-4xl font-bold text-red-400 mb-4">❌ Backend Disconnected</h1>
            <p className="text-white text-lg mb-4">Cannot connect to Qualia Tempo Visual Engine</p>
            <p className="text-gray-300 text-sm mb-4">Make sure the backend is running on http://localhost:8000</p>
            <div className="text-xs text-gray-500">
              <p>EventBus: {eventBus ? "✅" : "❌"}</p>
              <p>BackendSync: {backendSync ? "✅" : "❌"}</p>
            </div>
          </div>
        ) : !isPlaying ? (
          <div className="text-center p-8 bg-black bg-opacity-70 rounded-lg">
            <h1 className="text-6xl font-bold text-white mb-4">🎵 Qualia Tempo</h1>
            <p className="text-xl text-gray-300 mb-8">A Charlie Hellsinger Story</p>
            <div className="space-y-4">
              <button
                onClick={handleStartGame}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-xl font-bold rounded-lg transition-colors"
              >
                🎮 Start The First Duel
              </button>
              <div className="text-sm text-gray-400">✅ Backend Connected | ⚡ Visual Engine Ready</div>
            </div>
          </div>
        ) : (
          <QualiaTempoGame 
            isActive={true}
            onGameAction={handleGameAction}
          />
        )}
      </div>

      {/* Game Instructions */}
      <div className="absolute bottom-4 left-4 text-white text-sm bg-black bg-opacity-50 p-4 rounded-lg">
        <div className="font-bold mb-2">🎮 Controls:</div>
        <div>WASD - Rhythmic Movement</div>
        <div>SPACE - Pause Ability</div>
        <div>ESC - Reset Game</div>
      </div>

      {/* Version Info */}
      <div className="absolute bottom-4 right-4 text-gray-400 text-xs bg-black bg-opacity-50 p-2 rounded">
        <div>Qualia Tempo v1.0 | Prototype Build</div>
        <div>Backend: {backendConnected ? "Connected" : "Disconnected"}</div>
      </div>
    </div>
  );
};

export default App;
