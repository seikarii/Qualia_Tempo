import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Divider } from '@mui/material';
import type { PredictiveEntityState } from '../core/types';

/**
 * EntityInfoCard - Tarjeta avanzada de diagnóstico para entidades ontológicas.
 * Muestra estado físico, qualia, narrativa, evolución y diagnóstico arquetípico.
 * Optimizado para overlay visual, debugging y monitoreo evolutivo.
 */
interface EntityInfoCardProps {
  entity: PredictiveEntityState;
}

const EntityInfoCard: React.FC<EntityInfoCardProps> = ({ entity }) => {
  const qualia = entity.qualia_state;
  const narrative = entity.narrative_signature;

  return (
    <Card sx={{
      minWidth: 275,
      maxWidth: 370,
      backgroundColor: 'rgba(0, 0, 0, 0.82)',
      color: '#00FFFF',
      border: '1.5px solid #00FFFF',
      boxShadow: '0 0 16px rgba(0, 255, 255, 0.35)',
      backdropFilter: 'blur(7px)',
      position: 'absolute',
      top: '10px',
      right: '10px',
      zIndex: 1000,
      borderRadius: '14px',
      fontFamily: 'monospace',
    }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ color: '#00FFFF', fontWeight: 700 }}>
          {entity.name || `Entity ID: ${entity.id}`}
        </Typography>
        <Typography sx={{ mb: 1.5, color: '#38bdf8', fontSize: '0.95em' }}>
          Type: {entity.type || 'Unknown'}
        </Typography>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Position: ({entity.center_of_mass.x.toFixed(2)}, {entity.center_of_mass.y.toFixed(2)}, {entity.center_of_mass.z.toFixed(2)})
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Velocity: ({entity.velocity.x.toFixed(2)}, {entity.velocity.y.toFixed(2)}, {entity.velocity.z.toFixed(2)})
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Mass: {entity.mass.toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Consciousness: {(qualia.consciousness_density * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Coherence: {(qualia.temporal_coherence * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Valence: {qualia.emotional_valence > 0 ? '+' : ''}{qualia.emotional_valence.toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Arousal: {(qualia.arousal * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Complexity: {qualia.complexity.toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#00FFFF' }}>
            Spiritual Resonance: {qualia.spiritual_resonance.toFixed(2)}
          </Typography>
          {entity.is_sentient && (
            <Chip label="Sentient" color="info" size="small" sx={{ ml: 1, mt: 1, bgcolor: '#22d3ee', color: '#0a0a0a', fontWeight: 700 }} />
          )}
          {entity.is_player_controlled && (
            <Chip label="Player Controlled" color="success" size="small" sx={{ ml: 1, mt: 1, bgcolor: '#a3e635', color: '#0a0a0a', fontWeight: 700 }} />
          )}
        </Box>
        <Divider sx={{ my: 1, bgcolor: '#00FFFF', opacity: 0.3 }} />
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 600 }}>
            Evolution Vector: [{entity.evolutionVector.x.toFixed(2)}, {entity.evolutionVector.y.toFixed(2)}, {entity.evolutionVector.z.toFixed(2)}]
          </Typography>
          <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 600 }}>
            Interaction Potential: {entity.interactionPotential.toFixed(2)}
          </Typography>
          <Typography variant="body2" sx={{ color: '#38bdf8', fontWeight: 600 }}>
            Coherence Trajectory: {entity.coherenceTrajectory.slice(-3).map(n => n.toFixed(2)).join(' → ')}
          </Typography>
        </Box>
        {narrative && (
          <>
            <Divider sx={{ my: 1, bgcolor: '#a3e635', opacity: 0.4 }} />
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ color: '#a3e635', fontWeight: 700 }}>
                Archetype: {narrative.archetype}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a3e635' }}>
                Dramatic Function: {narrative.dramatic_function}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a3e635' }}>
                Character Arc: {narrative.character_arc}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a3e635' }}>
                Narrative Weight: {narrative.narrative_weight.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a3e635' }}>
                Plot Significance: {narrative.plot_significance?.toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a3e635' }}>
                Evolutionary Potential: {narrative.evolutionary_potential.toFixed(2)}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EntityInfoCard;
