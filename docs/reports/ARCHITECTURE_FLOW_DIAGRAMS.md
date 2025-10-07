# ARCHITECTURE FLOW DIAGRAMS: v1 vs v2
# Visual Representation of Data Flow and Service Interactions
# VERSIÓN: 1.0
# FECHA: 6 de octubre de 2025

---

## 🎯 PROPÓSITO

Este documento contiene diagramas visuales en formato Mermaid que ilustran:
1. Flujo de datos v1 (actual - deprecated)
2. Flujo de datos v2 (ARCHITECTURE.GOLD.CODE)
3. Interacciones de servicios
4. Arquitectura de 4 dominios

---

## 📊 DIAGRAMA 1: Flujo de Datos v1 (DEPRECATED)

```mermaid
sequenceDiagram
    participant Player
    participant FrontendMain as Frontend (Main Thread)
    participant BackendAPI as Backend API
    participant ParticleEngine as ParticleEngine (GPU)
    participant RenderingService as RenderingService
    participant StreamingService as StreamingWebService
    
    Player->>FrontendMain: Pulsa 'Q' (acción)
    FrontendMain->>FrontendMain: GameInputController captura
    FrontendMain->>FrontendMain: QualiaCalculator (main thread)
    Note over FrontendMain: ⚠️ Bloquea UI durante cálculo
    FrontendMain->>BackendAPI: WebSocket: QualiaState
    Note over FrontendMain,BackendAPI: Throttled (250ms)
    
    BackendAPI->>BackendAPI: QualiaProcessor recibe
    BackendAPI->>ParticleEngine: EventBus: QualiaStateUpdated
    ParticleEngine->>ParticleEngine: Calcula física + RENDERIZA
    Note over ParticleEngine: ❌ GPU rendering en servidor
    ParticleEngine->>RenderingService: Frame buffer (bytes)
    RenderingService->>StreamingService: Frame de video
    
    StreamingService->>FrontendMain: WebSocket: Video stream
    Note over StreamingService,FrontendMain: ⚠️ Latencia de video
    FrontendMain->>FrontendMain: Muestra frame en canvas
    Note over FrontendMain: ❌ No control total de visuales
    FrontendMain->>Player: Frame renderizado (mixto)
    
    Note over Player,StreamingService: PROBLEMAS v1:<br/>1. Backend desperdicia GPU<br/>2. Latencia de video<br/>3. Dos sistemas de rendering<br/>4. Main thread bloqueado
```

---

## 📊 DIAGRAMA 2: Flujo de Datos v2 (ARCHITECTURE.GOLD.CODE)

```mermaid
sequenceDiagram
    participant Player
    participant FrontendMain as Frontend (Main)
    participant QualiaWorker as QualiaCalculator (Worker)
    participant FFTAnalyzer as FFTAnalyzer
    participant BackendAPI as Backend API
    participant GameLogic as GameLogicService
    participant BossAI as BossAI
    participant ParticleCalc as ParticleCalculator (Pool)
    participant KairosEngine as Kairos Visual Engine
    
    Player->>FrontendMain: Pulsa 'Q' + Dash
    FrontendMain->>FFTAnalyzer: Captura datos audio
    FFTAnalyzer-->>FrontendMain: FFTData (bass/mid/treble)
    
    FrontendMain->>QualiaWorker: postMessage(PlayerAction)
    Note over QualiaWorker: ✅ Cálculo en thread separado
    QualiaWorker-->>FrontendMain: onmessage(QualiaState predictivo)
    Note over FrontendMain: ✅ Feedback visual INSTANTÁNEO
    
    FrontendMain->>KairosEngine: QualiaState (local)
    KairosEngine->>KairosEngine: Renderiza destello (local)
    Note over KairosEngine: ✅ Respuesta visual inmediata
    
    FrontendMain->>BackendAPI: WebSocket: PlayerAction + FFTData
    BackendAPI->>GameLogic: EventBus: PlayerActionReceived
    GameLogic->>GameLogic: HarmonyAnalysisService
    GameLogic->>BossAI: Evalúa QualiaState
    BossAI-->>GameLogic: AttackPattern decidido
    
    GameLogic->>ParticleCalc: Envía a Process Pool
    Note over ParticleCalc: ✅ Cálculo paralelo<br/>NO rendering
    ParticleCalc->>ParticleCalc: Física + colisiones (CPU)
    ParticleCalc-->>GameLogic: List[ParticleState] (JSON)
    
    GameLogic->>BackendAPI: CombatState completo
    BackendAPI->>FrontendMain: WebSocket: CombatState (autoritativo)
    Note over BackendAPI,FrontendMain: ✅ Solo estado, no frames
    
    FrontendMain->>KairosEngine: GameStateStore updated
    KairosEngine->>KairosEngine: Renderiza TODO
    Note over KairosEngine: ✅ Control total:<br/>God Rays, Bloom, FFT particles,<br/>Reaction-Diffusion, SDF avatars
    KairosEngine->>Player: Experiencia visual completa
    
    Note over Player,KairosEngine: VENTAJAS v2:<br/>1. Backend solo calcula<br/>2. Latencia reducida<br/>3. Frontend control total<br/>4. 4 dominios paralelos
```

