  `MUSIC.RUST.md` - Arquitectura del Sistema Musical Generativo

  Versión: 1.0
  TARGET: Qualia Tempo Rust Edition
  COMPLIANCE: GDD v2.0, ARCHITECTURE.RUST v2.0, QUALIA.CODE.RUST v1.1

  ---

  1. Filosofía y Arquitectura Central

  La música en Qualia Tempo es una fuerza diegética. No es una banda sonora, es el tejido de la realidad que los jugadores y bosses manipulan. Para lograr esto, la
  arquitectura musical se divide en dos sistemas principales pero interconectados:

   1. The Harmony Engine (El Musicólogo): Un sistema de análisis en el backend que deconstruye la canción pre-compuesta para entender su estructura teórica (tonalidad,
      acordes, ritmo).
   2. The Performance Engine (La Orquesta): Un sistema de síntesis y sampleo en el frontend que genera nuevos sonidos en tiempo real basándose en las acciones del
      jugador y del boss, siempre respetando las reglas dictadas por el Harmony Engine.

  El objetivo no es simplemente reaccionar a la música, sino componer sobre ella en tiempo real.

    1                                      ┌──────────────────────────┐
    2                                      │     Canción de Fondo     │
    3                                      │       (ej. .ogg)         │
    4                                      └────────────┬─────────────┘
    5                                                   │
    6                                                   ▼ (Análisis Offline/Real-time)
    7 ┌─────────────────────────────────────────────────┴──────────────────────────────────────────────────┐
    8 │ BACKEND                                                                                            │
    9 │                                                                                                    │
   10 │   ┌──────────────────────────┐         ┌────────────────────────┐         ┌─────────────────────┐   │
   11 │   │ HarmonyAnalysisService   ├────────►│       Harmony Map      ├────────►│  GameLogicService   │   │
   12 │   │ (El Musicólogo)          │         │ (Tonalidad, Acordes)   │         │ (El Director)       │   │
   13 │   └──────────────────────────┘         └────────────────────────┘         └──────────┬──────────┘   │
   14 │                                                                                      │               │
   15 └──────────────────────────────────────────────────────────────────────────────────────┼───────────────┘
   16                                                                                        │ (Eventos de Nota)
   17                                                                                        ▼
   18 ┌──────────────────────────────────────────────────────────────────────────────────────┼───────────────┐
   19 │ FRONTEND                                                                             │               │
   20 │                                                                                      │               │
   21 │   ┌──────────────────────────┐         ┌────────────────────────┐         ┌──────────▼──────────┐   │
   22 │   │ InputControllerService   ├────────►│     EventBus (Local)   ├────────►│ AudioService        │   │
   23 │   │ (Acción del Jugador)     │         │                        │         │ (La Orquesta)       │   │
   24 │   └──────────────────────────┘         └────────────────────────┘         └──────────┬──────────┘   │
   25 │                                                                                      │               │
   26 │                                                                                      ▼               │
   27 │                                                                         ┌───────────────────────┐    │
   28 │                                                                         │ Performance Engine    │    │
   29 │                                                                         │ (Sampler + Synth)     │    │
   30 │                                                                         └───────────────────────┘    │
   31 │                                                                                                      │
   32 └──────────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---

  2. The Harmony Engine (Backend)

  Este motor es el cerebro musical del juego. Su implementación reside en el audio::HarmonyAnalysisService definido en BLUEPRINT.RUST.md.

  2.1. Responsabilidades

   1. Análisis Offline (Pre-Procesamiento): Antes de que comience un combate, este servicio analiza la canción del nivel y realiza una transcripción Audio-a-MIDI.
   2. Generación del Mapa Armónico: A partir de la transcripción, genera un HarmonyMap, una estructura de datos que contiene la "teoría musical" de la canción:
       * Tonalidad principal (ej. "Do menor").
       * Tempo (BPM).
       * Progresión de acordes a lo largo del tiempo.
       * Escalas permitidas para cada sección de la canción.
   3. Análisis en Tiempo Real (Opcional): Puede analizar fragmentos de audio en tiempo real para detectar cambios armónicos no previstos.

  2.2. El Contrato HarmonyMap

  Esta es la estructura de datos clave que el GameLogicService consultará. Se generará una por canción y se cargará al inicio del combate.

    1 // Definición para DATA.RUST.md
    2 
    3 /// # Responsibility
    4 /// Defines a single harmonic region within a song's timeline.
    5 #[derive(Debug, Clone, Serialize, Deserialize)]
    6 pub struct HarmonicContext {
    7     pub start_time_sec: f64,
    8     pub end_time_sec: f64,
    9     pub chord: String, // ej. "Am7", "G", "Cmaj7"
   10     pub scale: Vec<String>, // ej. ["A", "B", "C", "D", "E", "F", "G"]
   11 }
   12 
   13 /// # Responsibility
   14 /// Contains the complete musical theory analysis of a song.
   15 /// This map is the "ruleset" for all generative music.
   16 #[derive(Debug, Clone, Serialize, Deserialize)]
   17 pub struct HarmonyMap {
   18     pub song_id: String,
   19     pub key_signature: String, // ej. "C Major"
   20     pub time_signature: (u8, u8),
   21     pub progression: Vec<HarmonicContext>,
   22 }

  ---

  3. The Performance Engine (Frontend)

  Este motor es la orquesta del jugador. Reside en el audio::AudioService del frontend y utiliza el WebAudioAPIService para la generación de sonido.

  3.1. Componentes

   1. `QualiaSampler`: Un reproductor de muestras de audio. Carga bancos de sonidos (SampleBank) y reproduce samples específicos cuando recibe un evento. Ideal para
      sonidos realistas o percusivos.
   2. `QualiaSynth`: Un sintetizador polifónico simple (ej. substractivo con 2 osciladores, 1 filtro, 1 envolvente ADSR). Genera sonidos proceduralmente. Ideal para
      sonidos etéreos, mágicos o que necesitan modularse en tiempo real.

  3.2. El Sistema de "Patches" de Instrumentos

  Para cumplir con el requisito del GDD de tener diferentes instrumentos por nivel o personaje, se define un InstrumentPatch.

    1 // Definición para DATA.RUST.md
    2 
    3 #[derive(Debug, Clone, Serialize, Deserialize)]
    4 pub enum PatchType {
    5     Sampler { sample_map_url: String }, // URL a un JSON que mapea notas MIDI a archivos .wav
    6     Synth { parameters: SynthParameters },
    7 }
    8 
    9 #[derive(Debug, Clone, Serialize, Deserialize)]
   10 pub struct SynthParameters {
   11     pub oscillator1_type: String, // "sine", "square", "sawtooth"
   12     pub filter_cutoff: f32,
   13     pub adsr_attack: f32,
   14     // ... otros parámetros del sintetizador
   15 }
   16 
   17 /// # Responsibility
   18 /// Defines a playable instrument, either sample-based or synthesized.
   19 /// Player and Boss will have a collection of these assigned per level.
   20 #[derive(Debug, Clone, Serialize, Deserialize)]
   21 pub struct InstrumentPatch {
   22     pub id: String,
   23     pub name: String,
   24     pub patch_type: PatchType,
   25 }

  ---

  4. El Flujo de Vida de un Evento Musical (Jugador pulsa 'Q')

  Este es el flujo completo que une la arquitectura, cumpliendo con los requisitos del GDD.

   1. Input (Frontend): El jugador pulsa la tecla 'Q'. El InputControllerService lo captura.
   2. Intención (Frontend): El GameControllerService lo interpreta como una "intención musical" y lo envía al backend vía WebSocket. PlayerAction { type: 
      "MusicalKeyPress", key: "Q" }.
   3. Adjudicación Armónica (Backend):
       * El GameLogicService recibe la acción.
       * Consulta al HarmonyAnalysisService (o su HarmonyMap cacheado) en el timestamp actual. El mapa responde: "La armonía actual es Do menor. La nota 'Q' (Do) es la
         tónica. Es una acción armónica."
       * El GameLogicService determina la nota exacta a tocar (ej. C4) y el instrumento asignado al jugador para esa acción (ej. crystal_bell_patch).
   4. Evento de Creación Musical (Backend): El GameLogicService emite un nuevo evento en el bus:

   1     GameEvent::PlayGenerativeNote {
   2         note_pitch: 60, // MIDI para C4
   3         velocity: 110, // Fuerte
   4         instrument_patch_id: "crystal_bell_patch",
   5         position: player.position, // Para audio 8D
   6     }
   5. Generación de Sonido (Frontend):
       * El AudioService del frontend recibe este evento.
       * Le ordena al PerformanceEngine que toque la nota 60 con el patch crystal_bell_patch. El QualiaSampler carga y reproduce el sample correspondiente.
       * El Audio8DService toma la salida de audio y la posiciona en el espacio 3D en player.position.
   6. Generación Visual (Frontend):
       * El KairosVisualEngine también recibe el PlayGenerativeNote.
       * Utiliza los datos (pitch, velocity, position) para generar un efecto de partículas, cumpliendo con la Fase 2 de VISUALS.RUST.md.

  Este mismo flujo se aplica a los combos (que generan secuencias de PlayGenerativeNote) y a los ataques del boss (que emiten eventos con patches de instrumentos
  "graves y caóticos").

  ---

  5. Conclusión Arquitectónica

  Este diseño de doble motor cumple con todos los requisitos del GDD y los documentos de exploración:

   * Música Generativa: El jugador y el boss crean música con sus acciones.
   * Cohesión Armónica: El HarmonyEngine asegura que la música generada siempre "encaje" con la banda sonora.
   * Flexibilidad Instrumental: El sistema de InstrumentPatch permite una personalización total del paisaje sonoro por nivel.
   * Integración con Qualia y Visuales: Los eventos PlayGenerativeNote se convierten en la fuente de datos unificada tanto para el audio 8D como para los efectos
     visuales de partículas, creando la sinestesia que es el corazón de Qualia Tempo.

  Este documento, MUSIC.RUST.md, servirá como la fuente de verdad para la implementación de todos los sistemas de audio del juego.

