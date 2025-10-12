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

4.  **Capa de Contratos y Datos (Definidos en `DATA.RUST.md`)**

    Siguiendo la directiva arquitectónica, todas las definiciones de `structs` y `enums` de Rust que traducen el modelo de datos del prototipo residirán en un documento dedicado: `DATA.RUST.md`. Esto mantiene el documento de arquitectura enfocado en la estructura y los flujos, no en la implementación de datos.

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

    *   6.1.5. Abstracción de la Escena (Patrón `IScene`)
        *   Para garantizar la máxima modularidad y la futura expansión a `QualiaWorld`, se introduce una capa de abstracción de escena.
        *   Se definirá un `trait IScene` que cualquier modo de juego o mundo virtual deberá implementar. Este trait es responsable de gestionar los objetos, la lógica y la interacción específica de esa escena.
        *   El `KairosVisualEngine` (Sección 6.2) se convierte en un **renderizador puro**. No tendrá conocimiento de "jugadores" o "jefes", sino que simplemente recibirá una lista de objetos `Renderable` desde la escena activa a través del trait `IScene` y los dibujará.
        *   `Qualia Tempo` se implementará como una `struct` concreta, `QualiaTempoScene`, que implementa `IScene`. Futuros modos de juego (3D, no-euclidianos) serán simplemente nuevas implementaciones de este trait, asegurando que el motor de renderizado no necesite modificación.

        }
        ```

    *   6.1.6. Sistema de Gestión de Escenas y Cinemáticas
        *   **Problema:** La arquitectura se centra en el bucle de combate, pero no formaliza cómo se transita entre diferentes estados del juego (Menú, Cinemática, Gameplay).
        *   **Solución:** Se introduce un `SceneManagerService` en el frontend para orquestar la carga y transición entre escenas.
        *   **`IScene` Trait:** Como se mencionó en 6.1.5, este es el contrato clave. Cada escena (`MenuScene`, `CombatScene`, `CinematicScene`) implementará este trait, que define métodos como `on_enter()`, `update(dt: f32)`, `render(&mut KairosVisualEngine)`, y `on_exit()`.
        *   **`SceneManagerService`:**
            *   **Responsabilidad:** Mantiene la escena activa, gestiona su ciclo de vida y facilita las transiciones.
            *   **Flujo de Transición:**
                1.  El `GameControllerService` o un evento de UI solicita una transición de escena (ej. `request_scene_change("intro_cinematic")`).
                2.  El `SceneManagerService` recibe la petición.
                3.  Llama a `on_exit()` en la escena actual.
                4.  Carga los datos de la nueva escena (usando `SceneData` de `DATA.RUST.md`).
                5.  Instancia la nueva implementación de `IScene` (ej. `CinematicScene`).
                6.  Llama a `on_enter()` en la nueva escena, pasándole los recursos necesarios.
                7.  En el bucle principal de la aplicación, el `SceneManagerService` llama a `update()` y `render()` de la escena activa en cada frame.
        *   **`CinematicScene`:**
            *   Una implementación de `IScene` que lee `CinematicData`.
            *   Su método `update()` procesa la línea de tiempo de eventos, utilizando otros servicios como `SubtitleService` y `AudioService` para ejecutar la cinemática.
            *   Al finalizar, solicita una transición a la siguiente escena (ej. `request_scene_change("combat_level_1")`).

    *   6.2. El "Proyecto Kairos" - Motor Visual (`wgpu`)
        
        **6.2.1. KairosVisualEngine - El Orquestador** (`kairos_engine.rs`)
        
        ```rust
        use wgpu::*;
        use shared_core::contracts::{QualiaState, CombatState, OptimizedParticle};
        
        /// # Responsibility
        /// Orchestrates the complete Deferred Rendering pipeline: G-Buffer → Lighting → Post-Processing Chain.
        ///
        /// ---
        ///
        /// Subscribes to GameStateStore (Leptos Signals) and updates visuals at 60+ FPS.
        /// Implements the Deferred Rendering architecture from VISUALS.RUST.md.
        pub struct KairosVisualEngine {
            device: Device,
            queue: Queue,
            surface: Surface,
            
            // Deferred Rendering Pipeline
            g_buffer_pass: GBufferPass,
            lighting_pass: LightingPass,
            post_processing_chain: PostProcessingChain,
            
            // Compute shaders for dynamic content
            particle_compute: ParticleCompute,
            reaction_diffusion_compute: ReactionDiffusionCompute,
            
            // SDF renderers for procedural avatars
            sdf_renderer: SDFRenderer,
        }
        
        impl KairosVisualEngine {
            pub fn render(&mut self, state: &CombatState) {
                // 1. G-Buffer Pass: Render geometry to multiple textures
                self.g_buffer_pass.render_geometry(state);
                
                // 2. Lighting Pass: Compute illumination using G-Buffer data
                self.lighting_pass.compute_lighting(&self.g_buffer_pass);
                
                // 3. Post-Processing Chain: Apply atmospheric and camera effects
                self.post_processing_chain.apply_effects(
                    &self.lighting_pass.output,
                    state.qualia_state,
                );
                
                // 4. Composite, tonemap, and present
                self.present_final_image();
            }
        }
        ```
        
        **6.2.2. Deferred Rendering Pipeline Architecture**
        
        La pipeline sigue la arquitectura de Deferred Rendering definida en VISUALS.RUST.md:
        
        **Paso 1: G-Buffer Pass** (`passes/g_buffer_pass.rs`)
        - Renderiza geometría de escena (partículas, SDFs) en múltiples texturas (G-Buffer)
        - Salidas: `g_albedo`, `g_normal`, `g_depth`, `g_material`, `g_velocity`
        - Implementación: Un solo pase de renderizado con múltiples render targets
        
        **Paso 2: Lighting Pass** (`passes/lighting_pass.rs`) 
        - Calcula iluminación usando datos del G-Buffer (evita iluminación por objeto/luz)
        - Técnicas: Iluminación directa, HBAO, SSR
        - Implementación: Shader de pantalla completa que lee del G-Buffer
        
        **Paso 3: Post-Processing Chain** (`post_fx/`)
        - Cadena de efectos aplicados en secuencia: Bloom → God Rays → DoF → Motion Blur
        - Cada efecto: Ping-pong entre texturas para composición acumulativa
        - Parámetros actualizados desde QualiaState en cada frame
        
        **Paso 4: Composite + Tonemapping + TAA** (`passes/composite_pass.rs`)
        - Combina escena iluminada con efectos de post-procesado
        - Aplica ACES Filmic Tonemapping para look cinematográfico
        - TAA (Temporal Anti-Aliasing) para suavizado de bordes
        
        **6.2.3. Fase 1: Atmósfera (Post-Processing Effects)**
        
        Bloom shader parameters:
        - `u_intensity` ← QualiaState.intensity (threshold)
        - `u_transcendence` ← QualiaState.transcendence (strength)
        
        God Rays shader parameters:
        - `u_precision` ← QualiaState.precision (ray sharpness)
        - `u_aggression_color_tint` ← QualiaState.aggression (red/orange tint)
        
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
        
        **6.2.4. Fase 2: Synesthesia (Particle System + FFT)**
        
        ```rust
        /// # Responsibility
        /// Manages particle simulation and rendering in the Deferred pipeline.
        ///
        /// ---
        ///
        /// Updates particles via compute shader, then renders to G-Buffer in geometry pass.
        pub struct ParticleCompute {
            compute_pipeline: ComputePipeline,
            particle_buffer: Buffer,
            uniforms: ParticleUniforms,
        }
        
        impl ParticleCompute {
            pub fn update(&mut self, particles: &[OptimizedParticle], fft_data: &FFTData, intensity: f32) {
                // Update particle positions/velocities via compute shader
                // FFT data modulates size, velocity, emissive strength
            }
        }
        ```
        
        Particle shader uniforms (WGSL):
        ```wgsl
        struct ParticleUniforms {
            bass_level: f32,      // Modulates size + emission rate
            mid_level: f32,       // Controls velocity + turbulence  
            treble_level: f32,    // Affects brightness (emissive)
            fft_aggression_mod: f32, // Multiplier from QualiaState.aggression
        }
        ```
        
        ```rust
        **6.2.5. Fase 3: Mundo Viviente (Reaction-Diffusion)**
        
        ```rust
        /// # Responsibility
        /// Simulates Reaction-Diffusion patterns using compute shaders.
        ///
        /// ---
        ///
        /// Updated every frame based on QualiaState.chaos and .flow.
        /// Creates organic, evolving patterns (Turing patterns) rendered in G-Buffer pass.
        pub struct ReactionDiffusionCompute {
            compute_pipeline: ComputePipeline,
            texture: Texture,
            uniforms: ReactionDiffusionUniforms,
        }
        
        impl ReactionDiffusionCompute {
            pub fn update(&mut self, chaos: f32, flow: f32) {
                // Chaos increases diffusion rate, flow increases feed rate
                self.uniforms.diffusion_rate = 0.1 + (chaos * 0.4);
                self.uniforms.feed_rate = 0.02 + (flow * 0.04);
                
                // Dispatch compute shader to update texture
            }
        }
        ```
        ```
        
        **6.2.6. Fase 4: Avatares Procedurales (SDF Rendering)**
        
        ```rust
        /// # Responsibility
        /// Renders player and boss as procedural SDFs in the G-Buffer pass.
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
                
                // Set shader uniforms and render to G-Buffer
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
    
        **Total: 50+ servicios (ver BLUEPRINT.RUST.md para lista completa)**
        
        Agrupados por dominio:
        - **Core** (4): EventBus, Logger, Timer, ErrorReporter
        - **Lifecycle** (1): ApplicationInitializer
        - **Audio** (5): Playback, SpatialAudio, FFTAnalyzer, AudioBridge, WebAudioAPI
        - **Input** (3): InputController, InputState, RhythmicMovement
        - **Gameplay** (4): GameController, Mechanics, ComboDetector, QualiaWorkerBridge
        - **State** (2): StateMerger, ViewLogic
        - **Networking** (4): Sync, StateStreaming, WebSocketClient, JitterCompensator
        - **Rendering** (15+): GBufferPass, LightingPass, BloomPass, GodRaysPass, DoFPass, MotionBlurPass, TAAPass, CompositePass, ParticleCompute, ReactionDiffusionCompute, SDFRenderer, RenderTargetPool, ShaderLoader, ShaderIntrospector, KairosEngine
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
        - FrontendRenderingService → Desglosado en pipeline granular
        - PostProcessingService → Desglosado en BloomPass, GodRaysPass, etc.

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
