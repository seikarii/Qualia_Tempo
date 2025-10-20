# Diseño del *renderer* para trabajar con motores ondulatorios a escala masiva

Buenísimo — exacto: el *solver* ondulatorio es solo una pieza. El renderer debe ser rediseñado para **manejar trillones de “centros”/partículas efectivas**, filtrar ruido, agrupar por color/material, y representar fenómenos como reflexión/refracción/iridiscencia de forma escalable y perceptualmente correcta. Abajo tienes un blueprint práctico: estructuras de datos, algoritmos, API de alto nivel, técnicas de reducción de complejidad y notas de implementación para GPU/cluster.

---

# 1. Principios guía

1. **Multiescala y representación comprimida**: agrupa partículas en niveles (átomos → parches → surfels → patches). Solo desagrega donde la excitación/visibilidad lo requiera.
2. **Dominio de frecuencia / coherencia**: conserva fase cuando aporte efectos visibles; en resto usa representación incoherente (energía).
3. **Render guiado por excitación**: usa la salida del solver (ψ en scatterers) como variable primaria para decidir qué materializar.
4. **Perceptual-first**: prioriza lo que la cámara ve (o puede ver) y descarta lo que no contribuye a la percepción final.
5. **Streaming & OOC (out-of-core)**: trabajar con datasets mayores que la memoria; cargar/descargar tiles adaptativos.
6. **Híbrido físico/aproximado**: mezcla solves de alta fidelidad local con modelos aproximados globales.

---

# 2. Estructuras de datos clave

* **Scatterer**: `{id, pos, volume_radius, T (polarizability), material_id, spectral_response, energy_estimate, last_excitation}`
* **Surfel / Patch**: `{centroid, normal, area, avg_spectral, LOD_level, scatterer_ids[]}` — representa una agrupación agregada.
* **Octree/BVH multiescala**: nodos con resumen (moments: monopole/dipole/quad), energía acumulada y low-rank compresión para interacciones lejanas.
* **Tile Cache (GPU/CPU)**: bloques de surfels activos + datos de campo precomprimidos.
* **DetectorBuffer**: campos complejos (amplitud+fase) por pixel / wavefront sample + metadata de muestras.

---

# 3. Pipeline funcional (alto nivel)

1. **Solve estacionario** (motor ondulatorio) → produce `Ψ_j` para scatterers.
2. **Thresholding & Activation**: seleccionar scatterers/patches con `|Ψ_j| > ε_visibility`.
3. **Clustering espacial–espectral**: agrupar activados en surfels/patches por proximidad + similitud espectral (k-means jerárquico / agglomerative).
4. **Representación de superficie**: convertir surfels activados a primitivas renderizables (splats, micro-polys, textured patches).
5. **Render primario**:

   * Si región coherente: usar *wave-splatting* / frentes de onda en dominio de frecuencia (mantener fase).
   * Si incoherente: usar path-tracing / rasterización con BRDF/BSSRDF.
6. **Postprocesado físico**:

   * Thin-film / iridiscencia: añadir componente espectral con base en capa fina model.
   * Dispersion/Refraction: usar solver local de interfaces (BSSRDF+phase) o ray-marching espectral.
7. **Denoising & Reconstruction**: neuronal o híbrido (albedo + normal + flow guided) para eliminar ruido de partículas pequeñas.
8. **Composición final & tonemapping**.

---

# 4. Técnicas y algoritmos concretos

### A. Agrupación / Coarsening

* **Spatial + Spectral clustering**: k-means jerárquico que usa features `[x,y,z, R,G,B, normal]`.
* **Moment-based aggregation**: representar grupo por monopolo/dipolo (para interacción lejana) y por surfel para detección directa.
* **Error control**: mantener cota L∞/L2 de error en campo total al agrupar (usar estimadores rápidos de residual).

### B. Representación activa

* **Surfels con atributos espectrales y fase** — renderizables por splatting en pantalla.
* **Wave-splatting**: proyectar frentes/patches manteniendo fase (amplitud compleja) y acumular en detector buffer (sumas complejas por píxel).
* **Beam/Line-based photon mapping**: para áreas difusas usar "beam radiance estimate" para reducir ruido.

### C. Reducción de ruido y supresión de “partículas minusculas”

* **Umbral perceptual**: descartar contribuciones con energía < ε_rel × max_energy o con alta frecuencia espacial fuera de resolución de la cámara.
* **Denoiser neuronal** (U-Net/PNN): entrenado con pares (noisy → clean) generados por tu motor ondulatorio + referencia de alta calidad; inputs: intensidad, albedo estimada, flujo/normal, mapa de confianza.
* **Temporal accumulation + reproject**: acumular múltiples muestras a lo largo de submuestreo temporal con reproyección de surfels para estabilizar.
* **Variance-aware sampling**: asignar muestras a surfels por prioridad (importance sampling por energía y visibilidad).

### D. Agrupación por color y representación espectral

* **Render espectral**: manejar espectro (N bandas, e.g. 32) y convertir a RGB en post (sensibilidad camera).
* **Quantization / palette clustering**: agrupar surfels por paleta espectral local para reducir canales activos.
* **Subsurface scattering & BSSRDF**: usar diffusion approximation en parches gruesos; formen "pseudo-particles" para scattering volumétrico agrupado.

