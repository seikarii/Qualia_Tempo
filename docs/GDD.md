# GDD: Qualia Tempo

**Versión:** 2.0
**Fecha:** 25 de Septiembre de 2025
**DEV NOTE** : QUALIA TEMPO NO ES UN JUEGO DE BROWSER, ES UNA APLICACION.
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
* **Sistema de Combos Emergentes:** Los combos no solo vienen de pulsar teclas, sino de la **armonía contextual** entre múltiples fuentes de input musical:

  * **Fuentes de Combo:**
    * **Input Activo:** Pulsar teclas musicales (Q, E, R, T, F, G, C)
    * **Recolección de Qualia:** Cada Qualia recolectado contribuye al combo según su color/sonido
    * **Sincronización Rítmica:** Precisión temporal con los beats del metrónomo
    * **Armonía Musical:** Comparación entre input del jugador y notas sonando en la canción
  
  * **Macro-combos musicales**: combinaciones emergentes de 3–5 elementos generan efectos basados en la **armonía contextual**:

  * **Combos Beneficiosos (Armónicos):**
    * `Q+E+R` → remolino (control de área).
    * `Q+R+F` → atractor (recolección masiva de Qualia).
    * `T+E+R` → repulsor (defensa contra ataques).
    * Escala completa (`Q+E+R+T+F+G+C`) → curación completa + escudo.
  
  * **Combos Maliciosos (Caóticos):**
    * `Q+T+G` → muro de sonido (bloquea movimiento).
    * `E+F+C` → zona de daño por segundo (DoT area).
    * `R+G+T` → repulsor inverso (empuja al jugador).
    * Secuencias disonantes → atractores hostiles (atraen al boss).
* **Sistema de Armonía Dinámica:** Los efectos dependen de cómo de "armónicas" sean las combinaciones comparadas con las notas musicales sonando en ese momento. Cada pelea es única debido a la interacción entre:
  * Notas de la canción (do-re-mi-fa-sol-la-si).
  * Qualia recolectado del suelo.
  * Habilidades del boss que generan Qualia adicional.
* **Prevención de Spam:** Los combos maliciosos evitan que el jugador simplemente "recoga todo" sin pensar en la armonía musical.

* **Habilidad Especial:** disponible con combo x40. Activa efecto coro mientras se mantenga.

  * Activa modo **Sonido 8D total**.
  * Duplica la generación de Qualia. Efecto orquesta musical.

### 3.4. Sistema de Combo Musical

* El combo depende de **múltiples fuentes de input musical** que se combinan dinámicamente:

  * **Recolección precisa de Qualia:** Cada Qualia recolectado contribuye según su color/sonido y timing.
  * **Input Activo del Jugador:** Pulsar teclas musicales (Q, E, R, T, F, G, C) en secuencias.
  * **Sincronización Rítmica:** Precisión temporal con beats del metrónomo y notas de la canción.
  * **Armonía vs. Caos Contextual:**
    * **Análisis en Tiempo Real:** El sistema compara TODAS las fuentes de input musical del jugador con las notas musicales sonando en ese momento exacto de la canción.
    * **Armonías Perfectas** → bonificaciones emergentes (curas, control de área, multiplicadores de Qualia).
    * **Caos Disonante** → penalizaciones automáticas (muros sonoros, zonas dañinas, repulsores que complican el movimiento).
* **Dinámica de Cada Pelea:** Como la canción tiene sus propios do-re-mi-fa-sol-la-si, más el Qualia del suelo, más el generado por habilidades del boss, cada combate es totalmente único. El mismo input puede generar combos beneficiosos en un momento y caóticos en otro.
* **Prevención de Optimización:** Los efectos caóticos evitan que el jugador simplemente "recoga todo" - deben pensar musicalmente y adaptarse a la armonía del momento.
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

### 3.7. Lista de Combos Musicales

Los combos son **emergentes** y pueden activarse a través de múltiples fuentes de input musical (teclas + recolección de Qualia + timing rítmico). Los efectos dependen del contexto armónico del momento.

#### Combos Beneficiosos (Armónicos)
* `Q+E+R` → Remolino (control de área, atrae Qualia cercano)
* `Q+R+F` → Atractor (recolección masiva de Qualia en radio)
* `T+E+R` → Repulsor (defensa, repele ataques del boss)
* `Q+E+T` → Multiplicador de combo (+50% puntuación temporal)
* `F+G+C` → Curación (restaura vida gradualmente)
* `Q+E+R+T+F+G+C` → Escala completa (curación completa + escudo temporal)
* **Combos de Recolección:** Secuencias de Qualia del mismo color recolectadas en timing perfecto
* **Combos Rítmicos:** Dash + recolección de Qualia en beats del metrónomo

#### Combos Maliciosos (Caóticos)
* `Q+T+G` → Muro sonoro (bloquea movimiento en área)
* `E+F+C` → Zona de daño (Daño por segundo en área circular)
* `R+G+T` → Repulsor inverso (empuja al jugador hacia el boss)
* `Q+G+C` → Atractor hostil (atrae al boss hacia el jugador)
* `T+F+R` → Interferencia auditiva (reduce precisión de recolección)
* Secuencias disonantes aleatorias → Efectos caóticos variables (basados en la entropía musical del momento)
* **Combos de Caos:** Recolección desincronizada + input disonante con la música actual

**Nota:** Los efectos específicos pueden variar según la armonía contextual con la música sonando en ese momento. Un mismo patrón de input puede ser beneficioso en un contexto armónico y malicioso en uno caótico.

### 3.8. Progresión y Dificultad

* La dificultad está directamente ligada al **volumen de la canción**:

  * Volumen 0% → modo ultra fácil.
  * Volumen 80–100% → dificultad estándar–extrema.
* Escala natural: cuanto más combo y más Qualia, más rápido y denso se vuelve todo.

### 3.9. Metajuego

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
* **Entregable:** 90s de gameplay en 2.5D.
* **Contenido mínimo:**

  * Dash rítmico funcional.
  * Generación/recolección de Qualia con eco sonoro.
  * Habilidades básicas (ñas 7 notas).
  * Sistema de combo musical (el caos no penaliza al combo, solo hace más difícil el gameplay del player mediante efectos emergentes negativos).
  * Boss complejo con ataques morado + telegraph que hace mas ataques y mas grandes y precisos dependiendo de la intensidad de la musica.
  * Visuales Fase 1 (God Rays + Bloom).
  * Música del boss con subtítulos en pantalla.

---

## 6. Futuras Expansiones

* Migración de 2.5D a **combate 3D procedural**.
* Nuevos bosses diseñados como **arquitecturas sonoras**.
* Integración de VR para inmersión total en el espacio 8D.

