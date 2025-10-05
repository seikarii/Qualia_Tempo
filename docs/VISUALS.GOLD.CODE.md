# VISUALS.GOLD.CODE.md: La Visión Técnica del "Proyecto Kairos"
# VERSIÓN: 1.0
# ESTADO: GOLD.CODE - SINGLE SOURCE OF TRUTH

## 1. Principio Arquitectónico Irrompible

**Todo el renderizado y la ejecución de efectos visuales (shaders, partículas, post-procesado) es responsabilidad EXCLUSIVA del FRONTEND, específicamente del componente `Kairos Visual Engine`.**

El Backend es el cerebro que sueña; el Frontend es el ojo que ve el sueño. El Backend emite **ESTADO** (`QualiaState`, `CombatState`), y el Frontend **INTERPRETA** ese estado para producir una experiencia visual.

---

## 2. Hoja de Ruta de Implementación: "Proyecto Kairos"

El desarrollo visual seguirá 4 fases secuenciales. Cada fase se construye sobre la anterior.

### **FASE 1: Atmósfera y Presencia (El Lienzo Emocional)**

*   **Visión y Experiencia del Jugador:** El jugador debe sentir que el mundo del juego es un ente vivo que respira con su energía. Las acciones exitosas son recompensadas con destellos de luz divinos, mientras que los momentos de alta intensidad saturan la escena.
*   **Componente Responsable:** `Frontend - Kairos Visual Engine (Renderer)`.
*   **Técnicas Clave:** Shaders de Post-Procesado: Bloom de alta calidad (multi-pass gaussian) y Iluminación Volumétrica (God Rays).
*   **Mapeo de Datos (Backend) a Parámetros (Shader Frontend):**

| Dato del Backend (`QualiaState`) | Parámetro del Shader (Uniform) | Efecto Visual Detallado
|
| :------------------------------- | :----------------------------- |
:------------------------------------------------------------------------------------------------------------------ |
| `intensity`                      | `u_intensity`                  | Controla el umbral del Bloom. A mayor intensidad, más píxeles brillantes "florecen", creando una sensación de poder. |
| `transcendence`                  | `u_transcendence`              | Modula la fuerza y el alcance del Bloom. En valores altos (Ultimate), el bloom se expande y puede teñirse de un color dorado. |
| `precision`                      | `u_precision`                  | Aumenta la definición y nitidez de los God Rays. Un jugador preciso es recompensado con rayos de luz casi sólidos.      |
| `aggression`                     | `u_aggression_color_tint`      | Tiñe sutilmente el color del Bloom y los God Rays hacia tonos rojizos o anaranjados.      |

---

### **FASE 2: Synesthesia Profunda (La Música Hecha Luz)**

*   **Visión y Experiencia del Jugador:** La conexión entre audio y vídeo debe ser absoluta. El jugador no solo oye el bombo de la batería, lo *ve* como un pulso en el universo. Cada frecuencia de la canción tiene una representación visual directa.
*   **Componente Responsable:** `Frontend - FFTAnalyzer` (para el análisis) y `Kairos Visual Engine` (para la visualización).
*   **Técnicas Clave:** Análisis de audio FFT en tiempo real y envío de los datos de frecuencia a los shaders de partículas.
*   **Mapeo de Datos (Audio/Backend) a Parámetros (Shader Frontend):**

| Dato del Frontend (`FFTData`) | Parámetro del Shader (Uniform/Buffer) | Efecto Visual Detallado
|
| :---------------------------- | :------------------------------------ |
:------------------------------------------------------------------------------------------------------------------ |
| `fft_bins[0-4]` (Graves)      | `u_bass_level`                        | Modula el tamaño (`particle.size`) y la tasa de emisión de las partículas. Los golpes de bombo generan pulsos visibles. |
| `fft_bins[5-20]` (Medios)     | `u_mid_level`                         | Controla la velocidad y el movimiento turbulento de las partículas. Las voces o melodías principales crean corrientes. |
| `fft_bins[21-31]` (Agudos)    | `u_treble_level`                      | Afecta la intensidad del brillo (`emissive`) de las partículas. Los platillos y hi-hats generan destellos rápidos.   |
| `QualiaState.aggression`      | `u_fft_aggression_mod`                | Modula la reacción a los graves. Con alta agresión, los pulsos de los graves son más explosivos y violentos.        |

---

### **FASE 3: El Mundo Viviente (El Suelo que Danza)**

*   **Visión y Experiencia del Jugador:** La arena de combate deja de ser un suelo estático para convertirse en un lienzo orgánico que refleja el estado mental de la batalla, un mar de patrones que fluyen y se retuercen.
*   **Componente Responsable:** `Frontend - Kairos Visual Engine (Renderer)`.
*   **Técnicas Clave:** Compute Shader para simulación de Reaction-Diffusion (Patrones de Turing) aplicado como textura al suelo.
*   **Mapeo de Datos (Backend) a Parámetros (Shader Frontend):**

| Dato del Backend (`QualiaState`) | Parámetro del Shader (Uniform) | Efecto Visual Detallado
|
| :------------------------------- | :----------------------------- |
:------------------------------------------------------------------------------------------------------------------ |
| `chaos`                          | `u_diffusion_rate`             | Controla la "tasa de difusión" de los químicos virtuales. Un alto `chaos` crea patrones frenéticos y desordenados. |
| `flow`                           | `u_flow_direction`             | Introduce un vector de "viento" en la simulación, haciendo que los patrones fluyan suavemente en una dirección.      |
| `recovery`                       | `u_kill_rate`                  | Controla la "tasa de muerte". Un alto `recovery` calma la simulación, haciendo que los patrones se estabilicen y se simplifiquen. |

---

### **FASE 4: Avatares Procedurales (La Deidad de Luz)**

*   **Visión y Experiencia del Jugador:** El jugador y el boss abandonan sus formas físicas para convertirse en encarnaciones puras de la música y la intención. Son esculturas de luz y matemática que mutan en tiempo real.
*   **Componente Responsable:** `Frontend - Kairos Visual Engine (Renderer)`.
*   **Técnicas Clave:** Renderizado por Raymarching de Signed Distance Fields (SDFs).
*   **Mapeo de Datos (Backend) a Parámetros (Shader Frontend):**

| Dato del Backend (`QualiaState`) | Parámetro del Shader (Uniform) | Efecto Visual Detallado
|
| :------------------------------- | :----------------------------- |
:------------------------------------------------------------------------------------------------------------------ |
| `precision` y `flow`             | `u_player_shape_params`        | Con valores altos, la SDF del jugador se define con formas geométricas puras, cristalinas y suaves.                 |
| `chaos` y `aggression`           | `u_boss_shape_params`          | Con valores altos, la SDF del boss se distorsiona con ruido fractal, creando formas orgánicas, amenazantes e impredecibles. |
| `transcendence`                  | `u_player_fractal_iter`        | Cuando `transcendence > 0.9`, la SDF del jugador se transforma en un fractal 3D (Mandelbulb, Julia), con iteraciones crecientes. |