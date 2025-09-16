import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

import QualiaTempoGameplay from './QualiaTempoGameplay';
import QualiaTempoHUD from './QualiaTempoHUD';
import QualiaFieldRenderer from './QualiaFieldRenderer';
import MusicalNotesRenderer from './MusicalNotesRenderer';
import BossRenderer from './BossRenderer';
import PlayerRenderer from './PlayerRenderer';

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
  onGameAction?: (action: string, data: any) => void;
  isActive?: boolean;
}

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  gameState,
  onGameAction,
  isActive = false
}) => {
  const [localGameState, setLocalGameState] = useState<QualiaTempoGameState | null>(null);
  const [inputMode, setInputMode] = useState<'rhythm'>('rhythm');
  const gameTimeRef = useRef(0);
  const lastUpdateRef = useRef(Date.now());

  // Mock game state for development/testing
  const mockGameState: QualiaTempoGameState = {
    status: 'running',
    global_qualia_field: {
      alpha: 0.6 + Math.sin(Date.now() / 1000) * 0.3,
      beta: 0.5 + Math.cos(Date.now() / 1500) * 0.2,
      coherence: 0.7
    },
    elemental_lattices: {},
    player: {
      id: 'player_1',
      name: 'The Demiurge',
      position: [0, 0, 0],
      power_level: 100,
      consciousness_level: 0.8,
      qualia_state: {
        emotional_valence: 0.5,
        arousal: 0.6,
        coherence: 0.7
      }
    },
    boss: {
      id: 'boss_1',
      name: 'Chaos Lord',
      position: [0, 5, 0],
      power_level: 150,
      phase: 1,
      stress_level: 0.3,
      qualia_state: {
        consciousness_density: 0.9,
        emotional_valence: -0.4,
        arousal: 0.7,
        coherence: 0.6
      }
    },
    notes: [
      {
        id: 'note_1',
        type: 'harmony',
        timing: gameTimeRef.current + 2.0,
        position: [-2, 1, 0],
        qualia_signature: 'ORDER'
      },
      {
        id: 'note_2', 
        type: 'chaos',
        timing: gameTimeRef.current + 4.0,
        position: [2, 1, 0],
        qualia_signature: 'CHAOS'
      }
    ],
    game_status: {
      current_time: gameTimeRef.current,
      score: 1500,
      combo: 5,
      music_speed_factor: 1.2,
      music_volume_factor: 0.8,
      performance_metrics: {
        accuracy: 0.85,
        rhythm_sync: 0.9,
        qualia_coherence: 0.75
      }
    },
    music_data: {
      bpm: 120,
      intensity: 0.7,
      harmony: 0.8,
      speed_factor: 1.2,
      volume_factor: 0.8,
      emotional_valence: 0.6,
      order_influence: 0.6,
      chaos_influence: 0.4
    }
  };

  // Update game time for mock state
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

  const currentState = gameState || mockGameState;

  // Handle note hits
  const handleNoteHit = useCallback((noteId: string, accuracy: number) => {
    if (onGameAction) {
      onGameAction('hit_note', { 
        timing: currentState.game_status.current_time,
        accuracy,
        noteId 
      });
    }
    
    console.log(`Note hit: ${noteId} with accuracy ${accuracy}`);
  }, [onGameAction, currentState.game_status.current_time]);

  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      if (inputMode === 'rhythm') {
        // Rhythm gameplay keys
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
      }
      
      // Toggle modes
      if (key === 'tab') {
        event.preventDefault();
        // Only rhythm mode now
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, inputMode, currentState, handleNoteHit]);

  if (!isActive) {
    return null;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D Game Scene */}
      <Canvas
        camera={{ position: [0, 5, 10], fov: 60 }}
        style={{ background: 'linear-gradient(180deg, #000511 0%, #1a0a2e 100%)' }}
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
        
        {/* Atmospheric effects */}
        <Stars 
          radius={100} 
          depth={50} 
          count={1000 * currentState.global_qualia_field.coherence} 
          factor={4} 
          saturation={0} 
          fade={true}
        />
        
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={true} />
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={currentState.global_qualia_field.alpha * 2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
          />
          <ChromaticAberration 
            offset={[currentState.music_data.chaos_influence * 0.002, 0]}
          />
        </EffectComposer>
      </Canvas>
      
      {/* Game HUD Overlay */}
      <QualiaTempoHUD 
        gameState={currentState}
        inputMode={inputMode}
        onModeToggle={() => setInputMode(mode => mode === 'rhythm' ? 'casting' : 'rhythm')}
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
        <div>SPACE/ENTER: Hit Notes</div>
        <div>TAB: Toggle Mode ({inputMode})</div>
        <div>Performance: {(currentState.game_status.performance_metrics.accuracy * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
};

export default QualiaTempoGame;