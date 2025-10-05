# 📋 DEUDA TÉCNICA - QUALIA TEMPO
*Última actualización: 4 de octubre de 2025 - 14:20*

-## 📋 TAREAS CRÍTICAS - CORRECCIONES DE BOOTSTRAP

## DEV NOTES: 
2. BARAJAR PINO PARA LOGGING
3. ARREGLAR LA PARTE DEL JUEGO (CATASTROFICO, FALTAN COSAS Y ESTA TODO DESCONECTADO)
4. AGREGAR SERVICIO DE BENCHMARKING
5. ARREGLAR EL PANDEL DE DIAGNOSTICO,MOSTRARLO Y AÑADIR LA PARTE DE BENCHMARK. CONTADOR FPS
6. MEJORAR EL MENU INICIAL
7.1. ~~**AUDIO ANALYSIS & PHYSICS TESTS**: 9 tests fallidos (2 AudioAnalysisService, 7 PhysicsService)~~ ✅ **COMPLETADO 2025-01-21 PHASE 7** - Fixed test container to bind REAL services instead of mocks. Fixed decorator order conflict (@OnEvent/@catchError). Fixed EventBus mock signature. **All 27/27 tests PASSING (100%)**. Ver CHANGELOG.md [2025-01-21 PHASE 7 COMPLETE] para detalles.
8. ~~INSPECCIONAR NUEVOS DECORADORES Y DEPRECATED (refactorizar adaptandemit para que no contenga un patron de service locator~~ ✅ **COMPLETADO 2025-10-04** - @AdaptAndEmit refactorizado a IoC puro. Agregar probablemente algun decorador de cache o de workers)
9. REVISAR DEBUGSERVICE,NOTIFICATION,ERRORSERVICE Y SU INTEGRACION CON EL RESTO DEL PROJECTO
10. MEJORAR MENU INICIAL, UTILIZAR LETRAS NEON
11. MEJORAR EL MOTOR PARA QUE CREE ONDAS Y CAMPOS QUE SE RESUELVEN Y RENDERIZAN EN PARTICULAS EN VEZ DEL REVES
12. INSPECCIONAR TODOS LOS SERVICIOS RELACIONADOS CON EL JUEGO Y VER SI TODOS DEBERIAN DE ESTAR EN EL FRONTEND O ALGUNO DEBERIA SER MIGRADO AL BACKEND PARA UTILIZAR ACELERACION POR GPU, JAX O SER MIGRADO A RUST.
13. DEPENDENCY INJECTOR PARA EL BACKEND
14. PASAR EL ENGINE DEL BACKEND A RUST
15. FALTAN INTERFACES EN EL BACKEND
16. Agregar concurrency,performance,cache,workers y demas
17. **CREAR ASSETS GRÁFICOS PARA BRANDING Y SEO** - Pendiente creación de favicon.ico, logo192.png, logo512.png, og-image.png (Ver `/frontend/public/ASSETS_TODO.md` para especificaciones completas)
18. CI/CD - AUTOMATIZAR `sitemap.xml`: La fecha `lastmod` debe generarse dinámicamente en el pipeline de build para reflejar la frescura real del contenido.
19. PWA - ENRIQUECER `manifest.json`: Añadir capturas de pantalla promocionales del juego al array `screenshots` para mejorar la experiencia de instalación de la PWA. qualia-tempo-prototype/frontend/public/METADATA_VALIDATION.md
20. Añadir motor de curvatura para fisicas de magia que deforme los ejes X ,Y
21. Añadir un circular dependency check al linter
---

## 🔍 Metodología de Análisis

**Patrones buscados:**
- `TODO`, `FIXME`, `HACK`, `NOTE:`, `PLACEHOLDER`, `SIMPLIFICATION`
- `XXX`, `BUG`, `FUTURE`, `DEPRECATED`, `TEMP`, `WORKAROUND`

**Alcance:**
- ✅ Código fuente en `qualia-tempo-prototype/`
- ❌ Archivos en `docs/`
- ❌ Dependencias externas (`.venv/`, `node_modules/`)
- ❌ Archivos generados (`htmlcov/`, `coverage/`)

---




