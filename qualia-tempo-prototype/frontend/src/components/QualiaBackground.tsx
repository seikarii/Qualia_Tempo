import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useService } from '../services/hooks';
import { TYPES } from '../services/inversify.types';
import type { IConfigurationService } from '../services/interfaces/IConfigurationService';
import type { ILogger } from '../services/interfaces/ILogger';

/**
 * QualiaBackground
 * EXTREME synesthetic background preview - demonstrates full visual potential.
 * Simulates the complete sensory overload experience of Qualia Tempo gameplay.
 * 
 * Visual Layers (Z-Order):
 * 1. Volumetric lighting base (God Rays simulation)
 * 2. Multi-gradient morphing field (Qualia memory colors)  
 * 3. FFT-reactive particle field (Audio visualization simulation)
 * 4. Bloom / aura concentric energy rings (Intensity pulses)
 * 5. Film grain / noise overlay (Texture depth)
 * 6. Chromatic aberration effects (Visual chaos)
 * 7. Reactive lightning/energy bolts (Action feedback simulation)
 */
export const QualiaBackground: React.FC = () => {
  const configService = useService<IConfigurationService>(TYPES.IConfigurationService);
  const logger = useService<ILogger>(TYPES.ILogger);
  const visualConfig = configService.getVisualEffectsConfig();

  const { particles, bloom, gradients, noise, palette, aura } = visualConfig;

  // Simulated FFT audio data for preview (mimics real-time audio analysis)
  const [audioData, setAudioData] = useState<number[]>(() => 
    Array.from({ length: 32 }, () => Math.random() * 100)
  );

  // Lightning bolt paths for energy discharge effects
  const [lightningPaths, setLightningPaths] = useState<Array<{
    id: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    intensity: number;
    color: string;
  }>>([]);

  // Precompute enhanced particle instances with audio-reactive properties
  const particleData = useMemo(() => {
    const arr = Array.from({ length: particles.count }, (_, i) => {
      const color = palette[i % palette.length];
      const frequencyBand = i % 8; // Map to frequency spectrum
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: particles.minSize + Math.random() * (particles.maxSize - particles.minSize),
        dx: (Math.random() - 0.5) * particles.drift,
        dy: (Math.random() - 0.5) * particles.drift,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 10,
        color,
        opacity: 0.3 + Math.random() * 0.7,
        frequencyBand, // Which audio frequency this particle responds to
        baseSize: particles.minSize + Math.random() * (particles.maxSize - particles.minSize),
      };
    });
    return arr;
  }, [particles, palette]);

  // God Rays configuration (volumetric lighting simulation)
  const godRays = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i * 30) + Math.random() * 10,
      width: 2 + Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.4,
      length: 60 + Math.random() * 40,
      color: palette[i % palette.length],
    }))
  , [palette]);

  // Canvas reference for advanced effects
  const auraRef = useRef<HTMLDivElement | null>(null);

  // Simulate real-time audio FFT data
  useEffect(() => {
    const audioSimulation = setInterval(() => {
      setAudioData(prev => prev.map((_, i) => {
        const bass = i < 8 ? Math.random() * 120 + 40 : Math.random() * 60;
        const mid = i >= 8 && i < 24 ? Math.random() * 80 + 20 : Math.random() * 40;
        const treble = i >= 24 ? Math.random() * 100 + 20 : Math.random() * 30;
        return bass + mid + treble;
      }));
    }, 120); // ~8fps for smooth audio visualization

    return () => clearInterval(audioSimulation);
  }, []);

  // Generate lightning bolts based on audio peaks
  useEffect(() => {
    const generateLightning = () => {
      const maxAudio = Math.max(...audioData);
      if (maxAudio > 80) { // Threshold for lightning generation
        const newBolt = {
          id: Date.now() + Math.random(),
          x1: Math.random() * 100,
          y1: Math.random() * 100,
          x2: Math.random() * 100,
          y2: Math.random() * 100,
          intensity: maxAudio / 100,
          color: palette[Math.floor(Math.random() * palette.length)],
        };
        
        setLightningPaths(prev => [...prev.slice(-2), newBolt]); // Keep last 3 bolts
        
        // Auto-remove after duration
        setTimeout(() => {
          setLightningPaths(prev => prev.filter(bolt => bolt.id !== newBolt.id));
        }, 800);
      }
    };

    const lightningTimer = setInterval(generateLightning, 300);
    return () => clearInterval(lightningTimer);
  }, [audioData, palette]);

  useEffect(() => {
    logger.debug('[QualiaBackground] Enhanced extreme preview initialized', visualConfig);
  }, [logger, visualConfig]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Volumetric Lighting (God Rays) Base Layer */}
      <div className="absolute inset-0 mix-blend-screen overflow-hidden">
        {godRays.map(ray => (
          <motion.div
            key={ray.id}
            className="absolute opacity-30"
            style={{
              left: '50%',
              top: '50%',
              width: `${ray.width}px`,
              height: `${ray.length}vh`,
              background: `linear-gradient(180deg, ${ray.color}80, transparent)`,
              transformOrigin: 'top center',
              filter: `blur(${ray.width * 0.5}px) drop-shadow(0 0 ${ray.width * 3}px ${ray.color})`
            }}
            animate={{
              rotate: [ray.angle - 5, ray.angle + 5, ray.angle - 3, ray.angle],
              opacity: [ray.opacity * 0.3, ray.opacity, ray.opacity * 0.6, ray.opacity],
              scaleY: [0.8, 1.2, 0.9, 1]
            }}
            transition={{ duration: 8 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Enhanced Multi-Gradient Morphing Field */}
      <motion.div
        className="absolute inset-0"
        style={{ 
          filter: `saturate(1.8) brightness(1.15) contrast(1.1)`,
          mixBlendMode: 'overlay'
        }}
        animate={{
          background: [
            `${gradients.layers[0]}, ${gradients.layers[1]}`,
            `${gradients.layers[1]}, ${gradients.layers[2]}`,
            `${gradients.layers[2]}, ${gradients.layers[0]}`,
            `${gradients.layers[0]}, ${gradients.layers[1]}`
          ],
          opacity: [0.75, 0.95, 0.85, 0.9]
        }}
        transition={{ duration: gradients.cycleDuration, repeat: Infinity, ease: 'linear' }}
      />

      {/* Chromatic Aberration Overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(255,0,255,0.03) 60%, rgba(0,255,255,0.03) 80%)',
          mixBlendMode: 'difference'
        }}
        animate={{
          transform: ['scale(1) rotate(0deg)', 'scale(1.02) rotate(0.5deg)', 'scale(0.98) rotate(-0.3deg)', 'scale(1) rotate(0deg)']
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* FFT-Reactive Particle Field */}
      <div className="absolute inset-0 mix-blend-screen">
        {particleData.map(p => {
          const audioReactivity = audioData[p.frequencyBand] || 50;
          const reactiveSize = p.baseSize * (1 + (audioReactivity / 200));
          const reactiveOpacity = p.opacity * (0.7 + (audioReactivity / 300));
          
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full will-change-transform"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: reactiveSize,
                height: reactiveSize,
                background: `radial-gradient(circle, ${p.color}, ${p.color}80, transparent)`,
                filter: `blur(${reactiveSize * 0.8}px) drop-shadow(0 0 ${reactiveSize * 6}px ${p.color})`,
                opacity: reactiveOpacity
              }}
              animate={{
                x: [0, p.dx * 140 * (1 + audioReactivity / 400), p.dx * -80, 0],
                y: [0, p.dy * 140 * (1 + audioReactivity / 400), p.dy * -80, 0],
                scale: [1, 1.4 + (audioReactivity / 150), 0.8, 1],
                opacity: [reactiveOpacity * 0.2, reactiveOpacity, reactiveOpacity * 0.6, reactiveOpacity]
              }}
              transition={{ 
                duration: p.duration * (1 - audioReactivity / 500), 
                delay: p.delay, 
                repeat: Infinity, 
                ease: 'easeInOut' 
              }}
            />
          );
        })}
      </div>

      {/* Lightning Energy Bolts */}
      <div className="absolute inset-0 mix-blend-screen">
        {lightningPaths.map(bolt => (
          <motion.svg
            key={bolt.id}
            className="absolute inset-0 w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, bolt.intensity, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.line
              x1={`${bolt.x1}%`}
              y1={`${bolt.y1}%`}
              x2={`${bolt.x2}%`}
              y2={`${bolt.y2}%`}
              stroke={bolt.color}
              strokeWidth={2 + bolt.intensity * 3}
              filter={`drop-shadow(0 0 ${bolt.intensity * 15}px ${bolt.color})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2 }}
            />
            {/* Branching sub-bolts */}
            <motion.line
              x1={`${bolt.x1 + (bolt.x2 - bolt.x1) * 0.3}%`}
              y1={`${bolt.y1 + (bolt.y2 - bolt.y1) * 0.3}%`}
              x2={`${bolt.x1 + Math.random() * 20}%`}
              y2={`${bolt.y1 + Math.random() * 20}%`}
              stroke={bolt.color}
              strokeWidth={1}
              opacity={bolt.intensity * 0.7}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.15, delay: 0.1 }}
            />
          </motion.svg>
        ))}
      </div>

      {/* Enhanced Aura Rings with Audio Reaction */}
      <div ref={auraRef} className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: aura.rings }).map((_, i) => {
          const ringSize = 30 + i * (60 / aura.rings);
          const color = palette[i % palette.length];
          const bassReaction = audioData.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
          const trebleReaction = audioData.slice(24).reduce((a, b) => a + b, 0) / 8;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${ringSize + (bassReaction / 10)}vw`,
                height: `${ringSize + (bassReaction / 10)}vw`,
                border: `${2 + trebleReaction / 30}px solid ${color}${Math.floor(64 + bassReaction * 2).toString(16)}`,
                boxShadow: `
                  0 0 ${25 + bassReaction / 2}px ${color}${Math.floor(85 + trebleReaction).toString(16)}, 
                  0 0 ${60 + bassReaction}px ${color}${Math.floor(48 + bassReaction / 2).toString(16)},
                  inset 0 0 ${30 + trebleReaction / 3}px ${color}${Math.floor(32 + bassReaction / 3).toString(16)}
                `,
                filter: `blur(${1 + trebleReaction / 50}px)`
              }}
              animate={{
                rotate: 360,
                opacity: [0.3 + bassReaction / 300, 0.9 + trebleReaction / 200, 0.4 + bassReaction / 250],
                scale: [
                  1 + bassReaction / 800, 
                  1.05 + trebleReaction / 400, 
                  0.98 + bassReaction / 600, 
                  1 + bassReaction / 800
                ]
              }}
              transition={{
                rotate: { duration: aura.rotationSpeed - (bassReaction / 10), repeat: Infinity, ease: 'linear' },
                opacity: { duration: aura.pulseDuration - (trebleReaction / 20), repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 },
                scale: { duration: (aura.pulseDuration * 0.8) - (bassReaction / 15), repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }
              }}
            />
          );
        })}
      </div>

      {/* Extreme Bloom Overlay with Audio Peaks */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${0.15 + Math.max(...audioData) / 800}), transparent 70%)`,
          mixBlendMode: 'screen'
        }}
        animate={{ 
          opacity: [
            0.4 * bloom.intensity + Math.max(...audioData) / 500, 
            0.8 * bloom.intensity + Math.max(...audioData) / 300, 
            0.5 * bloom.intensity + Math.max(...audioData) / 400
          ] 
        }}
        transition={{ duration: bloom.pulseSpeed / 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Enhanced Film Grain with Distortion */}
      {noise.enabled && (
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='6' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.8'/></svg>")`,
            backgroundSize: `${noise.scale * 250}px`,
            opacity: noise.opacity + Math.max(...audioData) / 2000,
            mixBlendMode: 'overlay'
          }}
          animate={{ 
            backgroundPosition: ['0px 0px', '150px 75px', '300px 150px', '0px 0px'],
            filter: [
              'contrast(1)', 
              `contrast(1.1) hue-rotate(${Math.max(...audioData) / 3}deg)`, 
              'contrast(1)'
            ]
          }}
          transition={{ duration: 20 / noise.speed, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Audio Spectrum Visualization Bars */}
      <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center space-x-1 mix-blend-screen">
        {audioData.slice(0, 16).map((value, i) => (
          <motion.div
            key={i}
            className="w-3 origin-bottom"
            style={{
              background: `linear-gradient(to top, ${palette[i % palette.length]}, ${palette[(i + 1) % palette.length]})`,
              filter: `blur(1px) drop-shadow(0 0 8px ${palette[i % palette.length]})`
            }}
            animate={{ height: `${(value / 2) + 10}px` }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
    </div>
  );
};

export default QualiaBackground;