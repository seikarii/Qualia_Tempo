# GDD: Qualia Tempo

**Versión:** 2.0
**Fecha:** 25 de Septiembre de 2025

---

## 1. Ficha Técnica

* **Título Comercial:** Qualia Tempo
* **Subtítulo (Lore):** A Charlie Hellsinger Story
* **Protagonista:** Charlie Hellsinger, una celestial exiliada que usa la música para redimir un infierno procedural.
* **Género:** Rhythm-Action / Music Boss Rush
* **Plataforma Objetivo:** PC (futuro soporte a móvil y VR)
* **Logline:** Un juego de ritmo brutal donde el mundo entero es música: cada dash, nota y acción genera Qualia, que transforma la arena en un organismo vivo sincronizado con la canción.
* **Propuesta Única de Venta (USP):** El primer juego donde **todo es Qualia**: sonido, luz, gameplay y dificultad emergen en tiempo real de la armonía (o caos) entre el jugador, la música y el boss.

---

## 2. Filosofía de Diseño

* **Confianza Absoluta en el Jugador:** Aprendizaje orgánico, sin tutoriales explícitos.
* **Profundidad Emergente:** Mecánicas simples (dash + notas musicales) que combinadas generan interacciones complejas.
* **Sobrecarga Sensorial como Recompensa:** El dominio rítmico amplifica música, luz y dificultad hasta niveles trascendentes.
* **La Narrativa es Sonora:** Las canciones y sus letras cuentan la historia.
* **Kairos:** El instante perfecto donde música, acción y visuales se alinean.

---

## 3. Mecánicas Fundamentales

### 3.1. Qualia (Recurso Central)

* Se genera en cada **dash**, cada **habilidad** (jugador o boss), y en cada **tic del metrónomo**.
* Al recogerse (<1s de margen):

  * Produce un **eco sonoro 8D** (direccional según posición en la arena).
  * Incrementa el **combo**.
  * Emite un destello visual ligado al color/sonido original.
* **Nunca es aleatorio:** siempre responde a la música, volumen e interacción jugador–boss.

### 3.2. Movimiento: Dash Sincronizado

* Dash en el **clic izquierdo**.
* Se **recarga en cada tic** del metrónomo.
* Usarlo en el tiempo exacto potencia la generación de Qualia.

### 3.3. Habilidades Sonoras

* Teclas **Q, E, R, T, F, G, C** → reproducen notas de la pista actual como escala musical.
* Cada nota:

  * Genera combo.
  * Tiene **5s de cooldown**, reducido por la velocidad de la música.
* **Macro-combos musicales**: combinaciones de 3–5 notas generan efectos emergentes (ej.:

  * `Q+E+R` → remolino.
  * `Q+R+F` → atractor.
  * `T+E+R` → repulsor.
  * Escala completa → curación.
    )
* **Habilidad Especial:** disponible con combo x40.Actica efecto coro mientras se mantenga.

  * Activa modo **Sonido 8D total**.
  * Duplica la generación de Qualia.Efecto orquesta musical.

### 3.4. Sistema de Combo Musical

* El combo depende de:

  * **Recolección precisa de Qualia.**
  * **Notas acertadas** en sincronía con la pista.
  * **Armonía vs. Caos:**

    * Armonías → bonificaciones (curas, control de área, multiplicadores).
    * Caos → penalizaciones (muros, zonas dañinas, repulsores).
* A mayor combo:

  * El jugador brilla más.
  * La canción acelera y sube volumen.
  * El boss despliega más habilidades con menos telegraph.

### 3.5. Enemigos y Bosses

* **Boss = la canción.** Su vida es la duración restante del track.
* Ataques del boss:

  * Siempre **morados/negros**.
  * Generan Qualia hostil y zonas de peligro (muros, DoTs, atractores).
  * Siempre tienen **telegraph visual**, más corto en fases intensas.
* El jugador puede neutralizar ataques con **combos armónicos**.Cuando los ejecuta cerca de estos.

### 3.6. Progresión y Dificultad

* La dificultad está directamente ligada al **volumen de la canción**:

  * Volumen 0% → modo ultra fácil.
  * Volumen 80–100% → dificultad estándar–extrema.
* Escala natural: cuanto más combo y más Qualia, más rápido y denso se vuelve todo.

### 3.7. Metajuego

* **Marcador de Puntos Online:** para competición y viralidad en redes.
* **Soporte de Música Personalizada:** los jugadores pueden subir cualquier pista (sin copyright propio) → cada boss fight se adapta dinámicamente.

---

## 4. Tecnología y Estética: Proyecto Kairos

La experiencia visual sigue una **hoja de ruta en 4 fases**, todas controladas por el **QualiaState** y/o análisis FFT en tiempo real.

### Fase 1: Atmósfera y Presencia

* Shaders de **Iluminación Volumétrica (God Rays)** y **Bloom**.
* Parametrizados por Qualia (intensidad, precisión, trascendencia).

### Fase 2: Synesthesia Profunda

* **FFT en tiempo real**: graves, medios y agudos afectan tamaño, color y brillo de partículas.
* Cada sonido se convierte en visual puro.

### Fase 3: El Mundo Viviente

* **Reaction-Diffusion Shader** aplicado al suelo.
* El tablero se convierte en un lienzo orgánico:

  * **Caos** → patrones frenéticos.
  * **Flow** → corrientes suaves.

### Fase 4: Avatares Procedurales

* Jugador y Boss representados como **entidades SDF mutables via Raymarching**.
* Formas cristalinas (Precisión/Flow) → fractales caóticos (Caos/Agresión).
* En trascendencia: fractal luminoso (ej. Mandelbulb).

---

## 5. Prototipo Vertical (Misión Inmediata)

* **Objetivo:** Probar el loop de Qualia + dash + notas musicales.
* **Entregable:** 90s de gameplay en 2D.
* **Contenido mínimo:**

  * Dash rítmico funcional.
  * Generación/recolección de Qualia con eco sonoro.
  * Habilidades básicas (ñas 7 notas).
  * Sistema de combo musical (nota, el caos no penaliza al combo, solo hace mas dificil el gameplay del player).
  * Boss complejo con ataques morado + telegraph que hace mas ataques y mas grandes y precisos dependiendo de la intensidad de la musica.
  * Visuales Fase 1 (God Rays + Bloom).
  * Música del boss con subtítulos en pantalla.

---

## 6. Futuras Expansiones

* Migración de 2D a **combate 3D procedural**.
* Nuevos bosses diseñados como **arquitecturas sonoras**.
* Integración de VR para inmersión total en el espacio 8D.

