# ARCHITECTURE.RUST v2.0 - Systema de Diseño Definitivo
# TARGET: Qualia Tempo Rust Rewrite
# COMPLIANCE: GOLD.CODE + QUALIA.CODE.RUST v1.1

---

## Tabla de Contenidos

1.  **Filosofía y Principios Fundamentales**
    *   1.1. Separación Absoluta de Responsabilidades (Backend vs. Frontend)
        *   El **Backend (El Cerebro)** es la autoridad sin estado. Su única responsabilidad es la lógica pura: valida acciones, calcula el estado del juego (`CombatState`), orquesta la IA del boss y gestiona la persistencia. Su salida es siempre **DATA**, nunca píxeles.
        *   El **Frontend (Los Sentidos)** es el cliente de visualización. Su única responsabilidad es interpretar el estado recibido del backend y traducirlo en una experiencia audiovisual. Renderiza los gráficos, reproduce el audio 8D y captura el input del usuario.
    *   1.2. Flujo de Datos Unidireccional
        *   El estado fluye en una sola dirección: `Input del Jugador -> Lógica del Backend -> Nuevo Estado del Juego -> Visualización del Frontend`. Este ciclo predecible es fundamental para la depuración y la mantenibilidad.
    *   1.3. Paradigma "Rust-First" para Contratos
        *   Se abandona el enfoque "JSON Schema First" del prototipo original. La nueva fuente única de verdad para todas las estructuras de datos compartidas son los **structs de Rust** definidos en el crate `shared_core`.
        *   Los JSON Schema se generarán a partir de los structs de Rust como artefactos de documentación, no como la fuente.
    *   1.4. Inyección de Dependencias y Ciclo de Vida
        *   Se adopta el patrón **Composition Root** de forma estricta. Un único punto en la aplicación (el `main.rs` de cada crate) es responsable de construir el grafo de dependencias.
        *   Se utilizará un contenedor de Inyección de Dependencias (IoC) en tiempo de compilación (`shaku`) para gestionar los servicios.
        *   Se replicará el patrón `ApplicationInitializerService` del prototipo original para gestionar el ciclo de vida de los servicios (arranque, apagado y registro de eventos) de forma orquestada.

2.  **Diagrama Arquitectónico General (GOLD.CODE Conforme)**
    *   2.1. Diagrama de Componentes de Alto Nivel

        Este diagrama adapta el `GOLD.CODE` a la pila tecnológica de Rust.

        ```
            ┌───────────────────────────────────────────────────────────────────────────────────────────┐
            │                                  FRONTEND (WASM / Leptos)                                 │
            │                                                                                           │
            │   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌────────────────────────┐   │
            │   │      Input Manager       │   │     Audio Engine (8D)    │   │   FFT Analyzer (Local) │   │
            │   │ (Leptos Event Listeners) │   │   (Web Audio via WASM)   │   │   (Web Audio via WASM) │   │
            │   └─────────────┬────────────┘   └─────────────┬────────────┘   └────────────┬───────────┘   │
            │                 │                              │                           │               │
            │                 └───────────────┬──────────────┴───────────────────────────┘               │
            │                                 ▼                                                          │
            │   ┌──────────────────────────────────────────────────────────┐                             │
            │   │               EventBus (tokio::sync::broadcast)          │                             │
            │   └──────────────────────────────────────────────────────────┘                             │
            │       ▲                  │                  │                  ▲                           │
            │       │                  │                  │                  │                           │
            │┌──────┴───────┐  ┌───────▼────────┐  ┌──────▼───────┐  ┌────────┴──────────┐                │
            ││ WebSocket    │  │ QualiaState    │  │ GameState    │  │ Kairos Visual      │                │
            ││ Client       │◄─┤ Calculator     │  │ Store        │◄─┤ Engine (Renderer)  │                │
            ││(tokio-tungstenite)│  │ (EN WASM WORKER)         │  │(Leptos Signals)│  │ (wgpu)             │                │
            │└──────┬───────┘  └────────────────┘  └──────┬───────┘  └────────────────────┘                │
            │       │                                     │                                              │
            └───────┼─────────────────────────────────────┼──────────────────────────────────────────────┘
                    │ (Player Actions, FFT Data)          │ (New Game State)
                    ▼                                     ▲
            ┌───────┼─────────────────────────────────────┼──────────────────────────────────────────────┐
                    │                                     │                                              │
                    │                            BACKEND (Rust / Axum)                                   │
                    │                                                                                    │
                    │   ┌───▼────────────────┐          ┌──────────────────────────┐          ┌────────────────┐   │
                    │   │ API Gateway        │          │   EventBus (Backend)     │          │ Persistence    │   │
                    │   │ (Axum/WebSocket)   ├─────────►│(tokio::sync::broadcast)  ├─────────►│ Service        │   │
                    │   └────────────────────┘          └─────────────┬────────────┘          └────────────────┘   │
                    │                                                 │                                          │
                    │     ┌──────────────────────────┐   ┌────────────▼───────────┐   ┌────────────────────────┐   │
                    │     │ Game Logic Service       │   │ Boss AI & Pattern      │   │ Harmony Analysis     │   │
                    │     │ (Reglas, Combos, Vida)   │◄──┤ System                 │──►│ Service              │   │
                    │   └──────────────────────────┘   └────────────────────────┘   └────────────────────────┘   │
                    │                                                 │                                          │
                    │                                                 ▼                                          │
                    │   ┌──────────────────────────────────────────────────────────┐                             │
                    │   │      Particle Engine & State Aggregator (EN WORKER POOL) │                             │
                    │   └──────────────────────────────────────────────────────────┘                             │
                    │                                                                                            │
                    └────────────────────────────────────────────────────────────────────────────────────────────┘
        ```

    *   2.2. Flujo de Datos de un "Latido" del Juego (El `Kairos`)

        1.  El **Audio Engine** del frontend emite un `Metronome_Tick`.
        2.  El jugador pulsa 'Q'. El **Input Manager** de Leptos lo captura y emite un `PlayerAction_KeyPressed` en el EventBus local.
        3.  El **QualiaState Calculator (WASM Worker)** del frontend recibe la acción y actualiza un QualiaState local y predictivo para una respuesta visual instantánea.
        4.  El **WebSocket Client** envía la acción del jugador y los datos del **FFTAnalyzer** al backend.
        5.  El **API Gateway (Axum)** del backend recibe los datos y los publica en su EventBus.
        6.  El **GameLogicService** procesa la acción, consulta al **HarmonyAnalysisService**, y actualiza el estado del juego.
        7.  La **BossAI** ve el nuevo estado y decide lanzar un ataque.
        8.  Todos estos cambios de estado se envían al **Particle Engine (Worker Pool)**.
        9.  El Particle Engine calcula el nuevo estado de todas las partículas y empaqueta todo en un `CombatState` optimizado.
        10. El `CombatState` se envía de vuelta al frontend a través del WebSocket.
        11. El **WebSocket Client** del frontend recibe el `CombatState` y actualiza el **GameState Store (Leptos Signals)**.
        12. El **Kairos Visual Engine (wgpu)**, que está suscrito a las señales del store, recibe el nuevo estado y actualiza la pantalla: renderiza las nuevas partículas, intensifica el bloom, etc.
        13. El ciclo se repite, idealmente a 60+ FPS.

