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
  NoteVisualData,
  QualiaFieldVisualData,
  GridVisualData,
  TileVisualData
} from './contracts/IViewLogicService.contracts';
import type { QualiaState } from '../types/contracts';
import type { ILogger } from './interfaces/ILogger';
import type { ICoordinateSystemService } from './interfaces/ICoordinateSystemService';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ViewLogicService implements IViewLogicService {
  private readonly config: ViewLogicConfig;
  private readonly logger: ILogger;
  private readonly coordinateSystemService: ICoordinateSystemService;
  
  private particleIdCounter = 0;
  private activeParticles: ParticleData[] = [];

  constructor(
    @inject(TYPES.ViewLogicConfig) config: ViewLogicConfig,
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.ICoordinateSystemService) coordinateSystemService: ICoordinateSystemService
  ) {
    this.config = config;
    this.logger = logger;
    this.coordinateSystemService = coordinateSystemService;
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

    // Generate tentacle data with segments
    const tentacleCount = 4 + boss.phase;
    const tentacles = Array.from({ length: tentacleCount }, (_, i) => {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const radius = 2 + phaseMultiplier * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const tentacleTime = time + i * 0.5;
      const tentacleScale = 0.8 + phaseMultiplier * 0.3;
      
      // Generate segments for each tentacle
      const segments = Array.from({ length: 6 }, (_, segmentIndex) => {
        const segmentY = segmentIndex * 0.8;
        const segmentSway = Math.sin(tentacleTime + segmentIndex * 0.3) * 0.2;
        
        return {
          position: [segmentSway, segmentY, 0] as [number, number, number],
          rotation: [0, 0, segmentSway * 0.1] as [number, number, number],
          scale: 1 - segmentIndex * 0.1
        };
      });
      
      return {
        position: [x, 0, z] as [number, number, number],
        rotation: [
          0,
          angle + Math.sin(tentacleTime) * 0.01 * stressIntensity,
          Math.cos(tentacleTime * 1.2) * 0.015 * stressIntensity
        ] as [number, number, number],
        scale: tentacleScale,
        segments
      };
    });

    // Generate power level particles
    const particleCount = Math.floor((boss.power_level / 100) * 20);
    const powerParticles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const radius = 4 + Math.sin(time + i) * 0.5;
      const height = Math.cos(time * 0.5 + i) * 2;
      
      return {
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ] as [number, number, number],
        scale: 0.1,
        opacity: 0.8
      };
    });

    // Generate attack waves (only if attack is active)
    const shouldShowAttack = Math.floor(time) % (4 / boss.phase) < 0.5;
    const attackWaves = shouldShowAttack ? Array.from({ length: boss.phase * 2 }, (_, i) => {
      const angle = (i / (boss.phase * 2)) * Math.PI * 2;
      const radius = 5 + Math.sin(time * 2 + i) * 2;
      
      // Attack rotation based on phase
      let attackRotation: [number, number, number];
      if (boss.phase === 1) {
        attackRotation = [0, time * 0.05, 0];
      } else if (boss.phase === 2) {
        attackRotation = [time * 0.03, time * 0.08, 0];
      } else {
        attackRotation = [
          Math.cos(time * 1.7) * 0.08,
          Math.sin(time * 2) * 0.1,
          Math.sin(time * 2.3) * 0.05
        ];
      }
      
      return {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
        rotation: attackRotation,
        scale: 1,
        opacity: 0.6
      };
    }) : [];

    // Chaos aura calculation
    const chaosAura = {
      scale: 3 + boss.phase,
      opacity: 0.1 + stressIntensity * 0.2,
      color: stressColor
    };

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
      powerParticles,
      attackWaves,
      chaosAura,
      
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
    
    // QUALIA.CODE v1.1: Use CoordinateSystemService for proper grid-to-world transformation
    // This eliminates the desynchronization issue between PlayerRenderer and GridRenderer
    const basePlayer3DPosition = this.coordinateSystemService.gridToWorld(
      player.position[0], // Grid X coordinate
      player.position[2]  // Grid Z coordinate (player.position[1] was incorrect)
    );
    
    // Apply floating animation based on consciousness level (extracted from PlayerRenderer)
    const player3DPosition: [number, number, number] = [
      basePlayer3DPosition[0],
      basePlayer3DPosition[1] + Math.sin(time * 2) * 0.1 * consciousnessLevel,
      basePlayer3DPosition[2]
    ];
    
    // Player colors based on qualia state (extracted from PlayerRenderer HSL to RGB conversion)
    const hsl = {
      h: player.qualia_state.emotional_valence * 0.8 + 0.1, // Hue based on valence
      s: 0.7 + player.qualia_state.arousal * 0.3, // Saturation based on arousal
      l: 0.4 + player.qualia_state.coherence * 0.4 // Lightness based on coherence
    };
    const baseColor: [number, number, number] = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    
    const auraHsl = {
      h: (player.qualia_state.emotional_valence * 0.8 + 0.3) % 1,
      s: 0.8,
      l: 0.5 + performanceLevel * 0.3
    };
    const auraColor: [number, number, number] = this.hslToRgb(auraHsl.h, auraHsl.s, auraHsl.l);
    
    // Scale pulsing based on performance (extracted from PlayerRenderer)
    const scale = 1 + Math.sin(time * 4) * 0.05 * performanceLevel;
    
    // Rotation based on qualia state - ABSOLUTE value, not delta (extracted from PlayerRenderer)
    const absoluteRotation: [number, number, number] = [
      0,
      time * (player.qualia_state.emotional_valence - 0.5) * 0.005,
      0
    ];
    
    // Aura calculations (extracted from PlayerRenderer)
    const auraScale = 1 + powerLevel * 0.5 + performanceLevel * 0.3;
    const auraOpacity = 0.3 + Math.sin(time * 3) * 0.1 * performanceLevel;
    const auraRotation: [number, number, number] = [
      Math.sin(time * 0.5) * 0.002,
      time * 0.01,
      0
    ];
    
    // Power core calculations (extracted from PlayerRenderer)
    const coreIntensity = powerLevel * performanceLevel;
    const coreScale = 0.5 + coreIntensity * 0.5;
    const coreRotation: [number, number, number] = [
      time * 0.03,
      time * 0.02,
      0
    ];
    
    // Core color shifting (extracted from PlayerRenderer)
    const coreHsl = {
      h: (player.qualia_state.emotional_valence + time * 0.1) % 1,
      s: 0.9,
      l: 0.6 + coreIntensity * 0.4
    };
    const coreColor: [number, number, number] = this.hslToRgb(coreHsl.h, coreHsl.s, coreHsl.l);
    
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
        rotation: auraRotation,
        color: auraColor,
        opacity: auraOpacity
      },
      
      powerCore: {
        scale: coreScale,
        rotation: coreRotation,
        color: coreColor,
        emissiveIntensity: coreIntensity
      }
    };
  }

  @logMethod
  @catchError
  getQualiaFieldVisuals(qualiaField: any, musicData: any, time: number): QualiaFieldVisualData {
    // Extract particle generation logic from QualiaFieldRenderer
    const particleCount = Math.floor(1000 * qualiaField.coherence + 500);
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Distribute particles in 3D space with some structure based on order_influence
      const orderFactor = musicData.order_influence;
      const chaosFactor = musicData.chaos_influence;

      if (orderFactor > chaosFactor) {
        // More structured, grid-like distribution
        const gridSize = Math.ceil(Math.pow(particleCount, 1 / 3));
        const x = (i % gridSize) - gridSize / 2;
        const y = (Math.floor(i / gridSize) % gridSize) - gridSize / 2;
        const z = Math.floor(i / (gridSize * gridSize)) - gridSize / 2;

        positions[i3] = x * 2 + (Math.random() - 0.5) * (1 - orderFactor);
        positions[i3 + 1] = y * 2 + (Math.random() - 0.5) * (1 - orderFactor);
        positions[i3 + 2] = z * 2 + (Math.random() - 0.5) * (1 - orderFactor);
      } else {
        // More chaotic distribution
        positions[i3] = (Math.random() - 0.5) * 40 * chaosFactor;
        positions[i3 + 1] = (Math.random() - 0.5) * 40 * chaosFactor;
        positions[i3 + 2] = (Math.random() - 0.5) * 40 * chaosFactor;
      }

      // Color based on emotional valence and field parameters
      const hue = (musicData.emotional_valence * 360 + i * 10) % 360;
      const saturation = 0.7 + qualiaField.alpha * 0.3;
      const lightness = 0.4 + qualiaField.beta * 0.4;

      const [r, g, b] = this.hslToRgb(hue / 360, saturation, lightness);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;

      // Size based on intensity and distance from center
      const distance = Math.sqrt(
        positions[i3] * positions[i3] +
        positions[i3 + 1] * positions[i3 + 1] +
        positions[i3 + 2] * positions[i3 + 2],
      );
      sizes[i] = (0.1 + musicData.intensity * 0.5) * (1 + Math.sin(distance * 0.1) * 0.3);
    }

    // Apply wave animation to particles
    const waveAmplitude = musicData.intensity * 0.5;
    const waveFrequency = musicData.harmony * 2 + 1;

    for (let i = 0; i < positions.length; i += 3) {
      // Add wave motion based on music
      positions[i + 1] += Math.sin(time * waveFrequency + positions[i] * 0.1) * waveAmplitude * 0.01;

      // Color shifting based on field dynamics
      const colorIndex = i;
      const hueShift = (time * 0.1 + i * 0.01) % 1;
      const baseHue = (musicData.emotional_valence + hueShift) % 1;
      const [r, g, b] = this.hslToRgb(baseHue, 0.7, 0.5 + qualiaField.alpha * 0.3);

      colors[colorIndex] = r;
      colors[colorIndex + 1] = g;
      colors[colorIndex + 2] = b;
    }

    // Generate wave plane positions
    const wavePositions = new Float32Array(33 * 33 * 3); // 32x32 plane geometry
    let posIndex = 0;
    for (let x = 0; x <= 32; x++) {
      for (let z = 0; z <= 32; z++) {
        const worldX = (x - 16) * (20 / 32);
        const worldZ = (z - 16) * (20 / 32);
        const distance = Math.sqrt(worldX * worldX + worldZ * worldZ);

        wavePositions[posIndex] = worldX;
        wavePositions[posIndex + 1] = Math.sin(distance * 0.3 - time * 2) * qualiaField.alpha * 2 + Math.cos(worldX * 0.2 + time) * qualiaField.beta * 1;
        wavePositions[posIndex + 2] = worldZ;
        posIndex += 3;
      }
    }

    // Generate ambient spheres
    const ambientSpheres = Array.from({ length: 5 }, (_, i) => {
      const angle = (i / 5) * Math.PI * 2;
      const radius = 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(time * 0.001 + i) * 2;

      const sphereHue = (musicData.emotional_valence + i * 0.2) % 1;
      const [r, g, b] = this.hslToRgb(sphereHue, 0.8, 0.6);

      return {
        position: [x, y, z] as [number, number, number],
        color: [r, g, b] as [number, number, number],
        opacity: 0.4 + qualiaField.alpha * 0.4,
        scale: 0.5
      };
    });

    return {
      fieldParticles: {
        positions,
        colors,
        sizes,
        count: particleCount,
        rotation: [
          Math.sin(time * 0.5) * 0.002,
          time * (musicData.order_influence - 0.5) * 0.005,
          0
        ],
        materialSize: 0.1 + musicData.intensity * 0.3,
        materialOpacity: 0.6 + qualiaField.coherence * 0.4
      },
      wavePlane: {
        positions: wavePositions,
        position: [0, -2, 0],
        rotation: [-Math.PI / 2, 0, 0],
        color: this.hslToRgb(musicData.emotional_valence, 0.6, 0.4),
        opacity: 0.3 + musicData.intensity * 0.4
      },
      ambientSpheres
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
  getMusicalNoteVisuals(notes: any[], currentTime: number): NoteVisualData[] {
    return notes.map((note, index) => {
      // Extract timing calculations from MusicalNotesRenderer
      const timeDiff = note.timing - currentTime;
      const isActive = timeDiff > -1 && timeDiff < 5; // Show notes 5 seconds before and 1 second after
      const isInHitWindow = Math.abs(timeDiff) < 0.5; // 0.5 second hit window
      const isMissed = timeDiff < -0.5;
      const isPerfectTiming = Math.abs(timeDiff) < 0.1;

      if (!isActive) {
        // Return inactive note
        return {
          id: note.id || `note_${index}`,
          position: note.position || [0, 0, 0],
          scale: [0, 0, 0],
          color: [0, 0, 0],
          opacity: 0,
          pulseIntensity: 0,
          approachProgress: 0,
          geometryType: note.type || 'default',
          rotation: [0, 0, 0],
          trail: { visible: false, color: [0, 0, 0], intensity: 0, scale: 0, opacity: 0 },
          isActive: false,
          isInHitWindow: false,
          isMissed: false,
          isPerfectTiming: false
        };
      }

      // Calculate approach progress (notes move toward player)
      const progress = (5 - timeDiff) / 5; // 0 to 1 as note approaches
      const finalPosition: [number, number, number] = [
        note.position[0],
        note.position[1],
        note.position[2] - progress * 8
      ];

      // Scale animation - pulse effect in hit window
      const baseScale = isInHitWindow ? 1.2 + Math.sin(Date.now() * 0.01) * 0.2 : 1;

      // Rotation animation
      const rotationSpeed = this.config.notes.rotationSpeed || 0.01;
      const rotation: [number, number, number] = [
        currentTime * rotationSpeed,
        currentTime * rotationSpeed * 0.7,
        currentTime * rotationSpeed * 0.3
      ];

      // Opacity calculation
      const opacity = isMissed ? 0.3 : Math.max(0.1, 1 - Math.abs(timeDiff) / 5);

      // Color calculation based on qualia signature
      const noteColor = this.getNoteColorBySignature(note.qualia_signature, timeDiff, currentTime);

      // Pulse intensity for perfect timing
      const pulseIntensity = isPerfectTiming ? Math.sin(currentTime * 0.01) * 0.3 + 0.7 : 0;

      // Trail effect calculation
      const trailVisible = isInHitWindow || progress > 0.8;
      const trailIntensity = Math.max(0, Math.min(1, progress * 2));

      return {
        id: note.id || `note_${index}`,
        position: finalPosition,
        scale: [baseScale, baseScale, baseScale],
        color: noteColor,
        opacity: opacity,
        pulseIntensity: pulseIntensity,
        approachProgress: progress,
        geometryType: note.type || 'default',
        rotation: rotation,
        trail: {
          visible: trailVisible,
          color: noteColor,
          intensity: trailIntensity,
          scale: 0.5 + Math.sin(currentTime * 2) * 0.2,
          opacity: 0.3 + Math.sin(currentTime * 3) * 0.2
        },
        isActive: isActive,
        isInHitWindow: isInHitWindow,
        isMissed: isMissed,
        isPerfectTiming: isPerfectTiming
      };
    });
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

  @logMethod
  @catchError
  getGridVisuals(gridSize: number, tileSize: number, playerPosition: {x: number, y: number}, activePositions: [number, number][], currentTime: number): GridVisualData {
    const tiles: TileVisualData[] = [];
    
    // Generate tile visual data
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const tileCoords = this.coordinateSystemService.indexToGrid(x * gridSize + z);
        const isPlayerTile = playerPosition.x === tileCoords.x && playerPosition.y === tileCoords.y;
        const isActiveTile = activePositions.some(pos => pos[0] === tileCoords.x && pos[1] === tileCoords.y);
        
        let emissiveColor: [number, number, number];
        let yPosition: number;
        
        if (isPlayerTile) {
          // Player tile glows
          const pulse = 0.3 + Math.sin(currentTime * 4) * 0.2;
          emissiveColor = this.hslToRgb(0.6, 1, pulse);
          yPosition = Math.sin(currentTime * 3) * 0.05;
        } else if (isActiveTile) {
          // Active tiles pulse
          const index = x * gridSize + z;
          const pulse = 0.2 + Math.sin(currentTime * 2 + index * 0.5) * 0.1;
          emissiveColor = this.hslToRgb(0.1, 0.8, pulse);
          yPosition = Math.sin(currentTime * 2 + index * 0.5) * 0.02;
        } else {
          // Default tiles
          emissiveColor = this.hslToRgb(0, 0, 0.05);
          yPosition = 0;
        }
        
        tiles.push({
          key: `tile-${x}-${z}`,
          position: [
            (x - gridSize / 2 + 0.5) * tileSize,
            yPosition,
            (z - gridSize / 2 + 0.5) * tileSize
          ],
          emissiveColor: emissiveColor,
          baseColor: [0.2, 0.2, 0.3],
          isPlayerTile,
          isActiveTile
        });
      }
    }
    
    return {
      tiles,
      gridBorders: {
        size: gridSize * tileSize,
        color: [0.267, 0.267, 0.267] // #444444
      }
    };
  }

  // Private helper methods
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }
    
    return [r + m, g + m, b + m];
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