Backend:
   * `backend/services/RenderingService.py:95`: PLACEHOLDER para el buffer de vértices de partículas.
   * `backend/engine/qualia_particle_engine.py:437`: FUTURE para la gestión del ciclo de vida de las partículas.
   * `backend/engine/shaders/qualia_particles.glsl:11`: FUTURE enhancement para investigar el soporte nativo de float16.

  Frontend:
   * `frontend/src/main.ts:177`: Future implementation para usar paquetes nativos de sesión de audio.
   * `frontend/src/services/GameControllerService.ts:215`: FUTURE para el manejo de acciones del jugador.
   * `frontend/src/services/SubtitleService.ts:71`: FUTURE para el cálculo de la duración de los subtítulos.
   * `frontend/src/services/NotificationService.ts:77`: FUTURE para la extensibilidad del servicio de configuración.
   * `frontend/src/services/__tests__/GameStateStoreService.test.ts:171`: Placeholder assertion en un test.
   * `frontend/src/services/DebugService.ts:79`: FUTURE para la limpieza de suscripciones del EventBus.
   * `frontend/src/components/QualiaMainMenu.tsx:44`: Comentario TEMPO que indica trabajo temporal o incompleto.
   * `frontend/public/shaders/gbuffer.glsl:40`: PLACEHOLDER para las propiedades de los materiales en el G-buffer.

---

## 🚀 NUEVAS TAREAS - IMPLEMENTACIÓN VISUALS.GOLD.CODE (PROYECTO KAIROS)

- [ ] **FASE 1: ATMÓSFERA Y PRESENCIA**: Implementar Bloom y God Rays en Kairos Visual Engine. Mapear QualiaState (intensity, transcendence, precision, aggression) a shader uniforms.
- [ ] **FASE 2: SYNESTHESIA PROFUNDA**: Integrar FFT análisis en AudioService, enviar datos al backend, modular partículas con graves/medios/agudos en shaders.
- [ ] **FASE 3: EL MUNDO VIVIENTE**: Implementar Reaction-Diffusion compute shader para suelo dinámico. Mapear QualiaState (chaos, flow, recovery) a simulación parameters.
- [ ] **FASE 4: AVATARES PROCEDURALES**: Reemplazar modelos 3D con Raymarching SDFs. Parametrizar formas con QualiaState para mutaciones en tiempo real.
- [ ] **VALIDAR MAPEOS DE DATOS**: Asegurar que todos los parámetros shader sean funciones del QualiaState y/o FFT data, sin valores estáticos.

---

## � TAREAS CRÍTICAS - CORRECCIONES DE BOOTSTRAP

- [ ] **CRITICAL: REFACTORIZAR INVERSIFY BINDING ORDER**: Dependency graph circular en bindServiceParameterObjects. Múltiples servicios (PostProcessingService, etc.) necesitan sus Params antes de ser instanciados, pero Params bindings llaman container.get() que dispara instanciación prematura. SOLUCIÓN: Crear dos fases de binding: (1) Bind todos los *Params objects que NO contienen servicios, (2) Bind objetos compuestos que usan container.get(). Archivo: `/frontend/src/services/inversify.config.ts` líneas 570-630 y funciones bind*ServiceParams.

## �🚀 NUEVAS TAREAS - MIGRACIÓN A ARCHITECTURE.GOLD.CODE

- [ ] **MIGRAR QualiaStateCalculator A WEB WORKER**: Mover cálculos de QualiaState a hilo separado para evitar bloqueo de UI. Archivo: `frontend/src/services/QualiaStateCalculatorService.ts`
- [ ] **IMPLEMENTAR PROCESS POOL PARA PARTICLE ENGINE**: Backend ParticleEngine en proceso separado. Archivo: `backend/engine/ParticleEngine.py`
- [ ] **ACTUALIZAR EVENTBUS PARA SOPORTE DE WORKERS**: Extender EventBus para comunicación cross-worker. Archivos: `frontend/src/services/EventBus.ts`, `backend/EventBus.py`
- [ ] **REFACTORIZAR KAIROS VISUAL ENGINE**: Separar cálculo visual de renderizado según patrón Stateless View-Logic. Archivo: `frontend/src/components/game/KairosVisualEngine.tsx`
- [ ] **VALIDAR FLUJO UNIDIRECCIONAL**: Asegurar que el flujo Input -> Backend -> Estado -> Frontend sea estricto. Revisar todos los servicios.
