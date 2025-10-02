/**
 * QUALIA.CODE v1.1 - ViewLogicService
 * Service responsible for processing game state and transforming it into visual properties.
 * Decouples useFrame logic from React components for better testability and reusability.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IViewLogicService, BossState, PlayerState, PerformanceData, MusicData } from './interfaces/IViewLogicService';
import type { 
  ViewLogicConfig,
  BossVisualData, 
  PlayerVisualData, 
  ParticleData, 
  NoteVisualData,
  QualiaFieldVisualData,
  GridVisualData,
  TileVisualData,
  GetGridVisualsParams
} from './contracts/IViewLogicService.contracts';
import type { QualiaState, NoteData } from '../types/contracts';
import type { ILogger } from './interfaces/ILogger';
import type { ICoordinateSystemService } from './interfaces/ICoordinateSystemService';
import type { IColorService } from './interfaces/IColorService';
import { logMethod, catchError } from '../utils/decorators';
import { NOTE_GEOMETRY_TYPES } from './contracts/constants';

@injectable()
export class ViewLogicService implements IViewLogicService {
  private readonly config: ViewLogicConfig;
  private readonly logger: ILogger;
  private readonly coordinateSystemService: ICoordinateSystemService;
  private readonly colorService: IColorService;
  
  private particleIdCounter = 0;
  private activeParticles: ParticleData[] = [];

  constructor(
    @inject(TYPES.ViewLogicConfig) config: ViewLogicConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ICoordinateSystemService) coordinateSystemService: ICoordinateSystemService,
    @inject(TYPES.IColorService) colorService: IColorService
  ) {
    this.config = config;
    this.logger = logger;
    this.coordinateSystemService = coordinateSystemService;
    this.colorService = colorService;
    this.logger.info('ViewLogicService initialized', {
      maxParticles: this.config.particles.maxCount,
      spawnRate: this.config.particles.spawnRate
    });
  }

  private calculateBossPosition(boss: BossState, time: number): [number, number, number] {
    if (boss.phase === 1) {
      // Slow, menacing movement  
      return [
        boss.position[0],
        boss.position[1] + Math.sin(time * 0.5) * 0.3,
        boss.position[2]
      ];
    } else if (boss.phase === 2) {
      // More aggressive movement
      return [
        boss.position[0] + Math.cos(time * 0.8) * 0.5,
        boss.position[1] + Math.sin(time * 1.5) * 0.5,
        boss.position[2]
      ];
    } else {
      // Chaotic final phase movement
      return [
        boss.position[0] + Math.cos(time * 2.1) * 1.0,
        boss.position[1] + Math.sin(time * 3) * 0.8,
        boss.position[2]
      ];
    }
  }

  private calculateBossRotation(boss: BossState, time: number): [number, number, number] {
    if (boss.phase === 1) {
      return [0, time * 0.005, 0];
    } else if (boss.phase === 2) {
      return [0, time * 0.01, Math.sin(time) * 0.01];
    } else {
      return [Math.sin(time * 1.3) * 0.02, time * 0.02, 0];
    }
  }

  @logMethod
  @catchError
  getBossVisuals(bossState: BossState, time: number): BossVisualData {
    const boss = bossState;
    const stressIntensity = boss.stress_level;
    const phaseMultiplier = boss.phase;
    
    const calculatedPosition = this.calculateBossPosition(boss, time);
    const absoluteRotation = this.calculateBossRotation(boss, time);
    const stressScale = 1 + stressIntensity * 0.3;
    
    const bossColor = this.calculateBossColor(boss, stressIntensity);
    const stressColor = this.calculateStressColor(stressIntensity);
    const coreData = this.calculateBossCoreData(time, phaseMultiplier, stressIntensity, stressColor);
    
    const tentacles = this.generateBossTentacles(boss, time, phaseMultiplier, stressIntensity);
    const powerParticles = this.generateBossPowerParticles(boss, time);
    const { shouldShowAttack, attackWaves } = this.generateBossAttackWaves(boss, time);
    const chaosAura = this.calculateBossChaosAura(boss, stressIntensity, stressColor);

    return {
      position: calculatedPosition,
      scale: [stressScale, stressScale, stressScale],
      rotation: absoluteRotation,
      color: bossColor,
      opacity: 0.8 + stressIntensity * 0.2,
      intensity: stressIntensity,
      phase: phaseMultiplier,
      core: coreData,
      tentacles,
      powerParticles,
      attackWaves,
      chaosAura,
      shouldShowAttack,
      attackIntensity: stressIntensity * (shouldShowAttack ? 1.0 : 0.0)
    };
  }

  private calculateBossColor(boss: BossState, stressIntensity: number): [number, number, number] {
    const emotionalValence = boss.qualia_state?.emotional_valence ?? 0;
    return [
      (emotionalValence + 1) * 0.15,
      0.8 + stressIntensity * 0.2,
      0.3 + (1 - stressIntensity) * 0.4
    ];
  }

  private calculateStressColor(stressIntensity: number): [number, number, number] {
    return [0, 1, 0.5 + stressIntensity * 0.3];
  }

  private calculateBossCoreData(time: number, phaseMultiplier: number, stressIntensity: number, stressColor: [number, number, number]) {
    const pulseScale = 1 + Math.sin(time * 4 * phaseMultiplier) * 0.2 * stressIntensity;
    const coreRotation: [number, number, number] = [
      time * 0.02 * phaseMultiplier,
      time * 0.015 * phaseMultiplier,
      0
    ];
    
    return {
      scale: pulseScale,
      rotation: coreRotation,
      color: stressColor,
      emissiveColor: [stressColor[0], stressColor[1], stressColor[2] * stressIntensity] as [number, number, number],
      emissiveIntensity: stressIntensity
    };
  }

  private generateBossTentacles(boss: BossState, time: number, phaseMultiplier: number, stressIntensity: number) {
    const tentacleCount = 4 + boss.phase;
    return Array.from({ length: tentacleCount }, (_, i) => {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const radius = 2 + phaseMultiplier * 0.5;
      const tentacleTime = time + i * 0.5;
      const tentacleScale = 0.8 + phaseMultiplier * 0.3;
      
      const segments = this.generateTentacleSegments(tentacleTime);
      
      return {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
        rotation: [
          0,
          angle + Math.sin(tentacleTime) * 0.01 * stressIntensity,
          Math.cos(tentacleTime * 1.2) * 0.015 * stressIntensity
        ] as [number, number, number],
        scale: tentacleScale,
        segments
      };
    });
  }

  private generateTentacleSegments(tentacleTime: number) {
    return Array.from({ length: 6 }, (_, segmentIndex) => {
      const segmentY = segmentIndex * 0.8;
      const segmentSway = Math.sin(tentacleTime + segmentIndex * 0.3) * 0.2;
      
      return {
        position: [segmentSway, segmentY, 0] as [number, number, number],
        rotation: [0, 0, segmentSway * 0.1] as [number, number, number],
        scale: 1 - segmentIndex * 0.1
      };
    });
  }

  private generateBossPowerParticles(boss: BossState, time: number) {
    const particleCount = Math.floor(boss.power_level * this.config.boss.particleMultiplier);
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / this.config.boss.particleAngleDivisor) * Math.PI * 2;
      const radius = this.config.boss.baseRadius + Math.sin(time + i) * this.config.boss.radiusVariation;
      const height = Math.cos(time * 0.5 + i) * this.config.boss.heightMultiplier;
      
      return {
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius] as [number, number, number],
        scale: this.config.boss.particleScale,
        opacity: this.config.boss.particleOpacity
      };
    });
  }

  private generateBossAttackWaves(boss: BossState, time: number) {
    const shouldShowAttack = Math.floor(time) % (4 / boss.phase) < 0.5;
    const attackWaves = shouldShowAttack ? Array.from({ length: boss.phase * 2 }, (_, i) => {
      const angle = (i / (boss.phase * 2)) * Math.PI * 2;
      const radius = 5 + Math.sin(time * 2 + i) * 2;
      const attackRotation = this.calculateAttackRotation(boss.phase, time);
      
      return {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
        rotation: attackRotation,
        scale: 1,
        opacity: 0.6
      };
    }) : [];
    
    return { shouldShowAttack, attackWaves };
  }

  private calculateAttackRotation(phase: number, time: number): [number, number, number] {
    if (phase === 1) {
      return [0, time * 0.05, 0];
    } else if (phase === 2) {
      return [time * 0.03, time * 0.08, 0];
    } else {
      return [
        Math.cos(time * 1.7) * 0.08,
        Math.sin(time * 2) * 0.1,
        Math.sin(time * 2.3) * 0.05
      ];
    }
  }

  private calculateBossChaosAura(boss: BossState, stressIntensity: number, stressColor: [number, number, number]) {
    return {
      scale: 3 + boss.phase,
      opacity: 0.1 + stressIntensity * 0.2,
      color: stressColor
    };
  }

  @logMethod
  @catchError
  getPlayerVisuals(playerState: PlayerState, performance: PerformanceData, time: number): PlayerVisualData {
    const player = playerState;
    const powerLevel = player.power_level / 100;
    const consciousnessLevel = player.consciousness_level;
    const performanceLevel = (performance.accuracy + performance.rhythm_sync + performance.qualia_coherence) / 3;
    
    const player3DPosition = this.calculatePlayer3DPosition(player, time, consciousnessLevel);
    const { baseColor, auraColor } = this.calculatePlayerColors(player, performanceLevel);
    const scale = 1 + Math.sin(time * 4) * 0.05 * performanceLevel;
    const absoluteRotation = this.calculatePlayerRotation(player, time);
    
    const auraData = this.calculatePlayerAura(powerLevel, performanceLevel, time, auraColor);
    const powerCoreData = this.calculatePlayerPowerCore(player, powerLevel, performanceLevel, time);
    
    return {
      position: player3DPosition,
      scale: [scale, scale, scale],
      rotation: absoluteRotation,
      color: baseColor,
      glowIntensity: performanceLevel,
      trailOpacity: performanceLevel > 0.5 ? 0.7 : 0.3,
      isMoving: performanceLevel > 0.1,
      aura: auraData,
      powerCore: powerCoreData
    };
  }

  private calculatePlayer3DPosition(player: PlayerState, time: number, consciousnessLevel: number): [number, number, number] {
    const basePlayer3DPosition = this.coordinateSystemService.gridToWorld(
      player.position[0],
      player.position[2]
    );
    
    return [
      basePlayer3DPosition[0],
      basePlayer3DPosition[1] + Math.sin(time * 2) * 0.1 * consciousnessLevel,
      basePlayer3DPosition[2]
    ];
  }

  private calculatePlayerColors(player: PlayerState, performanceLevel: number) {
    const hsl = {
      h: player.qualia_state.emotional_valence * 0.8 + 0.1,
      s: 0.7 + player.qualia_state.arousal * 0.3,
      l: 0.4 + player.qualia_state.coherence * 0.4
    };
    const baseColor = this.colorService.hslToRgb(hsl.h, hsl.s, hsl.l);
    
    const auraHsl = {
      h: (player.qualia_state.emotional_valence * 0.8 + 0.3) % 1,
      s: 0.8,
      l: 0.5 + performanceLevel * 0.3
    };
    const auraColor = this.colorService.hslToRgb(auraHsl.h, auraHsl.s, auraHsl.l);
    
    return { baseColor, auraColor };
  }

  private calculatePlayerRotation(player: PlayerState, time: number): [number, number, number] {
    return [
      0,
      time * (player.qualia_state.emotional_valence - 0.5) * 0.005,
      0
    ];
  }

  private calculatePlayerAura(powerLevel: number, performanceLevel: number, time: number, auraColor: [number, number, number]) {
    const auraScale = 1 + powerLevel * 0.5 + performanceLevel * 0.3;
    const auraOpacity = 0.3 + Math.sin(time * 3) * 0.1 * performanceLevel;
    const auraRotation: [number, number, number] = [
      Math.sin(time * 0.5) * 0.002,
      time * 0.01,
      0
    ];
    
    return {
      scale: auraScale,
      rotation: auraRotation,
      color: auraColor,
      opacity: auraOpacity
    };
  }

  private calculatePlayerPowerCore(player: PlayerState, powerLevel: number, performanceLevel: number, time: number) {
    const coreIntensity = powerLevel * performanceLevel;
    const coreScale = 0.5 + coreIntensity * 0.5;
    const coreRotation: [number, number, number] = [time * 0.03, time * 0.02, 0];
    
    const coreHsl = {
      h: (player.qualia_state.emotional_valence + time * 0.1) % 1,
      s: 0.9,
      l: 0.6 + coreIntensity * 0.4
    };
    const coreColor = this.colorService.hslToRgb(coreHsl.h, coreHsl.s, coreHsl.l);
    
    return {
      scale: coreScale,
      rotation: coreRotation,
      color: coreColor,
      emissiveIntensity: coreIntensity
    };
  }

  @logMethod
  @catchError
  getQualiaFieldVisuals(qualiaField: QualiaState, musicData: MusicData, time: number): QualiaFieldVisualData {
    const particleCount = Math.floor(this.config.qualiaField.particleCountMultiplier * qualiaField.flow + this.config.qualiaField.particleCountBase);
    const { positions, colors, sizes } = this.generateFieldParticleData(particleCount, qualiaField, musicData, time);
    const wavePositions = this.generateWavePlanePositions(qualiaField, time);
    const ambientSpheres = this.generateAmbientSpheres(qualiaField, musicData, time);

    return {
      fieldParticles: {
        positions,
        colors,
        sizes,
        count: particleCount,
        rotation: [Math.sin(time * 0.5) * 0.002, time * (musicData.order_influence - 0.5) * 0.005, 0] as [number, number, number],
        materialSize: 0.1 + musicData.intensity * 0.3,
        materialOpacity: 0.6 + qualiaField.flow * 0.4
      },
      wavePlane: {
        positions: wavePositions,
        position: [0, -2, 0] as [number, number, number],
        rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
        color: this.colorService.hslToRgb(musicData.emotional_valence, 0.6, 0.4),
        opacity: 0.3 + musicData.intensity * 0.4
      },
      ambientSpheres
    };
  }

  private generateFieldParticleData(particleCount: number, qualiaField: QualiaState, musicData: MusicData, time: number) {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.setParticlePosition(i, positions, musicData);
      this.setParticleColor(i, colors, qualiaField, musicData);
      this.setParticleSize(i, positions, sizes, musicData);
    }

    this.applyWaveAnimation({ positions, colors, qualiaField, musicData, time });
    return { positions, colors, sizes };
  }

  private setParticlePosition(i: number, positions: Float32Array, musicData: MusicData) {
    const i3 = i * 3;
    const orderFactor = musicData.order_influence;
    const chaosFactor = musicData.chaos_influence;

    if (orderFactor > chaosFactor) {
      const gridSize = Math.ceil(Math.pow(positions.length / 3, 1 / 3));
      const x = (i % gridSize) - gridSize / 2;
      const y = (Math.floor(i / gridSize) % gridSize) - gridSize / 2;
      const z = Math.floor(i / (gridSize * gridSize)) - gridSize / 2;

      positions[i3] = x * this.config.qualiaField.gridSpacing + (Math.random() - 0.5) * this.config.qualiaField.orderRandomness * (1 - orderFactor);
      positions[i3 + 1] = y * this.config.qualiaField.gridSpacing + (Math.random() - 0.5) * this.config.qualiaField.orderRandomness * (1 - orderFactor);
      positions[i3 + 2] = z * this.config.qualiaField.gridSpacing + (Math.random() - 0.5) * this.config.qualiaField.orderRandomness * (1 - orderFactor);
    } else {
      positions[i3] = (Math.random() - 0.5) * this.config.qualiaField.chaosSpread * chaosFactor;
      positions[i3 + 1] = (Math.random() - 0.5) * this.config.qualiaField.chaosSpread * chaosFactor;
      positions[i3 + 2] = (Math.random() - 0.5) * this.config.qualiaField.chaosSpread * chaosFactor;
    }
  }

  private setParticleColor(i: number, colors: Float32Array, qualiaField: QualiaState, musicData: MusicData) {
    const i3 = i * 3;
    const hue = (musicData.emotional_valence * this.config.qualiaField.colorHueRange + i * 10) % this.config.qualiaField.colorHueRange;
    const saturation = this.config.qualiaField.colorSaturationBase + qualiaField.intensity * this.config.qualiaField.colorSaturationIntensityMultiplier;
    const lightness = this.config.qualiaField.colorLightnessBase + qualiaField.precision * this.config.qualiaField.colorLightnessPrecisionMultiplier;

    const [r, g, b] = this.colorService.hslToRgb(hue / 360, saturation, lightness);
    colors[i3] = r;
    colors[i3 + 1] = g;
    colors[i3 + 2] = b;
  }

  private setParticleSize(i: number, positions: Float32Array, sizes: Float32Array, musicData: MusicData) {
    const i3 = i * 3;
    const distance = Math.sqrt(positions[i3] * positions[i3] + positions[i3 + 1] * positions[i3 + 1] + positions[i3 + 2] * positions[i3 + 2]);
    sizes[i] = (0.1 + musicData.intensity * 0.5) * (1 + Math.sin(distance * 0.1) * 0.3);
  }

  private applyWaveAnimation(animationData: {
    positions: Float32Array;
    colors: Float32Array;
    qualiaField: QualiaState;
    musicData: MusicData;
    time: number;
  }) {
    const { positions, colors, qualiaField, musicData, time } = animationData;
    const waveAmplitude = musicData.intensity * 0.5;
    const waveFrequency = musicData.harmony * 2 + 1;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time * waveFrequency + positions[i] * 0.1) * waveAmplitude * 0.01;

      const hueShift = (time * 0.1 + i * 0.01) % 1;
      const baseHue = (musicData.emotional_valence + hueShift) % 1;
      const [r, g, b] = this.colorService.hslToRgb(baseHue, 0.7, 0.5 + qualiaField.intensity * 0.3);

      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }
  }

  private generateWavePlanePositions(qualiaField: QualiaState, time: number): Float32Array {
    const gridSize = this.config.qualiaField.waveGridSize;
    const planeSize = this.config.qualiaField.wavePlaneSize;
    const centerOffset = this.config.qualiaField.waveCenterOffset;
    const wavePositions = new Float32Array((gridSize + 1) * (gridSize + 1) * 3);
    let posIndex = 0;

    for (let x = 0; x <= gridSize; x++) {
      for (let z = 0; z <= gridSize; z++) {
        const worldX = (x - centerOffset) * (planeSize / gridSize);
        const worldZ = (z - centerOffset) * (planeSize / gridSize);
        const distance = Math.sqrt(worldX * worldX + worldZ * worldZ);

        wavePositions[posIndex] = worldX;
        wavePositions[posIndex + 1] = Math.sin(distance * this.config.qualiaField.waveFrequency - time * this.config.qualiaField.waveTimeMultiplier) * qualiaField.intensity * this.config.qualiaField.waveAmplitudeAlpha + Math.cos(worldX * this.config.qualiaField.waveFrequencyX + time) * qualiaField.precision * this.config.qualiaField.waveAmplitudeBeta;
        wavePositions[posIndex + 2] = worldZ;
        posIndex += 3;
      }
    }

    return wavePositions;
  }

  private generateAmbientSpheres(qualiaField: QualiaState, musicData: MusicData, time: number) {
    return Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(time * 0.001 + i) * 2;

      const sphereHue = (musicData.emotional_valence + i * 0.2) % 1;
      const [r, g, b] = this.colorService.hslToRgb(sphereHue, 0.8, 0.6);

      return {
        position: [x, y, z] as [number, number, number],
        color: [r, g, b] as [number, number, number],
        opacity: 0.4 + qualiaField.intensity * 0.4,
        scale: 0.5
      };
    });
  }

  @logMethod
  @catchError
  getQualiaFieldParticles(qualiaState: QualiaState, musicData: MusicData, time: number): ParticleData[] {
    // Update existing particles
    this.updateExistingParticles(time);
    
    // Spawn new particles based on qualia state
    this.spawnQualiaParticles(qualiaState, musicData, time);
    
    return [...this.activeParticles];
  }

  /**
   * Maps note type string to standardized geometry type
   * QUALIA.CODE v1.1: Eliminates hardcoded logic in components
   */
  private mapNoteTypeToGeometry(type?: string): string {
    if (!type) return NOTE_GEOMETRY_TYPES.DEFAULT;
    
    const typeUpper = type.toUpperCase();
    switch (typeUpper) {
      case 'HARMONY':
        return NOTE_GEOMETRY_TYPES.HARMONY;
      case 'CHAOS':
        return NOTE_GEOMETRY_TYPES.CHAOS;
      case 'POWER':
        return NOTE_GEOMETRY_TYPES.POWER;
      case 'GRACE':
        return NOTE_GEOMETRY_TYPES.GRACE;
      default:
        return NOTE_GEOMETRY_TYPES.DEFAULT;
    }
  }

  @logMethod
  @catchError
  getMusicalNoteVisuals(notes: NoteData[], currentTime: number): NoteVisualData[] {
    return notes.map((note, index) => {
      if (note.state === 'hit') {
        return this.createHitNoteVisual(note, index);
      }
      if (note.state === 'missed') {
        return this.createMissedNoteVisual(note, index);
      }
      return this.createActiveNoteVisual(note, index, currentTime);
    });
  }

  private createHitNoteVisual(note: NoteData, index: number): NoteVisualData {
    return {
      id: note.id || `note_${index}`,
      position: [note.position.x, note.position.y, 0] as [number, number, number],
      scale: [2, 2, 2] as [number, number, number],
      color: [1, 1, 1] as [number, number, number],
      opacity: 0,
      pulseIntensity: 1,
      approachProgress: 1,
      geometryType: this.mapNoteTypeToGeometry(note.qualia_signature),
      rotation: [0, 0, 0] as [number, number, number],
      trail: { visible: true, color: [1, 1, 1] as [number, number, number], intensity: 1, scale: 2, opacity: 0.8 },
      isActive: true,
      isInHitWindow: true,
      isMissed: false,
      isPerfectTiming: true
    };
  }

  private createMissedNoteVisual(note: NoteData, index: number): NoteVisualData {
    return {
      id: note.id || `note_${index}`,
      position: [note.position.x, note.position.y, 0] as [number, number, number],
      scale: [0.8, 0.8, 0.8] as [number, number, number],
      color: [0.3, 0.3, 0.3] as [number, number, number],
      opacity: 0,
      pulseIntensity: 0,
      approachProgress: 1,
      geometryType: this.mapNoteTypeToGeometry(note.qualia_signature),
      rotation: [0, 0, 0] as [number, number, number],
      trail: { visible: false, color: [0.3, 0.3, 0.3] as [number, number, number], intensity: 0, scale: 0, opacity: 0 },
      isActive: true,
      isInHitWindow: false,
      isMissed: true,
      isPerfectTiming: false
    };
  }

  private createActiveNoteVisual(note: NoteData, index: number, currentTime: number): NoteVisualData {
    const timeDiff = note.timestamp - currentTime;
    const timingData = this.calculateNoteTiming(timeDiff);
    
    if (!timingData.isActive) {
      return this.createInactiveNoteVisual(note, index);
    }

    const progress = (5 - timeDiff) / 5;
    const finalPosition: [number, number, number] = [note.position.x, note.position.y, -progress * 8];
    const baseScale = timingData.isInHitWindow ? 1.2 + Math.sin(currentTime * 0.01) * 0.2 : 1;
    const rotation = this.calculateNoteRotation(currentTime);
    const opacity = timingData.isMissed ? 0.3 : Math.max(0.1, 1 - Math.abs(timeDiff) / 5);
    const noteColor = this.getNoteColorBySignature(note.qualia_signature, timeDiff, currentTime);
    const pulseIntensity = timingData.isPerfectTiming ? Math.sin(currentTime * 0.01) * 0.3 + 0.7 : 0;
    const trailData = this.calculateNoteTrail(timingData.isInHitWindow, progress, noteColor, currentTime);

    return {
      id: note.id || `note_${index}`,
      position: finalPosition,
      scale: [baseScale, baseScale, baseScale] as [number, number, number],
      color: noteColor,
      opacity,
      pulseIntensity,
      approachProgress: progress,
      geometryType: this.mapNoteTypeToGeometry(note.qualia_signature),
      rotation,
      trail: trailData,
      ...timingData
    };
  }

  private calculateNoteTiming(timeDiff: number) {
    return {
      isActive: timeDiff > -1 && timeDiff < 5,
      isInHitWindow: Math.abs(timeDiff) < 0.5,
      isMissed: timeDiff < -0.5,
      isPerfectTiming: Math.abs(timeDiff) < 0.1
    };
  }

  private createInactiveNoteVisual(note: NoteData, index: number): NoteVisualData {
    return {
      id: note.id || `note_${index}`,
      position: [note.position.x, note.position.y, 0] as [number, number, number],
      scale: [0, 0, 0] as [number, number, number],
      color: [0, 0, 0] as [number, number, number],
      opacity: 0,
      pulseIntensity: 0,
      approachProgress: 0,
      geometryType: this.mapNoteTypeToGeometry(note.qualia_signature),
      rotation: [0, 0, 0] as [number, number, number],
      trail: { visible: false, color: [0, 0, 0] as [number, number, number], intensity: 0, scale: 0, opacity: 0 },
      isActive: false,
      isInHitWindow: false,
      isMissed: false,
      isPerfectTiming: false
    };
  }

  private calculateNoteRotation(currentTime: number): [number, number, number] {
    const rotationSpeed = this.config.notes.rotationSpeed || 0.01;
    return [
      currentTime * rotationSpeed,
      currentTime * rotationSpeed * 0.7,
      currentTime * rotationSpeed * 0.3
    ];
  }

  private calculateNoteTrail(isInHitWindow: boolean, progress: number, noteColor: [number, number, number], currentTime: number) {
    const trailVisible = isInHitWindow || progress > 0.8;
    const trailIntensity = Math.max(0, Math.min(1, progress * 2));
    
    return {
      visible: trailVisible,
      color: noteColor,
      intensity: trailIntensity,
      scale: 0.5 + Math.sin(currentTime * 2) * 0.2,
      opacity: 0.3 + Math.sin(currentTime * 3) * 0.2
    };
  }

  private getNoteColorBySignature(signature: string, timeDiff: number, currentTime: number): [number, number, number] {
    const baseColors: Record<string, [number, number, number]> = {
      ORDER: [0.29, 0.56, 0.89], // #4A90E2
      CHAOS: [0.89, 0.29, 0.29], // #E24A4A
      HARMONY: [0.31, 0.78, 0.47], // #50C878
      DISCORD: [1.0, 0.42, 0.42], // #FF6B6B
      LIGHT: [1.0, 0.84, 0.0], // #FFD700
      SHADOW: [0.54, 0.35, 0.55], // #8B5A8C
    };

    const baseColor = baseColors[signature] || [1.0, 1.0, 1.0];

    // Pulse effect as note approaches hit window
    if (Math.abs(timeDiff) < 1) {
      const pulse = Math.sin(currentTime * 10) * 0.3 + 0.7;
      return [
        baseColor[0] * pulse,
        baseColor[1] * pulse,
        baseColor[2] * pulse
      ];
    }

    return baseColor;
  }

  getGridVisuals(_params: GetGridVisualsParams): GridVisualData;
  getGridVisuals(_gridSize: number, _tileSize: number, _playerPosition: {x: number, y: number}, _activePositions: [number, number][], _currentTime: number): GridVisualData;
  @logMethod
  @catchError
  getGridVisuals(
    paramsOrGridSize: GetGridVisualsParams | number,
    tileSize?: number,
    playerPosition?: {x: number, y: number},
    activePositions?: [number, number][],
    currentTime?: number
  ): GridVisualData {
    const params = this.normalizeGridVisualsParams(paramsOrGridSize, tileSize, playerPosition, activePositions, currentTime);
    const tiles = this.generateTiles(params);

    return {
      tiles,
      gridBorders: {
        size: params.gridSize * params.tileSize,
        color: [0.267, 0.267, 0.267] // #444444
      }
    };
  }

  private normalizeGridVisualsParams(
    paramsOrGridSize: GetGridVisualsParams | number,
    tileSize?: number,
    playerPosition?: {x: number, y: number},
    activePositions?: [number, number][],
    currentTime?: number
  ): GetGridVisualsParams {
    if (typeof paramsOrGridSize === 'object') {
      return paramsOrGridSize;
    }

    return {
      gridSize: paramsOrGridSize,
      tileSize: tileSize ?? 1,
      playerPosition: playerPosition ?? {x: 0, y: 0},
      activePositions: activePositions ?? [],
      currentTime: currentTime ?? 0
    };
  }

  private generateTiles(params: GetGridVisualsParams): TileVisualData[] {
    const tiles: TileVisualData[] = [];

    for (let x = 0; x < params.gridSize; x++) {
      for (let z = 0; z < params.gridSize; z++) {
        const tileCoords = this.coordinateSystemService.indexToGrid(x * params.gridSize + z);
        const tileState = this.calculateTileState(tileCoords, params);
        const appearance = this.calculateTileAppearance(tileState, x, z, params);
        const tileData = this.createTileData({
          x,
          z,
          tileCoords,
          appearance,
          tileState,
          params
        });

        tiles.push(tileData);
      }
    }

    return tiles;
  }

  private calculateTileState(
    tileCoords: {x: number, y: number},
    params: GetGridVisualsParams
  ): { isPlayerTile: boolean; isActiveTile: boolean } {
    const isPlayerTile = params.playerPosition.x === tileCoords.x && params.playerPosition.y === tileCoords.y;
    const isActiveTile = params.activePositions.some(pos => pos[0] === tileCoords.x && pos[1] === tileCoords.y);

    return { isPlayerTile, isActiveTile };
  }

  private calculateTileAppearance(
    tileState: { isPlayerTile: boolean; isActiveTile: boolean },
    x: number,
    z: number,
    params: GetGridVisualsParams
  ): { emissiveColor: [number, number, number]; yPosition: number } {
    if (tileState.isPlayerTile) {
      return this.calculatePlayerTileAppearance(params.currentTime);
    }

    if (tileState.isActiveTile) {
      return this.calculateActiveTileAppearance(x, z, params);
    }

    return this.calculateDefaultTileAppearance();
  }

  private calculatePlayerTileAppearance(currentTime: number): { emissiveColor: [number, number, number]; yPosition: number } {
    const pulse = 0.3 + Math.sin(currentTime * 4) * 0.2;
    return {
      emissiveColor: this.colorService.hslToRgb(0.6, 1, pulse),
      yPosition: Math.sin(currentTime * 3) * 0.05
    };
  }

  private calculateActiveTileAppearance(
    x: number,
    z: number,
    params: GetGridVisualsParams
  ): { emissiveColor: [number, number, number]; yPosition: number } {
    const index = x * params.gridSize + z;
    const pulse = 0.2 + Math.sin(params.currentTime * 2 + index * 0.5) * 0.1;
    return {
      emissiveColor: this.colorService.hslToRgb(0.1, 0.8, pulse),
      yPosition: Math.sin(params.currentTime * 2 + index * 0.5) * 0.02
    };
  }

  private calculateDefaultTileAppearance(): { emissiveColor: [number, number, number]; yPosition: number } {
    return {
      emissiveColor: this.colorService.hslToRgb(0, 0, 0.05),
      yPosition: 0
    };
  }

  private createTileData(tileData: {
    x: number;
    z: number;
    tileCoords: {x: number, y: number};
    appearance: { emissiveColor: [number, number, number]; yPosition: number };
    tileState: { isPlayerTile: boolean; isActiveTile: boolean };
    params: GetGridVisualsParams;
  }): TileVisualData {
    const { x, z, appearance, tileState, params } = tileData;
    return {
      key: `tile-${x}-${z}`,
      position: [
        (x - params.gridSize / 2 + 0.5) * params.tileSize,
        appearance.yPosition,
        (z - params.gridSize / 2 + 0.5) * params.tileSize
      ] as [number, number, number],
      emissiveColor: appearance.emissiveColor,
      baseColor: [0.2, 0.2, 0.3] as [number, number, number],
      isPlayerTile: tileState.isPlayerTile,
      isActiveTile: tileState.isActiveTile
    };
  }

  // Private helper methods
  private updateExistingParticles(_time: number): void {
    this.activeParticles = this.activeParticles.filter(particle => {
      particle.life += this.config.particles.assumedFrameTime; // Assume 60fps, so ~16ms per frame
      
      // Update position based on velocity
      particle.position[0] += particle.velocity[0] * this.config.particles.frameTimeSeconds;
      particle.position[1] += particle.velocity[1] * this.config.particles.frameTimeSeconds;
      particle.position[2] += particle.velocity[2] * this.config.particles.frameTimeSeconds;
      
      // Fade out over time
      const lifeRatio = particle.life / particle.maxLife;
      particle.color[3] = Math.max(0, 1 - lifeRatio);
      
      return particle.life < particle.maxLife;
    });
  }

  private spawnQualiaParticles(qualiaState: QualiaState, _musicData: MusicData, _time: number): void {
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
        maxLife: this.config.particles.baseLifetime + Math.random() * this.config.particles.lifetimeVariation,
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
