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

## Addressed Placeholders (for reference)

### Frontend (`game_frontend`)
- `game_frontend/src/components/DebugHUD.tsx`: Now displays real-time game state (player health, boss health, score, rhythm accuracy, QualiaState values).
- `game_frontend/src/components/Metronome.tsx`: Refined for sophisticated beat detection and visualization.
- `game_frontend/src/hooks/useGameLoop.ts`: Placeholder removed; functionality integrated directly into `game.ts`.
- `game_frontend/src/hooks/useRhythmicInput.ts`: Refined for precise rhythmic input detection and integration with player dash mechanics.
- `game_frontend/src/hooks/useAbilities.ts`: Full implementation of player abilities (Pause, Fast Forward, Rewind, Ultimate) and their effects.
- `game_frontend/public/Boss1.json`: Replaced with actual, detailed combat data for bosses, including note sequences, boss attack patterns, and dialogue.
- `game_frontend/src/types/tone.d.ts`: Placeholder removed; users can install `@types/tone` for comprehensive type definitions.
- `game_frontend/public/sounds/charlie_voice.mp3`: Placeholder audio file. Requires actual voice lines for Charlie (using `Boss1.mp3` as temporary placeholder).
- `game_frontend/src/vfx/ParticleManager.ts`: Placeholder removed; particle rendering handled by backend's `GPUPhysicsEngine`.
- `game_frontend/src/data/abilities.ts`: Defines the actual mechanics and values for each player ability.
- `game_frontend/src/types/QualiaState.ts`: Provides the actual, detailed type definition for the QualiaState.
- `game_frontend/src/types/CombatData.ts`: Provides the actual, detailed type definition for CombatData.

### Backend (`engine_backend`)
- `engine_backend/reality_engine/shaders/ontological_physics.glsl`: Further refined for advanced visual effects, especially particle rendering and complex interactions with QualiaState.
- `engine_backend/visualizer_process.py`: Deeper integration with `GPUPhysicsEngine` for particle rendering and more complex visual effects.