3.  **Modelo de Concurrencia y Rendimiento (Directiva `Performance.txt`)**
    *   3.1. Frontend: El Núcleo de Cálculo de Qualia (Web Worker)
        *   Para garantizar que el hilo principal de la UI nunca se bloquee, toda la lógica de cálculo intensiva del `QualiaState` se compilará en un módulo WASM dedicado y se ejecutará en un **Web Worker**.
        *   **Flujo de Comunicación:** El hilo principal de Leptos enviará acciones del jugador y eventos de audio al worker a través de `postMessage()`. El worker procesará estos datos de forma asíncrona y devolverá el `QualiaState` calculado al hilo principal, que luego actualizará el store global de Leptos Signals.

    *   3.2. Backend: El Núcleo de Simulación Visual (Pool de Hilos de Tokio)
        *   Para garantizar que los hilos del servidor web de `Axum` permanezcan 100% reactivos y dedicados a la E/S de red, toda la computación pesada se delegará a un pool de hilos de trabajo gestionado por Tokio.
        *   El `ParticleEngineService` y otros servicios de simulación no ejecutarán sus cálculos directamente. En su lugar, encolarán una tarea en un canal (`tokio::sync::mpsc`) que es consumido por este pool de hilos de trabajo.
        *   Se utilizará `tokio::task::spawn_blocking` para ejecutar el código de la simulación, asegurando que cualquier operación intensiva de CPU no bloquee el runtime asíncrono principal.
        *   Este modelo reemplaza la idea simplista de usar `Rayon` directamente en el servicio, proporcionando un aislamiento y una gestión de la carga mucho más robustos.

    *   3.3. Estrategias de Cero-Copia y Asincronía
        *   **Serialización y Buffers:** Se utilizará `bincode` para la serialización binaria sobre WebSockets. Para la gestión de buffers de red, se preferirá el uso de tipos como `Bytes` o `Arc<[u8]>` para permitir el uso compartido de datos entre hilos sin copias.
        *   **Deserialización Cero-Copia:** En rutas críticas, se explorará el uso de `serde` con el atributo `#[serde(borrow)]` para deserializar datos sin realizar asignaciones de memoria, leyendo directamente desde el buffer de entrada.
        *   **E/S Asíncrona Total:** Toda la E/S (lectura/escritura de archivos para persistencia, comunicación de red) debe ser manejada exclusivamente a través de las APIs asíncronas de `tokio`.

