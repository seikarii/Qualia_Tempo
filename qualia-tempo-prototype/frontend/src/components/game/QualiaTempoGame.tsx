import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useGameStore } from '../../state/useGameStore';
import { useServices } from '../../services/hooks';

import QualiaTempoHUD from './QualiaTempoHUD';
import PlayerAvatar from './PlayerAvatar';
import QualiaFieldRenderer from './QualiaFieldRenderer';
import MusicalNotesRenderer from './MusicalNotesRenderer';
import BossRenderer from './BossRenderer';
import PlayerRenderer from './PlayerRenderer';
import GridRenderer from './GridRenderer';

/**
 * QualiaTempoGame - Main Qualia Tempo game component integrated within MetacosmosViewer
 * 
 * Features:
 * - Rhythm-based gameplay with visual feedback
 * - Real-time qualia field visualization 
 * - Performance-driven music and visual enhancement
 * - Boss battle mechanics with phases
 * - Synesthetic experience combining music, light, and color
 */

export interface QualiaTempoGameState {
  status: string;
  global_qualia_field: {
    alpha: number;
    beta: number;
    coherence: number;
  };
  elemental_lattices: Record<string, any>;
  player: {
    id: string;
    name: string;
    position: [number, number, number];
    power_level: number;
    consciousness_level: number;
    qualia_state: {
      emotional_valence: number;
      arousal: number;
      coherence: number;
    };
  };
  boss: {
    id: string;
    name: string;
    position: [number, number, number];
    power_level: number;
    phase: number;
    stress_level: number;
    qualia_state: {
      consciousness_density: number;
      emotional_valence: number;
      arousal: number;
      coherence: number;
    };
  };
  notes: Array<{
    id: string;
    type: string;
    timing: number;
    position: [number, number, number];
    qualia_signature: string;
  }>;
  game_status: {
    current_time: number;
    score: number;
    combo: number;
    music_speed_factor: number;
    music_volume_factor: number;
    performance_metrics: {
      accuracy: number;
      rhythm_sync: number;
      qualia_coherence: number;
    };
  };
  music_data: {
    bpm: number;
    intensity: number;
    harmony: number;
    speed_factor: number;
    volume_factor: number;
    emotional_valence: number;
    order_influence: number;
    chaos_influence: number;
  };
}

