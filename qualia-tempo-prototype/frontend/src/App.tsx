import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Subtitles } from "./components/Subtitles";
import { Atmosphere } from './components/Atmosphere';
import BackendCanvas from './components/BackendCanvas';
import QualiaTempoGame from "./components/game/QualiaTempoGame";
import QualiaTempoHUD from "./components/game/QualiaTempoHUD";
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
              {/* Enhanced Professional Main Menu */}
              <div className="text-center space-y-12 relative">
                {/* Advanced Background Effects */}
                <div className="absolute inset-0 -z-10">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 rounded-full blur-2xl"
                    animate={{
                      rotate: [0, 360],
                      scale: [0.8, 1.1, 0.8],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                <motion.div
                  initial={{ y: -100, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 60, damping: 20 }}
                  className="relative"
                >
                  {/* Multi-layered Glowing Background */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-30 blur-3xl transform scale-125"
                    style={{ animation: 'colorShift 6s ease-in-out infinite' }}
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 opacity-20 blur-2xl transform scale-110"
                    style={{ animation: 'colorShift 8s ease-in-out infinite reverse' }}
                  />

                  {/* Enhanced Title with Advanced Effects */}
                  <motion.h1
                    className={`relative text-7xl xl:text-8xl 2xl:text-9xl font-black font-['Orbitron'] mb-6 leading-tight ${
                      titleGlitch ? 'glitch-text-enhanced' : ''
                    }`}
                    style={{
                      background: 'linear-gradient(45deg, #00ffff 0%, #ff00ff 25%, #ffff00 50%, #00ffff 75%, #ff00ff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      backgroundSize: '300% 300%',
                      animation: 'gradientShift 3s ease infinite',
                      filter: 'drop-shadow(0 0 30px rgba(0,255,255,0.5))',
                    }}
                    animate={{
                      textShadow: [
                        '0 0 30px rgba(0,255,255,0.5), 0 0 60px rgba(255,0,255,0.3)',
                        '0 0 40px rgba(0,255,255,0.8), 0 0 80px rgba(255,0,255,0.5)',
                        '0 0 30px rgba(0,255,255,0.5), 0 0 60px rgba(255,0,255,0.3)',
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    QUALIA
                    <br />
                    <motion.span
                      className="text-6xl xl:text-7xl 2xl:text-8xl"
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        background: 'linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        backgroundSize: '200% 100%',
                      }}
                    >
                      TEMPO
                    </motion.span>
                  </motion.h1>
                </motion.div>
                
                {/* Enhanced Professional Subtitle */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 100, damping: 15 }}
                  className="relative"
                >
                  <motion.p
                    className="text-3xl xl:text-4xl 2xl:text-5xl font-['Orbitron'] font-medium mb-8"
                    style={{
                      background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 50%, #ffff00 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 0 20px rgba(0,255,255,0.6)',
                    }}
                    animate={{
                      textShadow: [
                        '0 0 20px rgba(0,255,255,0.6)',
                        '0 0 30px rgba(255,0,255,0.4)',
                        '0 0 20px rgba(0,255,255,0.6)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    A CHARLIE HELLSINGER STORY
                  </motion.p>
                </motion.div>

                {/* Enhanced Professional Description */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring", stiffness: 80, damping: 20 }}
                  className="relative max-w-4xl mx-auto mb-12"
                >
                  <div className="cyber-gradient border border-cyan-500/30 p-8 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-pink-500/5 to-transparent" />

                    <div className="relative z-10 text-center space-y-4">
                      <motion.p
                        className="text-xl xl:text-2xl text-cyan-300 font-light leading-relaxed"
                        animate={{
                          textShadow: [
                            '0 0 10px rgba(0,255,255,0.3)',
                            '0 0 15px rgba(0,255,255,0.5)',
                            '0 0 10px rgba(0,255,255,0.3)',
                          ],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        Enter a <motion.span
                          className="text-cyan-400 font-semibold"
                          animate={{ color: ['#00ffff', '#ff00ff', '#00ffff'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >synesthetic battlefield</motion.span> where
                      </motion.p>

                      <motion.p
                        className="text-lg xl:text-xl text-purple-300 font-light leading-relaxed"
                        animate={{
                          textShadow: [
                            '0 0 8px rgba(255,0,255,0.3)',
                            '0 0 12px rgba(255,0,255,0.5)',
                            '0 0 8px rgba(255,0,255,0.3)',
                          ],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      >
                        <motion.span
                          className="text-purple-400 font-semibold"
                          animate={{ color: ['#ff00ff', '#ffff00', '#ff00ff'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >Rhythm defines reality</motion.span>, and <motion.span
                          className="text-pink-400 font-semibold"
                          animate={{ color: ['#ff0080', '#00ffff', '#ff0080'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        >visual chaos</motion.span> rewards precision.
                      </motion.p>

                      <motion.p
                        className="text-lg xl:text-xl text-yellow-300 font-light leading-relaxed"
                        animate={{
                          textShadow: [
                            '0 0 8px rgba(255,255,0,0.3)',
                            '0 0 12px rgba(255,255,0,0.5)',
                            '0 0 8px rgba(255,255,0,0.3)',
                          ],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                      >
                        Experience the <motion.span
                          className="text-yellow-400 font-semibold"
                          animate={{ color: ['#ffff00', '#ff8000', '#ffff00'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                        >fusion of sound and light</motion.span> in perfect harmony.
                      </motion.p>
                    </div>
                  </div>
                </motion.div>

                {/* Ultra-Enhanced Professional Main Button */}
                <motion.div
                  initial={{ y: 50, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 100, damping: 15 }}
                  className="relative"
                >
                  {/* Button Glow Effects */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <motion.button
                    onClick={handleStartGame}
                    whileHover={{
                      scale: 1.08,
                      y: -5,
                      boxShadow: [
                        '0 20px 40px rgba(0,255,255,0.4), 0 0 80px rgba(255,0,255,0.3)',
                        '0 25px 50px rgba(0,255,255,0.6), 0 0 100px rgba(255,0,255,0.5)',
                        '0 20px 40px rgba(0,255,255,0.4), 0 0 80px rgba(255,0,255,0.3)',
                      ],
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="cyber-button-ultra relative px-20 py-10 text-3xl font-bold text-white rounded-2xl overflow-hidden group border-2 border-transparent"
                    style={{
                      background: 'linear-gradient(45deg, #1a1a2e, #16213e) padding-box, linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff) border-box',
                      boxShadow: '0 10px 30px rgba(0,255,255,0.3), inset 0 0 30px rgba(0,255,255,0.1)',
                    }}
                  >
                    {/* Multi-layer Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1500" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-cyan-400/30 to-transparent opacity-0 group-hover:opacity-100 transform translate-y-[100%] group-hover:translate-y-[-100%] transition-all duration-1000" />

                    {/* Animated Border */}
                    <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="w-full h-full bg-gray-900 rounded-2xl" />
                    </div>

                    <span className="relative z-10 flex items-center justify-center space-x-4">
                      <motion.span
                        className="text-2xl"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        ⚡
                      </motion.span>
                      <span className="font-['Orbitron'] tracking-wider">INITIATE NEURAL SYNC</span>
                      <motion.span
                        className="text-2xl"
                        animate={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      >
                        🎵
                      </motion.span>
                    </span>

                    {/* Particle Effects on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                          style={{
                            left: `${20 + i * 15}%`,
                            top: `${30 + (i % 2) * 40}%`,
                          }}
                          animate={{
                            y: [-10, -30, -10],
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                    </div>
                  </motion.button>
                </motion.div>

                {/* Ultra-Enhanced Professional System Status */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, type: "spring", stiffness: 80, damping: 20 }}
                  className="mt-16 relative"
                >
                  <div className="cyber-gradient border border-cyan-500/30 p-8 rounded-2xl backdrop-blur-sm relative overflow-hidden max-w-2xl mx-auto">
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5" />
                    <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-pink-500/5 to-transparent" />

                    <motion.h3
                      className="text-2xl font-['Orbitron'] font-bold text-center mb-8 text-cyan-400 relative z-10"
                      animate={{
                        textShadow: [
                          '0 0 10px rgba(0,255,255,0.5)',
                          '0 0 15px rgba(0,255,255,0.7)',
                          '0 0 10px rgba(0,255,255,0.5)',
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      NEURAL SYSTEMS STATUS
                    </motion.h3>

                    <div className="grid grid-cols-2 gap-6 relative z-10">
                      {[
                        { label: "VISUAL ENGINE", color: "green", icon: "🔥", description: "GPU Accelerated" },
                        { label: "NEURAL LINK", color: "cyan", icon: "🧠", description: "Quantum Processing" },
                        { label: "QUALIA MATRIX", color: "purple", icon: "✨", description: "Reality Engine" },
                        { label: "AUDIO CORTEX", color: "pink", icon: "🎶", description: "Wave Synthesis" }
                      ].map((system, index) => (
                        <motion.div
                          key={system.label}
                          className="flex flex-col items-center space-y-3 p-4 rounded-xl border border-gray-600/30 hover:border-cyan-500/50 transition-all duration-300"
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: 1.2 + index * 0.15, type: "spring", stiffness: 100 }}
                          whileHover={{
                            scale: 1.05,
                            boxShadow: `0 0 20px rgba(${system.color === 'green' ? '0,255,0' : system.color === 'cyan' ? '0,255,255' : system.color === 'purple' ? '255,0,255' : '255,192,203'}, 0.3)`,
                          }}
                        >
                          <motion.div
                            className={`w-4 h-4 bg-${system.color}-400 rounded-full relative`}
                            animate={{
                              opacity: [0.7, 1, 0.7],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: index * 0.3,
                              ease: "easeInOut"
                            }}
                          >
                            <div className={`absolute inset-0 bg-${system.color}-400 rounded-full animate-ping opacity-75`} />
                          </motion.div>

                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-2 mb-1">
                              <span className="text-xl">{system.icon}</span>
                              <span className={`text-${system.color}-400 text-sm font-['Orbitron'] font-semibold`}>
                                {system.label}
                              </span>
                            </div>
                            <div className={`text-${system.color}-300 text-xs opacity-75`}>
                              {system.description}
                            </div>
                            <motion.div
                              className={`text-${system.color}-400 text-xs font-bold mt-1`}
                              animate={{ opacity: [0.7, 1, 0.7] }}
                              transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
                            >
                              ONLINE
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Status Indicator */}
                    <motion.div
                      className="absolute bottom-4 right-4 text-xs text-green-400 font-['Orbitron']"
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        textShadow: [
                          '0 0 5px rgba(0,255,0,0.5)',
                          '0 0 10px rgba(0,255,0,0.8)',
                          '0 0 5px rgba(0,255,0,0.5)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ● ALL SYSTEMS NOMINAL
                    </motion.div>
                  </div>
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

        .cyber-button-ultra:hover {
          transform: translateY(-5px);
          box-shadow:
            0 20px 40px rgba(0, 255, 255, 0.4),
            0 0 80px rgba(255, 0, 255, 0.3),
            inset 0 0 40px rgba(0, 255, 255, 0.2);
          animation: ultraButtonPulse 1.5s ease-in-out infinite;
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

        @keyframes ultraButtonPulse {
          0%, 100% {
            box-shadow:
              0 20px 40px rgba(0, 255, 255, 0.4),
              0 0 80px rgba(255, 0, 255, 0.3),
              inset 0 0 40px rgba(0, 255, 255, 0.2);
          }
          50% {
            box-shadow:
              0 25px 50px rgba(0, 255, 255, 0.6),
              0 0 100px rgba(255, 0, 255, 0.5),
              inset 0 0 50px rgba(0, 255, 255, 0.3);
          }
        }

        @keyframes advancedGlitch {
          0% {
            transform: translate(0);
            filter: hue-rotate(0deg) contrast(1) brightness(1);
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
          }
          10% {
            transform: translate(-2px, 2px);
            filter: hue-rotate(90deg) contrast(1.3) brightness(1.2);
            text-shadow: 4px 0 #ff00ff, -4px 0 #00ffff, 2px 2px #ffff00;
          }
          20% {
            transform: translate(-2px, -2px);
            filter: hue-rotate(180deg) contrast(0.8) brightness(1.5);
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff, -2px -2px #ff8000;
          }
          30% {
            transform: translate(2px, 2px);
            filter: hue-rotate(270deg) contrast(1.4) brightness(0.8);
            text-shadow: 2px 0 #ffff00, -2px 0 #ff00ff, 2px 2px #00ffff;
          }
          40% {
            transform: translate(2px, -2px);
            filter: hue-rotate(180deg) contrast(1.1) brightness(1.3);
            text-shadow: -2px 0 #ff00ff, 2px 0 #00ffff, 2px -2px #ff0080;
          }
          50% {
            transform: translate(-1px, 2px);
            filter: hue-rotate(90deg) contrast(1.2) brightness(1.1);
            text-shadow: 3px 0 #ffff00, -1px 0 #ff00ff, -1px 2px #00ffff;
          }
          60% {
            transform: translate(-1px, -1px);
            filter: hue-rotate(45deg) contrast(1.0) brightness(1.4);
            text-shadow: -1px 0 #ff8000, 1px 0 #ffff00, -1px -1px #ff00ff;
          }
          70% {
            transform: translate(1px, 1px);
            filter: hue-rotate(315deg) contrast(1.3) brightness(0.9);
            text-shadow: 1px 0 #00ffff, -1px 0 #ff0080, 1px 1px #ffff00;
          }
          80% {
            transform: translate(1px, -1px);
            filter: hue-rotate(180deg) contrast(0.9) brightness(1.2);
            text-shadow: -1px 0 #ff00ff, 1px 0 #00ffff, 1px -1px #ff8000;
          }
          90% {
            transform: translate(-1px, 1px);
            filter: hue-rotate(270deg) contrast(1.1) brightness(1.3);
            text-shadow: -1px 0 #ffff00, 1px 0 #ff00ff, -1px 1px #00ffff;
          }
          100% {
            transform: translate(0);
            filter: hue-rotate(360deg) contrast(1) brightness(1);
            text-shadow: 2px 0 #ff00ff, -2px 0 #00ffff;
          }
        }

        .glitch-text-enhanced {
          animation: advancedGlitch 0.6s ease-in-out infinite;
        }

        @keyframes matrixRain {
          0% {
            transform: translateY(-100vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        @keyframes holographicShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .holographic-text {
          background: linear-gradient(90deg, transparent, rgba(0,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: holographicShimmer 2s ease-in-out infinite;
        }

        @keyframes cyberpunkGrid {
          0% {
            background-position: 0 0;
            opacity: 0.1;
          }
          50% {
            background-position: 50px 50px;
            opacity: 0.3;
          }
          100% {
            background-position: 100px 100px;
            opacity: 0.1;
          }
        }

        .cyber-grid {
          background-image:
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(255,0,255,0.05) 0%, transparent 70%);
          background-size: 50px 50px, 50px 50px, 100% 100%;
          animation: cyberpunkGrid 10s linear infinite;
        }

        @keyframes neonFlicker {
          0%, 100% { opacity: 1; text-shadow: 0 0 10px currentColor; }
          50% { opacity: 0.8; text-shadow: 0 0 5px currentColor; }
        }

        .neon-flicker {
          animation: neonFlicker 3s ease-in-out infinite;
        }

        @keyframes performancePulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1) saturate(1);
          }
          50% {
            transform: scale(1.02);
            filter: brightness(1.1) saturate(1.1);
          }
        }

        .performance-optimized {
          will-change: transform, opacity;
          backface-visibility: hidden;
          transform: translateZ(0);
          animation: performancePulse 4s ease-in-out infinite;
        }

        @keyframes matrixRain {
          0% {
            transform: translateY(-100vh);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        .matrix-rain {
          animation: matrixRain 3s linear infinite;
        }

        @keyframes dataStream {
          0% {
            transform: translateX(-100px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100px);
            opacity: 0;
          }
        }

        .data-stream {
          animation: dataStream 2s ease-in-out infinite;
        }

        @keyframes holographicShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .holographic-shimmer {
          background: linear-gradient(90deg, transparent, rgba(0,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: holographicShimmer 2s ease-in-out infinite;
        }

        @keyframes cyberpunkGrid {
          0% {
            background-position: 0 0;
            opacity: 0.1;
          }
          50% {
            background-position: 50px 50px;
            opacity: 0.3;
          }
          100% {
            background-position: 100px 100px;
            opacity: 0.1;
          }
        }

        .cyberpunk-grid {
          background-image:
            linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(255,0,255,0.05) 0%, transparent 70%);
          background-size: 50px 50px, 50px 50px, 100% 100%;
          animation: cyberpunkGrid 10s linear infinite;
        }

        /* Performance optimizations */
        .gpu-accelerated {
          transform: translateZ(0);
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        .optimized-animation {
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};

export default App;