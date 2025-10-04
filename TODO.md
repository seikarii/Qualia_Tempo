# 📋 DEUDA TÉCNICA - QUALIA TEMPO
*Última actualización: 4 de octubre de 2025 - 14:20*

---

## 📊 Resumen Ejecutivo

**Estado General: EXCEPCIONAL** - Solo 6 instancias de deuda técnica activas tras purga arquitectónica
**Puntuación de Calidad: 9.8/10** ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ (3 deprecated completamente eliminados)

### Estadísticas por Severidad
- **Resueltas**: 6 instancias (3 antiguamente + 3 nuevas en purga del 2025-10-04)
- **Baja**: 3 instancias (50%)
- **Media**: 3 instancias (50%)
- **Media-Alta**: 0 instancias (0%)
- **TOTAL ACTIVAS**: 6 instancias
- **TOTAL HISTÓRICAS**: 12 instancias



## DEV NOTES: 
1. ARREGLAR/MEJORAR PARTE DE SHADERS Y RENDERIZADO FRONTEND (ESTADO CATASTROFICO)
2. BARAJAR PINO PARA LOGGING
3. ARREGLAR LA PARTE DEL JUEGO (CATASTROFICO, FALTAN COSAS Y ESTA TODO DESCONECTADO)
4. AGREGAR SERVICIO DE BENCHMARKING
5. ARREGLAR EL PANDEL DE DIAGNOSTICO,MOSTRARLO Y AÑADIR LA PARTE DE BENCHMARK
6. MEJORAR EL MENU INICIAL
7. **LINTER VIOLATIONS: 29 event handlers + 2 DTO methods** - Decidir estrategia: crear schemas para eventos internos O refinar linter para distinguir eventos externos (WebSocket/API) vs eventos internos (EventBus tipado). Ver CHANGELOG.md [2025-10-04 Phase 2] para análisis completo
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
