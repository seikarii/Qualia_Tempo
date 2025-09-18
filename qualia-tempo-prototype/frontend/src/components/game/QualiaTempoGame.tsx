import React, { useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useGameStore } from '../../state/useGameStore';
import { useService } from '../../services/hooks';
import { TYPES } from '../../services/inversify.types';
import { IEventBus } from '../../services/interfaces/IEventBus';

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

interface QualiaTempoGameProps {
  onGameAction?: (_action: string, _data: any) => void;
  isActive?: boolean;
}

const QualiaTempoGame: React.FC<QualiaTempoGameProps> = ({
  onGameAction: _onGameAction,
  isActive = false
}) => {

  const eventBus = useService<IEventBus>(TYPES.IEventBus);

  // Get real game state from Zustand store
  const zustandState = useGameStore();

  // Subscribe to rhythmic movement events
  useEffect(() => {
    // Listen for rhythmic dash events to update player position
    const rhythmicDashListenerId = eventBus.subscribe<any>(
      'RhythmicDash',
      (_event) => {
        // Position is updated in the store by GameStateStoreService
        // Component will re-render automatically when store changes
      }
    );

    // Listen for metronome ticks for audio feedback
    const metronomeListenerId = eventBus.subscribe<any>(
      'MetronomeTick',
      (_event) => {
        // Visual or audio feedback for metronome tick
      }
    );

    return () => {
      eventBus.unsubscribe(rhythmicDashListenerId);
      eventBus.unsubscribe(metronomeListenerId);
    };
  }, [eventBus]);

  // Handle note hits
  const handleNoteHit = useCallback((noteId: string, accuracy: number) => {
    // Emit hit note event
    eventBus.emit<any>({
      type: 'PlayerAction',
      action: 'HitNote',
      source: 'QualiaTempoGame',
      context: { noteId, accuracy }
    });
  }, [eventBus]);



  // Keyboard controls
  useEffect(() => {
    if (!isActive) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Global game controls
      if (key === 'p' || key === 'escape') {
        event.preventDefault();
        // Emit pause action to GameController
        eventBus.emit<any>({
          type: 'PlayerAction',
          action: 'PauseGame',
          source: 'QualiaTempoGame'
        });
        return;
      }
      
      // WASD Movement - REMOVED: Handled by RhythmicMovementController
      // Note hitting (Space/Enter)
      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        
        // For now, simulate a note hit since we don't have dynamic note generation
        const mockAccuracy = Math.random() * 0.5 + 0.5; // 0.5-1.0 accuracy
        
        // Emit hit note event
        eventBus.emit<any>({
          type: 'PlayerAction',
          action: 'HitNote',
          source: 'QualiaTempoGame',
          context: {
            points: Math.floor(mockAccuracy * 100),
            perfect: mockAccuracy > 0.9
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isActive, eventBus]);

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
        data-testid="canvas"
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
          intensity={zustandState.qualiaState.intensity * 2}
          color={`hsl(${zustandState.qualiaState.recovery * 360}, 80%, 60%)`}
        />
        
        {/* Game Elements */}
        <QualiaFieldRenderer 
          qualiaField={{
            alpha: zustandState.qualiaState.intensity,
            beta: zustandState.qualiaState.flow,
            coherence: zustandState.qualiaState.focus_level
          }}
          musicData={{
            intensity: zustandState.qualiaState.intensity,
            harmony: zustandState.qualiaState.flow,
            emotional_valence: zustandState.qualiaState.recovery,
            order_influence: zustandState.qualiaState.focus_level,
            chaos_influence: zustandState.qualiaState.chaos
          }}
        />
        
        <PlayerRenderer 
          player={{
            id: 'player_1',
            name: 'The Demiurge',
            position: [zustandState.player.position.x, 0, zustandState.player.position.y],
            power_level: zustandState.player.health,
            consciousness_level: zustandState.qualiaState.transcendence,
            qualia_state: {
              emotional_valence: zustandState.qualiaState.recovery,
              arousal: zustandState.qualiaState.intensity,
              coherence: zustandState.qualiaState.focus_level
            }
          }}
          performance={{
            accuracy: zustandState.notesHit / Math.max(1, zustandState.totalNotes),
            rhythm_sync: zustandState.qualiaState.flow,
            qualia_coherence: zustandState.qualiaState.focus_level
          }}
        />
        
        <BossRenderer 
          boss={{
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
          }}
          gameTime={zustandState.currentTime}
        />
        
        <MusicalNotesRenderer 
          notes={[]} // Will be populated by combat data
          currentTime={zustandState.currentTime}
          onNoteHit={handleNoteHit}
        />
        
        {/* Game Grid - The core playfield */}
        <GridRenderer
          gridSize={8}
          tileSize={1}
          playerPosition={[zustandState.player.position.x, zustandState.player.position.y]}
          activePositions={[]}
        />
        
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={zustandState.qualiaState.intensity * 2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
          />
          <ChromaticAberration 
            offset={new Vector2(zustandState.qualiaState.chaos * 0.002, 0)}
            radialModulation={false}
            modulationOffset={0.15}
          />
        </EffectComposer>
      </Canvas>
      
      {/* Game HUD Overlay */}
      <QualiaTempoHUD 
        qualiaState={{
          intensity: zustandState.qualiaState.intensity,
          focus_level: zustandState.notesHit / Math.max(1, zustandState.totalNotes),
          aggression: 0,
          flow: zustandState.qualiaState.flow,
          chaos: zustandState.qualiaState.chaos,
          recovery: 0,
          transcendence: zustandState.qualiaState.transcendence / 100
        }}
        playerHealth={zustandState.player.health}
        score={zustandState.player.score}
        music_data={{
          bpm: 120,
          emotional_valence: zustandState.qualiaState.recovery
        }}
      />

      {/* Player Avatar */}
      <PlayerAvatar 
        position={[zustandState.player.position.x, 0, zustandState.player.position.y]}
        qualiaState={{
          intensity: zustandState.qualiaState.intensity,
          focus_level: zustandState.notesHit / Math.max(1, zustandState.totalNotes),
          aggression: 0,
          flow: zustandState.qualiaState.flow,
          chaos: zustandState.qualiaState.chaos,
          recovery: 0,
          transcendence: zustandState.qualiaState.transcendence / 100
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
        <div>Performance: {(zustandState.notesHit / Math.max(1, zustandState.totalNotes) * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
};

export default QualiaTempoGame;