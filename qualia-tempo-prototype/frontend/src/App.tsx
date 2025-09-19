import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Subtitles } from "./components/Subtitles";
import QualiaTempoGame from "./components/game/QualiaTempoGame";
import { RhythmVisualizer } from "./components/RhythmVisualizer";
import { useGameStore } from "./state/useGameStore";
import { useService } from "./services/hooks";
import { TYPES } from "./services/inversify.types";
import type { IEventBus } from "./services/interfaces/IEventBus";
import type { ILogger } from "./services/interfaces/ILogger";
import type { IApplicationInitializerService } from "./services/interfaces/IApplicationInitializerService";
import type { PlayerActionEvent, PlayerInputEvent } from "./services/EventBus";
import { shallow } from 'zustand/shallow';

const App: React.FC = () => {
  const { backendConnected, isConfigLoaded, isPlaying, player } = useGameStore(
    (state) => ({
      backendConnected: state.backendConnected,
      isConfigLoaded: state.isConfigLoaded,
      isPlaying: state.isPlaying,
      player: state.player,
    }),
    shallow
  );
  
  // Get services via InversifyJS - MANDATORY QUALIA.CODE PATTERN
  const eventBus = useService<IEventBus>(TYPES.IEventBus);
  const logger = useService<ILogger>(TYPES.ILogger);
  const applicationInitializer = useService<IApplicationInitializerService>(TYPES.IApplicationInitializerService);

  // UI State for dynamic effects
  // const [_buttonHover, setButtonHover] = useState(false); // Future: Add button interaction feedback
  const [titleGlitch, setTitleGlitch] = useState(false);

  // Health-based visual effects
  useEffect(() => {
    const healthVignette = document.getElementById('health-vignette');
    if (healthVignette && player) {
      const healthPercentage = player.health;
      const damageIntensity = (100 - healthPercentage) / 100;
      healthVignette.style.opacity = `${damageIntensity * 0.6}`;
    }
  }, [player]);

  // Periodic title glitch effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setTitleGlitch(true);
      setTimeout(() => setTitleGlitch(false), 200);
    }, 5000 + Math.random() * 10000); // Random glitch every 5-15 seconds

    return () => clearInterval(glitchInterval);
  }, []);

  // CRITICAL: Application Initialization on Mount
  useEffect(() => {
    const initializeApplication = async () => {
      try {
        logger.info('App Component: Starting application initialization');
        await applicationInitializer.start();
        logger.info('App Component: Application initialization completed');
      } catch (error) {
        logger.error('App Component: Application initialization failed', error);
      }
    };

    initializeApplication();
  }, [applicationInitializer, logger]);

  // Keyboard Event Handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      eventBus.emit<PlayerInputEvent>({
        type: 'PlayerInput',
        key: event.key,
        source: 'App',
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [eventBus]);

  const handleStartGame = () => {
    if (backendConnected) {
      // Emit PlayerAction event for start game
      eventBus.emit<PlayerActionEvent>({
        type: "PlayerAction",
        action: "StartGame",
        source: "App",
      });
      logger.info("Game Start Requested via EventBus");
    }
  };

  const handleStopGame = () => {
    // Emit PlayerAction event for pause game
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "PauseGame",
      source: "App",
    });
    logger.info("Game Pause Requested via EventBus");
  };

  const handleResetGame = () => {
    // Emit PlayerAction event for reset game
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "ResetGame",
      source: "App",
    });
    logger.info("Game Reset Requested via EventBus");
  };

  const handleGameAction = (action: string, data: any) => {
    // Handle actions from QualiaTempoGame
    logger.debug(`Game Action: ${action}`, data);
    
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
        logger.warn(`Unknown game action: ${action}`, { action, data });
    }
  };  // Show loading while configuration is being loaded
  if (!isConfigLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="cyber-gradient p-8 rounded-lg border border-cyan-500">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-cyan-400 neon-glow">
              INITIALIZING QUALIA SYSTEM
            </h2>
            <p className="text-cyan-300 mt-2">Loading configuration matrices...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyber Grid Background is now in index.html */}
      
      {/* Dynamic Particle Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(0,255,255,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,0,255,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(255,255,0,0.1),transparent_70%)]" />
      </div>

      {/* Subtitles Component */}
      <Subtitles />

      {/* Game Content Area */}
      <div className="relative z-10 h-screen w-full">
        <AnimatePresence mode="wait">
          {!backendConnected ? (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center p-8 cyber-gradient rounded-lg border border-red-500 max-w-md">
                <motion.h1
                  animate={{ color: ["#ff0000", "#ff6666", "#ff0000"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-4xl font-bold mb-4 font-['Orbitron']"
                >
                  ⚠️ SYSTEM OFFLINE
                </motion.h1>
                <p className="text-red-300 text-lg mb-4">Visual Engine Disconnected</p>
                <p className="text-gray-300 text-sm mb-4">
                  Backend server unreachable at localhost:8000
                </p>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>EventBus: {eventBus ? "✅" : "❌"}</p>
                  <p>Logger: {logger ? "✅" : "❌"}</p>
                  <p>ApplicationInitializer: {applicationInitializer ? "✅" : "❌"}</p>
                </div>
              </div>
            </motion.div>
          ) : !isPlaying ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex"
            >
              {/* Asymmetric Layout - Left Side Title */}
              <div className="flex-1 flex flex-col justify-center pl-16 pr-8">
                <motion.h1
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                  className={`text-cyber-xl font-black text-white font-['Orbitron'] mb-4 ${
                    titleGlitch ? 'glitch-text' : ''
                  }`}
                  style={{
                    background: 'linear-gradient(45deg, #00ffff, #ff00ff, #ffff00)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  QUALIA
                  <br />
                  TEMPO
                </motion.h1>
                
                <motion.p
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-cyber-lg text-cyan-300 mb-2 font-['Orbitron'] font-light"
                >
                  A Charlie Hellsinger Story
                </motion.p>
                
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-sm text-gray-400 mb-8 max-w-md"
                >
                  <p>Enter a synesthetic battlefield where music becomes weapon,</p>
                  <p>rhythm defines reality, and visual chaos rewards precision.</p>
                </motion.div>
              </div>

              {/* Right Side - Interactive Panel */}
              <div className="flex-1 flex flex-col justify-center items-center pr-16">
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-center space-y-8"
                >
                  {/* Main Action Button */}
                  <motion.button
                    onClick={handleStartGame}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="cyber-button relative px-12 py-6 text-xl font-bold text-white rounded-lg overflow-hidden"
                  >
                    <span className="relative z-10">⚔️ START THE FIRST DUEL</span>
                  </motion.button>

                  {/* System Status */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="space-y-2 text-sm"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400">VISUAL ENGINE ONLINE</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span className="text-cyan-400">NEURAL LINK ESTABLISHED</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <span className="text-purple-400">QUALIA MATRIX READY</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <QualiaTempoGame 
                isActive={true}
                onGameAction={handleGameAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QUALIA.CODE v1.1: Rhythm Visualizer - Interactive Game Feature */}
      <RhythmVisualizer />

      {/* Modern Controls Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-4 left-4 cyber-gradient border border-cyan-500 p-4 rounded-lg text-sm max-w-xs"
      >
        <div className="font-bold mb-2 text-cyan-400 font-['Orbitron']">⌨️ NEURAL INTERFACE:</div>
        <div className="space-y-1 text-gray-300">
          <div><span className="text-cyan-400">WASD</span> - Rhythmic Movement</div>
          <div><span className="text-purple-400">SPACE</span> - Temporal Pause</div>
          <div><span className="text-yellow-400">ESC</span> - Reality Reset</div>
        </div>
      </motion.div>

      {/* System Status Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 }}
        className="absolute bottom-4 right-4 cyber-gradient border border-cyan-500 p-3 rounded-lg text-xs"
      >
        <div className="font-['Orbitron'] font-bold text-cyan-400 mb-1">SYSTEM STATUS</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
            <span className="text-gray-300">Visual Engine: {backendConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="text-gray-400">Qualia Tempo v1.0 | Prototype Build</div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;
