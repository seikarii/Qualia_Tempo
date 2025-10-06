# RUTA DE MIGRACIÓN v1 → v2
# Qualia Tempo - Transformación Arquitectónica Completa
# VERSIÓN: 2.0 GOLD.CODE
# FECHA: 6 de octubre de 2025

---

## RESUMEN EJECUTIVO

Esta es la hoja de ruta definitiva para migrar Qualia Tempo de la arquitectura v1 (híbrida frontend/backend rendering) a v2 (ARCHITECTURE.GOLD.CODE - separación absoluta, performance AAA).

**CAMBIO FUNDAMENTAL:** 
- v1: Backend renderiza con GPU (ModernGL) → Frontend muestra frames
- v2: Backend solo calcula ESTADO → Frontend hace TODO el rendering

**MAGNITUD:** ~120 archivos afectados, 45 nuevos, 8 eliminados, 67 modificados

---

## ÍNDICE

1. [Análisis de Brecha v1 vs v2](#1-análisis-de-brecha-v1-vs-v2)
2. [Arquitectura Objetivo (v2)](#2-arquitectura-objetivo-v2)
3. [Plan de Ejecución por Fases](#3-plan-de-ejecución-por-fases)
4. [Inventario Detallado de Archivos](#4-inventario-detallado-de-archivos)
5. [Dependencias y Orden de Implementación](#5-dependencias-y-orden-de-implementación)
6. [Riesgos y Mitigaciones](#6-riesgos-y-mitigaciones)
7. [Validación y Testing](#7-validación-y-testing)

---

## 1. ANÁLISIS DE BRECHA v1 vs v2

### 1.1. Estado Actual (v1)

#### Backend
- ✅ **CompositionRoot** con IoC
- ✅ **EventBus** backend
- ✅ **QualiaProcessor** (cálculo básico)
- ❌ **ParticleEngine** usando GPU/ModernGL (VIOLA v2)
- ❌ **RenderingService** renderizando frames (VIOLA v2)
- ❌ Shaders backend (VIOLA v2)
- ❌ **GameLogicService** (NO EXISTE)
- ❌ **BossAI** (NO EXISTE)
- ❌ **HarmonyAnalysisService** (NO EXISTE)
- ❌ **PersistenceService/Leaderboard** (NO EXISTE)
- ❌ **Process Pool** para ParticleEngine (NO EXISTE)

#### Frontend
- ✅ **InversifyJS** IoC container
- ✅ **EventBus** frontend
- ✅ **QualiaStateCalculatorService** (pero en main thread)
- ✅ **AudioService** con Tone.js
- ✅ **BackendSyncService** con WebSocket
- ✅ Shaders avanzados (Bloom, TAA, HBAO, etc.)
- ❌ **Web Worker** para QualiaCalculator (NO EXISTE - Performance.txt)
- ❌ **FFTAnalyzerService** (NO EXISTE)
- ❌ **KairosVisualEngine** Three.js (NO EXISTE)
- ❌ **Audio8DService** (NO EXISTE)
- ❌ **InputManagerService** dedicado (NO EXISTE)
- ❌ **MusicalComboDetector** (NO EXISTE)
- ❌ Shaders Proyecto Kairos:
  - ❌ God Rays (volumetric lighting)
  - ❌ Reaction-Diffusion (compute shader)
  - ❌ SDF Raymarching (player/boss avatars)
  - ❌ Fractal Mandelbulb (transcendence)

#### Shared Contracts
- ✅ QualiaState.json
- ✅ PlayerState.json (básico)
- ✅ CombatData.json (básico)
- ✅ OptimizedParticle.json
- ❌ **12+ contratos faltantes** (BossState, CombatState, etc.)

### 1.2. Cambios Arquitectónicos Críticos

| Aspecto | v1 | v2 |
|---------|----|----|
| **Rendering** | Backend GPU (ModernGL) | Frontend exclusive (Three.js) |
| **ParticleEngine** | GPU renderer | Pure state calculator (Process Pool) |
| **QualiaCalculator** | Main thread | Web Worker (separate thread) |
| **Audio** | Basic playback | FFT analysis + 8D spatial |
| **Combos** | No system | Emergent harmonic/chaotic system |
| **Boss** | No AI | AI + Pattern System + Harmony Analysis |
| **Visual** | Basic effects | Proyecto Kairos (4 phases) |
| **Performance** | 2 domains | 4 domains (Performance.txt) |

---

## 2. ARQUITECTURA OBJETIVO (v2)

### 2.1. Dominios de Ejecución (4 Total)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Cliente)                          │
├─────────────────────────────────────────────────────────────────┤
│ DOMINIO 1: Main Thread (UI/React)                             │
│   • React Components                                            │
│   • KairosVisualEngine (Three.js renderer)                     │
│   • EventBus subscriptions                                      │
│   • Input capture                                               │
├─────────────────────────────────────────────────────────────────┤
│ DOMINIO 2: Web Worker (QualiaCalculator)                      │
│   • QualiaStateCalculatorWorker                                │
│   • Predictive state computation                               │
│   • Instant visual feedback                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Servidor)                          │
├─────────────────────────────────────────────────────────────────┤
│ DOMINIO 3: FastAPI Event Loop (API)                           │
│   • WebSocket management                                        │
│   • GameLogicService                                            │
│   • BossAI orchestration                                        │
│   • EventBus backend                                            │
├─────────────────────────────────────────────────────────────────┤
│ DOMINIO 4: Process Pool (ParticleEngine)                      │
│   • Particle state calculation (NO rendering)                  │
│   • Heavy computation isolation                                 │
│   • Returns CombatState to main thread                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Flujo de Datos del "Kairos" (Un Latido del Juego)

```
1. FRONTEND: AudioEngine emite Metronome_Tick
2. FRONTEND: Player pulsa 'Q' + dash → InputManager captura
3. FRONTEND: EventBus.emit(PlayerActionEvent)
4. FRONTEND: QualiaCalculatorWorker calcula estado predictivo
5. FRONTEND: CommunicationService envía action + FFT data → Backend
6. BACKEND: API recibe, EventBus.emit()
7. BACKEND: GameLogicService procesa + HarmonyAnalysis
8. BACKEND: BossAI decide ataque basado en QualiaState
9. BACKEND: ParticleEngine (Process Pool) calcula particle states
10. BACKEND: CombatState empaquetado → WebSocket → Frontend
11. FRONTEND: CommunicationService recibe → GameStateStore.update()
12. FRONTEND: KairosVisualEngine reacciona → renderiza nueva escena
```

---

## 3. PLAN DE EJECUCIÓN POR FASES

### **FASE 0: PREPARACIÓN Y FUNDAMENTOS** (3-5 días)

#### Objetivos:
- Actualizar shared contracts
- Configurar infraestructura de testing
- Documentar estado actual

#### Tareas:
1. **Shared Contracts** (Día 1-2): ✅ **COMPLETADO**
   - [x] Crear 12 nuevos schemas JSON (BossState, CombatState, etc.) ✅
   - [x] Actualizar QualiaState.json (añadir collectionWindowEnd) ✅
   - [x] Actualizar PlayerState.json (añadir velocity, abilities) ✅
   - [x] Actualizar CombatData.json (añadir patterns, combos) ✅
   - [x] Ejecutar `./scripts/generate_contracts.sh` ✅
   - [x] Verificar generación TypeScript + Pydantic ✅
   - **Archivos generados**:
     - 11 nuevos contratos: BossState, CombatState, MusicalComboData, PatternData, ISongData, ILeaderboardEntry, IGameSettings, IMusicalInputAnalysis, IActiveEffect, IEnvironmentEffect, AudioEvent, AudioLayer
     - 3 contratos actualizados: QualiaState, PlayerState, CombatData
     - TypeScript interfaces: frontend/src/types/contracts.ts (1.9KB)
     - Pydantic models: backend/api/models.py (28KB)
   - **Fix realizado**: pyproject.toml MyPy overrides (TOML syntax)

2. **Testing Infrastructure** (Día 3):
   - [ ] Crear test fixtures para nuevos contracts
   - [ ] Setup test containers para nuevos servicios
   - [ ] Crear mocks base para servicios v2

3. **Documentation** (Día 4-5):
   - [ ] Auditar todos los servicios actuales
   - [ ] Documentar APIs internas
   - [ ] Crear diagramas de flujo v1 vs v2

#### Entregables:
- ✅ 12 nuevos schemas en shared_contracts/
- ✅ Contratos generados y validados
- ✅ Infraestructura de testing lista
- ✅ Documentación de estado actual

---

### **FASE 1: BACKEND - ELIMINACIÓN DE RENDERING** (5-7 días)

#### Objetivos:
- Eliminar todo código de rendering del backend
- Refactorizar ParticleEngine a pure state calculator
- Preparar para Process Pool

#### Tareas:

##### 1.1. Eliminación (Día 1):
- [ ] **ELIMINAR**: `backend/services/RenderingService.py`
- [ ] **ELIMINAR**: `backend/engine/shaders/` (todos los shaders backend)
- [ ] **ELIMINAR**: Endpoint `/ws/video_stream` de `routes.py`
- [ ] **ELIMINAR**: Referencias a ModernGL rendering en CompositionRoot
- [ ] Actualizar tests para remover rendering

##### 1.2. Refactorización ParticleEngine (Día 2-4):
- [ ] Crear `backend/engine/ParticleStateCalculator.py` (nueva clase)
- [ ] Migrar lógica de física/colisiones (sin GPU)
- [ ] Remover dependencias de ModernGL del ParticleEngine
- [ ] Mantener estructura de datos (OPTIMIZED_PARTICLE_DTYPE)
- [ ] Calcular solo: position, velocity, lifetime, NO renderizar
- [ ] Output: lista de estados de partículas (JSON serializable)
- [ ] Tests unitarios para cálculos de estado

##### 1.3. Process Pool Setup (Día 5-6):
- [ ] Crear `backend/workers/ParticleEngineWorker.py`
- [ ] Implementar pool con multiprocessing.Pool
- [ ] Queue management (input/output)
- [ ] Timeout handling y error recovery
- [ ] Config: `backend/config/process-pool.yaml`
- [ ] Tests de concurrencia

##### 1.4. Integration (Día 7):
- [ ] Integrar ParticleEngineWorker en CompositionRoot
- [ ] Actualizar EventBus para comunicación con workers
- [ ] Refactorizar StateStreamingService para nuevo flujo
- [ ] Tests de integración backend completo

#### Entregables:
- ✅ Backend SIN código de rendering
- ✅ ParticleEngine como pure state calculator
- ✅ Process Pool funcional
- ✅ Tests pasando (cobertura >80%)

---

### **FASE 2: BACKEND - GAME LOGIC & AI** (8-10 días)

#### Objetivos:
- Implementar toda la lógica de juego del GDD
- Boss AI con patrones musicales
- Sistema de armonía musical

#### Tareas:

##### 2.1. GameLogicService (Día 1-3):
- [ ] Crear `backend/services/GameLogicService.py`
- [ ] Crear interfaz `backend/services/interfaces/IGameLogicService.py`
- [ ] Implementar mecánicas GDD:
  - [ ] Generación de Qualia (dash, abilities, metronome)
  - [ ] Sistema de combos (emergentes)
  - [ ] Detección de ventana de recolección (<1s)
  - [ ] Cálculo de score
  - [ ] Gestión de vida del jugador
  - [ ] Dificultad basada en volumen
- [ ] Config: `backend/config/game-logic.yaml`
- [ ] Tests unitarios completos

##### 2.2. HarmonyAnalysisService (Día 4-5):
- [ ] Crear `backend/services/HarmonyAnalysisService.py`
- [ ] Crear interfaz `backend/services/interfaces/IHarmonyAnalysisService.py`
- [ ] Implementar comparación musical:
  - [ ] Input del jugador (teclas Q-E-R-T-F-G-C)
  - [ ] Notas actuales de la canción
  - [ ] Qualia recolectado del suelo
  - [ ] Calcular harmony score (0-1)
  - [ ] Determinar: armónico vs caótico
- [ ] Config: `backend/config/harmony-analysis.yaml`
- [ ] Tests con casos musicales reales

##### 2.3. BossAI & PatternSystem (Día 6-9):
- [ ] Crear `backend/services/BossAIService.py`
- [ ] Crear `backend/services/PatternSystemService.py`
- [ ] Crear interfaces correspondientes
- [ ] Implementar:
  - [ ] Fases del boss (basadas en % de canción)
  - [ ] Selección de patrones (basada en QualiaState)
  - [ ] Telegraph visual (timing variable)
  - [ ] Aggression level (tempo + volume)
  - [ ] Pattern execution
- [ ] Cargar PatternData desde CombatData
- [ ] Config: `backend/config/boss-patterns.yaml`
- [ ] Tests de AI decisioning

##### 2.4. PersistenceService (Día 10):
- [ ] Crear `backend/services/PersistenceService.py`
- [ ] Crear interfaz `backend/services/interfaces/IPersistenceService.py`
- [ ] Implementar:
  - [ ] Save/load leaderboard entries
  - [ ] Score validation
  - [ ] Difficulty tracking
  - [ ] JSON file persistence (SQLite para futuro)
- [ ] Config: `backend/config/persistence.yaml`
- [ ] Tests de persistencia

#### Entregables:
- ✅ GameLogicService completo con todas las mecánicas GDD
- ✅ HarmonyAnalysisService funcional
- ✅ BossAI con sistema de patrones
- ✅ Leaderboard persistente
- ✅ Tests >85% cobertura

---

### **FASE 3: FRONTEND - WEB WORKER & PERFORMANCE** (5-7 días)

#### Objetivos:
- Mover QualiaCalculator a Web Worker
- Implementar architecture de Performance.txt
- Desbloquear UI thread

#### Tareas:

##### 3.1. Web Worker Setup (Día 1-2):
- [ ] Crear `frontend/src/workers/QualiaCalculatorWorker.ts`
- [ ] Migrar lógica de QualiaStateCalculatorService al worker
- [ ] Implementar message passing (postMessage)
- [ ] Crear wrapper service: `QualiaCalculatorWorkerService.ts`
- [ ] Manejar serialización de eventos
- [ ] Error handling y fallback a main thread

##### 3.2. Service Refactoring (Día 3-4):
- [ ] Refactorizar `QualiaStateCalculatorService.ts`:
  - [ ] Mantener como facade/coordinator
  - [ ] Delegar cálculos al worker
  - [ ] Implementar local prediction
- [ ] Actualizar EventBus para worker communication
- [ ] Actualizar InversifyJS bindings
- [ ] Tests de comunicación worker

##### 3.3. Performance Optimization (Día 5-6):
- [ ] Implementar transferable objects (ArrayBuffer)
- [ ] Optimizar serialización de QualiaState
- [ ] Reducir overhead de message passing
- [ ] Benchmarking: main thread vs worker
- [ ] Documentar mejoras de performance

##### 3.4. Integration (Día 7):
- [ ] Integrar worker en flujo completo
- [ ] Verificar instant visual feedback
- [ ] Tests de carga (simulación 60fps)
- [ ] Validación de no-blocking UI

#### Entregables:
- ✅ QualiaCalculator en Web Worker
- ✅ UI thread completamente desblocked
- ✅ Performance medido y documentado
- ✅ Tests de concurrency pasando

---

### **FASE 4: FRONTEND - AUDIO ADVANCED** (6-8 días)

#### Objetivos:
- FFT analysis real-time
- 8D spatial audio
- Musical abilities (Q-G keys)

#### Tareas:

##### 4.1. FFTAnalyzerService (Día 1-3):
- [ ] Crear `frontend/src/services/FFTAnalyzerService.ts`
- [ ] Crear interfaz `IFFTAnalyzerService.ts`
- [ ] Implementar:
  - [ ] Web Audio API AnalyserNode
  - [ ] Real-time FFT (1024-4096 bins)
  - [ ] Frequency band extraction:
    - Bass (0-4 bins)
    - Mid (5-20 bins)
    - Treble (21-31 bins)
  - [ ] Smoothing y normalization
  - [ ] Event emission: FFTDataUpdated
- [ ] Config: `frontend/public/config/fft-analyzer.yaml`
- [ ] Tests con audio sintético

##### 4.2. Audio8DService (Día 4-5):
- [ ] Crear `frontend/src/services/Audio8DService.ts`
- [ ] Crear interfaz `IAudio8DService.ts`
- [ ] Implementar:
  - [ ] Panner3D para cada fuente de sonido
  - [ ] Posicionamiento basado en arena 2D
  - [ ] Echo direccional (Qualia collection)
  - [ ] Listener position (player)
  - [ ] Doppler effect (opcional)
- [ ] Config: `frontend/public/config/audio-8d.yaml`
- [ ] Tests de espacialización

##### 4.3. Musical Abilities (Día 6-7):
- [ ] Refactorizar `AudioService.ts`:
  - [ ] Integrar FFTAnalyzerService
  - [ ] Integrar Audio8DService
  - [ ] Mapeo Q-E-R-T-F-G-C → notas musicales
  - [ ] Cooldown management (5s, reducido por tempo)
  - [ ] Tone.js instruments para cada nota
  - [ ] Integration con GameInputController
- [ ] Crear `MusicalComboDetectorService.ts`:
  - [ ] Detectar secuencias de teclas
  - [ ] Comparar con datos de harmony
  - [ ] Emit ComboDetectedEvent
- [ ] Tests de input sequences

##### 4.4. Integration (Día 8):
- [ ] Conectar FFT → EventBus → Backend
- [ ] Enviar FFT data en flujo constante
- [ ] Integrar combos con GameLogic
- [ ] Tests end-to-end audio completo

#### Entregables:
- ✅ FFT analysis en tiempo real
- ✅ 8D spatial audio funcional
- ✅ Musical abilities (Q-G) implementadas
- ✅ Combo detection emergente
- ✅ Tests >80% cobertura

---

### **FASE 5: FRONTEND - KAIROS VISUAL ENGINE** (12-15 días)

#### Objetivos:
- Implementar Proyecto Kairos completo
- Three.js/React-Three-Fiber
- 4 fases visuales secuenciales

#### Tareas:

##### 5.1. Foundation (Día 1-2):
- [ ] Install Three.js + React-Three-Fiber + Drei
- [ ] Crear `frontend/src/services/KairosVisualEngine.ts`
- [ ] Crear interfaz `IKairosVisualEngine.ts`
- [ ] Setup base:
  - [ ] Scene, Camera, Renderer
  - [ ] Post-processing pipeline (EffectComposer)
  - [ ] Integration con GameStateStore
  - [ ] Config: `frontend/public/config/kairos-visual.yaml`
- [ ] Crear componentes base:
  - [ ] `components/kairos/KairosCanvas.tsx`
  - [ ] `components/kairos/KairosScene.tsx`

##### 5.2. FASE 1: Atmósfera y Presencia (Día 3-5):
- [ ] Implementar **Bloom avanzado**:
  - [ ] Multi-pass gaussian blur
  - [ ] Threshold basado en QualiaState.intensity
  - [ ] Shader: `bloom_advanced.glsl` (mejorar existente)
- [ ] Implementar **God Rays**:
  - [ ] Volumetric lighting shader
  - [ ] Crear `god_rays.glsl`
  - [ ] Occlusion-based ray marching
  - [ ] Parametrización:
    - u_intensity ← QualiaState.intensity
    - u_transcendence ← QualiaState.transcendence
    - u_precision ← QualiaState.precision
    - u_aggression_color_tint ← QualiaState.aggression
- [ ] Componente: `components/kairos/GodRaysEffect.tsx`
- [ ] Tests visuales (snapshot)

##### 5.3. FASE 2: Synesthesia Profunda (Día 6-8):
- [ ] Crear **Particle System FFT-reactive**:
  - [ ] `components/kairos/ParticleSystem.tsx`
  - [ ] Shader: `particle_fft_reactive.glsl`
  - [ ] Input: FFTData (bass, mid, treble)
  - [ ] Efectos:
    - Bass → particle size + emission rate
    - Mid → velocity + turbulence
    - Treble → emissive brightness
  - [ ] Integration con FFTAnalyzerService
- [ ] Instanced rendering para performance
- [ ] Tests de reactividad audio

##### 5.4. FASE 3: El Mundo Viviente (Día 9-11):
- [ ] Implementar **Reaction-Diffusion**:
  - [ ] Compute shader: `reaction_diffusion.compute.glsl`
  - [ ] Simulación Gray-Scott model
  - [ ] Ping-pong buffers en GPU
  - [ ] Parametrización:
    - u_diffusion_rate ← QualiaState.chaos
    - u_flow_direction ← QualiaState.flow
    - u_kill_rate ← QualiaState.recovery
- [ ] Aplicar a floor:
  - [ ] Shader: `reaction_diffusion_floor.glsl`
  - [ ] Geometry: PlaneGeometry
  - [ ] Texture mapping desde compute shader
- [ ] Componente: `components/kairos/FloorReactionDiffusion.tsx`
- [ ] Tests de compute shader

##### 5.5. FASE 4: Avatares Procedurales (Día 12-14):
- [ ] Implementar **SDF Raymarching Player**:
  - [ ] Shader: `sdf_raymarching_player.glsl`
  - [ ] SDFs: sphere, box, torus (morphing)
  - [ ] Parametrización:
    - u_player_shape_params ← QualiaState.precision + flow
  - [ ] Componente: `components/kairos/PlayerAvatar.tsx`
- [ ] Implementar **SDF Raymarching Boss**:
  - [ ] Shader: `sdf_raymarching_boss.glsl`
  - [ ] SDFs con noise distortion
  - [ ] Parametrización:
    - u_boss_shape_params ← BossState.aggression + chaos
  - [ ] Componente: `components/kairos/BossAvatar.tsx`
- [ ] Implementar **Fractal Mandelbulb**:
  - [ ] Shader: `mandelbulb_fractal.glsl`
  - [ ] Activación: QualiaState.transcendence > 0.9
  - [ ] Parametrización:
    - u_player_fractal_iter ← transcendence * 10
  - [ ] Integration en PlayerAvatar

##### 5.6. Integration & Polish (Día 15):
- [ ] Refactorizar `FrontendRenderer.tsx` → integrar KairosCanvas
- [ ] Implementar phase switching logic
- [ ] Performance optimization (LOD, culling)
- [ ] Shader hot-reload para dev
- [ ] Tests end-to-end visuales

#### Entregables:
- ✅ Kairos Visual Engine completo (4 fases)
- ✅ All shaders implementados y testados
- ✅ Three.js rendering pipeline
- ✅ Performance >60fps constante
- ✅ Tests visuales pasando

---

### **FASE 6: INTEGRATION & POLISH** (5-7 días)

#### Objetivos:
- Integrar todos los sistemas
- End-to-end testing
- Performance profiling
- Bug fixing

#### Tareas:

##### 6.1. Full System Integration (Día 1-2):
- [ ] Conectar todos los dominios (4 threads)
- [ ] Verificar flujo completo de Kairos
- [ ] Sincronización audio-visual-gameplay
- [ ] WebSocket stability testing

##### 6.2. Performance Profiling (Día 3-4):
- [ ] Chrome DevTools profiling
- [ ] Worker overhead measurement
- [ ] Backend Process Pool efficiency
- [ ] GPU utilization (Three.js)
- [ ] Memory leak detection
- [ ] Optimizaciones identificadas

##### 6.3. Testing & Validation (Día 5-6):
- [ ] End-to-end tests completos
- [ ] Stress testing (combos extremos)
- [ ] Load testing (múltiples clientes)
- [ ] Architectural linting (`./scripts/lint-architecture.sh`)
- [ ] Test coverage >85% global

##### 6.4. Documentation & Deployment (Día 7):
- [ ] Actualizar QUALIA.CODE.md con cambios v2
- [ ] Actualizar QUALIA.MANUAL.md con ejemplos v2
- [ ] Deployment guide
- [ ] Performance benchmarks documentados

#### Entregables:
- ✅ Sistema completamente integrado
- ✅ Performance validado (60fps, 4 dominios)
- ✅ Tests >85% cobertura
- ✅ Documentación actualizada
- ✅ Ready for production

---

## 4. INVENTARIO DETALLADO DE ARCHIVOS

### 4.1. Backend - Archivos a ELIMINAR (8 archivos)

```
backend/
├── services/
│   └── RenderingService.py                        ❌ DELETE
├── engine/
│   └── shaders/
│       ├── particle.frag                          ❌ DELETE
│       ├── particle.vert                          ❌ DELETE
│       ├── composite.glsl                         ❌ DELETE
│       ├── blur.glsl                              ❌ DELETE
│       └── [otros shaders backend]                ❌ DELETE (mover a frontend si útiles)
```

### 4.2. Backend - Archivos a MODIFICAR (12 archivos)

```
backend/
├── CompositionRoot.py                             🔧 REFACTOR (remove rendering)
├── api/
│   ├── routes.py                                  🔧 REFACTOR (remove /ws/video_stream)
│   └── models.py                                  🔧 UPDATE (auto-generated)
├── engine/
│   └── qualia_particle_engine.py                  🔧 HEAVY REFACTOR (remove GPU)
├── services/
│   ├── EventBus.py                                🔧 ENHANCE (worker communication)
│   ├── QualiaProcessor.py                         🔧 ENHANCE (integrate GameLogic)
│   ├── StateStreamingService.py                   🔧 REFACTOR (new data flow)
│   └── StreamingWebService.py                     🔧 REFACTOR (remove video stream)
├── tests/
│   ├── test_particle_engine_*.py                  🔧 UPDATE (new tests for state calc)
│   └── test_main.py                               🔧 UPDATE (remove rendering tests)
```

### 4.3. Backend - Archivos NUEVOS (20+ archivos)

```
backend/
├── services/
│   ├── GameLogicService.py                        ✨ NEW
│   ├── BossAIService.py                           ✨ NEW
│   ├── PatternSystemService.py                    ✨ NEW
│   ├── HarmonyAnalysisService.py                  ✨ NEW
│   ├── PersistenceService.py                      ✨ NEW
│   └── interfaces/
│       ├── IGameLogicService.py                   ✨ NEW
│       ├── IBossAIService.py                      ✨ NEW
│       ├── IPatternSystemService.py               ✨ NEW
│       ├── IHarmonyAnalysisService.py             ✨ NEW
│       └── IPersistenceService.py                 ✨ NEW
├── workers/
│   ├── ParticleEngineWorker.py                    ✨ NEW
│   └── __init__.py                                ✨ NEW
├── engine/
│   └── ParticleStateCalculator.py                 ✨ NEW (refactored from engine)
├── config/
│   ├── game-logic.yaml                            ✨ NEW
│   ├── boss-patterns.yaml                         ✨ NEW
│   ├── harmony-analysis.yaml                      ✨ NEW
│   ├── persistence.yaml                           ✨ NEW
│   └── process-pool.yaml                          ✨ NEW
├── tests/
│   ├── test_game_logic_service.py                 ✨ NEW
│   ├── test_boss_ai_service.py                    ✨ NEW
│   ├── test_harmony_analysis_service.py           ✨ NEW
│   ├── test_persistence_service.py                ✨ NEW
│   └── test_particle_engine_worker.py             ✨ NEW
```

### 4.4. Frontend - Archivos a MODIFICAR (15 archivos)

```
frontend/src/
├── services/
│   ├── QualiaStateCalculatorService.ts            🔧 HEAVY REFACTOR (facade for worker)
│   ├── AudioService.ts                            🔧 ENHANCE (FFT + musical abilities)
│   ├── BackendSyncService.ts                      🔧 UPDATE (new event types)
│   ├── EventBus.ts                                🔧 ENHANCE (worker communication)
│   ├── GameInputControllerService.ts              🔧 ENHANCE (musical keys)
│   ├── inversify.config.ts                        🔧 UPDATE (new bindings)
│   ├── inversify.types.ts                         🔧 UPDATE (new TYPES)
│   └── contracts/
│       ├── events.contracts.ts                    🔧 ENHANCE (new event types)
│       └── [service].contracts.ts                 🔧 UPDATE (new configs)
├── components/
│   └── FrontendRenderer.tsx                       🔧 REFACTOR (integrate KairosCanvas)
├── types/
│   └── contracts.ts                               🔧 UPDATE (auto-generated)
└── state/
    └── useGameStore.ts                            🔧 ENHANCE (new state fields)
```

### 4.5. Frontend - Archivos NUEVOS (40+ archivos)

```
frontend/src/
├── workers/
│   ├── QualiaCalculatorWorker.ts                  ✨ NEW
│   └── QualiaCalculatorWorker.test.ts             ✨ NEW
├── services/
│   ├── FFTAnalyzerService.ts                      ✨ NEW
│   ├── KairosVisualEngine.ts                      ✨ NEW
│   ├── Audio8DService.ts                          ✨ NEW
│   ├── InputManagerService.ts                     ✨ NEW
│   ├── MusicalComboDetectorService.ts             ✨ NEW
│   ├── QualiaCalculatorWorkerService.ts           ✨ NEW (wrapper)
│   ├── interfaces/
│   │   ├── IFFTAnalyzerService.ts                 ✨ NEW
│   │   ├── IKairosVisualEngine.ts                 ✨ NEW
│   │   ├── IAudio8DService.ts                     ✨ NEW
│   │   ├── IInputManagerService.ts                ✨ NEW
│   │   └── IMusicalComboDetectorService.ts        ✨ NEW
│   ├── contracts/
│   │   ├── IFFTAnalyzerService.contracts.ts       ✨ NEW
│   │   ├── IKairosVisualEngine.contracts.ts       ✨ NEW
│   │   ├── IAudio8DService.contracts.ts           ✨ NEW
│   │   └── [otros contracts]                      ✨ NEW
│   └── __tests__/
│       ├── FFTAnalyzerService.test.ts             ✨ NEW
│       ├── KairosVisualEngine.test.ts             ✨ NEW
│       ├── Audio8DService.test.ts                 ✨ NEW
│       └── [otros tests]                          ✨ NEW
├── components/
│   └── kairos/
│       ├── KairosCanvas.tsx                       ✨ NEW
│       ├── KairosScene.tsx                        ✨ NEW
│       ├── ParticleSystem.tsx                     ✨ NEW
│       ├── FloorReactionDiffusion.tsx             ✨ NEW
│       ├── PlayerAvatar.tsx                       ✨ NEW
│       ├── BossAvatar.tsx                         ✨ NEW
│       ├── GodRaysEffect.tsx                      ✨ NEW
│       ├── BloomEffect.tsx                        ✨ NEW
│       └── [component tests]                      ✨ NEW
└── public/
    ├── config/
    │   ├── fft-analyzer.yaml                      ✨ NEW
    │   ├── audio-8d.yaml                          ✨ NEW
    │   ├── musical-combos.yaml                    ✨ NEW
    │   ├── kairos-visual.yaml                     ✨ NEW
    │   └── game-logic.yaml                        ✨ NEW (frontend copy)
    └── shaders/
        ├── god_rays.glsl                          ✨ NEW
        ├── particle_fft_reactive.glsl             ✨ NEW
        ├── reaction_diffusion.compute.glsl        ✨ NEW
        ├── reaction_diffusion_floor.glsl          ✨ NEW
        ├── sdf_raymarching_player.glsl            ✨ NEW
        ├── sdf_raymarching_boss.glsl              ✨ NEW
        ├── mandelbulb_fractal.glsl                ✨ NEW
        └── bloom_advanced.glsl                    🔧 ENHANCE (existing)
```

### 4.6. Shared Contracts - Archivos NUEVOS (12+ archivos)

```
shared_contracts/
├── BossState.json                                 ✨ NEW
├── CombatState.json                               ✨ NEW
├── MusicalComboData.json                          ✨ NEW
├── PatternData.json                               ✨ NEW
├── ISongData.json                                 ✨ NEW
├── ILeaderboardEntry.json                         ✨ NEW
├── IGameSettings.json                             ✨ NEW
├── IMusicalInputAnalysis.json                     ✨ NEW
├── IActiveEffect.json                             ✨ NEW
├── IEnvironmentEffect.json                        ✨ NEW
├── AudioEvent.json                                ✨ NEW
└── AudioLayer.json                                ✨ NEW
```

### 4.7. Shared Contracts - Archivos a MODIFICAR (3 archivos)

```
shared_contracts/
├── QualiaState.json                               🔧 ENHANCE (add collectionWindowEnd)
├── PlayerState.json                               🔧 ENHANCE (add velocity, abilities, buffs)
└── CombatData.json                                🔧 ENHANCE (add patterns, combos)
```

---

## 5. DEPENDENCIAS Y ORDEN DE IMPLEMENTACIÓN

### 5.1. Grafo de Dependencias

```
FASE 0: Preparación
    ↓
FASE 1: Backend Rendering Removal
    ↓
    ├─→ FASE 2: Backend Game Logic & AI (parallel)
    │       ↓
    └─→ FASE 3: Frontend Web Worker (parallel)
            ↓
            ├─→ FASE 4: Frontend Audio Advanced
            │       ↓
            └─→ FASE 5: Frontend Kairos Visual
                    ↓
                FASE 6: Integration & Polish
```

### 5.2. Dependencias Críticas

| Task | Depends On | Blocks |
|------|-----------|--------|
| **Fase 0** | - | Todo lo demás |
| **Fase 1: ParticleEngine refactor** | Fase 0 | Backend Game Logic, Frontend Kairos |
| **Fase 2: GameLogicService** | Fase 0, Fase 1 | Integration testing |
| **Fase 2: HarmonyAnalysisService** | Fase 0 | GameLogicService, Combos |
| **Fase 3: Web Worker** | Fase 0 | Performance validation |
| **Fase 4: FFTAnalyzerService** | Fase 0, Fase 3 | Kairos Phase 2 |
| **Fase 5: Kairos Phase 1** | Fase 0 | Phase 2, 3, 4 (sequential) |
| **Fase 5: Kairos Phase 2** | Phase 1, FFTAnalyzer | Phase 3 |
| **Fase 5: Kairos Phase 3** | Phase 2 | Phase 4 |
| **Fase 5: Kairos Phase 4** | Phase 3 | Integration |
| **Fase 6: Integration** | All phases | Production deployment |

### 5.3. Paralelización Oportunidades

**Parallel Track A (Backend):**
- Fase 1 → Fase 2 (Game Logic + AI)

**Parallel Track B (Frontend):**
- Fase 3 (Web Worker) → Fase 4 (Audio) → Fase 5 (Kairos)

**Nota:** Fase 1 debe completarse antes que Fase 2 y 3 comiencen.

---

## 6. RIESGOS Y MITIGACIONES

### 6.1. Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **ParticleEngine refactor rompe física** | Alta | Crítico | Tests exhaustivos pre/post, validación matemática |
| **Web Worker overhead > beneficio** | Media | Alto | Benchmarking temprano (Fase 3), fallback a main thread |
| **Compute shaders no soportados** | Baja | Medio | Fallback a fragment shader, detección de WebGL2 |
| **Three.js performance <60fps** | Media | Alto | LOD, culling, instanced rendering, profiling continuo |
| **Process Pool deadlock** | Media | Alto | Timeout strict, error recovery, health checks |
| **Musical harmony logic incorrecta** | Media | Medio | Tests con casos reales, validación con músicos |

### 6.2. Riesgos de Proyecto

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Scope creep (añadir features)** | Alta | Alto | Strict adherence a RUTA.md, no desvíos |
| **Estimación optimista** | Media | Medio | Buffer 20% en cada fase, check-ins diarios |
| **Falta de testing incremental** | Media | Alto | TDD mandatorio, tests antes de implementar |
| **Documentación desactualizada** | Alta | Medio | Update docs al finalizar cada fase |

### 6.3. Estrategias de Mitigación Generales

1. **Testing First**: Escribir tests ANTES de implementar
2. **Incremental Integration**: No esperar a Fase 6 para integrar
3. **Performance Checkpoints**: Validar en cada fase
4. **Rollback Plan**: Git branches por fase, merge controlado
5. **Code Reviews**: Peer review de cambios críticos

---

## 7. VALIDACIÓN Y TESTING

### 7.1. Test Coverage Goals

| Component | Coverage Target | Priority |
|-----------|----------------|----------|
| **Backend Game Logic** | >90% | Crítica |
| **Backend AI** | >85% | Alta |
| **Backend ParticleEngine** | >80% | Alta |
| **Frontend QualiaCalculator** | >85% | Alta |
| **Frontend Audio (FFT, 8D)** | >80% | Alta |
| **Frontend Kairos** | >75% | Media |
| **Integration E2E** | >70% | Crítica |

### 7.2. Test Strategy por Fase

#### Fase 0:
- [ ] Contract validation (JSON Schema)
- [ ] Mock generation tests
- [ ] Test infrastructure smoke tests

#### Fase 1:
- [ ] ParticleEngine unit tests (state calculation)
- [ ] Process Pool concurrency tests
- [ ] Backend EventBus integration tests

#### Fase 2:
- [ ] GameLogicService unit tests (all GDD mechanics)
- [ ] HarmonyAnalysisService tests (musical cases)
- [ ] BossAI decision tree tests
- [ ] PatternSystem execution tests

#### Fase 3:
- [ ] Web Worker message passing tests
- [ ] QualiaCalculator accuracy tests (vs main thread)
- [ ] Performance benchmarks

#### Fase 4:
- [ ] FFTAnalyzer frequency extraction tests
- [ ] Audio8D spatial positioning tests
- [ ] Musical combo detection tests

#### Fase 5:
- [ ] Shader compilation tests
- [ ] Three.js scene rendering tests (snapshot)
- [ ] Visual regression tests
- [ ] Performance tests (60fps validation)

#### Fase 6:
- [ ] Full system E2E tests (Kairos flow)
- [ ] Load tests (múltiples clientes)
- [ ] Stress tests (combos extremos)
- [ ] Architectural linting
- [ ] Memory leak detection

### 7.3. Acceptance Criteria (Go/No-Go para Producción)

**Must Have:**
- [ ] All tests passing (>85% coverage global)
- [ ] Performance validated (60fps constante, 4 dominios)
- [ ] Architectural linting clean
- [ ] No critical bugs
- [ ] Documentation actualizada

**Should Have:**
- [ ] Zero memory leaks (Chrome DevTools validation)
- [ ] Backend Process Pool efficiency >80%
- [ ] Web Worker overhead <10ms
- [ ] All visual phases implementadas

**Nice to Have:**
- [ ] Visual polish (particle effects tuning)
- [ ] Audio mixing refinement
- [ ] Boss pattern balancing

---

## RESUMEN FINAL

**Duración Total Estimada:** 40-50 días laborables (~8-10 semanas)

**Archivos Afectados:**
- **Eliminar:** 8 archivos
- **Modificar:** 30 archivos
- **Crear Nuevos:** 80+ archivos
- **Total:** ~120 archivos

**Componentes Principales:**
- Backend: 5 nuevos servicios + refactor ParticleEngine
- Frontend: 6 nuevos servicios + Kairos Visual Engine
- Shared: 12+ nuevos contratos
- Shaders: 7+ nuevos shaders

**Validación:**
- Tests: >85% coverage
- Performance: 60fps, 4 dominios concurrentes
- Architectural compliance: QUALIA.CODE + GOLD.CODE

---

**Esta es la RUTA definitiva. Cada fase es mandatory y secuencial (excepto paralelizaciones indicadas). No hay desviaciones. Ejecución comienza con Fase 0.**

**GOLD.CODE COMPLIANCE: ABSOLUTE. NON-NEGOTIABLE.**

---

*Generado: 6 de octubre de 2025*
*Autor: AI Agent (QUALIA.CODE compliant)*
*Versión: 2.0 FINAL*
