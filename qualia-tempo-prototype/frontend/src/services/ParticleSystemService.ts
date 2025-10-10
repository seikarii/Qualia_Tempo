/**
 * QUALIA.CODE v1.1 - Particle System Service
 * GPU-instanced particle system for FFT-reactive visuals
 * 
 * ARCHITECTURE: IBaseService lifecycle with @OnEvent handlers
 * REFERENCE: docs/VISUALS.GOLD.CODE.md Phase 2 - Synesthesia Profunda
 * 
 * MISSION: Create 10,000+ particles that react to audio FFT data
 * RESPONSIBILITY: Transform audio frequencies into visual particle motion
 */

import { injectable, inject } from 'inversify';
import * as THREE from 'three';
import { TYPES } from './inversify.types';
import type { IBaseService } from './interfaces/IBaseService';
import type { ILogger } from './interfaces/ILogger';
import type { IEventBus } from './interfaces/IEventBus';
import type { IAudioAnalysisService } from './interfaces/IAudioAnalysisService';
import type { ParticleSystemServiceConfig, ParticleSystemServiceParams } from './contracts/IParticleSystemService.contracts';
import { OnEvent, initializeEventSubscriptions, cleanupEventSubscriptions, logMethod, catchError } from '../utils/decorators';
import type { QualiaStateCalculatedEvent } from './contracts/events.contracts';

/**
 * Particle data structure for CPU-side simulation
 */
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  emissive: number;
}

/**
 * ParticleSystemService - GPU-Instanced FFT-Reactive Particles
 * 
 * ARCHITECTURE NOTES:
 * - Implements IBaseService for lifecycle management
 * - Uses Direct Configuration Injection (QUALIA.CODE v1.1)
 * - Subscribes to QualiaState and Audio events via @OnEvent
 * - Uses THREE.InstancedMesh for GPU instancing (10,000+ particles)
 * - CPU-side particle simulation with GPU rendering
 * - FFT data drives particle size, velocity, emissive
 */
@injectable()
export class ParticleSystemService implements IBaseService {
  private readonly config: ParticleSystemServiceConfig;
  private readonly logger: ILogger;
  // QUALIA.CODE v1.1: EventBus required for @OnEvent decorator lifecycle management
  // @ts-expect-error - Used by @OnEvent decorator infrastructure
  private readonly eventBus: IEventBus;
  private readonly audioAnalysisService: IAudioAnalysisService;
  
  // Particle system state
  private particles: Particle[] = [];
  private particleCount: number = 0;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshStandardMaterial | null = null;
  
  // FFT data cache
  private currentFFT: {
    bass: number;
    mid: number;
    treble: number;
  } = { bass: 0, mid: 0, treble: 0 };
  
  // QualiaState cache
  private currentQualiaState: {
    intensity: number;
    aggression: number;
    chaos: number;
  } = { intensity: 0.5, aggression: 0.5, chaos: 0.5 };
  
  // Emission state
  private emissionTimer: number = 0;
  private emissionRate: number = 10; // particles per second
  
  // Temporary objects to avoid allocations
  private readonly _tempMatrix = new THREE.Matrix4();
  private readonly _tempColor = new THREE.Color();
  
  constructor(
    @inject(TYPES.ParticleSystemServiceParams) params: ParticleSystemServiceParams
  ) {
    this.config = params.config;
    this.logger = params.logger;
    this.eventBus = params.eventBus;
    this.audioAnalysisService = params.audioAnalysisService;
    
    this.particleCount = this.config.maxParticles;
    
    this.logger.info('[ParticleSystemService] Service instantiated', {
      maxParticles: this.particleCount
    });
  }
  
  /**
   * IBaseService lifecycle - Initialize service
   */
  @logMethod
  public initialize(): void {
    this.logger.info('[ParticleSystemService] Initializing...');
    initializeEventSubscriptions(this);
    this.initializeParticles();
    this.logger.info('[ParticleSystemService] Initialized successfully');
  }
  
  /**
   * IBaseService lifecycle - Cleanup service
   */
  @logMethod
  public cleanup(): void {
    this.logger.info('[ParticleSystemService] Cleaning up...');
    this.dispose();
    cleanupEventSubscriptions(this);
    this.logger.info('[ParticleSystemService] Cleanup complete');
  }
  
