/**
 * Contract Fixtures - Central Export
 * 
 * Este archivo centraliza todas las exportaciones de fixtures para contratos.
 * Los fixtures proporcionan datos de prueba type-safe para los contratos del sistema.
 * 
 * Patrón: Cada fixture exporta funciones factory que aceptan overrides parciales.
 * 
 * @example
 * ```typescript
 * import { createMockBossState, createMaxQualiaState } from '@/testing/fixtures/contracts';
 * 
 * const boss = createMockBossState({ health: 50 });
 * const qualia = createMaxQualiaState();
 * ```
 */

// Core State Fixtures
export * from './QualiaState.fixture';
export * from './PlayerState.fixture';
export * from './BossState.fixture';
export * from './CombatState.fixture';

// Musical System Fixtures
export * from './MusicalComboData.fixture';
export * from './PatternData.fixture';
export * from './ISongData.fixture';
export * from './IMusicalInputAnalysis.fixture';

// Audio System Fixtures
export * from './AudioEvent.fixture';
export * from './AudioLayer.fixture';

// Game Settings & Config Fixtures
export * from './IGameSettings.fixture';
export * from './ILeaderboardEntry.fixture';

// Visual Effects Fixtures
export * from './IActiveEffect.fixture';
export * from './IEnvironmentEffect.fixture';
