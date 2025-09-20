import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Subtitles } from "./components/Subtitles";
import { Atmosphere } from './components/Atmosphere';
import BackendCanvas from './components/BackendCanvas';
import QualiaTempoGame from "./components/game/QualiaTempoGame";
import QualiaTempoHUD from "./components/game/QualiaTempoHUD";
// import { RhythmVisualizer } from "./components/RhythmVisualizer"; // Temporarily disabled to fix viewport
import { useGameStore } from "./state/useGameStore";
import { useService } from "./services/hooks";
import { TYPES } from "./services/inversify.types";
import type { IEventBus } from "./services/interfaces/IEventBus";
import type { ILogger } from "./services/interfaces/ILogger";
import type { IApplicationInitializerService } from "./services/interfaces/IApplicationInitializerService";
import type { IStreamingVideoService } from "./services/interfaces/IStreamingVideoService";
import type { PlayerActionEvent, PlayerInputEvent } from "./services/EventBus";
import { shallow } from 'zustand/shallow';

// Enhanced loading component
const QualiaLoader: React.FC = () => {
  const [loadingText, setLoadingText] = useState("INITIALIZING");
  const texts = ["INITIALIZING", "SYNCHRONIZING", "CALIBRATING", "READY"];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingText(prev => {
        const currentIndex = texts.indexOf(prev);
        return texts[(currentIndex + 1) % texts.length];
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle at 50% 50%, rgba(255,0,255,0.05) 0%, transparent 70%)
            `,
            backgroundSize: '60px 60px, 60px 60px, 100% 100%',
            animation: 'gridPulse 4s ease-in-out infinite',
          }}
        />
      </div>

      {/* Central loading interface */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10"
      >
        <div className="cyber-gradient p-12 rounded-2xl border-2 border-cyan-500 backdrop-blur-sm">
          {/* Rotating orb */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 mx-auto mb-8 relative"
          >
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent" />
            <div className="absolute inset-2 rounded-full border-2 border-purple-500 border-r-transparent" 
                 style={{ animation: 'spin 2s linear infinite reverse' }} />
            <div className="absolute inset-4 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 opacity-60" 
                 style={{ animation: 'pulse 2s ease-in-out infinite' }} />
          </motion.div>

          {/* Loading text with glitch effect */}
          <motion.h2
            key={loadingText}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-cyan-400 neon-glow text-center font-['Orbitron'] mb-4"
          >
            {loadingText} QUALIA SYSTEM
          </motion.h2>

          {/* Progress bar */}
          <div className="w-80 h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
              animate={{ width: ["0%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <p className="text-cyan-300 text-center">Neural pathways synchronizing...</p>
        </div>
      </motion.div>

      <style>{`
        @keyframes gridPulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; }
          50% { transform: scale(1.05) rotate(1deg); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const { backendConnected, isConfigLoaded, isPlaying, player, qualiaState } = useGameStore(
    (state) => ({
      backendConnected: state.backendConnected,
      isConfigLoaded: state.isConfigLoaded,
      isPlaying: state.isPlaying,
      player: state.player,
      qualiaState: state.qualiaState,
    }),
    shallow
  );
  
  // Get services via InversifyJS
  const eventBus = useService<IEventBus>(TYPES.IEventBus);
  const logger = useService<ILogger>(TYPES.ILogger);
  const applicationInitializer = useService<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
  const streamingService = useService<IStreamingVideoService>(TYPES.IStreamingVideoService);

  // Enhanced UI state
  const [titleGlitch, setTitleGlitch] = useState(false);
  const [audioVisualization, setAudioVisualization] = useState<number[]>([]);
  const [connectionStatus, setConnectionStatus] = useState(streamingService.getConnectionStatus());
  const controls = useAnimation();

  // Health-based visual effects with enhanced vignette
  useEffect(() => {
    const healthVignette = document.getElementById('health-vignette');
    if (healthVignette && player) {
      const healthPercentage = player.health;
      const damageIntensity = (100 - healthPercentage) / 100;
      const pulseIntensity = damageIntensity > 0.5 ? 'animate-pulse' : '';
      
      healthVignette.style.opacity = `${damageIntensity * 0.8}`;
      healthVignette.className = `health-vignette ${pulseIntensity}`;
      
      // Add screen shake on low health
      if (damageIntensity > 0.7) {
        document.body.style.animation = 'screenShake 0.1s infinite';
      } else {
        document.body.style.animation = '';
      }
    }
  }, [player]);

  // Enhanced glitch effect with more variety
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setTitleGlitch(true);
      setTimeout(() => setTitleGlitch(false), 300);
    }, 3000 + Math.random() * 7000);

    return () => clearInterval(glitchInterval);
  }, []);

  // Audio visualization mock (would connect to real audio analysis)
  useEffect(() => {
    const interval = setInterval(() => {
      setAudioVisualization(
        Array.from({ length: 16 }, () => Math.random() * 100)
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Application initialization
  useEffect(() => {
    const initializeApplication = async () => {
      try {
        logger.info('App Component: Starting application initialization');
        await applicationInitializer.start();
        logger.info('App Component: Application initialization completed');
        controls.start({ opacity: 1, scale: 1 });
      } catch (error) {
        logger.error('App Component: Application initialization failed', error);
      }
    };

    initializeApplication();
  }, [applicationInitializer, logger, controls]);

  // Keyboard handling with enhanced feedback
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      eventBus.emit<PlayerInputEvent>({
        type: 'PlayerInput',
        key: event.key,
        source: 'App',
      });

      // Visual feedback for keypresses
      if (['q', 'w', 'e', 'r', 't'].includes(event.key.toLowerCase())) {
        const flashElement = document.createElement('div');
        flashElement.className = 'fixed inset-0 bg-cyan-400 opacity-20 pointer-events-none z-50';
        document.body.appendChild(flashElement);
        setTimeout(() => document.body.removeChild(flashElement), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eventBus]);

  // Update connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus(streamingService.getConnectionStatus());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [streamingService]);

  const handleStartGame = () => {
    if (backendConnected) {
      eventBus.emit<PlayerActionEvent>({
        type: "PlayerAction",
        action: "StartGame",
        source: "App",
      });
      logger.info("Game Start Requested via EventBus");
    }
  };

  const handleStopGame = () => {
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "PauseGame",
      source: "App",
    });
    logger.info("Game Pause Requested via EventBus");
  };

  const handleResetGame = () => {
    eventBus.emit<PlayerActionEvent>({
      type: "PlayerAction",
      action: "ResetGame",
      source: "App",
    });
    logger.info("Game Reset Requested via EventBus");
  };

  const handleGameAction = (action: string, data: any) => {
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
  };

  if (!isConfigLoaded) {
    return <QualiaLoader />;
  }

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      <Atmosphere />
      {/* Loading indicator when not connected */}
      {!connectionStatus.connected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-cyan-400 text-center">
            <div className="mb-2">🎨 Connecting to Qualia Engine...</div>
            <div className="text-sm opacity-75">
              {connectionStatus.state === 'CONNECTING' ? 'Establishing connection...' : 
               connectionStatus.state === 'ERROR' ? 'Connection failed, retrying...' : 
               'Initializing...'}
            </div>
          </div>
        </div>
      )}
      
      {/* QUALIA.CODE v1.1: GPU-accelerated backend rendering replaces DOM simulation */}
      <BackendCanvas 
        className="fixed inset-0 z-10 mix-blend-screen"
        showStatus={false} // Set to true for debugging
      />
      
      {/* Enhanced audio visualization bars - now integrated */}
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-10 mix-blend-screen">
        <div className="flex space-x-1">
          {audioVisualization.map((height, index) => (
            <motion.div
              key={index}
              className="w-2 bg-gradient-to-t from-cyan-400 via-purple-400 to-pink-400 rounded-full opacity-80"
              style={{ 
                height: `${height}px`,
                filter: `blur(0.5px) drop-shadow(0 0 ${height / 10}px currentColor)`
              }}
              animate={{ 
                height: `${height}px`,
                opacity: [0.6, 1, 0.7]
              }}
              transition={{ 
                height: { duration: 0.1 },
                opacity: { duration: 0.3, repeat: Infinity }
              }}
            />
          ))}
        </div>
      </div>

      <Subtitles />

      {/* Main content area */}
      <div className="relative z-10 h-screen w-full">
        <AnimatePresence mode="wait">
          {!backendConnected ? (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center p-12 cyber-gradient rounded-2xl border-2 border-red-500 max-w-2xl backdrop-blur-sm">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 20px rgba(255,0,0,0.5)',
                      '0 0 40px rgba(255,0,0,0.8)',
                      '0 0 20px rgba(255,0,0,0.5)'
                    ] 
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6"
                >
                  <h1 className="text-5xl font-bold mb-4 font-['Orbitron'] text-red-400">
                    ⚠️ NEURAL LINK SEVERED
                  </h1>
                </motion.div>
                
                <div className="text-red-300 text-xl mb-6">Visual Cortex Disconnected</div>
                <div className="text-gray-300 mb-6">
                  Backend quantum processor unreachable at localhost:8000
                </div>
                
                {/* System diagnostics with enhanced styling */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="cyber-gradient border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-400">EventBus</div>
                    <div className="text-lg">{eventBus ? "✅" : "❌"}</div>
                  </div>
                  <div className="cyber-gradient border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-400">Logger</div>
                    <div className="text-lg">{logger ? "✅" : "❌"}</div>
                  </div>
                  <div className="cyber-gradient border border-gray-600 p-3 rounded-lg">
                    <div className="text-gray-400">Init Service</div>
                    <div className="text-lg">{applicationInitializer ? "✅" : "❌"}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !isPlaying ? (
            <motion.div
              key="menu-container"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Left side - Enhanced title */}
                            {/* Centered main menu */}
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 80 }}
                  className="relative"
                >
                  {/* Glowing background for title */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-20 blur-3xl transform scale-110"
                    style={{ animation: 'colorShift 6s ease-in-out infinite' }}
                  />
                  
                  <h1
                    className={`relative text-6xl xl:text-7xl 2xl:text-8xl font-black font-['Orbitron'] mb-4 leading-tight ${
                      titleGlitch ? 'glitch-text-enhanced' : ''
                    }`}
                    style={{
                      background: 'linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      backgroundSize: '200% 200%',
                      animation: 'gradientShift 4s ease infinite',
                    }}
                  >
                    QUALIA
                    <br />
                    TEMPO
                  </h1>
                </motion.div>
                
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl xl:text-3xl text-cyan-300 mb-6 font-['Orbitron'] font-light"
                  style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}
                >
                  A Charlie Hellsinger Story
                </motion.p>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed"
                >
                  <p className="mb-2">Enter a synesthetic battlefield where <span className="text-cyan-400">music becomes weapon</span>,</p>
                  <p className="mb-2"><span className="text-purple-400">rhythm defines reality</span>, and <span className="text-pink-400">visual chaos rewards precision</span>.</p>
                  <p className="text-yellow-400">Experience the fusion of sound and light in perfect harmony.</p>
                </motion.div>

                {/* Enhanced main button */}
                <motion.button
                  onClick={handleStartGame}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="cyber-button-enhanced relative px-16 py-8 text-2xl font-bold text-white rounded-xl overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000" />
                  <span className="relative z-10 flex items-center justify-center space-x-3">
                    <span>⚡</span>
                    <span>INITIATE NEURAL SYNC</span>
                    <span>🎵</span>
                  </span>
                </motion.button>

                {/* Enhanced system status */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 }}
                  className="space-y-4 mt-8"
                >
                  {[
                    { label: "VISUAL ENGINE", color: "green", icon: "🔥" },
                    { label: "NEURAL LINK", color: "cyan", icon: "🧠" },
                    { label: "QUALIA MATRIX", color: "purple", icon: "✨" },
                    { label: "AUDIO CORTEX", color: "pink", icon: "🎶" }
                  ].map((system, index) => (
                    <motion.div
                      key={system.label}
                      className="flex items-center justify-center space-x-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + index * 0.1 }}
                    >
                      <motion.div 
                        className={`w-3 h-3 bg-${system.color}-400 rounded-full`}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                      />
                      <span className="text-lg">{system.icon}</span>
                      <span className={`text-${system.color}-400 text-lg font-['Orbitron']`}>
                        {system.label} ONLINE
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Right side - Enhanced interactive panel */}
              <div className="flex-1 flex flex-col justify-center items-center pr-20 min-w-0">
                <motion.div
                  initial={{ x: 200, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-center space-y-10"
                >
                  {/* Enhanced main button */}
                  <motion.button
                    onClick={handleStartGame}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="cyber-button-enhanced relative px-16 py-8 text-2xl font-bold text-white rounded-xl overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000" />
                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      <span>⚡</span>
                      <span>INITIATE NEURAL SYNC</span>
                      <span>🎵</span>
                    </span>
                  </motion.button>

                  {/* Enhanced system status */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="space-y-4"
                  >
                    {[
                      { label: "VISUAL ENGINE", color: "green", icon: "🔥" },
                      { label: "NEURAL LINK", color: "cyan", icon: "🧠" },
                      { label: "QUALIA MATRIX", color: "purple", icon: "✨" },
                      { label: "AUDIO CORTEX", color: "pink", icon: "🎶" }
                    ].map((system, index) => (
                      <motion.div
                        key={system.label}
                        className="flex items-center justify-center space-x-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.3 + index * 0.1 }}
                      >
                        <motion.div 
                          className={`w-3 h-3 bg-${system.color}-400 rounded-full`}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                        />
                        <span className="text-lg">{system.icon}</span>
                        <span className={`text-${system.color}-400 text-lg font-['Orbitron']`}>
                          {system.label} ONLINE
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              className="absolute inset-0 z-10"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
            >
              <QualiaTempoGame 
                isActive={true}
                onGameAction={handleGameAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RhythmVisualizer temporarily disabled to fix viewport overflow */}
      {/* <RhythmVisualizer /> */}

      {/* Enhanced HUD - ALWAYS VISIBLE FOR DEMONSTRATION */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <QualiaTempoHUD
            qualiaState={qualiaState}
            playerHealth={player.health}
            score={player.score}
            music_data={{ bpm: 120 }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Enhanced control panels */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 left-6 cyber-gradient border-2 border-cyan-500 p-6 rounded-xl text-sm max-w-sm backdrop-blur-sm"
      >
        <div className="font-bold mb-3 text-cyan-400 font-['Orbitron'] text-lg flex items-center space-x-2">
          <span>⌨️</span>
          <span>NEURAL INTERFACE</span>
        </div>
        <div className="space-y-2 text-gray-300">
          <div className="flex justify-between"><span className="text-cyan-400 font-mono">QWERT</span><span>Sound Synthesis</span></div>
          <div className="flex justify-between"><span className="text-purple-400 font-mono">SPACE</span><span>Temporal Dash</span></div>
          <div className="flex justify-between"><span className="text-pink-400 font-mono">CTRL</span><span>Ultimate Sync</span></div>
          <div className="flex justify-between"><span className="text-yellow-400 font-mono">ESC</span><span>Reality Reset</span></div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 }}
        className="absolute bottom-6 right-6 cyber-gradient border-2 border-purple-500 p-6 rounded-xl text-sm backdrop-blur-sm"
      >
        <div className="font-['Orbitron'] font-bold text-purple-400 mb-3 text-lg flex items-center space-x-2">
          <span>📊</span>
          <span>SYSTEM STATUS</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <motion.div 
              className={`w-3 h-3 rounded-full ${backendConnected ? 'bg-green-400' : 'bg-red-400'}`}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-gray-300">Visual Engine: </span>
            <span className={backendConnected ? 'text-green-400' : 'text-red-400'}>
              {backendConnected ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="text-gray-400 text-xs pt-2 border-t border-gray-700">
            Qualia Tempo v2.0 | Neural Prototype Build
          </div>
        </div>
      </motion.div>

      {/* Custom enhanced styles */}
      <style>{`
        @keyframes screenShake {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1px, -1px); }
          20% { transform: translate(1px, -1px); }
          30% { transform: translate(-1px, 1px); }
          40% { transform: translate(1px, 1px); }
          50% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, -1px); }
          70% { transform: translate(-1px, 1px); }
          80% { transform: translate(1px, 1px); }
          90% { transform: translate(-1px, -1px); }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes colorShift {
          0% { filter: hue-rotate(0deg); }
          33% { filter: hue-rotate(120deg); }
          66% { filter: hue-rotate(240deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .glitch-text-enhanced {
          animation: glitchEnhanced 0.4s ease-in-out infinite;
        }

        @keyframes glitchEnhanced {
          0% { 
            transform: translate(0);
            filter: hue-rotate(0deg) contrast(1);
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
          }
          10% { 
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg) contrast(1.2);
            text-shadow: 4px 0 #ff00ff, -4px 0 #00ffff;
          }
          20% { 
            transform: translate(-2px, -2px);
            filter: hue-rotate(180deg) contrast(0.8);
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff;
          }
          30% { 
            transform: translate(2px, 2px);
            filter: hue-rotate(270deg) contrast(1.5);
          }
          40% { 
            transform: translate(2px, -2px);
            filter: hue-rotate(180deg) contrast(1);
          }
          50% { 
            transform: translate(-1px, 2px);
            filter: hue-rotate(90deg) contrast(1.2);
            text-shadow: 3px 0 #ffff00, -1px 0 #ff00ff;
          }
          60% { 
            transform: translate(-1px, -1px);
            filter: hue-rotate(45deg) contrast(1);
          }
          70% { 
            transform: translate(1px, 1px);
            filter: hue-rotate(315deg) contrast(1.3);
          }
          80% { 
            transform: translate(1px, -1px);
            filter: hue-rotate(180deg) contrast(0.9);
          }
          90% { 
            transform: translate(-1px, 1px);
            filter: hue-rotate(270deg) contrast(1.1);
          }
          100% { 
            transform: translate(0);
            filter: hue-rotate(360deg) contrast(1);
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
          }
        }

        .cyber-button-enhanced {
          position: relative;
          border: 2px solid transparent;
          background: linear-gradient(45deg, #1a1a2e, #16213e) padding-box,
                      linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff) border-box;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .cyber-button-enhanced:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 10px 30px rgba(0, 255, 255, 0.3),
            0 0 50px rgba(255, 0, 255, 0.2),
            inset 0 0 30px rgba(0, 255, 255, 0.1);
          animation: buttonPulse 1s ease-in-out infinite;
        }

        @keyframes buttonPulse {
          0%, 100% { 
            box-shadow: 
              0 10px 30px rgba(0, 255, 255, 0.3),
              0 0 50px rgba(255, 0, 255, 0.2);
          }
          50% { 
            box-shadow: 
              0 15px 40px rgba(0, 255, 255, 0.5),
              0 0 70px rgba(255, 0, 255, 0.4);
          }
        }
      `}</style>
    </div>
  );
};

export default App;