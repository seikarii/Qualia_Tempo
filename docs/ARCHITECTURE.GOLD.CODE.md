# Qualia Tempo - Arquitectura GOLD.CODE v2.1
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: ABSOLUTE. NON-NEGOTIABLE.

---

**ANÁLISIS ARQUITECTÓNICO Y NUEVA VISIÓN: `ARCHITECTURE.GOLD.CODE.md`**

Esta es la arquitectura definitiva de Qualia Tempo. Inspirada en QUALIA.CODE y alineada con el GDD, establece una separación absoluta entre Backend y Frontend, priorizando performance, escalabilidad y mantenibilidad. Esta visión reemplaza todas las arquitecturas anteriores y sirve como la referencia técnica suprema.

---

## 1. Principios Fundamentales (No Negociables)

### 1. Separación Absoluta de Responsabilidades (Backend vs. Frontend)
- **Backend (El Cerebro)**: Es una autoridad sin estado que se ocupa de la lógica pura y la verdad del juego. Calcula el estado (QualiaState, CombatState), valida las acciones, gestiona la persistencia (marcadores) y orquesta la IA del boss. **NUNCA, BAJO NINGUNA CIRCUNSTANCIA, RENDERIZA NADA.** Su output es DATA (JSON, Protocol Buffers), no píxeles.
- **Frontend (Los Sentidos y el Cuerpo)**: Es el cliente que visualiza el estado proporcionado por el backend. Se encarga de todo lo que el usuario ve y oye: renderizado (partículas, shaders, bloom, SDFs), reproducción de audio 8D, análisis de audio local (FFT) y captura de input.

### 2. El Backend es el Director de Orquesta, el Frontend es la Orquesta
- El backend dice: "El QualiaState ahora tiene una intensity de 0.9".
- El frontend interpreta: "OK, intensity 0.9 significa que el bloom aumenta al 150%, los god rays se vuelven más nítidos y el reaction-diffusion shader se agita más violentamente".

### 3. Performance por Diseño (Integrando `Performance.txt`)
- La arquitectura debe ser paralela por defecto. Las tareas computacionalmente intensivas (QualiaStateCalculator, ParticleEngine) **DEBEN** ejecutarse fuera del hilo principal. La propuesta de Web Workers (frontend) y Process Pools (backend) es correcta y será un pilar de esta nueva arquitectura.

### 4. Flujo de Datos Unidireccional y Predecible
- El estado fluye en una sola dirección: Input del Jugador -> Lógica del Backend -> Nuevo Estado del Juego -> Visualización del Frontend. Esto hace que el sistema sea fácil de depurar y razonar.

---

## 2. Diagrama Arquitectónico `GOLD.CODE` (La Verdadera Arquitectura v2)