4.  **Capa de Contratos y Datos (Traducción de `data_structures_v2.md`)**

    El rico modelo de datos definido en `data_structures_v2.md` será la base para los `structs` y `enums` en el crate `shared_core`. El paradigma es "Rust-First", donde los tipos de Rust son la fuente de verdad.

    *   4.1. Estructuras de Estado del Juego (`shared_core/src/contracts/game_state.rs`)
    
        Todas las interfaces de estado del juego se convierten en structs con `# Responsibility` headers obligatorios.

        ```rust
        use serde::{Deserialize, Serialize};
        use schemars::JsonSchema;
        use crate::utils::math::Vector2;

        /// # Responsibility
        /// Represents the player's real-time mastery state, driving procedural visuals and audio.
        ///
        /// ---
        ///
        /// All values are normalized to [0.0, 1.0] range. This state is calculated
        /// in real-time based on player actions and musical input, and drives the
        /// visual effects (bloom, god rays, particle behavior) and audio modulation (8D, volume).
        #[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Default)]
        #[serde(rename_all = "camelCase")]
        pub struct QualiaState {
            /// Base intensity of player engagement (0.0 - 1.0)
            pub intensity: f32,
            
            /// Timing accuracy and precision (0.0 - 1.0)
            pub precision: f32,
            
            /// Aggressive playstyle indicator (0.0 - 1.0)
            pub aggression: f32,
            
            /// Flow state / "in the zone" (0.0 - 1.0)
            pub flow: f32,
            
            /// Chaotic/dissonant input indicator (0.0 - 1.0)
            pub chaos: f32,
            
            /// Recovery/healing state (0.0 - 1.0)
            pub recovery: f32,
            
            /// Transcendent/ultimate state (0.0 - 1.0)
            pub transcendence: f32,
            
            /// Musical harmony with current song (0.0 - 1.0)
            pub harmony: f32,
            
            /// Kairos moment (perfect timing) indicator (0.0 - 1.0)
            pub kairos: f32,
            
            /// Unix timestamp (milliseconds)
            pub timestamp: u64,
            
            /// Combo multiplier (1.0+)
            pub combo_multiplier: f32,
            
            /// Collection window for qualia pickup (0.0 - 1.0 sec remaining)
            pub collection_window_remaining: f32,
            
            /// Timestamp when collection window ends
            pub collection_window_end: u64,
        }

        /// # Responsibility
        /// Represents the player's current state in combat.
        ///
        /// ---
        ///
        /// Updated by GameLogicService based on player actions, boss attacks,
        /// and qualia collection. Synchronized to frontend via WebSocket.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct PlayerState {
            /// Player position on the stage
            pub position: Vector2,
            
            /// Player velocity (for free movement)
            pub velocity: Vector2,
            
            /// Current health (0.0 - 100.0)
            pub health: f32,
            
            /// Maximum health
            pub max_health: f32,
            
            /// Shield/barrier (0.0 - 100.0)
            pub shield: f32,
            
            /// Current combo count
            pub combo: u32,
            
            /// Is player currently dashing
            pub is_dashing: bool,
            
            /// Dash cooldown remaining (ms)
            pub dash_cooldown: u32,
            
            /// Musical ability states (Q, E, R, T, F, G, C)
            pub abilities: Vec<MusicalAbilityState>,
            
            /// Ultimate charge (0.0 - 100.0, activates at 100.0 with x40 combo)
            pub ultimate_charge: f32,
            
            /// Is ultimate currently active
            pub ultimate_active: bool,
            
            /// Ultimate activation timestamp (for 8D audio effect)
            pub ultimate_activation_timestamp: Option<u64>,
            
            /// Active status effects
            pub active_effects: Vec<ActiveEffect>,
        }

        /// # Responsibility
        /// Represents the state of a musical ability (Q, E, R, T, F, G, C keys).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct MusicalAbilityState {
            /// Ability key (Q, E, R, T, F, G, C)
            pub key: char,
            
            /// Musical note (Do, Re, Mi, Fa, Sol, La, Si)
            pub note: String,
            
            /// Cooldown remaining (ms)
            pub cooldown: u32,
            
            /// Max cooldown (scales with song tempo)
            pub max_cooldown: u32,
            
            /// Is currently on cooldown
            pub is_on_cooldown: bool,
            
            /// Qualia generation modifier (e.g., 2.0x during ultimate)
            pub qualia_generation_modifier: f32,
        }

        /// # Responsibility
        /// Represents an active status effect on player or boss.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct ActiveEffect {
            /// Effect ID
            pub id: String,
            
            /// Effect type (buff, debuff, damage_over_time, etc.)
            pub effect_type: String,
            
            /// Effect magnitude
            pub magnitude: f32,
            
            /// Duration remaining (ms)
            pub duration_remaining: u32,
            
            /// Effect source (player ability, boss attack, combo)
            pub source: String,
        }

        /// # Responsibility
        /// Represents the boss's current state in combat.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct BossState {
            /// Boss unique identifier
            pub id: String,
            
            /// Boss display name
            pub name: String,
            
            /// Current health (0.0 - max_health)
            pub health: f32,
            
            /// Maximum health
            pub max_health: f32,
            
            /// Current combat phase (0, 1, 2, ...)
            pub current_phase: u32,
            
            /// Current attack pattern ID being executed
            pub current_pattern: Option<String>,
            
            /// Position on stage
            pub position: Vector2,
            
            /// Telegraph data (upcoming attack visualization)
            pub telegraph: Option<TelegraphData>,
            
            /// Active environment effects (walls, attractors, repulsors, AoE)
            pub environment_effects: Vec<EnvironmentEffect>,
            
            /// Current aggression level (influenced by tempo and volume)
            pub current_aggression_level: f32,
            
            /// Active status effects
            pub active_effects: Vec<ActiveEffect>,
        }

        /// # Responsibility
        /// Represents the visual telegraph of an upcoming boss attack.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct TelegraphData {
            /// Pattern ID being telegraphed
            pub pattern_id: String,
            
            /// Telegraph duration remaining (ms)
            pub duration_remaining: u32,
            
            /// Telegraph area (circle, line, cone, etc.)
            pub area: TelegraphArea,
            
            /// Telegraph color (always purple/black for boss)
            pub color: [f32; 4], // RGBA
        }

        /// # Responsibility
        /// Defines the shape of a telegraph area.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(tag = "type", rename_all = "camelCase")]
        pub enum TelegraphArea {
            Circle { center: Vector2, radius: f32 },
            Line { start: Vector2, end: Vector2, width: f32 },
            Cone { origin: Vector2, direction: f32, angle: f32, length: f32 },
            Rectangle { center: Vector2, width: f32, height: f32 },
        }

        /// # Responsibility
        /// Represents an environment effect (wall, attractor, repulsor, AoE damage zone).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct EnvironmentEffect {
            /// Effect unique ID
            pub id: String,
            
            /// Effect type
            pub effect_type: EnvironmentEffectType,
            
            /// Position on stage
            pub position: Vector2,
            
            /// Effect radius/size
            pub radius: f32,
            
            /// Duration remaining (ms)
            pub duration_remaining: u32,
            
            /// Effect strength
            pub strength: f32,
            
            /// Source (player combo or boss attack)
            pub source: String,
        }

        /// # Responsibility
        /// Enumerates environment effect types.
        #[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "snake_case")]
        pub enum EnvironmentEffectType {
            Wall,
            Attractor,
            Repulsor,
            DamageZone,
            HealingZone,
            SlowZone,
        }

        /// # Responsibility
        /// Represents the overall combat state.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct CombatState {
            /// Is combat currently active
            pub is_active: bool,
            
            /// Combat elapsed time (ms)
            pub elapsed_time: u64,
            
            /// Current song elapsed time (ms)
            pub song_elapsed_time: u64,
            
            /// Current combat phase
            pub current_phase: u32,
            
            /// Player state
            pub player: PlayerState,
            
            /// Boss state
            pub boss: BossState,
            
            /// Current Qualia state
            pub qualia_state: QualiaState,
            
            /// Qualia orbs on stage (for collection)
            pub qualia_pool: Vec<QualiaOrb>,
            
            /// Optimized particles for rendering
            pub particles: Vec<OptimizedParticle>,
            
            /// Recent Qualia events (for history/replay)
            pub qualia_event_history: Vec<QualiaEvent>,
            
            /// Current song tempo (BPM)
            pub current_tempo: f32,
            
            /// Current song volume (0.0 - 1.0, affects difficulty)
            pub current_volume: f32,
        }

        /// # Responsibility
        /// Represents a Qualia orb on the stage that can be collected.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct QualiaOrb {
            /// Orb unique ID
            pub id: String,
            
            /// Position on stage
            pub position: Vector2,
            
            /// Orb color (based on sound that generated it)
            pub color: [f32; 4], // RGBA
            
            /// Collection window remaining (0.0 - 1.0 sec)
            pub collection_window_remaining: f32,
            
            /// Timestamp when it expires
            pub expires_at: u64,
            
            /// Source (dash, ability, metronome, boss attack)
            pub source: String,
            
            /// Musical note that will play on collection
            pub echo_note: Option<String>,
        }

        /// # Responsibility
        /// Represents a Qualia generation event for history tracking.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct QualiaEvent {
            /// Event timestamp
            pub timestamp: u64,
            
            /// Event type
            pub event_type: String,
            
            /// Amount of Qualia generated
            pub amount: f32,
            
            /// Position where generated
            pub position: Vector2,
        }
        ```

    *   4.2. Estructuras de Datos de Combate (`shared_core/src/contracts/combat_data.rs`)
    
        Configuración de combate cargada desde archivos JSON/YAML al inicio.

        ```rust
        /// # Responsibility
        /// Defines a complete combat encounter (boss fight).
        ///
        /// ---
        ///
        /// Loaded from `combat_data/*.json` files at server startup.
        /// Contains all data needed for a boss fight: patterns, combos, song data.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct CombatData {
            pub id: String,
            pub boss_id: String,
            pub boss_name: String,
            pub boss_max_health: f32,
            pub song_data: SongData,
            pub combos: Vec<MusicalComboData>,
            pub patterns: Vec<PatternData>,
            pub phases: Vec<PhaseData>,
            pub victory_conditions: Vec<VictoryCondition>,
            pub failure_conditions: Vec<FailureCondition>,
        }

        /// # Responsibility
        /// Defines a musical combo that triggers emergent effects.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct MusicalComboData {
            pub id: String,
            pub name: String,
            pub key_sequence: Vec<char>, // e.g., ['Q', 'E', 'R']
            pub musical_note_sequence: Vec<String>, // e.g., ["Do", "Re", "Mi"]
            pub harmony_requirement: f32, // Minimum harmony score (0.0 - 1.0)
            pub effect: ComboEffect,
            pub qualia_cost: f32,
            pub cooldown: u32, // ms
        }

        /// # Responsibility
        /// Defines the effect of a successful combo.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum ComboEffect {
            Vortex { radius: f32, duration: u32, strength: f32 },
            Attractor { radius: f32, duration: u32, strength: f32 },
            Repulsor { radius: f32, duration: u32, strength: f32 },
            Heal { amount: f32 },
            Damage { amount: f32, radius: f32 },
            Shield { amount: f32, duration: u32 },
        }

        /// # Responsibility
        /// Defines a boss attack pattern.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct PatternData {
            pub id: String,
            pub name: String,
            pub telegraph_duration: u32, // ms
            pub telegraph_area: TelegraphArea,
            pub damage: f32,
            pub generates_qualia: bool,
            pub qualia_generation_amount: Option<f32>,
            pub environment_effects: Vec<EnvironmentEffectData>,
            pub triggers: Vec<PatternTrigger>,
        }

        /// # Responsibility
        /// Defines when a pattern is triggered.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum PatternTrigger {
            HealthThreshold { threshold: f32 },
            TimeInterval { interval: u32 }, // ms
            PhaseChange { phase: u32 },
            ComboThreshold { combo: u32 },
            Random { probability: f32 },
        }

        /// # Responsibility
        /// Configuration for an environment effect spawned by a pattern.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct EnvironmentEffectData {
            pub effect_type: EnvironmentEffectType,
            pub position_offset: Vector2, // Relative to boss position
            pub radius: f32,
            pub duration: u32, // ms
            pub strength: f32,
        }

        /// # Responsibility
        /// Defines a combat phase (e.g., phase 1, phase 2).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct PhaseData {
            pub phase_number: u32,
            pub health_threshold: f32, // Boss health % to trigger phase
            pub aggression_modifier: f32, // Multiplier for attack rate
            pub available_patterns: Vec<String>, // Pattern IDs
            pub music_tempo_modifier: f32, // Multiplier for BPM
        }

        /// # Responsibility
        /// Defines a victory condition.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum VictoryCondition {
            BossDefeated,
            SongCompleted,
            TimeLimit { time: u64 }, // ms
        }

        /// # Responsibility
        /// Defines a failure condition.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum FailureCondition {
            PlayerDefeated,
            TimeExpired { time: u64 }, // ms
        }
        ```

    *   4.3. Estructuras de Audio (`shared_core/src/contracts/audio.rs`)
    
        ```rust
        /// # Responsibility
        /// Defines metadata for a song used in combat.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct SongData {
            pub id: String,
            pub name: String,
            pub artist: String,
            pub bpm: f32,
            pub duration: u64, // ms
            pub audio_file_path: String,
            pub lyrics: Vec<LyricData>,
            pub fft_data: Option<Vec<FFTFrame>>, // Pre-analyzed FFT (optional)
        }

        /// # Responsibility
        /// Represents synchronized lyrics for a song.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct LyricData {
            pub id: String,
            pub start_time: u64, // ms
            pub end_time: u64, // ms
            pub text: String,
            pub audio_effects: Vec<AudioEffect>,
        }

        /// # Responsibility
        /// Defines an audio effect to apply.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum AudioEffect {
            Reverb { wet: f32, decay: f32 },
            Delay { time: u32, feedback: f32 },
            Distortion { amount: f32 },
            Filter { frequency: f32, q: f32 },
        }

        /// # Responsibility
        /// Represents a single frame of FFT analysis.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct FFTFrame {
            pub timestamp: u64, // ms
            pub bass_level: f32, // 0.0 - 1.0
            pub mid_level: f32,
            pub treble_level: f32,
            pub bins: Vec<f32>, // Full frequency bins
        }

        /// # Responsibility
        /// Represents an audio event (play, stop, volume change, spatial positioning).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum AudioEvent {
            Play { layer_id: String, timestamp: u64 },
            Stop { layer_id: String },
            VolumeChange { layer_id: String, volume: f32 },
            SpatialPosition { layer_id: String, position: Vector2 },
        }

        /// # Responsibility
        /// Represents an audio layer (music track, SFX layer).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct AudioLayer {
            pub id: String,
            pub name: String,
            pub volume: f32,
            pub is_looping: bool,
            pub spatial_position: Option<Vector2>, // For 8D audio
            pub effects: Vec<AudioEffect>,
        }
        ```

    *   4.4. Estructuras de Partículas (`shared_core/src/contracts/particles.rs`)
    
        ```rust
        /// # Responsibility
        /// Represents an optimized particle for rendering.
        ///
        /// ---
        ///
        /// This is the minimal data needed for the frontend to render a particle.
        /// Updated at 60+ FPS by the backend's ParticleEngine.
        #[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq)]
        #[serde(rename_all = "camelCase")]
        pub struct OptimizedParticle {
            pub position: Vector2,
            pub velocity: Vector2,
            pub color: [f32; 4], // RGBA
            pub size: f32,
            pub lifetime_remaining: f32, // seconds
            pub emissive_strength: f32, // For bloom effect
        }
        ```

    *   4.5. Estructuras de Input (`shared_core/src/contracts/input.rs`)
    
        ```rust
        /// # Responsibility
        /// Enumerates all possible player input actions.
        ///
        /// ---
        ///
        /// Sent from frontend to backend via WebSocket.
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(tag = "type", rename_all = "snake_case")]
        pub enum PlayerAction {
            KeyPressed {
                key: char, // Q, E, R, T, F, G, C
                timestamp: u64,
                accuracy: f32, // Rhythm accuracy (0.0 - 1.0)
            },
            Dash {
                direction: Vector2,
                timestamp: u64,
            },
            Movement {
                direction: Vector2, // Normalized direction vector
                timestamp: u64,
            },
            UltimateActivated {
                timestamp: u64,
            },
            QualiaCollected {
                orb_id: String,
                timestamp: u64,
                position: Vector2,
            },
        }

        /// # Responsibility
        /// Represents analysis of a musical input (timing, harmony).
        #[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase")]
        pub struct MusicalInputAnalysis {
            pub timing_accuracy: f32, // 0.0 - 1.0 (how close to metronome tick)
            pub harmony_score: f32, // 0.0 - 1.0 (how harmonic with current song)
            pub is_on_beat: bool,
            pub note_played: String,
            pub timestamp: u64,
        }
        ```

    *   4.6. Configuración del Sistema de Partículas (Solo Frontend - NO en shared_core)
    
        Como se indica en `data_structures_v2.md`, estas estructuras son configuración interna del renderer y no se sincronizan por red. Se definen en `frontend/src/rendering/effects/particle_config.rs`.

5.  **Arquitectura del Backend (El Cerebro) - Catálogo Completo de Servicios**

    El backend es una aplicación Rust nativa, compilada y optimizada, que actúa como la autoridad central del juego. Esta sección documenta **TODOS** los servicios del prototipo y su migración.

    *   5.1. Composition Root y Ciclo de Vida (`backend/src/main.rs`)
    
        ```rust
        use shaku::module;
        use backend::services::*;
        
        // Define el módulo Shaku con TODOS los servicios
        module! {
            pub GameModule {
                components = [
                    // Core infrastructure
                    core::EventBusService,
                    core::QualiaLogger,
                    core::TimerService,
                    core::ErrorReportingService,
                    
                    // Lifecycle
                    lifecycle::ApplicationInitializerService,
                    
                    // Gameplay
                    gameplay::GameLogicService,
                    gameplay::BossAIService,
                    gameplay::PatternSystemService,
                    gameplay::QualiaProcessorService,
                    gameplay::CombatOrchestratorService,
                    
                    // Audio
                    audio::HarmonyAnalysisService,
                    
                    // Rendering
                    rendering::ParticlePoolService,
                    rendering::ShaderIntrospectionService,
                    
                    // Networking
                    networking::WebSocketService,
                    networking::StateStreamingService,
                    
                    // Persistence
                    persistence::LeaderboardService,
                    
                    // Security
                    security::AuthService,
                    security::ValidationService,
                    
                    // Monitoring
                    monitoring::HealthCheckService,
                    monitoring::MetricsService,
                    monitoring::PerformanceService,
                    
                    // Infrastructure
                    infrastructure::FileSystemService,
                    infrastructure::EnvironmentService,
                ],
                providers = []
            }
        }
        
        #[tokio::main]
        async fn main() -> anyhow::Result<()> {
            // 1. Build DI container
            let module = GameModule::builder()
                .with_component_parameters::<QualiaLogger>(QualiaLoggerConfig::load()?)
                .with_component_parameters::<GameLogicService>(GameLogicConfig::load()?)
                // ... configure all services with their config structs
                .build();
            
            // 2. Resolve ApplicationInitializerService
            let initializer: Arc<dyn IApplicationInitializer> = module.resolve();
            
            // 3. Start all services (initializer calls start() on each)
            initializer.initialize().await?;
            
            // 4. Start Axum server
            let app = create_axum_app(module.clone()).await?;
            axum::Server::bind(&"0.0.0.0:3000".parse()?)
                .serve(app.into_make_service())
                .await?;
            
            // 5. Shutdown all services
            initializer.shutdown().await?;
            
            Ok(())
        }
        ```

    *   5.2. API Gateway (Axum y WebSockets) - `backend/src/handlers/websocket.rs`
    
        ```rust
        use axum::{
            extract::{ws::{WebSocket, WebSocketUpgrade}, State},
            response::Response,
        };
        use tokio::sync::broadcast;
        use shared_core::events::GameEvent;
        
        /// # Responsibility
        /// Handles WebSocket upgrade requests and manages bidirectional communication.
        pub async fn websocket_handler(
            ws: WebSocketUpgrade,
            State(event_bus): State<Arc<dyn IEventBus>>,
        ) -> Response {
            ws.on_upgrade(|socket| handle_socket(socket, event_bus))
        }
        
        async fn handle_socket(socket: WebSocket, event_bus: Arc<dyn IEventBus>) {
            let (mut sender, mut receiver) = socket.split();
            
            // Spawn task to receive from client and publish to EventBus
            let event_bus_clone = event_bus.clone();
            tokio::spawn(async move {
                while let Some(Ok(msg)) = receiver.next().await {
                    if let Ok(action) = bincode::deserialize::<PlayerAction>(&msg.into_data()) {
                        event_bus_clone.emit(GameEvent::PlayerAction(action)).ok();
                    }
                }
            });
            
            // Subscribe to EventBus and send to client
            let mut events = event_bus.subscribe();
            tokio::spawn(async move {
                while let Ok(event) = events.recv().await {
                    if let GameEvent::CombatStateUpdated(state) = event {
                        if let Ok(data) = bincode::serialize(&state) {
                            sender.send(Message::Binary(data)).await.ok();
                        }
                    }
                }
            });
        }
        ```

    *   5.3. El EventBus (`tokio::sync::broadcast`) - `backend/src/services/core/event_bus.rs`
    
        **MANDATO**: Implementación lock-free con `tokio::sync::broadcast`.

        ```rust
        use tokio::sync::broadcast;
        use shared_core::events::GameEvent;
        use shaku::Component;
        
        /// # Responsibility
        /// Provides lock-free event distribution across all backend services.
        ///
        /// ---
        ///
        /// Uses tokio::sync::broadcast for zero-lock contention.
        /// Capacity of 1000 events is sufficient for typical gameplay.
        #[derive(Component)]
        #[shaku(interface = IEventBus)]
        pub struct EventBusService {
            tx: broadcast::Sender<GameEvent>,
        }
        
        impl EventBusService {
            pub fn new(capacity: usize) -> Self {
                let (tx, _rx) = broadcast::channel(capacity);
                Self { tx }
            }
        }
        
        impl IEventBus for EventBusService {
            fn emit(&self, event: GameEvent) -> Result<usize> {
                self.tx.send(event)
                    .map_err(|_| anyhow::anyhow!("No active subscribers"))
            }
            
            fn subscribe(&self) -> broadcast::Receiver<GameEvent> {
                self.tx.subscribe()
            }
        }
        ```

    *   5.4. Catálogo Completo de Servicios Backend
    
        **5.4.1. Core Services** (`backend/src/services/core/`)
        
        - **EventBusService**: Lock-free event distribution (tokio::sync::broadcast)
        - **QualiaLogger**: Structured logging wrapper (tracing crate)
        - **TimerService**: Timing utilities (tokio::time)
        - **ErrorReportingService**: Centralized error handling and reporting
        
        **5.4.2. Lifecycle Services** (`backend/src/services/lifecycle/`)
        
        - **ApplicationInitializerService**: Orchestrates service startup/shutdown
        
        **5.4.3. Gameplay Services** (`backend/src/services/gameplay/`)
        
        - **GameLogicService**: Core game rules (health, damage, combo, victory/failure)
        - **BossAIService**: Boss behavior and decision-making
        - **PatternSystemService**: Boss attack pattern execution
        - **QualiaProcessorService**: Qualia state calculation from player actions
        - **CombatOrchestratorService**: Coordinates all combat systems
        
        **5.4.4. Audio Services** (`backend/src/services/audio/`)
        
        - **HarmonyAnalysisService**: Musical harmony analysis for combo system
        
        **5.4.5. Rendering Services** (`backend/src/services/rendering/`)
        
        - **ParticlePoolService**: Manages Tokio task pool for particle computation
        - **ShaderIntrospectionService**: Provides shader metadata to frontend
        
        **5.4.6. Networking Services** (`backend/src/services/networking/`)
        
        - **WebSocketService**: WebSocket server management (Axum + tokio-tungstenite)
        - **StateStreamingService**: Broadcasts CombatState to all connected clients
        
        **5.4.7. Persistence Services** (`backend/src/services/persistence/`)
        
        - **LeaderboardService**: Leaderboard storage and retrieval (SQLite/PostgreSQL)
        
        **5.4.8. Security Services** (`backend/src/services/security/`)
        
        - **AuthService**: Player authentication and session management
        - **ValidationService**: Input validation and anti-cheat measures
        
        **5.4.9. Monitoring Services** (`backend/src/services/monitoring/`)
        
        - **HealthCheckService**: System health monitoring (CPU, memory, connections)
        - **MetricsService**: Performance metrics collection (Prometheus format)
        - **PerformanceService**: Profiling and performance tracking
        
        **5.4.10. Infrastructure Services** (`backend/src/services/infrastructure/`)
        
        - **FileSystemService**: File I/O operations (tokio::fs)
        - **EnvironmentService**: Environment variable and system detection

    *   5.5. Particle Engine Worker Pool - `backend/src/engine/particle_engine.rs`
    
        **CRITICAL**: Offload heavy computation to Tokio task pool to keep network I/O threads responsive.

        ```rust
        use tokio::sync::mpsc;
        use shared_core::contracts::OptimizedParticle;
        
        /// # Responsibility
        /// Manages a pool of Tokio tasks for particle simulation.
        ///
        /// ---
        ///
        /// Prevents blocking the Axum server threads with CPU-intensive particle updates.
        /// Uses tokio::task::spawn_blocking for compute-heavy operations.
        pub struct ParticleEngine {
            work_tx: mpsc::Sender<ParticleWorkRequest>,
            result_rx: mpsc::Receiver<Vec<OptimizedParticle>>,
        }
        
        impl ParticleEngine {
            pub fn new(num_workers: usize) -> Self {
                let (work_tx, mut work_rx) = mpsc::channel(100);
                let (result_tx, result_rx) = mpsc::channel(100);
                
                // Spawn worker pool
                for _ in 0..num_workers {
                    let mut rx = work_rx.clone();
                    let tx = result_tx.clone();
                    
                    tokio::spawn(async move {
                        while let Some(request) = rx.recv().await {
                            // Use spawn_blocking for CPU-intensive work
                            let result = tokio::task::spawn_blocking(move || {
                                calculate_particles(request)
                            }).await.unwrap();
                            
                            tx.send(result).await.ok();
                        }
                    });
                }
                
                Self { work_tx, result_rx }
            }
            
            pub async fn submit_work(&self, request: ParticleWorkRequest) -> Result<()> {
                self.work_tx.send(request).await
                    .map_err(|_| anyhow::anyhow!("Worker pool closed"))
            }
            
            pub async fn get_result(&mut self) -> Option<Vec<OptimizedParticle>> {
                self.result_rx.recv().await
            }
        }
        
        fn calculate_particles(request: ParticleWorkRequest) -> Vec<OptimizedParticle> {
            // Heavy CPU work here (particle physics simulation)
            // ...
        }
        ```

    *   5.6. Configuration Loading - `backend/src/config/loader.rs`
    
        **MANDATO**: Direct configuration injection, NO ConfigurationService.

        ```rust
        use serde::Deserialize;
        use anyhow::{Context, Result};
        
        /// # Responsibility
        /// Loads configuration from YAML files.
        ///
        /// ---
        ///
        /// Called once at startup. Config structs are injected into services via Shaku.
        pub fn load_config<T: for<'de> Deserialize<'de>>(path: &str) -> Result<T> {
            let contents = std::fs::read_to_string(path)
                .context(format!("Failed to read config: {}", path))?;
            
            serde_yaml::from_str(&contents)
                .context("Failed to parse YAML config")
        }
        ```

6.  **Arquitectura del Frontend (Los Sentidos) - Catálogo Completo de Servicios**

    El frontend es una Single Page Application (SPA) compilada a WebAssembly (WASM), utilizando `Leptos` como framework reactivo y `wgpu` para todo el renderizado.

    *   6.1. Composition Root y Ciclo de Vida (`frontend/src/lib.rs`)
    
        ```rust
        use leptos::*;
        use shaku::module;
        use frontend::services::*;
        
        // Define el módulo Shaku con TODOS los servicios frontend
        module! {
            pub FrontendModule {
                components = [
                    // Core
                    core::EventBusService,
                    core::Logger,
                    core::TimerService,
                    core::ErrorReporterService,
                    
                    // Lifecycle
                    lifecycle::ApplicationInitializerService,
                    
                    // Audio
                    audio::AudioService,
                    audio::SpatialAudioService,
                    audio::FFTAnalyzerService,
                    audio::AudioBridgeService,
                    audio::WebAudioAPIService,
                    
                    // Input
                    input::InputControllerService,
                    input::InputStateService,
                    input::RhythmicMovementService,
                    
                    // Gameplay
                    gameplay::GameControllerService,
                    gameplay::MechanicsService,
                    gameplay::ComboDetectorService,
                    gameplay::QualiaWorkerBridgeService,
                    
                    // State
                    state::StateMergerService,
                    state::ViewLogicService,
                    
                    // Networking
                    networking::SyncService,
                    networking::StateStreamingService,
                    networking::WebSocketClientService,
                    networking::JitterCompensatorService,
                    
                    // Rendering
                    rendering::RendererService,
                    rendering::KairosEngineService,
                    rendering::ParticleSystemService,
                    rendering::PhysicsService,
                    rendering::PostProcessingService,
                    rendering::RenderTargetPoolService,
                    rendering::ShaderLoaderService,
                    rendering::ShaderIntrospectorService,
                    rendering::ReactionDiffusionService,
                    
                    // UI
                    ui::NotificationService,
                    ui::SubtitleService,
                    
                    // Utils
                    utils::ColorService,
                    utils::CoordinateService,
                    
                    // Monitoring
                    monitoring::PerformanceService,
                    
                    // Debug
                    debug::OrchestratorService,
                    debug::DebugService,
                ],
                providers = []
            }
        }
        
        #[wasm_bindgen(start)]
        pub fn main() {
            // 1. Initialize panic hook for better error messages
            console_error_panic_hook::set_once();
            
            // 2. Build DI container
            let module = FrontendModule::builder().build();
            
            // 3. Initialize all services
            let initializer: Arc<dyn IApplicationInitializer> = module.resolve();
            spawn_local(async move {
                initializer.initialize().await.ok();
            });
            
            // 4. Mount Leptos app
            leptos::mount_to_body(|| view! { <App module=module /> });
        }
        ```

    *   6.2. El "Proyecto Kairos" - Motor Visual Completo (`frontend/src/rendering/`)
    
        **6.2.1. KairosVisualEngine - El Orquestador** (`kairos_engine.rs`)
        
        ```rust
        use wgpu::*;
        use shared_core::contracts::{QualiaState, CombatState, OptimizedParticle};
        
        /// # Responsibility
        /// Orchestrates the entire rendering pipeline: particles, SDFs, post-processing.
        ///
        /// ---
        ///
        /// Subscribes to GameStateStore (Leptos Signals) and updates visuals at 60+ FPS.
        /// Implements the 4-phase visual roadmap from VISUALS.GOLD.CODE.md.
        pub struct KairosVisualEngine {
            device: Device,
            queue: Queue,
            surface: Surface,
            
            // Phase 1: Atmosphere
            bloom_pass: BloomPass,
            god_rays_pass: GodRaysPass,
            
            // Phase 2: Synesthesia
            fft_data: FFTData,
            particle_system: ParticleSystem,
            
            // Phase 3: Living World
            reaction_diffusion_pass: ReactionDiffusionPass,
            
            // Phase 4: Avatars
            sdf_renderer: SDFRenderer,
        }
        
        impl KairosVisualEngine {
            pub fn render(&mut self, state: &CombatState) {
                // 1. Update reaction-diffusion floor (Phase 3)
                self.reaction_diffusion_pass.update(
                    state.qualia_state.chaos,
                    state.qualia_state.flow,
                );
                
                // 2. Update particles with FFT data (Phase 2)
                self.particle_system.update(
                    &state.particles,
                    &self.fft_data,
                    state.qualia_state.intensity,
                );
                
                // 3. Render SDFs (Phase 4)
                self.sdf_renderer.render_player(
                    state.player.position,
                    state.qualia_state.transcendence,
                );
                self.sdf_renderer.render_boss(
                    state.boss.position,
                    state.boss.current_phase,
                );
                
                // 4. Apply post-processing (Phase 1)
                self.bloom_pass.apply(
                    state.qualia_state.intensity,
                    state.qualia_state.transcendence,
                );
                self.god_rays_pass.apply(
                    state.qualia_state.precision,
                    state.qualia_state.aggression,
                );
            }
        }
        ```
        
        **6.2.2. Phase 1: Atmosphere** (`shaders/bloom.rs` + `god_rays.rs`)
        
        Bloom shader parameters:
        - `u_intensity` ← QualiaState.intensity (threshold)
        - `u_transcendence` ← QualiaState.transcendence (strength)
        
        God Rays shader parameters:
        - `u_precision` ← QualiaState.precision (ray sharpness)
        - `u_aggression_color_tint` ← QualiaState.aggression (red/orange tint)
        
        **6.2.3. Phase 2: Synesthesia** (`audio/fft_analyzer.rs` + `particle_system.rs`)
        
        ```rust
        /// # Responsibility
        /// Analyzes audio in real-time using Web Audio API AnalyserNode.
        ///
        /// ---
        ///
        /// Extracts frequency data (bass, mids, treble) and sends to particle shaders.
        pub struct FFTAnalyzerService {
            analyser: web_sys::AnalyserNode,
            fft_data: Vec<f32>,
        }
        
        impl FFTAnalyzerService {
            pub fn analyze(&mut self) -> FFTData {
                self.analyser.get_float_frequency_data(&mut self.fft_data);
                
                FFTData {
                    bass_level: self.calculate_band_average(0, 4),
                    mid_level: self.calculate_band_average(5, 20),
                    treble_level: self.calculate_band_average(21, 31),
                    bins: self.fft_data.clone(),
                }
            }
        }
        ```
        
        Particle shader uniforms (WGSL):
        ```wgsl
        struct Uniforms {
            bass_level: f32,      // Modulates size + emission rate
            mid_level: f32,       // Controls velocity + turbulence
            treble_level: f32,    // Affects brightness (emissive)
            fft_aggression_mod: f32, // Multiplier from QualiaState.aggression
        }
        ```
        
        **6.2.4. Phase 3: Living World** (`shaders/reaction_diffusion.rs`)
        
        ```rust
        /// # Responsibility
        /// Simulates Reaction-Diffusion patterns on the floor using compute shaders.
        ///
        /// ---
        ///
        /// Updated every frame based on QualiaState.chaos and .flow.
        /// Creates organic, evolving patterns (Turing patterns).
        pub struct ReactionDiffusionPass {
            compute_pipeline: ComputePipeline,
            texture: Texture,
            uniforms: ReactionDiffusionUniforms,
        }
        
        impl ReactionDiffusionPass {
            pub fn update(&mut self, chaos: f32, flow: f32) {
                // Chaos increases diffusion rate, flow increases feed rate
                self.uniforms.diffusion_rate = 0.1 + (chaos * 0.4);
                self.uniforms.feed_rate = 0.02 + (flow * 0.04);
                
                // Dispatch compute shader
                // ...
            }
        }
        ```
        
        **6.2.5. Phase 4: Avatars** (`shaders/sdf_renderer.rs`)
        
        ```rust
        /// # Responsibility
        /// Renders player and boss as procedural SDFs (Signed Distance Fields).
        ///
        /// ---
        ///
        /// Uses raymarching in fragment shader. Shapes morph based on QualiaState.
        /// At transcendence > 0.9, player transforms into Mandelbulb fractal.
        pub struct SDFRenderer {
            pipeline: RenderPipeline,
        }
        
        impl SDFRenderer {
            pub fn render_player(&self, position: Vector2, transcendence: f32) {
                let sdf_type = if transcendence > 0.9 {
                    SDFType::Mandelbulb { iterations: (transcendence * 10.0) as u32 }
                } else {
                    SDFType::Sphere { radius: 1.0 + transcendence }
                };
                
                // Set shader uniforms and draw
                // ...
            }
        }
        ```

    *   6.3. Gestión de Estado con Leptos Signals (`frontend/src/state/game_store.rs`)
    
        ```rust
        use leptos::*;
        use shared_core::contracts::{CombatState, PlayerState, BossState, QualiaState};
        
        /// # Responsibility
        /// Global game state store using Leptos reactive signals.
        ///
        /// ---
        ///
        /// Provided via provide_context at app root. Components access via use_context.
        /// Automatically triggers re-renders when state changes.
        #[derive(Clone)]
        pub struct GameStateStore {
            pub combat_state: RwSignal<CombatState>,
            pub player_state: RwSignal<PlayerState>,
            pub boss_state: RwSignal<BossState>,
            pub qualia_state: RwSignal<QualiaState>,
            pub is_connected: RwSignal<bool>,
            pub connection_latency: RwSignal<u32>, // ms
        }
        
        impl GameStateStore {
            pub fn new() -> Self {
                Self {
                    combat_state: create_rw_signal(CombatState::default()),
                    player_state: create_rw_signal(PlayerState::default()),
                    boss_state: create_rw_signal(BossState::default()),
                    qualia_state: create_rw_signal(QualiaState::default()),
                    is_connected: create_rw_signal(false),
                    connection_latency: create_rw_signal(0),
                }
            }
            
            pub fn update_from_backend(&self, new_state: CombatState) {
                self.combat_state.set(new_state.clone());
                self.player_state.set(new_state.player);
                self.boss_state.set(new_state.boss);
                self.qualia_state.set(new_state.qualia_state);
            }
        }
        ```

    *   6.4. Motor de Audio 8D (`frontend/src/services/audio/`)
    
        **6.4.1. AudioService** (`playback.rs`)
        ```rust
        /// # Responsibility
        /// Manages music playback and synchronization using Web Audio API.
        pub struct AudioService {
            context: web_sys::AudioContext,
            source: Option<web_sys::AudioBufferSourceNode>,
            gain: web_sys::GainNode,
        }
        ```
        
        **6.4.2. SpatialAudioService** (`spatial_audio.rs`)
        ```rust
        /// # Responsibility
        /// Creates 8D spatial audio effects using PannerNode.
        ///
        /// ---
        ///
        /// Positions sounds based on qualia orb locations, boss attacks, etc.
        pub struct SpatialAudioService {
            context: web_sys::AudioContext,
            listener: web_sys::AudioListener,
            panners: HashMap<String, web_sys::PannerNode>,
        }
        
        impl SpatialAudioService {
            pub fn play_at_position(&mut self, sound_id: &str, position: Vector2) {
                let panner = self.panners.entry(sound_id.to_string())
                    .or_insert_with(|| self.create_panner());
                
                panner.set_position(position.x, position.y, 0.0);
                // Trigger sound...
            }
        }
        ```
        
        **6.4.3. FFTAnalyzerService** (`fft_analyzer.rs`)
        
        See Phase 2 (Synesthesia) above.

    *   6.5. Web Worker para QualiaStateCalculator (`frontend/src/workers/qualia_calculator.rs`)
    
        **CRITICAL**: Offload CPU-intensive qualia calculation to Web Worker.

        ```rust
        use wasm_bindgen::prelude::*;
        use shared_core::contracts::{QualiaState, PlayerAction};
        
        /// # Responsibility
        /// Runs in a Web Worker to calculate QualiaState without blocking UI thread.
        ///
        /// ---
        ///
        /// Receives PlayerAction via postMessage, calculates predictive QualiaState,
        /// sends result back to main thread.
        #[wasm_bindgen]
        pub struct QualiaCalculatorWorker {
            calculator: QualiaStateCalculator,
        }
        
        #[wasm_bindgen]
        impl QualiaCalculatorWorker {
            #[wasm_bindgen(constructor)]
            pub fn new() -> Self {
                Self {
                    calculator: QualiaStateCalculator::new(/* config */),
                }
            }
            
            #[wasm_bindgen]
            pub fn process_action(&mut self, action_json: &str) -> String {
                let action: PlayerAction = serde_json::from_str(action_json).unwrap();
                let new_state = self.calculator.calculate(action);
                serde_json::to_string(&new_state).unwrap()
            }
        }
        ```
        
        Main thread bridge (`services/gameplay/qualia_worker_bridge.rs`):
        ```rust
        /// # Responsibility
        /// Bridges communication between main thread and QualiaCalculator Web Worker.
        pub struct QualiaWorkerBridgeService {
            worker: web_sys::Worker,
        }
        
        impl QualiaWorkerBridgeService {
            pub fn send_action(&self, action: PlayerAction) {
                let json = serde_json::to_string(&action).unwrap();
                self.worker.post_message(&json.into()).ok();
            }
            
            pub fn on_result(&self, callback: impl Fn(QualiaState) + 'static) {
                // Setup onmessage handler...
            }
        }
        ```

    *   6.6. Catálogo Completo de Servicios Frontend
    
        **Total: 50 servicios (ver BLUEPRINT.RUST.md para lista completa)**
        
        Agrupados por dominio:
        - **Core** (4): EventBus, Logger, Timer, ErrorReporter
        - **Lifecycle** (1): ApplicationInitializer
        - **Audio** (5): Playback, SpatialAudio, FFTAnalyzer, AudioBridge, WebAudioAPI
        - **Input** (3): InputController, InputState, RhythmicMovement
        - **Gameplay** (4): GameController, Mechanics, ComboDetector, QualiaWorkerBridge
        - **State** (2): StateMerger, ViewLogic
        - **Networking** (4): Sync, StateStreaming, WebSocketClient, JitterCompensator
        - **Rendering** (9): Renderer, KairosEngine, ParticleSystem, Physics, PostProcessing, RenderTargetPool, ShaderLoader, ShaderIntrospector, ReactionDiffusion
        - **UI** (2): Notifications, Subtitles
        - **Utils** (2): Color, Coordinates
        - **Monitoring** (1): Performance
        - **Debug** (2): Orchestrator, Debug
        
        **Servicios REMOVIDOS** (reemplazados por soluciones Rust-nativas):
        - BrowserAudioContextFactory → Direct wasm-bindgen
        - BrowserEventsService → Leptos event handlers
        - BrowserWebSocketFactory → Direct tokio-tungstenite
        - HttpService → Direct reqwest
        - JsGlslParserService → naga (Rust GLSL parser)
        - GameStateStoreService → Direct Leptos Signals access

7.  **Lógica Transversal (Macros Procedurales)**

    La lógica transversal (logging, error handling, etc.) se manejará de forma declarativa utilizando macros procedurales de Rust, replicando la limpieza y potencia de la arquitectura basada en decoradores del prototipo original.

    *   7.1. Replicando los Decoradores de TS/Python
        *   El prototipo original dependía en gran medida de decoradores como `@logMethod`, `@catchError`, `@retry`, y `@throttle` para manejar incumbencias transversales.
        *   Se creará un crate dedicado, `qualia_macros`, para albergar un conjunto de macros procedurales de atributos que proporcionen una funcionalidad análoga. Esto mantiene el código de negocio limpio de lógica repetitiva.

    *   7.2. `#[handle_event]` para suscripción automática
        *   Inspirado en el decorador `@OnEvent`, se creará una macro de atributo `#[handle_event(GameEvent::Variant)]`.
        *   Esta macro transformará una función simple (ej. `async fn handle_my_event(&self, event: MyEvent)`) en una tarea de Tokio completa que se suscribe al `EventBus`, filtra los eventos por el tipo especificado, y maneja el bucle de recepción, los errores y el logging de forma automática. Esto elimina código repetitivo y propenso a errores en los servicios que consumen eventos.

    *   7.3. `#[instrument]` para Logging Estructurado
        *   Se adopta el macro `#[instrument]` del crate `tracing` como el estándar para la observabilidad a nivel de función. Será el reemplazo directo del decorador `@logMethod`.
        *   Este macro enriquecerá automáticamente los logs con el nombre de la función, sus argumentos y la duración de su ejecución, proporcionando trazas detalladas con un esfuerzo de implementación mínimo.