---

## 📊 DIAGRAMA 3: Arquitectura de 4 Dominios v2

```mermaid
graph TB
    subgraph Frontend["FRONTEND (Cliente)"]
        subgraph Domain1["DOMAIN 1: Main Thread"]
            ReactUI[React Components]
            KairosEngine[Kairos Visual Engine]
            EventBusFE[EventBus Frontend]
            InputManager[Game Input Controller]
            StateStore[GameState Store<br/>Zustand]
        end
        
        subgraph Domain2["DOMAIN 2: Web Worker"]
            QualiaWorker[QualiaCalculator Worker]
        end
        
        InputManager --> EventBusFE
        EventBusFE --> QualiaWorker
        QualiaWorker -.postMessage.-> EventBusFE
        EventBusFE --> StateStore
        StateStore --> KairosEngine
        KairosEngine --> ReactUI
    end
    
    subgraph Backend["BACKEND (Servidor)"]
        subgraph Domain3["DOMAIN 3: FastAPI Event Loop"]
            APIGateway[API Gateway<br/>WebSocket]
            EventBusBE[EventBus Backend]
            GameLogic[GameLogic Service]
            BossAI[Boss AI]
            HarmonyAnalysis[Harmony Analysis]
            QualiaProc[Qualia Processor]
        end
        
        subgraph Domain4["DOMAIN 4: Process Pool"]
            ParticleCalc[Particle State Calculator]
        end
        
        APIGateway --> EventBusBE
        EventBusBE --> GameLogic
        GameLogic --> HarmonyAnalysis
        GameLogic --> BossAI
        GameLogic --> ParticleCalc
        ParticleCalc -.Queue.-> GameLogic
        GameLogic --> APIGateway
    end
    
    ReactUI <-.WebSocket.-> APIGateway
    
    style Domain1 fill:#e3f2fd
    style Domain2 fill:#fff3e0
    style Domain3 fill:#f3e5f5
    style Domain4 fill:#e8f5e9
    style KairosEngine fill:#ffeb3b,stroke:#f57f17,stroke-width:3px
    style ParticleCalc fill:#4caf50,stroke:#1b5e20,stroke-width:3px
```

---

## �� DIAGRAMA 4: Dependencias de Servicios Backend v2

```mermaid
graph TD
    EventBus[EventBus<br/>Foundation]
    
    QualiaProc[Qualia Processor]
    StateStream[State Streaming]
    GameLogic[Game Logic Service]
    BossAI[Boss AI]
    Harmony[Harmony Analysis]
    Persistence[Persistence Service]
    ParticleCalc[Particle State Calculator<br/>Process Pool]
    
    Security[Security Service]
    FileSystem[File System Service]
    SysEnv[System Environment]
    
    EventBus --> QualiaProc
    EventBus --> StateStream
    EventBus --> GameLogic
    EventBus --> ParticleCalc
    
    GameLogic --> Harmony
    GameLogic --> BossAI
    GameLogic --> Persistence
    
    SysEnv --> FileSystem
    
    style EventBus fill:#ff5722,color:#fff
    style ParticleCalc fill:#4caf50,color:#fff
    style GameLogic fill:#2196f3,color:#fff
```

