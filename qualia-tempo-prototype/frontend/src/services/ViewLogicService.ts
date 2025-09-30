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
import type { IBrowserEventsService } from './interfaces/IBrowserEventsService';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ViewLogicService implements IViewLogicService {
  private readonly config: ViewLogicConfig;
  private readonly logger: ILogger;
  private readonly timerService: ITimerService;
  private readonly browserEventsService: IBrowserEventsService;
  
  private particleIdCounter = 0;
  private activeParticles: ParticleData[] = [];

  constructor(
    @inject(TYPES.ViewLogicConfig) config: ViewLogicConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ITimerService) timerService: ITimerService,
    @inject(TYPES.IBrowserEventsService) browserEventsService: IBrowserEventsService
  ) {
    this.config = config;
    this.logger = logger;
    this.timerService = timerService;
    this.browserEventsService = browserEventsService;
    this.logger.info('ViewLogicService initialized', {
      maxParticles: this.config.particles.maxCount,
      spawnRate: this.config.particles.spawnRate
    });
  }

  @logMethod
  @catchError
  getBossVisuals(bossState: any, time: number): BossVisualData {
    const phase = Math.sin(time * 0.001) * 0.5 + 0.5; // Oscillate between 0 and 1
    const intensity = bossState?.intensity || 0.5;
    
    return {
      position: [0, 2, -5] as [number, number, number],
      scale: [
        this.config.boss.baseScale * (1 + intensity * this.config.boss.intensityMultiplier),
        this.config.boss.baseScale * (1 + intensity * this.config.boss.intensityMultiplier),
        this.config.boss.baseScale * (1 + intensity * this.config.boss.intensityMultiplier)
      ] as [number, number, number],
      rotation: [0, time * 0.0005, 0] as [number, number, number],
      color: [
        0.8 + intensity * 0.2,
        0.3 + phase * 0.4,
        0.9 - intensity * 0.3
      ] as [number, number, number],
      opacity: 0.8 + intensity * 0.2,
      intensity: intensity,
      phase: phase
    };
  }

  @logMethod
  @catchError
  getPlayerVisuals(playerState: any, time: number): PlayerVisualData {
    const position = playerState?.position || { x: 0, y: 0 };
    const isMoving = playerState?.isMoving || false;
    const glowIntensity = this.calculatePlayerGlow(playerState, time);
    
    return {
      position: [position.x, 0.5, position.y] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      rotation: [0, time * 0.001, 0] as [number, number, number],
      color: [
        0.3 + glowIntensity * 0.4,
        0.8 + glowIntensity * 0.2,
        1.0
      ] as [number, number, number],
      glowIntensity: glowIntensity,
      trailOpacity: isMoving ? 0.7 : 0.3,
      isMoving: isMoving
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
  private calculatePlayerGlow(playerState: any, time: number): number {
    const baseGlow = Math.sin(time * 0.003) * 0.2 + 0.5;
    const healthMultiplier = (playerState?.health || 100) / 100;
    const comboMultiplier = Math.min(1.5, 1 + (playerState?.combo || 0) * 0.02);
    
    return Math.min(1, baseGlow * healthMultiplier * comboMultiplier);
  }

  private updateExistingParticles(time: number): void {
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

  private spawnQualiaParticles(qualiaState: QualiaState, musicData: any, time: number): void {
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

  @logMethod
  addWindowEventListener<K extends keyof WindowEventMap>(
    event: K,
    handler: (event: WindowEventMap[K]) => void
  ): void {
    this.browserEventsService.addWindowEventListener(event, handler);
  }

  @logMethod
  removeWindowEventListener<K extends keyof WindowEventMap>(
    event: K,
    handler: (event: WindowEventMap[K]) => void
  ): void {
    this.browserEventsService.removeWindowEventListener(event, handler);
  }
}