8.  **Estrategia de Testing (Estándar `QUALIA.CODE`)**

    La estrategia de testing es un pilar fundamental y no negociable. Se adhiere a los principios de `QUALIA.CODE` para garantizar la robustez, mantenibilidad y corrección del sistema.

    *   8.1. El Patrón de Contenedor Aislado con `shaku`
        *   **Mandato:** Cada prueba unitaria o de integración de servicios se ejecutará en un entorno completamente aislado. Está prohibido compartir estado o instancias de servicios entre tests.
        *   **Implementación:** Se creará una factoría de módulos de test (ej. `create_test_module()`) que construirá una nueva instancia del `shaku::Module` para cada caso de prueba. Esta factoría se encargará de reemplazar las dependencias reales por sus dobles de prueba (mocks).

    *   8.2. El Estándar de Mocks de Alta Fidelidad con `mockall`
        *   **Mandato:** Todos los dobles de prueba para `traits` de servicios DEBEN ser creados usando el crate `mockall`.
        *   **Principio de Alta Fidelidad:** Un mock debe ser una representación fiel y segura de su contrato. Un mock para un método que devuelve `Result<u32, Error>` debe ser configurado para devolver `Ok(0)` por defecto, no para causar un `panic`. Esto previene tests frágiles y errores de compilación o ejecución inesperados.

    *   8.3. Pruebas de Propiedad con `proptest`
        *   Para validar los invariantes de la lógica de negocio y los algoritmos críticos (ej. cálculos de `QualiaState`), se utilizará el crate `proptest`.
        *   En lugar de probar con ejemplos específicos, se definirán las propiedades que el código debe cumplir (ej. "la intensidad nunca debe ser negativa"), y `proptest` generará cientos de entradas aleatorias para intentar falsar dichas propiedades.