---

## 📊 DIAGRAMA 5: Dependencias de Servicios Frontend v2

```mermaid
graph TD
    EventBus[EventBus<br/>Foundation]
    ConfigService[Configuration Service]
    Logger[Logger<br/>QualiaLogger]
    
    subgraph Core["Core Services"]
        GameInput[Game Input Controller]
        QualiaCalc[Qualia Calculator<br/>+Worker]
        GameStateStore[GameState Store Service]
        GameController[Game Controller]
        BackendSync[Backend Sync Service]
    end
    
    subgraph Audio["Audio Services (Phase 4)"]
        AudioService[Audio Service]
        FFT[FFT Analyzer]
        Audio8D[Audio 8D Service]
        ComboDetector[Musical Combo Detector]
        WebAudio[Web Audio API]
    end
    
    subgraph Visual["Visual Services (Phase 5)"]
        Kairos[Kairos Visual Engine]
        PostProc[Post Processing]
        ShaderLoader[Shader Loader]
        ViewLogic[View Logic]
        FrontendRender[Frontend Rendering]
    end
    
    subgraph Utils["Utilities"]
        Timer[Timer Service]
        Http[Http Service]
        Perf[Performance Service]
        Error[Error Reporting]
        Notif[Notification Service]
        Debug[Debug Service]
    end
    
    EventBus --> GameInput
    EventBus --> QualiaCalc
    EventBus --> GameStateStore
    EventBus --> GameController
    EventBus --> BackendSync
    EventBus --> ComboDetector
    EventBus --> Kairos
    
    ConfigService --> Http
    
    FFT --> WebAudio
    Audio8D --> WebAudio
    
    Kairos --> PostProc
    Kairos --> ShaderLoader
    Kairos --> ViewLogic
    Kairos --> FrontendRender
    
    Logger -.injected everywhere.-> Core
    Logger -.injected everywhere.-> Audio
    Logger -.injected everywhere.-> Visual
    
    style EventBus fill:#ff5722,color:#fff
    style Kairos fill:#ffeb3b,stroke:#f57f17,stroke-width:3px
    style Logger fill:#9c27b0,color:#fff
    style ConfigService fill:#00bcd4,color:#fff
```

---

## 📊 DIAGRAMA 6: Lifecycle de un "Latido" del Juego (Kairos)

```mermaid
sequenceDiagram
    autonumber
    participant Audio as AudioEngine
    participant Player as Player
    participant Input as InputManager
    participant Worker as QualiaWorker
    participant Visual as KairosEngine
    participant Sync as BackendSync
    participant API as Backend API
    participant Logic as GameLogic
    participant Boss as BossAI
    participant Calc as ParticleCalc
    
    Audio->>Input: Metronome_Tick
    Player->>Input: Pulsa 'Q' + Dash
    Input->>Worker: PlayerAction (postMessage)
    Worker-->>Visual: QualiaState (predictivo)
    Visual->>Visual: Destello visual instantáneo ⚡
    
    Input->>Sync: PlayerAction + FFTData
    Sync->>API: WebSocket send
    
    API->>Logic: EventBus: PlayerActionReceived
    Logic->>Logic: HarmonyAnalysis
    Logic->>Boss: Evalúa QualiaState
    Boss-->>Logic: AttackPattern
    
    Logic->>Calc: CombatState (to Pool)
    Calc->>Calc: Calcula estados (CPU)
    Calc-->>Logic: ParticleStates (JSON)
    
    Logic->>API: CombatState completo
    API->>Sync: WebSocket send
    Sync->>Visual: GameStateStore.update()
    
    Visual->>Visual: Renderiza frame final 🎨
    Note over Visual: God Rays, Bloom, Particles,<br/>Reaction-Diffusion, SDF avatars
    
    Visual->>Player: Frame completo en pantalla
    
    Note over Audio,Player: 🎯 KAIROS COMPLETADO<br/>Música + Acción + Visual alineados
```

