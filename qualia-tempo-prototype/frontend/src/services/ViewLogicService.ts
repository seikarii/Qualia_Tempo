/**
 * QUALIA.CODE v1.1 - ViewLogicService
 * Service responsible for processing game state and transforming it into visual properties.
 * Decouples useFrame logic from React components for better testability and reusability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IViewLogicService } from './interfaces/IViewLogicService';
import type { 
  ViewLogicConfig,
  BossVisualData, 
  PlayerVisualData, 
  ParticleData, 
  NoteVisualData 
} from './contracts/IViewLogicService.contracts';
import type { QualiaState } from '../types/contracts';
import type { ILogger } from './interfaces/ILogger';
import type { ITimerService } from './interfaces/ITimerService';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ViewLogicService implements IViewLogicService {
  private readonly config: ViewLogicConfig;
  private readonly logger: ILogger;
  // @ts-ignore - Reserved for future timer functionality
  private readonly _timerService: ITimerService;
  
  private particleIdCounter = 0;
  private activeParticles: ParticleData[] = [];

  constructor(
    @inject(TYPES.ViewLogicConfig) config: ViewLogicConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService
  ) {
    this.config = config;
    this.logger = logger;
    this._timerService = timerService;
    this.logger.info('ViewLogicService initialized', {
      maxParticles: this.config.particles.maxCount,
      spawnRate: this.config.particles.spawnRate
    });
  }

  @logMethod
  @catchError
  getBossVisuals(bossState: any, time: number): BossVisualData {
    // QUALIA.CODE v1.1: REAL visual logic extracted from BossRenderer
    const boss = bossState;
    // Power ratio calculation for future use
    // const powerRatio = boss.power_level / 200; // Assuming max 200
    const stressIntensity = boss.stress_level;
    const phaseMultiplier = boss.phase;

    // Calculate phase-based movement patterns (extracted from useFrame)
    let calculatedPosition: [number, number, number];
    let absoluteRotation: [number, number, number];
    
    if (boss.phase === 1) {
      // Slow, menacing movement  
      calculatedPosition = [
        boss.position[0],
        boss.position[1] + Math.sin(time * 0.5) * 0.3,
        boss.position[2]
      ];
      absoluteRotation = [0, time * 0.005, 0];
    } else if (boss.phase === 2) {
      // More aggressive movement
      calculatedPosition = [
        boss.position[0] + Math.cos(time * 0.8) * 0.5,
        boss.position[1] + Math.sin(time * 1.5) * 0.5,
        boss.position[2]
      ];
      absoluteRotation = [0, time * 0.01, Math.sin(time) * 0.01];
    } else {
      // Chaotic final phase movement
      calculatedPosition = [
        boss.position[0] + Math.cos(time * 2.1) * 1.0,
        boss.position[1] + Math.sin(time * 3) * 0.8,
        boss.position[2]
      ];
      absoluteRotation = [Math.sin(time * 1.3) * 0.02, time * 0.02, 0];
    }

    // Scale based on stress level (boss grows when stressed)
    const stressScale = 1 + stressIntensity * 0.3;

    // Boss color based on qualia state and stress
    const emotionalValence = boss.qualia_state?.emotional_valence || 0;
    const bossColor: [number, number, number] = [
      (emotionalValence + 1) * 0.15, // Red-ish hue for negative valence
      0.8 + stressIntensity * 0.2,
      0.3 + (1 - stressIntensity) * 0.4
    ];

    const stressColor: [number, number, number] = [
      0, // H
      1, // S  
      0.5 + stressIntensity * 0.3 // L
    ];

    // Core animation calculations
    const pulseScale = 1 + Math.sin(time * 4 * phaseMultiplier) * 0.2 * stressIntensity;
    const coreRotation: [number, number, number] = [
      time * 0.02 * phaseMultiplier,
      time * 0.015 * phaseMultiplier,
      0
    ];

    // Generate tentacle data
    const tentacleCount = 4 + boss.phase;
    const tentacles = Array.from({ length: tentacleCount }, (_, i) => {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const radius = 2 + phaseMultiplier * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const tentacleTime = time + i * 0.5;
      const tentacleScale = 0.8 + phaseMultiplier * 0.3;
      
      return {
        position: [x, 0, z] as [number, number, number],
        rotation: [
          0,
          angle + Math.sin(tentacleTime) * 0.01 * stressIntensity,
          Math.cos(tentacleTime * 1.2) * 0.015 * stressIntensity
        ] as [number, number, number],
        scale: tentacleScale
      };
    });

    // Attack pattern calculation
    const shouldShowAttack = Math.floor(time) % (4 / boss.phase) < 0.5;

    return {
      position: calculatedPosition,
      scale: [stressScale, stressScale, stressScale],
      rotation: absoluteRotation,
      color: bossColor,
      opacity: 0.8 + stressIntensity * 0.2,
      intensity: stressIntensity,
      phase: phaseMultiplier,
      
      core: {
        scale: pulseScale,
        rotation: coreRotation,
        color: stressColor,
        emissiveColor: [
          stressColor[0],
          stressColor[1],
          stressColor[2] * stressIntensity
        ],
        emissiveIntensity: stressIntensity
      },
      
      tentacles,
      
      shouldShowAttack,
      attackIntensity: stressIntensity * (shouldShowAttack ? 1.0 : 0.0)
    };
  }

  @logMethod
  @catchError
  getPlayerVisuals(playerData: any, performance: any, time: number): PlayerVisualData {
    const player = playerData;
    
    // Extract calculations from PlayerRenderer useFrame
    const powerLevel = player.power_level / 100; // Normalize to 0-1
    const consciousnessLevel = player.consciousness_level;
    const performanceLevel = (performance.accuracy + performance.rhythm_sync + performance.qualia_coherence) / 3;
    
    // Use CoordinateSystemService transformation (this will be injected later)
    const player3DPosition: [number, number, number] = [
      player.position[0],
      player.position[1] + Math.sin(time * 2) * 0.1 * consciousnessLevel, // Floating animation
      player.position[2]
    ];
    
    // Player colors based on qualia state (extracted from PlayerRenderer)
    const baseColor: [number, number, number] = [
      player.qualia_state.emotional_valence * 0.8 + 0.1, // Hue based on valence
      0.7 + player.qualia_state.arousal * 0.3, // Saturation based on arousal
      0.4 + player.qualia_state.coherence * 0.4 // Lightness based on coherence
    ];
    
    const auraColor: [number, number, number] = [
      (player.qualia_state.emotional_valence * 0.8 + 0.3) % 1,
      0.8,
      0.5 + performanceLevel * 0.3
    ];
    
    // Scale pulsing based on performance (extracted from PlayerRenderer)
    const scale = 1 + Math.sin(time * 4) * 0.05 * performanceLevel;
    
    // Rotation based on qualia state (extracted from PlayerRenderer)
    const absoluteRotation: [number, number, number] = [
      0,
      time * (player.qualia_state.emotional_valence - 0.5) * 0.005,
      0
    ];
    
    // Aura calculations (extracted from PlayerRenderer)
    const auraScale = 1 + powerLevel * 0.5 + performanceLevel * 0.3;
    const auraOpacity = 0.3 + Math.sin(time * 3) * 0.1 * performanceLevel;
    
    // Power core calculations (extracted from PlayerRenderer)
    const coreIntensity = powerLevel * performanceLevel;
    const coreScale = 0.5 + coreIntensity * 0.5;
    
    return {
      position: player3DPosition,
      scale: [scale, scale, scale],
      rotation: absoluteRotation,
      color: baseColor,
      glowIntensity: performanceLevel,
      trailOpacity: performanceLevel > 0.5 ? 0.7 : 0.3,
      isMoving: performanceLevel > 0.1,
      
      aura: {
        scale: auraScale,
        rotation: [
          Math.sin(time * 0.5) * 0.002,
          time * 0.01,
          0
        ],
        color: auraColor,
        opacity: auraOpacity
      },
      
      powerCore: {
        scale: coreScale,
        rotation: [
          time * 0.03,
          time * 0.02,
          0
        ],
        color: baseColor,
        emissiveIntensity: coreIntensity
      }
    };
  }

  @logMethod
  @catchError
  getQualiaFieldParticles(qualiaState: QualiaState, musicData: any, time: number): ParticleData[] {
    // Update existing particles
    this.updateExistingParticles(time);
    
    // Spawn new particles based on qualia state
    this.spawnQualiaParticles(qualiaState, musicData, time);
    
    return [...this.activeParticles];
  }

  @logMethod
  @catchError
  getMusicalNoteVisuals(notes: any[], time: number): NoteVisualData[] {
    return notes.map((note, index) => {
      const approachProgress = Math.max(0, 1 - (note.timing - time * 0.001) / 2); // 2 second approach time
      const pulseIntensity = Math.sin(time * 0.01 + index) * 0.5 + 0.5;
      
      return {
        id: note.id || `note_${index}`,
        position: note.position || [0, 0, 0],
        scale: [
          this.config.notes.scaleRange[0] + approachProgress * (this.config.notes.scaleRange[1] - this.config.notes.scaleRange[0]),
          this.config.notes.scaleRange[0] + approachProgress * (this.config.notes.scaleRange[1] - this.config.notes.scaleRange[0]),
          this.config.notes.scaleRange[0] + approachProgress * (this.config.notes.scaleRange[1] - this.config.notes.scaleRange[0])
        ] as [number, number, number],
        color: [
          0.9 + pulseIntensity * 0.1,
          0.5 + pulseIntensity * 0.3,
          0.2 + approachProgress * 0.5
        ] as [number, number, number],
        opacity: Math.min(1, approachProgress * 2),
        pulseIntensity: pulseIntensity,
        approachProgress: approachProgress
      };
    });
  }

  @logMethod
  @catchError
  getGridVisuals(playerPosition: { x: number; y: number }, activePositions: [number, number][], time: number): any {
    return {
      playerPosition,
      activePositions,
      pulseIntensity: Math.sin(time * 0.002) * 0.3 + 0.7,
      glowColor: [
        0.3 + Math.sin(time * 0.001) * 0.2,
        0.7,
        0.9 + Math.cos(time * 0.0015) * 0.1
      ] as [number, number, number]
    };
  }

  // Private helper methods
  // @ts-ignore - Reserved for future player glow calculations  
  private _calculatePlayerGlow(playerState: any, time: number): number {
    const baseGlow = Math.sin(time * 0.003) * 0.2 + 0.5;
    const healthMultiplier = (playerState?.health || 100) / 100;
    const comboMultiplier = Math.min(1.5, 1 + (playerState?.combo || 0) * 0.02);
    
    return Math.min(1, baseGlow * healthMultiplier * comboMultiplier);
  }

  private updateExistingParticles(_time: number): void {
    this.activeParticles = this.activeParticles.filter(particle => {
      particle.life += 16; // Assume 60fps, so ~16ms per frame
      
      // Update position based on velocity
      particle.position[0] += particle.velocity[0] * 0.016;
      particle.position[1] += particle.velocity[1] * 0.016;
      particle.position[2] += particle.velocity[2] * 0.016;
      
      // Fade out over time
      const lifeRatio = particle.life / particle.maxLife;
      particle.color[3] = Math.max(0, 1 - lifeRatio);
      
      return particle.life < particle.maxLife;
    });
  }

  private spawnQualiaParticles(qualiaState: QualiaState, _musicData: any, _time: number): void {
    if (this.activeParticles.length >= this.config.particles.maxCount) {
      return;
    }

    const spawnCount = Math.floor(this.config.particles.spawnRate * (qualiaState.intensity || 0.1));
    
    for (let i = 0; i < spawnCount; i++) {
      const particle: ParticleData = {
        id: `particle_${this.particleIdCounter++}`,
        position: [
          (Math.random() - 0.5) * 10,
          Math.random() * 5,
          (Math.random() - 0.5) * 10
        ] as [number, number, number],
        velocity: [
          (Math.random() - 0.5) * 2,
          Math.random() * 1 + 0.5,
          (Math.random() - 0.5) * 2
        ] as [number, number, number],
        color: [
          0.5 + (qualiaState.precision || 0) * 0.3,
          0.3 + (qualiaState.flow || 0) * 0.4,
          0.8 + (qualiaState.transcendence || 0) * 0.2,
          1.0
        ] as [number, number, number, number],
        size: 0.1 + Math.random() * 0.2,
        life: 0,
        maxLife: this.config.particles.baseLifetime + Math.random() * 1000,
        type: this.determineParticleType(qualiaState)
      };
      
      this.activeParticles.push(particle);
    }
  }

  private determineParticleType(qualiaState: QualiaState): 'qualia' | 'rhythm' | 'energy' {
    const intensity = qualiaState.intensity || 0;
    if (intensity > 0.7) return 'energy';
    if (qualiaState.flow && qualiaState.flow > 0.5) return 'rhythm';
    return 'qualia';
  }


}
