# INFORME DE DEUDA DE COBERTURA DE SERVICIOS CRÍTICOS
## Fecha de Análisis: 2025-10-03 14:32:56
## Arquitecto: Sistema de Análisis Auto### RECOMENDACIONES DE PRIORIZACIÓN

#### **FASE 1: REPARACIÓN CRÍTICA (Esta Semana)**
**PRIORIDAD MÁXIMA:** Arreglar tests fallando antes de agregar nuevos

1. **BackendSyncService.ts** (2/7 pasan - 28.6%)
   - Problema: Decoradores no funcionan en tests
   - Impacto: Servicio crítico de sincronización backend

2. **RhythmicMovementController.ts** (0/6 pasan - 0%)
   - Problema: Conflictos de binding IoC
   - Impacto: Controlador de movimiento rítmico

3. **GameStateStoreService.ts** (0/2 pasan - 0%)
   - Problema: Métodos faltantes (start/stop)
   - Impacto: Puente crítico EventBus → Zustand

4. **EventBus.ts** (15/16 pasan - 93.8%)
   - Problema: 1 test fallando
   - Impacto: Sistema nervioso central de la aplicación

5. **DebugOrchestratorService.ts** (6/8 pasan - 75%)
   - Problema: 2 tests fallando
   - Impacto: Sistema de debugging

#### **FASE 2: EXPANSIÓN DE COBERTURA (Próximas 2 Semanas)**
**Después de arreglar tests críticos**

1. **ALTA:** Servicios de infraestructura crítica
   - ApplicationCompositionRoot.ts, ConfigurationService.ts, Logger.ts
   - EventBus.ts (una vez arreglado)

2. **MEDIA:** Servicios de lógica de negocio
   - ViewLogicService.ts, QualiaStateCalculatorService.ts, GameControllerService.ts
   - AudioService.ts, WebSocketService.ts

3. **BAJA:** Servicios utilitarios y helpers
   - ColorService.ts, CoordinateSystemService.ts, TimerService.ts
   - HttpService.ts, NotificationService.tsIA.CODE

### RESUMEN EJECUTIVO
- **Total de Servicios:** 41
- **Servicios con Tests:** 17 (41.5%)
- **Servicios sin Tests:** 24 (58.5%)
- **Total Tests:** 124
- **Tests Pasando:** 103 (83.1%)
- **Tests Fallando:** 21 (16.9%)

### METODOLOGÍA
Este análisis compara la existencia de archivos de servicio (*.ts) en `/src/services/`
con sus correspondientes archivos de prueba en `/src/services/__tests__/`.

Un servicio se considera "con cobertura" si existe un archivo `[ServiceName].test.ts`
correspondiente. Los porcentajes de cobertura se basan en líneas de código ejecutadas.

### ESTADO ACTUAL DE TESTS

#### Tests por Servicio (Resumen)
- **ApplicationInitializerService:** 12 tests ✅ (todos pasan)
- **BackendSyncService:** 7 tests ❌ (5 fallan - problemas con decoradores)
- **BrowserAudioContextFactory:** 5 tests ❌ (1 falla - metadata IoC)
- **ColorService:** 10 tests ✅ (todos pasan)
- **DebugOrchestratorService:** 8 tests ❌ (2 fallan - @OnEvent no inicializado)
- **DebugService:** 3 tests ✅ (todos pasan)
- **EventBus:** 16 tests ❌ (1 falla - timeout en error handling)
- **GameControllerService:** 6 tests ✅ (todos pasan)
- **GameStateStoreService:** 2 tests ❌ (2 fallan - métodos start/stop no existen)
- **InputStateService:** 10 tests ✅ (todos pasan)
- **PerformanceService:** 12 tests ✅ (todos pasan)
- **QualiaStateCalculatorService:** 8 tests ✅ (todos pasan)
- **RhythmicMovementController:** 6 tests ❌ (6 fallan - bindings ambiguos IoC)
- **ShaderIntrospectionService:** 5 tests ✅ (todos pasan)
- **RawToParticleEventAdapter:** 5 tests ❌ (4 fallan - config no inicializada)

