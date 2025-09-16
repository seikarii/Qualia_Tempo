import React from 'react';
import type { QualiaTempoGameState } from './QualiaTempoGame';

interface QualiaTempoHUDProps {
  gameState: QualiaTempoGameState;
  inputMode: 'rhythm' | 'casting';
  onModeToggle: () => void;
}

/**
 * QualiaTempoHUD - Game UI overlay displaying score, combo, performance metrics
 * and visual feedback for player actions. Designed for streamable visibility.
 */
const QualiaTempoHUD: React.FC<QualiaTempoHUDProps> = ({ 
  gameState, 
  inputMode, 
  onModeToggle 
}) => {
  const { game_status, player, boss, music_data, global_qualia_field } = gameState;

  // Calculate dynamic colors based on performance and qualia state
  const performanceColor = `hsl(${game_status.performance_metrics.accuracy * 120}, 70%, 50%)`;
  const qualiaColor = `hsl(${music_data.emotional_valence * 360}, 80%, 60%)`;
  const bossColor = `hsl(${(1 - boss.stress_level) * 60}, 90%, 50%)`;

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      pointerEvents: 'none',
      fontFamily: 'monospace'
    }}>
      {/* Top Bar - Score and Combo */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#fff',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          <div style={{ color: performanceColor }}>
            SCORE: {game_status.score.toLocaleString()}
          </div>
          <div style={{ fontSize: '18px', marginTop: '5px' }}>
            COMBO: {game_status.combo}x
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', color: qualiaColor }}>
            QUALIA FIELD
          </div>
          <div style={{ fontSize: '14px' }}>
            α: {global_qualia_field.alpha.toFixed(3)} | 
            β: {global_qualia_field.beta.toFixed(3)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', color: bossColor }}>
            {boss.name}
          </div>
          <div style={{ fontSize: '14px' }}>
            Phase {boss.phase} | Power: {boss.power_level.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Performance Metrics - Left Side */}
      <div style={{
        position: 'absolute',
        left: 20,
        top: '30%',
        color: '#fff',
        background: 'rgba(0,0,0,0.6)',
        padding: '15px',
        borderRadius: '8px',
        backdropFilter: 'blur(5px)'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          PERFORMANCE
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Accuracy</div>
          <div style={{ 
            width: '120px', 
            height: '6px', 
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${game_status.performance_metrics.accuracy * 100}%`,
              height: '100%',
              background: performanceColor,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '14px', marginTop: '2px' }}>
            {(game_status.performance_metrics.accuracy * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Rhythm Sync</div>
          <div style={{ 
            width: '120px', 
            height: '6px', 
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${game_status.performance_metrics.rhythm_sync * 100}%`,
              height: '100%',
              background: `hsl(${game_status.performance_metrics.rhythm_sync * 120}, 70%, 50%)`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '14px', marginTop: '2px' }}>
            {(game_status.performance_metrics.rhythm_sync * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Qualia Coherence</div>
          <div style={{ 
            width: '120px', 
            height: '6px', 
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${game_status.performance_metrics.qualia_coherence * 100}%`,
              height: '100%',
              background: qualiaColor,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ fontSize: '14px', marginTop: '2px' }}>
            {(game_status.performance_metrics.qualia_coherence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Music Data - Right Side */}
      <div style={{
        position: 'absolute',
        right: 20,
        top: '30%',
        color: '#fff',
        background: 'rgba(0,0,0,0.6)',
        padding: '15px',
        borderRadius: '8px',
        backdropFilter: 'blur(5px)'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          MUSIC ANALYSIS
        </div>
        
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
          BPM: <span style={{ color: '#00ff88' }}>{music_data.bpm.toFixed(0)}</span>
        </div>
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
          Speed: <span style={{ color: '#ffaa00' }}>{music_data.speed_factor.toFixed(2)}x</span>
        </div>
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
          Volume: <span style={{ color: '#88aaff' }}>{(music_data.volume_factor * 100).toFixed(0)}%</span>
        </div>
        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
          Intensity: <span style={{ color: '#ff6688' }}>{(music_data.intensity * 100).toFixed(0)}%</span>
        </div>
        
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>Order vs Chaos</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
            <div style={{ 
              flex: music_data.order_influence, 
              height: '8px', 
              background: '#4a90e2',
              marginRight: '2px',
              borderRadius: '4px 0 0 4px'
            }} />
            <div style={{ 
              flex: music_data.chaos_influence, 
              height: '8px', 
              background: '#e24a4a',
              marginLeft: '2px',
              borderRadius: '0 4px 4px 0'
            }} />
          </div>
        </div>
      </div>

      {/* Input Mode Indicator - Bottom Center */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#fff',
        background: inputMode === 'rhythm' ? 'rgba(74, 144, 226, 0.8)' : 'rgba(226, 74, 74, 0.8)',
        padding: '10px 20px',
        borderRadius: '20px',
        fontSize: '16px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        cursor: 'pointer',
        pointerEvents: 'auto',
        transition: 'all 0.3s ease'
      }} onClick={onModeToggle}>
        {inputMode === 'rhythm' ? '🎵 RHYTHM MODE' : '✨ CASTING MODE'}
      </div>

      {/* Beat Indicator */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${qualiaColor} 0%, transparent 70%)`,
        animation: `pulse ${60 / music_data.bpm}s infinite ease-in-out`,
        opacity: 0.7
      }}>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.7; }
            50% { transform: translateX(-50%) scale(1.2); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default QualiaTempoHUD;