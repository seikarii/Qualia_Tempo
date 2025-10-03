# INFORME DE DEUDA DE COBERTURA DE SERVICIOS CRÍTICOS
## Fecha de Análisis: 2025-10-03 11:33:34
## Arquitecto: Sistema de Análisis Automatizado QUALIA.CODE

### RESUMEN EJECUTIVO
- **Total de Servicios:** 41
- **Servicios con Tests:** 9 (22.0%)
- **Servicios sin Tests:** 32 (78.0%)

### METODOLOGÍA
Este análisis compara la existencia de archivos de servicio (*.ts) en `/src/services/` 
con sus correspondientes archivos de prueba en `/src/services/__tests__/`.

Un servicio se considera "sin cobertura" si no existe un archivo `[ServiceName].test.ts` 
correspondiente, independientemente de si hay pruebas indirectas en otros archivos.

### TABLA DE DEUDA DE COBERTURA

| Prioridad | Archivo de Servicio | Tiene Tests | Estado |
|-----------|-------------------|-------------|---------|
| 🔴 CRÍTICA | `QualiaStateCalculatorService.ts` | No | ❌ Faltante |
| 🔴 CRÍTICA | `GameControllerService.ts` | No | ❌ Faltante |
| 🔴 CRÍTICA | `BackendSyncService.ts` | No | ❌ Faltante |
| 🔴 CRÍTICA | `EventBus.ts` | No | ❌ Faltante |
| 🔴 CRÍTICA | `ApplicationInitializerService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `ApplicationCompositionRoot.ts` | No | ❌ Faltante |
| 🟡 ALTA | `AudioService.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `BrowserAudioContextFactory.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `BrowserEventsService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `BrowserWebSocketFactory.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `ColorService.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `CompositionRoot.provider.ts` | No | ❌ Faltante |
| 🟡 ALTA | `ConfigurationService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `CoordinateSystemService.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `DebugOrchestratorService.ts` | Sí | ✅ Existe |
| ✅ CUBIERTO | `DebugService.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `ErrorReportingService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `FrontendRenderingService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `GameInputControllerService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `GameStateStore.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `GameStateStoreService.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `GameplayMechanicsService.ts` | No | ❌ Faltante |
| 🟡 ALTA | `HttpService.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `InputStateService.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `Logger.ts` | No | ❌ Faltante |
| 🟡 ALTA | `NotificationService.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `PerformanceService.ts` | Sí | ✅ Existe |
| 🟡 ALTA | `PostProcessingService.ts` | No | ❌ Faltante |
| ✅ CUBIERTO | `RhythmicMovementController.ts` | Sí | ✅ Existe |
| ✅ CUBIERTO | `ShaderIntrospectionService.ts` | Sí | ✅ Existe |
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

Los siguientes 32 servicios requieren creación inmediata de tests:

1. **ApplicationCompositionRoot.ts** - Test file: `__tests__/ApplicationCompositionRoot.test.ts`
2. **ApplicationInitializerService.ts** - Test file: `__tests__/ApplicationInitializerService.test.ts`
3. **Logger.ts** - Test file: `__tests__/Logger.test.ts`
4. **PostProcessingService.ts** - Test file: `__tests__/PostProcessingService.test.ts`
5. **inversify.types.ts** - Test file: `__tests__/inversify.types.test.ts`
6. **CompositionRoot.provider.ts** - Test file: `__tests__/CompositionRoot.provider.test.ts`
7. **StateStreamingService.ts** - Test file: `__tests__/StateStreamingService.test.ts`
8. **WebAudioAPIService.ts** - Test file: `__tests__/WebAudioAPIService.test.ts`
9. **WebSocketService.ts** - Test file: `__tests__/WebSocketService.test.ts`
10. **inversify.config.ts** - Test file: `__tests__/inversify.config.test.ts`
11. **AudioService.ts** - Test file: `__tests__/AudioService.test.ts`
12. **QualiaStateCalculatorService.ts** - Test file: `__tests__/QualiaStateCalculatorService.test.ts`
13. **GameControllerService.ts** - Test file: `__tests__/GameControllerService.test.ts`
14. **ConfigurationService.ts** - Test file: `__tests__/ConfigurationService.test.ts`
15. **BrowserWebSocketFactory.ts** - Test file: `__tests__/BrowserWebSocketFactory.test.ts`
16. **TimerService.ts** - Test file: `__tests__/TimerService.test.ts`
17. **CoordinateSystemService.ts** - Test file: `__tests__/CoordinateSystemService.test.ts`
18. **FrontendRenderingService.ts** - Test file: `__tests__/FrontendRenderingService.test.ts`
19. **GameplayMechanicsService.ts** - Test file: `__tests__/GameplayMechanicsService.test.ts`
20. **BrowserEventsService.ts** - Test file: `__tests__/BrowserEventsService.test.ts`
21. **HttpService.ts** - Test file: `__tests__/HttpService.test.ts`
22. **GameStateStore.ts** - Test file: `__tests__/GameStateStore.test.ts`
23. **inversify.container.ts** - Test file: `__tests__/inversify.container.test.ts`
24. **NotificationService.ts** - Test file: `__tests__/NotificationService.test.ts`
25. **GameInputControllerService.ts** - Test file: `__tests__/GameInputControllerService.test.ts`
26. **BackendSyncService.ts** - Test file: `__tests__/BackendSyncService.test.ts`
27. **ViewLogicService.ts** - Test file: `__tests__/ViewLogicService.test.ts`
28. **EventBus.ts** - Test file: `__tests__/EventBus.test.ts`
29. **hooks.ts** - Test file: `__tests__/hooks.test.ts`
30. **ShaderLoaderService.ts** - Test file: `__tests__/ShaderLoaderService.test.ts`
31. **ErrorReportingService.ts** - Test file: `__tests__/ErrorReportingService.test.ts`
32. **SubtitleService.ts** - Test file: `__tests__/SubtitleService.test.ts`


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

1. Usar `createTestContainer()` de `test-container-factory.ts` para todos los nuevos tests
2. Seguir el patrón High-Fidelity Mocking (QUALIA.CODE Section 10.3.1)
3. Cada test debe verificar:
   - Inyección correcta de dependencias
   - Métodos públicos retornan valores esperados
   - Efectos secundarios (llamadas a dependencias) ocurren correctamente
   - Manejo de errores en casos edge

---
*Generado automáticamente por ARCHITECTURAL DIRECTIVE 002*