---

## 📊 DIAGRAMA 7: Migration Phases Overview

```mermaid
gantt
    title Qualia Tempo v1 → v2 Migration Timeline
    dateFormat YYYY-MM-DD
    
    section Phase 0: Prep
    Shared Contracts (14)         :done, p0t1, 2025-10-01, 2d
    Testing Infrastructure (18)   :done, p0t2, 2025-10-03, 1d
    Documentation (Audit)         :done, p0t3, 2025-10-06, 1d
    
    section Phase 1: Backend
    Delete Rendering Services     :active, p1t1, 2025-10-07, 1d
    Refactor ParticleEngine       :p1t2, after p1t1, 3d
    Process Pool Setup            :p1t3, after p1t2, 2d
    
    section Phase 2: Game Logic
    GameLogicService             :p2t1, after p1t3, 3d
    BossAI                       :p2t2, after p2t1, 2d
    HarmonyAnalysisService       :p2t3, after p2t2, 2d
    PersistenceService           :p2t4, after p2t3, 2d
    
    section Phase 3: Web Worker
    QualiaCalculator to Worker   :p3t1, after p2t4, 5d
    
    section Phase 4: Audio
    FFTAnalyzerService           :p4t1, after p3t1, 2d
    Audio8DService               :p4t2, after p4t1, 2d
    MusicalComboDetector         :p4t3, after p4t2, 2d
    
    section Phase 5: Visual
    KairosVisualEngine           :p5t1, after p4t3, 3d
    God Rays + Bloom             :p5t2, after p5t1, 2d
    FFT Particles                :p5t3, after p5t2, 2d
    Reaction-Diffusion           :p5t4, after p5t3, 2d
    SDF Raymarching              :p5t5, after p5t4, 3d
    
    section Phase 6: Polish
    Integration Testing          :p6t1, after p5t5, 3d
    Performance Tuning           :p6t2, after p6t1, 2d
    Bug Fixes                    :p6t3, after p6t2, 2d
```

---

## 📊 DIAGRAMA 8: Service States by Phase

```mermaid
graph LR
    subgraph Legend
        KEEP[✅ KEEP]
        DELETE[❌ DELETE]
        REFACTOR[🔄 REFACTOR]
        CREATE[➕ CREATE]
    end
    
    subgraph "Backend Services Status"
        B1[EventBus]:::keep
        B2[QualiaProcessor]:::keep
        B3[StateStreaming]:::keep
        B4[RenderingService]:::delete
        B5[ShaderIntrospection]:::delete
        B6[StreamingWeb]:::delete
        B7[ParticleEngine]:::refactor
        B8[GameLogic]:::create
        B9[BossAI]:::create
        B10[HarmonyAnalysis]:::create
    end
    
    subgraph "Frontend Services Status"
        F1[EventBus]:::keep
        F2[GameController]:::keep
        F3[AudioService]:::keep
        F4[QualiaCalculator]:::refactor
        F5[FFTAnalyzer]:::create
        F6[Audio8D]:::create
        F7[ComboDetector]:::create
        F8[KairosEngine]:::create
    end
    
    classDef keep fill:#4caf50,color:#fff
    classDef delete fill:#f44336,color:#fff
    classDef refactor fill:#ff9800,color:#fff
    classDef create fill:#2196f3,color:#fff
```

---

## 📚 CÓMO USAR ESTOS DIAGRAMAS

### En GitHub/GitLab
Los diagramas Mermaid se renderizan automáticamente en Markdown viewers.

### En VS Code
Instalar extensión: **Markdown Preview Mermaid Support**

### En Obsidian
Funciona nativamente con bloques ```mermaid```.

### Exportar a Imagen
Usar herramientas online:
- https://mermaid.live/
- https://mermaid.ink/

---

## 📝 METADATA

- **Autor:** AI Agent (Qualia.CODE v1.1)
- **Fecha:** 6 de octubre de 2025
- **Versión:** 1.0
- **Formato:** Mermaid.js diagrams
- **Propósito:** Visualización de arquitectura v1 vs v2

---

**FIN DEL DOCUMENTO**