#### Problemas Comunes en Tests Fallando
1. **Decoradores @OnEvent no funcionan en tests** - BackendSyncService, DebugOrchestratorService
2. **Bindings IoC ambiguos** - RhythmicMovementController (mock + implementación real)
3. **Configuración no inicializada** - RawToParticleEventAdapter
4. **Métodos inexistentes** - GameStateStoreService (start/stop)
5. **Metadata IoC faltante** - BrowserAudioContextFactory

### TABLA DE DEUDA DE COBERTURA

| Prioridad | Archivo de Servicio | Tiene Tests | Estado | Tests | Ratio |
|-----------|-------------------|-------------|---------|-------|-------|
| ✅ CUBIERTO | `ApplicationInitializerService.ts` | Sí | ✅ 12/12 pasan | 12 | 100% |
| ❌ CRÍTICA | `BackendSyncService.ts` | Sí | ❌ 2/7 pasan | 7 | 28.6% |
| ❌ CRÍTICA | `BrowserAudioContextFactory.ts` | Sí | ❌ 4/5 pasan | 5 | 80% |
| ✅ CUBIERTO | `ColorService.ts` | Sí | ✅ 10/10 pasan | 10 | 100% |
| ❌ CRÍTICA | `DebugOrchestratorService.ts` | Sí | ❌ 6/8 pasan | 8 | 75% |
| ✅ CUBIERTO | `DebugService.ts` | Sí | ✅ 3/3 pasan | 3 | 100% |
| ❌ CRÍTICA | `EventBus.ts` | Sí | ❌ 15/16 pasan | 16 | 93.8% |
| ✅ CUBIERTO | `GameControllerService.ts` | Sí | ✅ 6/6 pasan | 6 | 100% |
| ❌ CRÍTICA | `GameStateStoreService.ts` | Sí | ❌ 0/2 pasan | 2 | 0% |
| ✅ CUBIERTO | `InputStateService.ts` | Sí | ✅ 10/10 pasan | 10 | 100% |
| ✅ CUBIERTO | `PerformanceService.ts` | Sí | ✅ 12/12 pasan | 12 | 100% |
| ✅ CUBIERTO | `QualiaStateCalculatorService.ts` | Sí | ✅ 8/8 pasan | 8 | 100% |
| ❌ CRÍTICA | `RhythmicMovementController.ts` | Sí | ❌ 0/6 pasan | 6 | 0% |
| ✅ CUBIERTO | `ShaderIntrospectionService.ts` | Sí | ✅ 5/5 pasan | 5 | 100% |
| 🟡 ALTA | `ApplicationCompositionRoot.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `AudioService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `BrowserEventsService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `BrowserWebSocketFactory.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `CompositionRoot.provider.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `ConfigurationService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `CoordinateSystemService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `ErrorReportingService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `FrontendRenderingService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `GameInputControllerService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `GameStateStore.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `GameplayMechanicsService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `HttpService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `Logger.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `NotificationService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `PostProcessingService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `StateStreamingService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `SubtitleService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `TimerService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `ViewLogicService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `WebAudioAPIService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `WebSocketService.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `hooks.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `inversify.config.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `inversify.container.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `inversify.types.ts` | No | ❌ Faltante | 0 | 0% |
| 🟡 ALTA | `ShaderLoaderService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `StateStreamingService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `SubtitleService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `TimerService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `ViewLogicService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `WebAudioAPIService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `WebSocketService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `hooks.ts` | No | ❌ Faltante |
| 🟡 ALTA | `inversify.config.ts` | No | ❌ Faltante |
| 🟡 ALTA | `inversify.container.ts` | No | ❌ Faltante |
| 🟡 ALTA | `inversify.types.ts` | No | ❌ Faltante |


### SERVICIOS SIN COBERTURA (DEUDA CRÍTICA)

Los siguientes 24 servicios requieren creación inmediata de tests:

1. **ApplicationCompositionRoot.ts** - Test file: `__tests__/ApplicationCompositionRoot.test.ts`
2. **AudioService.ts** - Test file: `__tests__/AudioService.test.ts`
3. **BrowserEventsService.ts** - Test file: `__tests__/BrowserEventsService.test.ts`
4. **BrowserWebSocketFactory.ts** - Test file: `__tests__/BrowserWebSocketFactory.test.ts`
5. **CompositionRoot.provider.ts** - Test file: `__tests__/CompositionRoot.provider.test.ts`
6. **ConfigurationService.ts** - Test file: `__tests__/ConfigurationService.test.ts`
7. **CoordinateSystemService.ts** - Test file: `__tests__/CoordinateSystemService.test.ts`
8. **ErrorReportingService.ts** - Test file: `__tests__/ErrorReportingService.test.ts`
9. **FrontendRenderingService.ts** - Test file: `__tests__/FrontendRenderingService.test.ts`
10. **GameInputControllerService.ts** - Test file: `__tests__/GameInputControllerService.test.ts`
11. **GameStateStore.ts** - Test file: `__tests__/GameStateStore.test.ts`
12. **GameplayMechanicsService.ts** - Test file: `__tests__/GameplayMechanicsService.test.ts`
13. **hooks.ts** - Test file: `__tests__/hooks.test.ts`
14. **HttpService.ts** - Test file: `__tests__/HttpService.test.ts`
15. **inversify.config.ts** - Test file: `__tests__/inversify.config.test.ts`
16. **inversify.container.ts** - Test file: `__tests__/inversify.container.test.ts`
17. **inversify.types.ts** - Test file: `__tests__/inversify.types.test.ts`
18. **Logger.ts** - Test file: `__tests__/Logger.test.ts`
19. **NotificationService.ts** - Test file: `__tests__/NotificationService.test.ts`
20. **PostProcessingService.ts** - Test file: `__tests__/PostProcessingService.test.ts`
21. **ShaderLoaderService.ts** - Test file: `__tests__/ShaderLoaderService.test.ts`
22. **StateStreamingService.ts** - Test file: `__tests__/StateStreamingService.test.ts`
23. **SubtitleService.ts** - Test file: `__tests__/SubtitleService.test.ts`
24. **TimerService.ts** - Test file: `__tests__/TimerService.test.ts`
25. **ViewLogicService.ts** - Test file: `__tests__/ViewLogicService.test.ts`
26. **WebAudioAPIService.ts** - Test file: `__tests__/WebAudioAPIService.test.ts`
27. **WebSocketService.ts** - Test file: `__tests__/WebSocketService.test.ts`


### RECOMENDACIONES DE PRIORIZACIÓN

1. **CRÍTICA (Inmediato):** QualiaStateCalculatorService, GameControllerService, BackendSyncService
   - Estos servicios son el núcleo de la lógica de negocio y estado del juego
   
2. **ALTA (Esta Semana):** EventBus, ApplicationInitializerService
   - Infraestructura crítica que afecta a todos los demás servicios
   
3. **MEDIA (Próximas 2 Semanas):** Servicios de UI y presentación
   - ViewLogicService, NotificationService, etc.
   
4. **BAJA (Backlog):** Servicios utilitarios y helpers
   - ColorService, CoordinateSystemService, etc.

### PRÓXIMOS PASOS

#### **INMEDIATO: REPARACIÓN DE TESTS FALLANDO**

1. **BackendSyncService.ts** - Resolver problemas de decoradores en tests
   - Investigar por qué `@logMethod()` y otros decoradores fallan en entorno de test
   - Posible solución: Mockear decoradores o usar configuración alternativa

2. **RhythmicMovementController.ts** - Resolver conflictos de binding IoC
   - Revisar configuración de InversifyJS para bindings ambiguos
   - Verificar dependencias circulares o bindings duplicados

3. **GameStateStoreService.ts** - Implementar métodos faltantes
   - Agregar métodos `start()` y `stop()` requeridos por tests
   - Verificar contratos de interfaz

4. **EventBus.ts** - Arreglar test fallando
   - Identificar causa específica del test que falla
   - Verificar manejo de tipos de eventos

#### **MEDIANO PLAZO: EXPANSIÓN DE COBERTURA**

5. Usar `createTestContainer()` de `test-container-factory.ts` para todos los nuevos tests
6. Seguir el patrón High-Fidelity Mocking (QUALIA.CODE Section 10.3.1)
7. Cada test debe verificar:
   - Inyección correcta de dependencias
   - Métodos públicos retornan valores esperados
   - Efectos secundarios (llamadas a dependencias) ocurren correctamente
   - Manejo de errores en casos edge

#### **VALIDACIÓN CONTINUA**

8. Ejecutar `./scripts/lint-architecture.sh` después de cada cambio
9. Actualizar este documento después de arreglar cada servicio crítico
10. Mantener tasa de fallos por debajo del 5%