9.  **Plan de Migración y Fases**

    La reescritura se abordará en fases lógicas para garantizar una base sólida y permitir la verificación incremental.

    *   **Fase 1: Fundación y Núcleo Compartido (Semanas 1-2)**
        *   Establecer la estructura del workspace de Cargo (`backend`, `frontend`, `shared_core`, `qualia_macros`).
        *   Definir el 100% de los `structs` y `enums` de datos en `shared_core` basados en `data_structures_v2.md`, derivando `serde` y `schemars`.
        *   Implementar el `EventBusService` con `tokio::sync::broadcast`.
        *   Definir los `traits` base para todos los servicios (`IService`, `ILogger`, etc.).

    *   **Fase 2: Implementación del Backend (Semanas 3-6)**
        *   Implementar el `CompositionRoot` del backend con `shaku` y el `ApplicationInitializerService`.
        *   Construir el servidor WebSocket con `Axum`, capaz de aceptar conexiones y emitir eventos de prueba.
        *   Implementar el catálogo completo de servicios del backend (`GameLogic`, `HarmonyAnalysis`, `Persistence`, etc.).
        *   **CRÍTICO:** La lógica del `ParticleEngineService` debe ser delegada a un pool de hilos de trabajo de Tokio desde el principio, como se define en la sección de concurrencia.
        *   Escribir tests unitarios (con `mockall`) y de integración para todos los servicios clave.

    *   **Fase 3: Implementación del Frontend (Semanas 7-10)**
        *   Establecer el `CompositionRoot` simétrico en el frontend con `shaku`.
        *   Implementar el `GameStateStore` global utilizando Leptos Signals y `provide_context`.
        *   Implementar el `KairosVisualEngineService` con `wgpu`, enfocándose primero en la **Fase 1 (Atmósfera)** y **Fase 2 (Synesthesia/FFT)** del plan visual.
        *   Implementar el `AudioEngineService` con `wasm-bindgen` para la reproducción de música y el análisis FFT.
        *   **CRÍTICO:** El `QualiaStateCalculator` debe ser implementado en un **Web Worker** desde el principio.
        *   Construir los componentes de UI básicos con Leptos para mostrar el estado del juego.

    *   **Fase 4: Integración y Optimización (Semanas 11-12)**
        *   Conectar el WebSocket del frontend con el backend, estableciendo el flujo de datos completo.
        *   Refinar la lógica de juego y la IA del boss basándose en el flujo de datos real.
        *   Implementar las **Fases 3 (Reaction-Diffusion)** y **4 (SDFs)** del "Proyecto Kairos".
        *   Realizar profiling de rendimiento del backend y frontend con `tracing` y `flamegraph`.
        *   Aplicar optimizaciones de cero-copia en las rutas calientes (hot paths) identificadas.

    *   **Fase 5: Despliegue y Estabilización (Semana 13)**
        *   Crear Dockerfiles para el despliegue del backend.
        *   Configurar pipelines de CI/CD en GitHub Actions para ejecutar `cargo test` y `clippy` automáticamente.
        *   Realizar pruebas de carga en el servidor WebSocket.
        *   Auditoría de seguridad y estabilización de la API.

---
*Este documento es la única fuente de verdad para la arquitectura de la reescritura en Rust. Reemplaza y anula todas las versiones anteriores.*
