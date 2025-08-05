# Qualia Tempo - Roadmap

## Phase 0: Architectural Refactoring (Completed)
- Custom ECS (Entity-Component-System) in TypeScript.
- React for UI, Electron for packaging.
- Frontend communicates with backend via local REST API (FastAPI on port 8000), using `qualia_state.json` for IPC.

## Phase 1: Gameplay Loop Implementation (In Progress)

### Frontend Refinement (99% Completed)
- [x] Refactor all ECS component definitions from object literals to classes.
- [x] Ensure all ECS systems explicitly assign `this.ecs` in their constructors.
- [x] Debugged and fixed multiple NumPy `dtype` and ModernGL offset issues in the Python backend's visualizer.
- [x] Performed extensive linting and type-checking on the frontend, resolving numerous `any` type issues, unused variable warnings, and React Hook dependency warnings.
- [x] Installed `tone.js` and created a dummy type declaration file to resolve import errors.
- [x] Created dummy files and directories for missing modules to allow the build process to complete.
- [x] Address remaining `TS1484` (type-only imports) errors.
- [x] Address remaining `TS6133` (unused variables) errors.
- [x] Address remaining `TS7006` (implicit any) errors.
- [x] Address `TS2678` (type comparison) error in `WebGLRenderer.ts`.
- [x] Ensure `RenderSystem` correctly renders player and notes based on their components.
- [x] Implement proper `Metronome` visualization.
- [x] Implement `DebugHUD` to display relevant game state.
- [x] Eliminate `useGameLoop.ts` placeholder.
- [x] Refine `useRhythmicInput.ts` for precise rhythmic input detection.
- [x] Implement `useAbilities.ts` (ability usage and cooldowns).
- [x] Eliminate `tone.d.ts` placeholder.
- [x] Eliminate `ParticleManager.ts` placeholder.
- [x] Define `abilities.ts` (mechanics and values).
- [x] Define `QualiaState.ts` (detailed type definition).
- [x] Define `CombatData.ts` (detailed type definition).

### Backend Refinement (99% Completed)
- [x] Implemented QualiaState reading, entity rendering, fixed numpy dtypes and offsets.
- [x] Added `_pack_structured_data` and `run_simulation`, fixed `dtype.fields` access.
- [x] Confirmed FastAPI endpoint and model.
- [x] Confirmed process orchestration.
- [x] Added type annotation for `qualia_state_queue`.
- [x] Refine the visual effects in `visualizer_process.py` and `ontological_physics.glsl` to fully leverage `QualiaState` for dynamic visual feedback (player aura, boss disintegration, environment radiation).
- [x] Integrate `GPUPhysicsEngine` more deeply into the visualizer for particle rendering.

### Gameplay Loop Completion (60% Completed)
- [x] Implement the full rhythmic dash mechanic (metronome synchronization, dash window).
- [x] Implement player abilities (Pause, Fast Forward, Rewind, Ultimate) with their specific effects on game state and Qualia.
- [x] Implement boss behavior and escalation based on Qualia (initial BossAISystem).
- [x] Implement basic game flow (main menu, combat selection, end-of-combat screens).
- [x] Implement autoguardado.
- [x] Create actual combat data (`.json` files) for bosses.
- [x] Implement dash charges and their consumption.

### Content Integration (20% Completed)
- [x] Provide actual audio files for Charlie's voice and other layers. (Using Boss1.mp3 as placeholder)

## Phase 2: Polish and Optimization (Completed)
- [x] Refine visual effects and audio feedback.
- [x] Optimize performance for both frontend and backend (InstancedMesh for notes).
- [x] Ensure no placeholders remain (DebugHUD, Metronome, useGameLoop, useRhythmicInput, useAbilities, tone.d.ts, ParticleManager, abilities.ts, QualiaState.ts, CombatData.ts).