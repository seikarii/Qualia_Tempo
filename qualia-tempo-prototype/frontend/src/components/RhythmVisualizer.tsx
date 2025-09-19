import React, { useState, useEffect, useCallback } from 'react';
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import type { IEventBus } from '../services/interfaces/IEventBus';
import type { IRhythmicMovementController } from '../services/interfaces/IRhythmicMovementController';
import type { IGameControllerService } from '../services/interfaces/IGameControllerService';
import type { MetronomeTickEvent } from '../services/EventBus';

/**
 * RhythmVisualizer Component
 * QUALIA.CODE v1.1: Interactive rhythm visualization with beat event subscription
 * 
 * Features:
 * - Visual beat indicator with animation
 * - Real-time BPM display
 * - Start/Stop controls for rhythm system
 * - Beat counter with pulse animation
 * - Status indicators for playing/paused state
 */
export const RhythmVisualizer: React.FC = () => {
  // Service resolution via hooks (QUALIA.CODE pattern)
  const eventBus = useService<IEventBus>(TYPES.IEventBus);
  const rhythmController = useService<IRhythmicMovementController>(TYPES.IRhythmicMovementController);
  const gameController = useService<IGameControllerService>(TYPES.IGameControllerService);

  // Component state (simple primitives only per ESLint rules)
  const [currentBPM, setCurrentBPM] = useState<number>(0);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);
  const [listenerCount, setListenerCount] = useState<number>(0);

  // Beat event handler with pulse animation
  const handleMetronomeTick = useCallback((event: MetronomeTickEvent) => {
    setCurrentBeat(event.beatNumber);
    setCurrentBPM(Math.round(event.bpm));
    
    // Trigger beat pulse animation
    setBeatPulse(true);
    setTimeout(() => setBeatPulse(false), 150); // 150ms pulse duration
    
    setListenerCount(prev => prev + 1);
  }, []);

  // Service state update
  const updateServiceStates = useCallback(() => {
    setIsRunning(rhythmController.isRunning());
    setIsPlaying(rhythmController.isPlaying());
    setCurrentBPM(rhythmController.getCurrentBPM());
    setCurrentBeat(rhythmController.getCurrentBeat());
  }, [rhythmController]);

  // Setup beat event subscription
  useEffect(() => {
    const listenerId = eventBus.subscribe<MetronomeTickEvent>('MetronomeTick', handleMetronomeTick);
    
    // Initial state update
    updateServiceStates();
    
    // Cleanup subscription on unmount
    return () => {
      if (listenerId) {
        eventBus.unsubscribe(listenerId);
      }
    };
  }, [eventBus, handleMetronomeTick, updateServiceStates]);

  // Periodic state updates (every 500ms)
  useEffect(() => {
    const intervalId = setInterval(updateServiceStates, 500);
    return () => clearInterval(intervalId);
  }, [updateServiceStates]);

  // Control handlers
  const handleStart = useCallback(() => {
    rhythmController.start();
    gameController.startGame();
    updateServiceStates();
  }, [rhythmController, gameController, updateServiceStates]);

  const handleStop = useCallback(() => {
    rhythmController.stop();
    gameController.pauseGame();
    updateServiceStates();
  }, [rhythmController, gameController, updateServiceStates]);

  const handleReset = useCallback(() => {
    rhythmController.stop();
    gameController.resetGame();
    setCurrentBeat(0);
    setListenerCount(0);
    updateServiceStates();
  }, [rhythmController, gameController, updateServiceStates]);

  return (
    <div className="rhythm-visualizer">
      <style>{`
        .rhythm-visualizer {
          padding: 20px;
          border: 2px solid #333;
          border-radius: 8px;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: #ffffff;
          font-family: 'Courier New', monospace;
          max-width: 600px;
          margin: 20px auto;
        }
        
        .rhythm-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .rhythm-title {
          font-size: 24px;
          font-weight: bold;
          color: #00ff88;
          margin-bottom: 10px;
        }
        
        .rhythm-status {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 10px;
        }
        
        .status-item {
          flex: 1;
          text-align: center;
          padding: 10px;
          border: 1px solid #444;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
        }
        
        .status-label {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 5px;
        }
        
        .status-value {
          font-size: 18px;
          font-weight: bold;
        }
        
        .status-value.playing {
          color: #00ff88;
        }
        
        .status-value.stopped {
          color: #ff4444;
        }
        
        .beat-display {
          text-align: center;
          margin: 30px 0;
        }
        
        .beat-circle {
          width: 120px;
          height: 120px;
          border: 4px solid #00ff88;
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          font-weight: bold;
          transition: all 0.15s ease;
          background: rgba(0, 255, 136, 0.1);
        }
        
        .beat-circle.pulse {
          transform: scale(1.2);
          box-shadow: 0 0 20px #00ff88;
          background: rgba(0, 255, 136, 0.3);
        }
        
        .bpm-display {
          font-size: 20px;
          color: #00ff88;
        }
        
        .controls {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 20px;
        }
        
        .control-button {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        
        .control-button.start {
          background: #00ff88;
          color: #000;
        }
        
        .control-button.start:hover {
          background: #00cc6a;
          transform: translateY(-2px);
        }
        
        .control-button.stop {
          background: #ff4444;
          color: #fff;
        }
        
        .control-button.stop:hover {
          background: #cc3333;
          transform: translateY(-2px);
        }
        
        .control-button.reset {
          background: #6666ff;
          color: #fff;
        }
        
        .control-button.reset:hover {
          background: #5555cc;
          transform: translateY(-2px);
        }
        
        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .debug-info {
          margin-top: 20px;
          padding: 10px;
          border: 1px solid #444;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.2);
          font-size: 12px;
          color: #aaa;
        }
      `}</style>
      
      <div className="rhythm-header">
        <div className="rhythm-title">🎵 RHYTHM VISUALIZER</div>
        <div style={{ color: '#888', fontSize: '14px' }}>
          QUALIA.CODE v1.1 - Beat Event Subscription System
        </div>
      </div>

      <div className="rhythm-status">
        <div className="status-item">
          <div className="status-label">SYSTEM</div>
          <div className={`status-value ${isRunning ? 'playing' : 'stopped'}`}>
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-label">PLAYBACK</div>
          <div className={`status-value ${isPlaying ? 'playing' : 'stopped'}`}>
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-label">EVENTS</div>
          <div className="status-value" style={{ color: '#00aaff' }}>
            {listenerCount}
          </div>
        </div>
      </div>

      <div className="beat-display">
        <div className={`beat-circle ${beatPulse ? 'pulse' : ''}`}>
          {currentBeat}
        </div>
        <div className="bpm-display">
          {currentBPM} BPM
        </div>
      </div>

      <div className="controls">
        <button 
          className="control-button start" 
          onClick={handleStart}
          disabled={isRunning && isPlaying}
        >
          ▶ START
        </button>
        
        <button 
          className="control-button stop" 
          onClick={handleStop}
          disabled={!isRunning}
        >
          ⏸ STOP
        </button>
        
        <button 
          className="control-button reset" 
          onClick={handleReset}
        >
          🔄 RESET
        </button>
      </div>

      <div className="debug-info">
        <strong>System Diagnostics:</strong><br/>
        Rhythm Controller: {isRunning ? 'Active' : 'Inactive'} | 
        Game State: {isPlaying ? 'Playing' : 'Paused'} | 
        Current Beat: {currentBeat} | 
        Current BPM: {currentBPM} | 
        Events Received: {listenerCount}
      </div>
    </div>
  );
};