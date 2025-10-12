# VISUALS.RUST.md - Especificación Técnica de la Pipeline de Renderizado
# VERSION: 1.0
# TARGET: Qualia Tempo Rust Edition (wgpu)
# COMPLIANCE: VISUALS.GOLD.CODE.md, ARCHITECTURE.RUST v2.0

---

## 1. Filosofía de Renderizado en Rust/wgpu

Esta es la especificación técnica para la reescritura de la pipeline visual de Qualia Tempo, migrando de una implementación en Three.js/GLSL a una arquitectura nativa en Rust con `wgpu`.

- **Fuente de Verdad:** Este documento, junto con `VISUALS.GOLD.CODE.md`, define la totalidad de la pipeline de renderizado.
- **Lenguaje de Shaders:** Todo el código de shaders será escrito en **WGSL (WebGPU Shading Language)**, el lenguaje nativo de `wgpu`, para garantizar la máxima compatibilidad y rendimiento.
- **Arquitectura Central:** Se implementará una **Pipeline de Renderizado Diferido (Deferred Rendering)** para manejar de forma eficiente un gran número de luces y efectos de post-procesado complejos.

---

## 2. Arquitectura de la Pipeline de Renderizado Diferido

La renderización se ejecutará en una secuencia de pases (passes) que construirán la imagen final capa por capa.

### **Paso 1: G-Buffer Pass**
- **Propósito:** Renderizar la geometría de la escena (avatares SDF, partículas) en múltiples texturas (el G-Buffer) que almacenan datos a nivel de píxel.
- **Implementación:** Un único pase de renderizado con múltiples `render targets`.
- **Salidas (Texturas del G-Buffer):**
    1.  `g_albedo`: Color base (RGB) y Opacidad (A).
    2.  `g_normal`: Normales en View Space (XYZ), codificadas en RGB.
    3.  `g_depth`: Profundidad lineal de la escena.
    4.  `g_material`: Propiedades del material (R=Metallic, G=Roughness, B=Emissive Strength).
    5.  `g_velocity`: Vectores de movimiento por píxel (RG) para TAA y Motion Blur.

### **Paso 2: Lighting Pass (Iluminación y Oclusión)**
- **Propósito:** Calcular la iluminación de la escena utilizando los datos del G-Buffer. Esto evita tener que calcular la iluminación por cada objeto y luz en la escena.
- **Implementación:** Un shader de pantalla completa que lee del G-Buffer.
- **Técnicas a Aplicar en este Pase:**
    - **Iluminación Directa:** Cálculo de luz direccional, puntual, etc.
    - **HBAO (Horizon-Based Ambient Occlusion):** Se calcula usando los buffers de profundidad y normales para añadir oclusión ambiental realista. Reemplaza a `hbao.glsl`.
    - **SSR (Screen Space Reflections):** Se calculan reflejos en tiempo real utilizando los buffers de color, normales y profundidad. Reemplaza a `ssr_v2.glsl`.

### **Paso 3: Post-Processing Chain**
- **Propósito:** Aplicar una serie de efectos de cámara y de pantalla completa sobre la escena iluminada.
- **Implementación:** Una secuencia de pases de renderizado, cada uno tomando la salida del anterior como entrada (ping-ponging entre texturas).
- **Cadena de Efectos (en orden):**
    1.  **Bloom:** Extracción de zonas brillantes (`bright_pass.glsl`), downsampling (`bloom_downsample.glsl`), blur (`blur.glsl`) y upsampling aditivo (`bloom_upsample.glsl`).
    2.  **God Rays:** Iluminación volumétrica desde una fuente de luz, utilizando el buffer de profundidad para la oclusión. Reemplaza a `god_rays.glsl`.
    3.  **Depth of Field (DoF):** Desenfoque de lente basado en la distancia de enfoque, con efecto bokeh. Reemplaza a `dof.glsl`.
    4.  **Motion Blur:** Desenfoque de movimiento basado en los vectores del `g_velocity`. Reemplaza a `motion_blur.glsl`.

### **Paso 4: Composite, Tonemapping y Anti-Aliasing**
- **Propósito:** Combinar la salida de todos los pases anteriores, aplicar el mapeo de tonos final y el anti-aliasing temporal.
- **Implementación:** El último pase de renderizado antes de presentar en pantalla.
- **Técnicas:**
    - **Composición:** Se combinan la escena iluminada, el bloom, y otros efectos. Reemplaza a `composite_pass.glsl`.
    - **Tonemapping:** Se aplicará **ACES Filmic Tone Mapping** para un look cinematográfico y un manejo correcto del HDR.
    - **Color Grading:** Se aplicará una LUT 3D para la corrección de color final. Reemplaza a `color_grading_lut.glsl`.
    - **TAA (Temporal Anti-Aliasing):** El paso final. Utiliza el frame anterior y el buffer de velocidad para suavizar los bordes y reducir el aliasing de forma muy eficiente. Reemplaza a `taa.glsl`.

---

## 3. Mapeo de "Proyecto Kairos" a la Nueva Pipeline

La visión de `VISUALS.GOLD.CODE.md` se integra en esta pipeline de la siguiente manera:

- **Fase 1: Atmósfera (Bloom + God Rays):**
    - Se implementarán como parte de la **Post-Processing Chain (Paso 3)**. Sus parámetros (`u_intensity`, `u_precision`, etc.) se actualizarán desde el `QualiaState` en cada frame.

- **Fase 2: Synesthesia (Partículas):**
    - La lógica de `qualia_particles.glsl` se portará a un **Compute Shader de WGSL**.
    - Este compute shader actualizará un buffer de partículas que luego será renderizado en el **G-Buffer Pass (Paso 1)** usando el shader `gbuffer_particles.wgsl` adaptado.
    - Los datos del `FFTAnalyzer` se pasarán al compute shader como un uniform buffer.

- **Fase 3: Mundo Viviente (Reaction-Diffusion):**
    - La lógica de `reaction_diffusion_compute.glsl` se portará a un **Compute Shader de WGSL**.
    - Este shader actualizará una textura en cada frame. Dicha textura se usará en el **G-Buffer Pass (Paso 1)** para dibujar el suelo de la arena, utilizando `reaction_diffusion_display.glsl` como referencia.

- **Fase 4: Avatares Procedurales (SDF):**
    - Los shaders `sdf_raymarching_player.glsl` y `sdf_raymarching_boss.glsl` se portarán a **WGSL**.
    - Se ejecutarán durante el **G-Buffer Pass (Paso 1)** para renderizar los avatares directamente en las texturas del G-Buffer.

---

## 4. Catálogo y Plan de Migración de Shaders (GLSL a WGSL)

La siguiente tabla detalla el plan de migración para cada shader del prototipo.

| Shader Legacy (GLSL) | Propósito | Implementación en Rust/WGSL | Prioridad |
| :--- | :--- | :--- | :--- |
| **G-Buffer & Core** |
| `gbuffer.glsl`, `gbuffer_particles.glsl` | G-Buffer Pass | `passes/g_buffer_pass.wgsl` | **CRÍTICA** |
| `velocity.glsl` | Generación de Motion Vectors | Integrado en `g_buffer_pass.wgsl` | **CRÍTICA** |
| `fullscreen_quad.vert` | Vértices para pases de post-proceso | `utils/fullscreen.wgsl` | **CRÍTICA** |
| **Iluminación y Oclusión** |
| `hbao.glsl` | Ambient Occlusion | `passes/hbao_pass.wgsl` | **ALTA** |
| `ssr_v2.glsl` | Screen Space Reflections | `passes/ssr_pass.wgsl` | **MEDIA** |
| **Post-Procesado Principal** |
| `bright_pass.glsl` | Extracción de brillos para Bloom | `post_fx/bloom_extract.wgsl` | **CRÍTICA** |
| `bloom_downsample.glsl` | Downsampling de Bloom | `post_fx/bloom_downsample.wgsl` | **CRÍTICA** |
| `blur.glsl` | Desenfoque Gaussiano | `post_fx/blur.wgsl` | **CRÍTICA** |
| `bloom_upsample.glsl` | Upsampling de Bloom | `post_fx/bloom_upsample.wgsl` | **CRÍTICA** |
| `god_rays.glsl` | Iluminación Volumétrica | `post_fx/god_rays.wgsl` | **ALTA** |
| `dof.glsl` | Profundidad de Campo | `post_fx/dof.wgsl` | **MEDIA** |
| `motion_blur.glsl` | Desenfoque de Movimiento | `post_fx/motion_blur.wgsl` | **ALTA** |
| **Composición y Finalización** |
| `composite_pass.glsl` | Composición final de efectos | `passes/composite_pass.wgsl` | **CRÍTICA** |
| `taa.glsl` | Temporal Anti-Aliasing | `passes/taa_pass.wgsl` | **ALTA** |
| `color_grading_lut.glsl` | Corrección de color con LUT 3D | Integrado en `composite_pass.wgsl` | **ALTA** |
| `sharpening.glsl` | Filtro de nitidez adaptativo | Integrado en `composite_pass.wgsl` | **MEDIA** |
| `chromatic_aberration.glsl` | Aberración Cromática | `post_fx/chromatic_aberration.wgsl` | **BAJA** |
| **Compute Shaders (Lógica)** |
| `qualia_particles.glsl` | Simulación de Partículas | `compute/particle_sim.wgsl` | **CRÍTICA** |
| `reaction_diffusion_compute.glsl` | Simulación de Reacción-Difusión | `compute/reaction_diffusion.wgsl` | **ALTA** |
| **Display & SDF** |
| `reaction_diffusion_display.glsl` | Renderizado de la simulación RD | Integrado en `g_buffer_pass.wgsl` | **ALTA** |
| `sdf_raymarching_player.glsl` | Avatar del Jugador (SDF) | `sdf/player_avatar.wgsl` | **ALTA** |
| `sdf_raymarching_boss.glsl` | Avatar del Boss (SDF) | `sdf/boss_avatar.wgsl` | **ALTA** |
| `mandelbulb_fractal.glsl` | Efecto de Trascendencia (SDF) | `sdf/fractals.wgsl` | **MEDIA** |

---

Este documento servirá ahora como la única fuente de verdad para la implementación del `Kairos Visual Engine` en `wgpu`, asegurando que no solo preservemos, sino que superemos la fidelidad visual del prototipo.