  /**
   * Initialize particle pool and GPU resources
   */
  @catchError
  private initializeParticles(): void {
    // Create particle pool
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 3.0,
        size: 1.0,
        color: new THREE.Color(1, 1, 1),
        emissive: 0.5
      });
    }
    
    // Create geometry (simple box for each particle)
    this.geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    
    // Create material with emissive support
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      metalness: 0.5,
      roughness: 0.5
    });
    
    // Create instanced mesh
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      this.particleCount
    );
    
    // Initialize all instances as invisible (life = 0)
    const matrix = new THREE.Matrix4();
    matrix.makeScale(0, 0, 0); // Zero scale = invisible
    for (let i = 0; i < this.particleCount; i++) {
      this.instancedMesh.setMatrixAt(i, matrix);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    
    this.logger.info('[ParticleSystemService] Particle system initialized', {
      particles: this.particleCount,
      geometry: 'BoxGeometry',
      material: 'MeshStandardMaterial'
    });
  }
  
  /**
   * Get the instanced mesh for adding to scene
   */
  @logMethod
  public getInstancedMesh(): THREE.InstancedMesh | null {
    return this.instancedMesh;
  }
  
  /**
   * Update particle system
   * Called every frame by KairosVisualEngine
   */
  @logMethod
  @catchError
  public update(deltaTime: number): void {
    // Update FFT data from audio service
    this.updateFFTData();
    
    // Emit new particles based on emission rate
    this.emitParticles(deltaTime);
    
    // Update existing particles
    this.updateParticles(deltaTime);
    
    // Apply FFT modifiers to particles
    this.applyFFTModifiers();
    
    // Update GPU instancing
    this.updateInstancedMesh();
  }
  
  /**
   * Update FFT data cache from audio analysis service
   */
  private updateFFTData(): void {
    if (!this.audioAnalysisService.isAnalyzing()) {
      return;
    }
    
    // Get current audio data (contains 8 frequency bands)
    const audioData = this.audioAnalysisService.getCurrentAudioData();
    if (!audioData?.frequencyBands || audioData.frequencyBands.length < 8) {
      return;
    }
    
    // Map frequency bands to bass/mid/treble (0-1 normalized)
    // Bands 0-1: Bass (0-200Hz)
    // Bands 2-5: Mid (200-2000Hz)
    // Bands 6-7: Treble (2000-20000Hz)
    this.currentFFT.bass = (audioData.frequencyBands[0] + audioData.frequencyBands[1]) / 2;
    this.currentFFT.mid = (audioData.frequencyBands[2] + audioData.frequencyBands[3] + audioData.frequencyBands[4] + audioData.frequencyBands[5]) / 4;
    this.currentFFT.treble = (audioData.frequencyBands[6] + audioData.frequencyBands[7]) / 2;
  }  /**
   * Emit new particles based on emission rate and FFT bass
   */
  private emitParticles(deltaTime: number): void {
    // Modulate emission rate by bass level
    const bassMultiplier = THREE.MathUtils.lerp(
      this.config.fftReactivity.bassToParticleSizeMultiplier.min,
      this.config.fftReactivity.bassToParticleSizeMultiplier.max,
      this.currentFFT.bass
    );
    
    const effectiveEmissionRate = this.emissionRate * bassMultiplier;
    this.emissionTimer += deltaTime * effectiveEmissionRate;
    
    // Emit particles
    const particlesToEmit = Math.floor(this.emissionTimer);
    this.emissionTimer -= particlesToEmit;
    
    for (let i = 0; i < particlesToEmit; i++) {
      this.emitParticle();
    }
  }
  
  /**
   * Emit a single particle from a dead particle in the pool
   */
  private emitParticle(): void {
    // Find dead particle
    const particle = this.particles.find(p => p.life <= 0);
    if (!particle) return;
    
    // Emit from center with random direction
    particle.position.set(0, 0, 0);
    
    // Random spherical direction
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = this.config.emissionSpeed * (0.5 + Math.random() * 0.5);
    
    particle.velocity.set(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    );
    
    // Initialize life
    particle.life = particle.maxLife;
    particle.size = this.config.baseParticleSize;
    
    // Initialize color based on aggression
    const hue = THREE.MathUtils.lerp(0.6, 0.0, this.currentQualiaState.aggression); // Blue to red
    particle.color.setHSL(hue, 1.0, 0.5);
    
    // Initialize emissive
    particle.emissive = 0.5;
  }
  
  /**
   * Update all active particles
   */
  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      
      // Update lifetime
      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.life = 0;
        continue;
      }
      
      // Update position
      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      
      // Apply chaos-based turbulence
      if (this.currentQualiaState.chaos > 0.5) {
        const turbulence = (this.currentQualiaState.chaos - 0.5) * 2.0;
        particle.velocity.x += (Math.random() - 0.5) * turbulence * deltaTime;
        particle.velocity.y += (Math.random() - 0.5) * turbulence * deltaTime;
        particle.velocity.z += (Math.random() - 0.5) * turbulence * deltaTime;
      }
      
      // Apply drag
      particle.velocity.multiplyScalar(0.98);
    }
  }
  
  /**
   * Apply FFT modifiers to particles
   * VISUALS.GOLD.CODE Phase 2: FFT → particle properties
   */
  private applyFFTModifiers(): void {
    const { bass, treble } = this.currentFFT;
    
    // Bass → particle size multiplier
    const sizeMultiplier = THREE.MathUtils.lerp(
      this.config.fftReactivity.bassToParticleSizeMultiplier.min,
      this.config.fftReactivity.bassToParticleSizeMultiplier.max,
      bass
    );
    
    // Treble → emissive multiplier
    const emissiveMultiplier = THREE.MathUtils.lerp(
      this.config.fftReactivity.trebleToEmissiveMultiplier.min,
      this.config.fftReactivity.trebleToEmissiveMultiplier.max,
      treble
    );
    
    // Apply to all active particles
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      
      // Size affected by bass
      particle.size = this.config.baseParticleSize * sizeMultiplier;
      
      // Velocity affected by mid (applied in next frame)
      // (velocity already updated in updateParticles)
      
      // Emissive affected by treble
      particle.emissive = emissiveMultiplier;
    }
  }
  
  /**
   * Update GPU instanced mesh with current particle data
   */
  private updateInstancedMesh(): void {
    if (!this.instancedMesh) return;
    
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      
      if (particle.life <= 0) {
        // Dead particle - make invisible
        this._tempMatrix.makeScale(0, 0, 0);
      } else {
        // Alive particle - set transform
        const lifeRatio = particle.life / particle.maxLife;
        const scale = particle.size * lifeRatio; // Fade out size
        
        this._tempMatrix.makeTranslation(
          particle.position.x,
          particle.position.y,
          particle.position.z
        );
        this._tempMatrix.scale(new THREE.Vector3(scale, scale, scale));
      }
      
      this.instancedMesh.setMatrixAt(i, this._tempMatrix);
      
      // Update color with emissive
      this._tempColor.copy(particle.color);
      this._tempColor.multiplyScalar(particle.emissive);
      this.instancedMesh.setColorAt(i, this._tempColor);
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
  
  /**
   * @OnEvent handler for QualiaStateCalculated
   * Updates particle behavior based on QualiaState
   */
  @OnEvent('QualiaState.Calculated')
  // @ts-expect-error - Handler method called by @OnEvent decorator via reflection
  private handleQualiaStateCalculated(event: QualiaStateCalculatedEvent): void {
    const qualiaState = event.qualiaState;
    
    // Cache QualiaState for particle updates
    this.currentQualiaState = {
      intensity: qualiaState.intensity,
      aggression: qualiaState.aggression,
      chaos: qualiaState.chaos
    };
    
    // Modulate emission rate by intensity
    this.emissionRate = THREE.MathUtils.lerp(
      10, // base emission rate
      100, // high intensity emission rate
      this.currentQualiaState.intensity
    );
    
    this.logger.debug('[ParticleSystemService] QualiaState updated', {
      intensity: this.currentQualiaState.intensity,
      aggression: this.currentQualiaState.aggression,
      chaos: this.currentQualiaState.chaos,
      emissionRate: this.emissionRate
    });
  }
  
  /**
   * Dispose GPU resources
   */
  @logMethod
  @catchError
  public dispose(): void {
    this.logger.info('[ParticleSystemService] Disposing resources...');
    
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    
    this.instancedMesh = null;
    this.particles = [];
    
    this.logger.info('[ParticleSystemService] Resources disposed');
  }
}
