# Qualia Tempo - Placeholder List

This document lists current and anticipated placeholders in the project that require replacement with actual implementations or content.

## Current Placeholders (to be addressed tomorrow)

### Frontend (`game_frontend`)
- **UI Elements:** Placeholder UI elements for menus, talent trees, and dialogue boxes will be created as the game flow is implemented. These will initially be functional but may lack final artistic polish.
- **Additional Combat Data:** As more bosses and songs are added, new `.json` files for combat data will be created. These will follow the defined `CombatData` structure.
- **Sound Effects:** Specific sound effects for player actions, boss attacks, and environmental cues will be added as needed. These will initially be basic and may be refined later.
- **Visual Assets:** Basic geometric shapes or simple textures will be used as placeholders for complex visual assets (e.g., character models, environment textures) until final assets are integrated.

### General
- **Music Separation App:** A dedicated application needs to be created to separate music into individual instruments, voices, and choruses for the game. This is a significant task that will influence future content integration.

## Mejorable (Areas for Future Enhancement)

### Frontend (`game_frontend`)
- **Duplicación de Código (Trivial/Build)**: Pequeños fragmentos de código similares en `game_frontend/src/data/abilities.ts` y `game_frontend/src/hooks/useAbilities.ts`. También, duplicación de HTML en `game_frontend/index.html` y `game_frontend/dist/index.html` (relacionado con el proceso de build).

### Backend (`engine_backend`)
- **Valores Numéricos Hardcodeados (Simulación/Shaders)**: Persisten números hardcodeados en la inicialización de datos de entidades/partículas y en las cadenas de shaders GLSL dentro de `visualizer_process.py`, `moderngl_debug.py` y `gpu_physics_engine.py`. Estos son datos de simulación o constantes de implementación de bajo nivel, no configuraciones globales. Podrían ser externalizados a archivos de datos (ej. JSON) si se requiere mayor flexibilidad en el futuro.
- **Deserialización de JSON (Consideración de Seguridad)**: La lectura de `qualia_state.json` en `visualizer_process.py` (`json.load(f)`) es una consideración de seguridad. Aunque actualmente es para IPC interno, si la fuente de datos pudiera volverse externa o no confiable, se requeriría una validación de esquema más estricta.

## Completado (Addressed Placeholders and Improvements)

### Frontend (`game_frontend`)
- **`game_frontend/src/components/DebugHUD.tsx`**: Now displays real-time game state (player health, boss health, score, rhythm accuracy, QualiaState values).
- **`game_frontend/src/components/Metronome.tsx`**: Refined for sophisticated beat detection and visualization.
- **`game_frontend/src/hooks/useGameLoop.ts`**: Placeholder removed; functionality integrated directly into `game.ts`.
- **`game_frontend/src/hooks/useRhythmicInput.ts`**: Refined for precise rhythmic input detection and integration with player dash mechanics.
- **`game_frontend/src/hooks/useAbilities.ts`**: Full implementation of player abilities (Pause, Fast Forward, Rewind, Ultimate) and their effects.
- **`game_frontend/public/Boss1.json`**: Replaced with actual, detailed combat data for bosses, including note sequences, boss attack patterns, and dialogue.
- **`game_frontend/src/types/tone.d.ts`**: Placeholder removed; users can install `@types/tone` for comprehensive type definitions.
- **`game_frontend/public/sounds/charlie_voice.mp3`**: Placeholder audio file. Requires actual voice lines for Charlie (using `Boss1.mp3` as temporary placeholder).
- **`game_frontend/src/vfx/ParticleManager.ts`**: Placeholder removed; particle rendering handled by backend's `GPUPhysicsEngine`.
- **`game_frontend/src/data/abilities.ts`**: Defines the actual mechanics and values for each player ability.
- **`game_frontend/src/types/QualiaState.ts`**: Provides the actual, detailed type definition for the QualiaState.
- **`game_frontend/src/types/CombatData.ts`**: **Corregido**: Se eliminó este archivo duplicado y se consolidó la definición en `game_frontend/src/data/CombatData.ts`.
- **Duplicación de Componentes UI**: Se redujo la duplicación en `CombatSelectionMenu.tsx` y `MainMenu.tsx` mediante la creación de `MenuContainer.tsx`.
- **Duplicación de Lógica ECS**: Se refactorizó `SaveLoadSystem.ts` y `QualiaSystem.ts` para usar la función de utilidad `getComponentForEntity` de `ecsUtils.ts`.

### Backend (`engine_backend`)
- **`engine_backend/reality_engine/shaders/ontological_physics.glsl`**: Further refined for advanced visual effects, especially particle rendering and complex interactions with QualiaState.
- **`engine_backend/visualizer_process.py`**: Deeper integration with `GPUPhysicsEngine` for particle rendering and more complex visual effects.
- **Configuraciones Hardcodeadas**: Se movieron `QUALIA_STATE_FILE`, `FASTAPI_LOG`, `VISUALIZER_PROCESS_LOG` y `DEFAULT_DISPLAY` a `config.py`.
- **Manejo de Excepciones**: Se reemplazó el manejo genérico de excepciones (`except Exception`) por capturas más específicas (`IOError`, `json.JSONDecodeError`) en `fastapi_server.py` y `visualizer_process.py`.
- **Docstrings Faltantes**: Se añadieron docstrings a nivel de módulo en `engine_backend/engine_backend_visualizer.py`, `engine_backend/moderngl_debug.py`, `engine_backend/reality_engine/__init__.py`, `engine_backend/visualizer_debug.py` y `engine_backend/visualizer_process.py`.

---