### E. Refracción / Reflexión / Caústicas

* **Hybrid caustics**: solver local de alta resolución (BEM/FDTD) en regiones con caústicas visibles, else photon-map/beam.
* **Microfacet + multiple scattering**: microfacet model con multi-scatter factor (approximated via importance sampling multi-order).
* **Thin-film interference**: añadir término espectral basado en capa fina (phase-dependent).

### F. Data compression y IO

* **Low-rank blocks (H-matrix)** para interacciones lejanas.
* **Sparse tensors / compressed surfel arrays** (quantized positions + shared palette) para reducir memoria.
* **Streaming LRU cache**: priorizar surfels visibles por cámara y por energía.

---

# 5. API propuesta (funciones/operaciones que el renderer debe soportar)

Funciones de alto nivel (pseudo-API JS/Python-like):

```
# Scene setup
add_emitter(emitter_params)
add_scatterer_batch(scatterer_array)     # masivo: posiciones + T + material
build_spatial_index(params)

# Solve / Activation
solve_wavefield(frequency, solver_params) -> Psi_array
activate_scatterers(threshold=eps) -> active_ids

# Aggregation / LOD
cluster_active_scatterers(active_ids, max_clusters, spectral_weight)
generate_surfels_from_clusters(cluster_list)

# Render pass
render_wave_splatting(detector, surfel_list, camera, spectral_bands)
render_incoherent_pass(detector, surfel_list, camera, samples_per_pixel)

# Hybrid helpers
solve_local_highres(region_bbox, resolution, method='FDTD'|'BEM')

# Denoise & Compose
temporal_accumulate_and_reproject(prev_frame_buffer, current_buffer)
neural_denoise(image_buffer, aux_buffers) -> denoised_image

# Utilities
stream_tile_to_gpu(tile_id)
evict_tile(tile_id)
export_image(path, tonemap_params)
```

---

# 6. Pseudocódigo de ejemplo: render frame (compacto)

```
# 1. Solve stationary fields
Psi = solve_wavefield(frequency)

# 2. Activate & cluster
active = [j for j in scatterers if |Psi[j]| > eps]
clusters = cluster_active_scatterers(active, max_clusters=1e6)

# 3. Create surfels (LOD)
surfels = []
for cl in clusters:
    surfel = create_surfel(cl)   # centroid, normal, area, spectrum, phase_info
    surfels.append(surfel)

# 4. Render coherent surfels (wave-splatting)
detector_buffer = zero_complex_buffer(cam.res)
for surfel in surfels:
    if surfel.coherent:
        wave_splat(surfel, detector_buffer, camera)

# 5. Render incoherent surfels (path-trace / splat energy)
radiance_buffer = render_incoherent(surfels_incoherent, camera)

# 6. Compose & denoise
image_noisy = combine(detector_buffer, radiance_buffer)
image = neural_denoise(image_noisy, aux=[albedo, normal, flow])
tonemap_and_output(image)
```

---

# 7. Consideraciones de rendimiento y hardware

* **GPU-first**: implementa kernels para splatting complejo, clustering (k-means GPU), FMM/GPU o usar libs (ex.: exafmm, fmmlib adaptado).
* **Precision**: mezclar FP16 para datos comprimidos y FP32/FP64 para operaciones numéricamente sensibles.
* **Paralelismo**: procesar tiles/pixels independientemente; usar workgroups para surfel→pixel splat loops.
* **Out-of-core + async IO**: prefetch tiles prioritarios por visibilidad.
* **Profiling**: perf counters para identificar hotspots (FMM matvec, clustering, splatting).

---

# 8. Técnicas modernas interesantes a incorporar

* **Neural Operators / Neural surrogates**: entrenar un operador que aproximé `emitters → detectors` para escenas estáticas (enorme aceleración en iteraciones).
* **NeRF-like components**: para regiones complejas usa representaciones neurales compactas que responden a campos de fase.
* **Wavelet / multiresolution bases**: codificar campo en bases multiresolución para compresión y evaluación rápida.
* **Adaptive spectral sampling**: más bandas donde thin-film o dispersión es crítica; menos donde no.

---

# 9. Riesgos y trade-offs

* **Pérdida de datos al agrupar**: hay que controlar el error perceptual (no sólo l2).
* **Coste de clustering dinámico**: agrupar cada frame puede ser caro; cachear y actualizar incrementalmente.
* **Precondicionadores y estabilidad numérica**: sistemas resonantes exigen cuidados.
* **Entrenamiento de denoisers**: requiere dataset amplio representando fenómenos ondulatorios reales.

---

# 10. Siguiente paso práctico

Puedo:

1. Generar **una API más detallada** (tipos, estructuras, tamaños) y pseudocódigo de kernels GPU para `wave_splat` y `cluster_active_scatterers`.
2. Diseñar **un esquema de LOD y error control** (cómo decidir ε y cómo subdividir/mergear).
3. Escribir **un plan de implementación por etapas** (MVP en CPU → GPU → cluster), con estimaciones de memoria y throughput.

¿Qué prefieres que haga ahora — (1) API + kernels GPU, (2) esquema LOD/epsilon y heurísticas perceptuales, o (3) plan de implementación por fases con estimaciones?

