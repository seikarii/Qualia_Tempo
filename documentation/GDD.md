# GDD: Qualia Tempo

**Versión:** 1.0
**Fecha:** 5 de Agosto de 2025

## 1. Ficha Técnica

- **Título Comercial:** Qualia Tempo
- **Subtítulo (Lore):** A Charlie Hellsinger Story
- **Protagonista:** Charlie Hellsinger, una celestial exiliada usando su música para redimir un infierno procedural.
- **Género:** Rhythm-Action / Boss Rush
- **Plataforma Objetivo:** PC/Escritorio (con posible adaptación a móvil en el futuro)
- **Logline:** Un juego de ritmo brutal donde debes mantener un tempo constante para sobrevivir a duelos musicales contra bosses épicos, mientras tu propia habilidad pinta un cataclismo visual en la pantalla.
- **Propuesta Única de Venta (USP):** El primer juego donde el "Game Feel" es procedural: la estética visual y sonora es generada en tiempo real por el rendimiento y las decisiones del jugador a través del sistema "QualiaState".

## 2. Filosofía de Diseño

- **Confianza Absoluta en el Jugador:** No hay tutoriales. El aprendizaje es orgánico a través de la experiencia directa.
- **Profundidad Emergente, no Complejidad Impuesta:** Mecánicas simples (4 habilidades + movimiento rítmico) que interactúan para crear un techo de habilidad ilimitado.
- **La Recompensa es la Sobrecarga Sensorial:** La maestría se recompensa con una experiencia audiovisual trascendente, generada por el propio jugador.
- **La Narrativa es la Música:** La historia se cuenta exclusivamente a través de las letras de las canciones durante los combates.

## 3. Mecánicas Fundamentales

### 3.1. Movimiento: Dash Rítmico
- El jugador debe moverse constantemente al tempo de la percusión de la música.
- Mantener el ritmo activa el **Qualia de Fluidez**.
- Fallar el ritmo activa el **Qualia de Caos**.

### 3.2. Habilidades (Control del Reproductor)
- **Pause:** Micro-ralentización defensiva (0.1s). Aumenta **Qualia de Precisión**.
- **Fast Forward:** Aceleración de riesgo/recompensa. Otorga un multiplicador de combo (x4). Aumenta **Qualia de Agresión**.
- **Rewind:** Curación y reducción de cooldowns. Activa **Qualia de Recuperación**.
- **Ultimate (8D Mayhem):** Activa un modo de 8D audio durante 20 segundos. Aumenta el daño, la dificultad, y la velocidad y movimiento de las casillas de combo. Activa **Qualia de Trascendencia**.

### 3.3. Sistema de Combo y Dificultad
- El suelo del escenario está compuesto por casillas de colores.
- El jugador debe pisar las casillas para aumentar su combo.
- A mayor combo:
    - Más daño inflige el jugador.
    - El boss utiliza más habilidades.
    - La música se acelera y se añaden más capas de coros.
    - Las casillas de combo se mueven más rápido y de forma más errática.

### 3.4. Barra de Vida del Boss
- La "vida" del boss es la duración restante de la canción.
- El daño del jugador reduce la duración de la canción, acortando el combate.

## 4. Tecnología y Estética

- **Motor de Partículas (de 'Jano'):** Sistema basado en shaders (GLSL) que genera todos los efectos visuales del juego.
- **QualiaState:** El cerebro del juego. Traduce las acciones del jugador (aciertos, rachas, uso de habilidades) en un estado (Precisión, Fluidez, Caos, etc.) que dirige al motor de partículas en tiempo real. No hay dos partidas visualmente idénticas.
- **Coro Infinito:** Sistema de audio dinámico que acumula capas de la misma sección musical para crear una intensidad sonora creciente y exponencial.

## 5. Prototipo Vertical (Misión Inmediata)

- **Objetivo:** Crear un prototipo de una sola fase.
- **Entregable:** Un vídeo de gameplay de 60 segundos.
- **Contenido Mínimo:
    - Un combate de boss completo.
    - Mecánica de Dash Rítmico funcional.
    - Una habilidad implementada (Pause).
    - El sistema QualiaState reaccionando visiblemente a las acciones del jugador.
    - Música del boss con letras subtituladas.