interface QualiaTempoGameProps {
  gameState?: QualiaTempoGameState;
  onGameAction?: (_action: string, _data: any) => void;
  isActive?: boolean;
}

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  gameState,
  onGameAction: _onGameAction,
  isActive = false
}) => {

  const gameTimeRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());
  const services = useServices();
  const [playerGridX, setPlayerGridX] = useState<number>(4);
  const [playerGridZ, setPlayerGridZ] = useState<number>(4);
  const [lastRhythmicAction, setLastRhythmicAction] = useState<'perfect' | 'good' | 'miss' | null>(null);

  // Get real game state from Zustand store
  const zustandState = useGameStore();
  
  // Adapt Zustand state to QualiaTempoGameState format
  const adaptedGameState: QualiaTempoGameState = {
    status: zustandState.isPlaying ? 'running' : 'paused',
    global_qualia_field: {
      alpha: zustandState.qualiaState.intensity,
      beta: zustandState.qualiaState.flow,
      coherence: zustandState.qualiaState.precision
    },
    elemental_lattices: {},
    player: {
      id: 'player_1',
      name: 'The Demiurge',
      position: [zustandState.player.position.x, 0, zustandState.player.position.y],
      power_level: zustandState.player.health,
      consciousness_level: zustandState.qualiaState.transcendence,
      qualia_state: {
        emotional_valence: zustandState.qualiaState.recovery,
        arousal: zustandState.qualiaState.intensity,
        coherence: zustandState.qualiaState.precision
      }
    },
    boss: {
      id: 'boss_1',
      name: 'Order Incarnate',
      position: [0, 5, 0],
      power_level: 100,
      phase: 1,
      stress_level: zustandState.qualiaState.chaos,
      qualia_state: {
        consciousness_density: 0.9,
        emotional_valence: -zustandState.qualiaState.chaos,
        arousal: zustandState.qualiaState.aggression,
        coherence: 1 - zustandState.qualiaState.chaos
      }
    },
    notes: [], // Will be populated by combat data
    game_status: {
      current_time: zustandState.currentTime,
      score: zustandState.player.score,
      combo: zustandState.player.combo,
      music_speed_factor: 1,
      music_volume_factor: 1,
      performance_metrics: {
        accuracy: zustandState.notesHit / Math.max(1, zustandState.totalNotes),
        rhythm_sync: zustandState.qualiaState.flow,
        qualia_coherence: zustandState.qualiaState.precision
      }
    },
    music_data: {
      bpm: 120,
      intensity: zustandState.qualiaState.intensity,
      harmony: zustandState.qualiaState.flow,
      speed_factor: 1,
      volume_factor: 1,
      emotional_valence: zustandState.qualiaState.recovery,
      order_influence: zustandState.qualiaState.precision,
      chaos_influence: zustandState.qualiaState.chaos
    }
  };

  // Update game time from Zustand store
  useEffect(() => {
    if (!gameState) {
      const interval = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastUpdateRef.current) / 1000;
        lastUpdateRef.current = now;
        gameTimeRef.current += delta;
      }, 100);

      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Subscribe to rhythmic movement events
  useEffect(() => {
    const eventBus = services.eventBus;
    
    // Listen for rhythmic dash events to update player position
    const rhythmicDashListenerId = eventBus.subscribe<any>(
      'RhythmicDash',
      (event) => {
        setPlayerGridX(event.newPosition[0]);
        setPlayerGridZ(event.newPosition[1]);
        setLastRhythmicAction(event.timing);
        console.log(`🎵 Rhythmic Dash: ${event.direction} (${event.timing}) to position [${event.newPosition}]`);
      }
    );

    // Listen for metronome ticks for audio feedback
    const metronomeListenerId = eventBus.subscribe<any>(
      'MetronomeTick',
      (event) => {
        // Visual or audio feedback for metronome tick
        console.log(`🥁 Metronome tick: Beat ${event.beatNumber} (${event.bpm} BPM)`);
      }
    );

    return () => {
      eventBus.unsubscribe(rhythmicDashListenerId);
      eventBus.unsubscribe(metronomeListenerId);
    };
  }, [services.eventBus, setPlayerGridX, setPlayerGridZ, setLastRhythmicAction]);

  // Use adapted state instead of mock
  const currentState = gameState || adaptedGameState;

  // Handle note hits
  const handleNoteHit = useCallback((noteId: string, accuracy: number) => {
    // For now, just log the action - in full implementation would trigger events
    console.log(`Note hit: ${noteId} with accuracy ${accuracy}`, { 
      timing: currentState.game_status.current_time,
      accuracy,
      noteId 
    });
  }, [currentState.game_status.current_time]);



  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Global game controls
      if (key === 'p' || key === 'escape') {
        event.preventDefault();
        // Emit pause action to GameController
        services.eventBus.emit<any>({
          type: 'PlayerAction',
          action: 'PauseGame',
          source: 'QualiaTempoGame'
        });
        return;
      }
      
      // Standard WASD movement and abilities only
      if (key === ' ' || key === 'enter') {
        // Hit current note
        const currentNote = currentState.notes
          .filter(note => !note.id.includes('hit_'))
          .sort((a, b) => Math.abs(a.timing - currentState.game_status.current_time) - 
                         Math.abs(b.timing - currentState.game_status.current_time))[0];
        
        if (currentNote) {
          const timingDiff = Math.abs(currentNote.timing - currentState.game_status.current_time);
          const accuracy = Math.max(0, 1 - timingDiff);
          handleNoteHit(currentNote.id, accuracy);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, currentState, handleNoteHit, services.eventBus]);

  if (!isActive) {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh',
      zIndex: 10 
    }}>
      {/* 3D Game Scene */}
      <Canvas
        camera={{ position: [0, 8, 8], fov: 45, rotation: [-0.5, 0, 0] }}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'linear-gradient(180deg, #0a0a2e 0%, #16213e 100%)' 
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        {/* Enhanced lighting based on qualia state */}
        <pointLight 
          position={[0, 5, 0]} 
          intensity={currentState.global_qualia_field.alpha * 2}
          color={`hsl(${currentState.music_data.emotional_valence * 360}, 80%, 60%)`}
        />
        
        {/* Game Elements */}
        <QualiaFieldRenderer 
          qualiaField={currentState.global_qualia_field}
          musicData={currentState.music_data}
        />
        
        <PlayerRenderer 
          player={currentState.player}
          performance={currentState.game_status.performance_metrics}
        />
        
        <BossRenderer 
          boss={currentState.boss}
          gameTime={currentState.game_status.current_time}
        />
        
        <MusicalNotesRenderer 
          notes={currentState.notes}
          currentTime={currentState.game_status.current_time}
          onNoteHit={handleNoteHit}
        />
        
        {/* Game Grid - The core playfield */}
        <GridRenderer
          gridSize={8}
          tileSize={1}
          playerPosition={[playerGridX, playerGridZ]}
          activePositions={[]}
        />
        
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={currentState.global_qualia_field.alpha * 2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
          />
          <ChromaticAberration 
            offset={new Vector2(currentState.music_data.chaos_influence * 0.002, 0)}
            radialModulation={false}
            modulationOffset={0.15}
          />
        </EffectComposer>
      </Canvas>
      
      {/* Game HUD Overlay */}
      <QualiaTempoHUD 
        qualiaState={{
          intensity: currentState.player.qualia_state.arousal,
          precision: currentState.game_status.performance_metrics.accuracy,
          aggression: 0,
          flow: currentState.player.qualia_state.coherence,
          chaos: 1 - currentState.player.qualia_state.coherence,
          recovery: 0,
          transcendence: currentState.player.consciousness_level / 100
        }}
        playerHealth={100}
        score={currentState.game_status.score}
        music_data={currentState.music_data}
      />

      {/* Player Avatar */}
      <PlayerAvatar 
        position={[playerGridX, 0, playerGridZ]}
        qualiaState={{
          intensity: currentState.player.qualia_state.arousal,
          precision: currentState.game_status.performance_metrics.accuracy,
          aggression: 0,
          flow: currentState.player.qualia_state.coherence,
          chaos: 1 - currentState.player.qualia_state.coherence,
          recovery: 0,
          transcendence: currentState.player.consciousness_level / 100
        }}
      />
      
      {/* Gameplay Instructions */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px'
      }}>
        <div><strong>Controls:</strong></div>
        <div>WASD: Move on Grid</div>
        <div>P/ESC: Pause Game</div>
        <div>SPACE/ENTER: Hit Notes</div>
        <div>WASD: Movement</div>
        <div>SPACE/ENTER: Hit Note</div>
        <div>Performance: {(currentState.game_status.performance_metrics.accuracy * 100).toFixed(1)}%</div>
        {lastRhythmicAction && (
          <div style={{ color: lastRhythmicAction === 'perfect' ? '#00ff00' : lastRhythmicAction === 'good' ? '#ffff00' : '#ff0000' }}>
            Last: {lastRhythmicAction}
          </div>
        )}
      </div>
    </div>
  );
};

export default QualiaTempoGame;