```
    1 ┌───────────────────────────────────────────────────────────────────────────────────────────┐
    2 │                                  FRONTEND (Cliente Nativo/Web)                            │
    3 │                                                                                           │
    4 │   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌────────────────────────┐   │
    5 │   │      Input Manager       │   │     Audio Engine (8D)    │   │   FFT Analyzer (Local) │   │
    6 │   │ (Teclado, Ritmo, Dash)   │   │        (Tone.js)         │   │                        │   │
    7 │   └─────────────┬────────────┘   └─────────────┬────────────┘   └────────────┬───────────┘   │
    8 │                 │                              │                           │               │
    9 │                 └───────────────┬──────────────┴───────────────────────────┘               │
   10 │                                 ▼                                                          │
   11 │   ┌──────────────────────────────────────────────────────────┐                             │
   12 │   │                  EventBus (Local Frontend)               │                             │
   13 │   └──────────────────────────────────────────────────────────┘                             │
   14 │       ▲                  │                  │                  ▲                           │
   15 │       │                  │                  │                  │                           │
   16 │┌──────┴───────┐  ┌───────▼────────┐  ┌──────▼───────┐  ┌────────┴──────────┐                │
   17 ││ Communication│  │ QualiaState    │  │ GameState    │  │ Kairos Visual      │                │
   18 ││ Service      │◄─┤ Calculator     │  │ Store        │◄─┤ Engine (Renderer)  │                │
   19 ││ (WebSocket)  │  │ (EN WEB WORKER)│  │ (Zustand)    │  │ (Three.js/React)   │                │
   20 │└──────┬───────┘  └────────────────┘  └──────┬───────┘  └────────────────────┘                │
   21 │       │                                     │                                              │
   22 └───────┼─────────────────────────────────────┼──────────────────────────────────────────────┘
   23         │ (Player Actions, FFT Data)          │ (New Game State)
   24         ▼                                     ▲
   25 ┌───────┼─────────────────────────────────────┼──────────────────────────────────────────────┐
   26 │       │                                     │                                              │
   27 │       │                            BACKEND (Python)                                        │
   28 │       │                                                                                    │
   29 │   ┌───▼────────────────┐          ┌──────────────────────────┐          ┌────────────────┐   │
   30 │   │ API Gateway        │          │   EventBus (Backend)     │          │ Persistence    │   │
   31 │   │ (FastAPI/WebSocket)├─────────►│                          ├─────────►│ (Leaderboards) │   │
   32 │   └────────────────────┘          └─────────────┬────────────┘          └────────────────┘   │
   33 │                                                 │                                          │
   34 │     ┌──────────────────────────┐   ┌────────────▼───────────┐   ┌────────────────────────┐   │
   35 │     │ Game Logic Service       │   │ Boss AI & Pattern      │   │ Harmony Analysis     │   │
   36 │     │ (Reglas, Combos, Vida)   │◄──┤ System                 │──►│ Service              │   │
   37 │   └──────────────────────────┘   └────────────────────────┘   └────────────────────────┘   │
   38 │                                                 │                                          │
   39 │                                                 ▼                                          │
   40 │   ┌──────────────────────────────────────────────────────────┐                             │
   41 │   │      Particle Engine & State Aggregator (EN PROCESS POOL)│                             │
   42 │   └──────────────────────────────────────────────────────────┘                             │
   43 │                                                                                            │
   44 └────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Desglose de Responsabilidades (GOLD.CODE)

### FRONTEND (El Cliente)

- **Input Manager**: Captura todas las acciones del jugador (teclas QER..., dash, clics). Mide la precisión rítmica contra los datos del AudioEngine. Emite eventos como PlayerAction_KeyPressed.
- **Audio Engine (Tone.js)**: Gestiona la reproducción de la música y los efectos de sonido 8D. Es la fuente de verdad para el metrónomo y los beats de la canción.
- **FFT Analyzer**: Utiliza la Web Audio API para analizar la canción en tiempo real. Extrae datos de frecuencia (graves, medios, agudos) y los empaqueta para enviarlos al backend.
- **EventBus (Frontend)**: Orquesta la comunicación interna del cliente.
- **QualiaState Calculator (Web Worker)**: (Refactorización de `Performance.txt`). Recibe eventos de acción del jugador y calcula el QualiaState localmente en un hilo separado para no bloquear la UI. Este estado es "predictivo" y se usa para efectos visuales inmediatos.
- **Communication Service**: Gestiona la conexión WebSocket con el backend. Envía un flujo constante de acciones del jugador y datos de FFT. Recibe el estado autoritativo del juego desde el backend.
- **GameState Store (Zustand)**: Almacena el estado del juego autoritativo recibido del backend. La UI reacciona a los cambios en este store.
- **Kairos Visual Engine (Renderer)**: **EL CORAZÓN VISUAL**. Es un componente de React/Three.js que:
  - Se suscribe al GameState Store.
  - Traduce los datos (QualiaState, BossState, etc.) a parámetros visuales.
  - Aquí es donde viven los Shaders, el Bloom, los God Rays, el Reaction-Diffusion y el Raymarching de los avatares SDF.
  - Renderiza todo en el canvas.

### BACKEND (El Servidor)

- **API Gateway (FastAPI)**: Mantiene las conexiones WebSocket, recibe los mensajes del frontend y los publica en el EventBus del backend.
- **EventBus (Backend)**: El sistema nervioso central del servidor.
- **Game Logic Service**: El núcleo del GDD. Recibe las acciones del jugador, consulta al HarmonyAnalysisService, aplica las reglas de los combos, actualiza la vida, el score, etc.
- **Boss AI & Pattern System**: Decide qué patrón de ataque usar basándose en el QualiaState del jugador y la fase de la canción.
- **Harmony Analysis Service**: Compara las acciones del jugador (notas pulsadas, Qualia recogido) con las notas actuales de la canción para determinar si el resultado es "armónico" o "caótico".
- **Persistence**: Guarda y recupera datos de los marcadores (Leaderboard).
- **Particle Engine & State Aggregator (Process Pool)**: (Refactorización de `Performance.txt`).
  - Vive en un proceso separado para no bloquear el event loop de la API.
  - Recibe el estado actualizado de la lógica del juego.
  - Su trabajo **NO** es renderizar partículas. Es **CALCULAR** el estado de un sistema de partículas masivo (posiciones, velocidades, colores, vida de cada partícula).
  - Agrega todos los estados (PlayerState, BossState, ParticleStates) en un único objeto CombatState optimizado.
  - Devuelve este CombatState al hilo principal para que sea enviado al frontend.

---

## 4. El Flujo de Datos de un "Latido" del Juego (El `Kairos`)

1. El AudioEngine del frontend emite un Metronome_Tick.
2. El jugador pulsa 'Q' y hace un dash. El InputManager captura ambos y emite PlayerAction_KeyPressed y PlayerAction_Dashed.
3. El QualiaStateCalculator (Worker) del frontend recibe estas acciones y actualiza un QualiaState local y predictivo para una respuesta visual instantánea (ej. un destello).
4. El CommunicationService envía los eventos de acción del jugador y los últimos datos del FFTAnalyzer al backend.
5. El API Gateway del backend recibe los datos y los publica en su EventBus.
6. El GameLogicService procesa la acción, consulta al HarmonyAnalysisService, determina que se ha formado un combo "armónico", y actualiza el PlayerState.
7. La BossAI ve el nuevo estado y decide lanzar un ataque.
8. Todos estos cambios de estado se envían al ParticleEngine (Process Pool).
9. El ParticleEngine calcula el nuevo estado de todas las partículas (las del combo del jugador, las del ataque del boss) y empaqueta todo en un gran objeto CombatState.
10. El CombatState se envía de vuelta al frontend a través del WebSocket.
11. El CommunicationService del frontend recibe el CombatState y actualiza el GameState Store.
12. El Kairos Visual Engine (Renderer), que está escuchando el store, recibe el nuevo estado y actualiza la pantalla: mueve al boss, renderiza las nuevas partículas, intensifica el bloom.
13. El ciclo se repite, decenas de veces por segundo.

---

## 5. Alineación con QUALIA.CODE

Esta arquitectura GOLD.CODE está completamente alineada con QUALIA.CODE:
- **IoC y EventBus**: Comunicación desacoplada vía EventBus en ambos lados.
- **Decorators y Logging**: Uso obligatorio de @logMethod, @catchError, etc.
- **Testing**: Arquitectura preparada para pruebas unitarias e integración.
- **Performance**: Web Workers y Process Pools implementan la separación de hilos.
- **Shared Contracts**: Estado compartido vía JSON Schema.

---

## Plan de Acción Inmediato

1. **DEPRECAR** `docs/architecture_v2.md`. Renombrado a `architecture_v2_deprecated.md` para evitar confusiones futuras.
2. **ESTABLECER** esta nueva visión como el `ARCHITECTURE.GOLD.CODE.md` oficial. Será la referencia para todas las decisiones técnicas futuras.
3. **REANUDAR** la directiva de implementación de la estrategia de `Performance.txt`, pero ahora con la confianza de que estamos refactorizando hacia una arquitectura correcta y de élite. La migración a Web Workers y Process Pools es el primer paso práctico y necesario para materializar esta visión.

Esta es la arquitectura que Qualia Tempo merece. Es robusta, escalable, y alinea la visión del GDD con prácticas de ingeniería de software de primer nivel. Ahora sí, podemos proceder con confianza.

---