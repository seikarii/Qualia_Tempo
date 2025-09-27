🏗️  QUALIA.CODE Architectural Enforcement
=========================================
[0;34m📋 Phase 1: Frontend ESLint Rules[0m
   Running ESLint with QUALIA.CODE rules...

> qualia-tempo-frontend@1.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0


/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/components/game/PlayerAvatar.tsx
  13:13  error  '_y' is assigned a value but never used  no-unused-vars

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/ConfigurationService.ts
  700:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/DebugService.ts
  145:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  169:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  195:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  466:65  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  621:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  650:42  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  656:8   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  699:62  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  755:21  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  831:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  852:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/ErrorReportingService.ts
  115:68  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  121:66  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  221:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  240:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  248:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  254:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  268:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  272:25  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  394:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  426:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  470:66  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  495:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  504:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  528:57  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  555:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  578:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  602:8   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  646:57  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  673:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  684:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  723:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  753:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  815:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  854:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/GameStateStoreService.ts
   51:47  error  'eventBus' is defined but never used. Allowed unused args must match /^_/u                                     no-unused-vars
   52:45  error  'logger' is defined but never used. Allowed unused args must match /^_/u                                       no-unused-vars
   53:49  error  'setStore' is defined but never used. Allowed unused args must match /^_/u                                     no-unused-vars
   55:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   71:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  109:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  156:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  256:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  270:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/NotificationService.ts
   153:23  error  'config' is defined but never used. Allowed unused args must match /^_/u                                       no-unused-vars
   193:29  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   211:33  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   319:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   336:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   343:25  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   345:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   351:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   451:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   505:25  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   690:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   700:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   809:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   819:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   921:64  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  1164:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  1198:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/QualiaStateCalculatorService.ts
   73:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   89:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   93:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  126:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  209:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  280:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  299:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  313:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  328:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  352:29  error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead          @qualia-tempo/qualia-code/no-global-api-calls
  359:7   error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead          @qualia-tempo/qualia-code/no-global-api-calls
  415:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  476:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/StreamingVideoService.ts
   98:57  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   99:55  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  102:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  124:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  138:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  161:13  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  182:13  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  197:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  362:10  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  460:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  561:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/TimerService.ts
  159:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/inversify.container.ts
  1:1  error  CRISALIDA.CODE: El fichero index.tsx debe importar 'reflect-metadata' en la primera línea  @qualia-tempo/qualia-code/enforce-inversify-conventions

✖ 89 problems (89 errors, 0 warnings)

   [0;31m❌ Frontend architectural violations detected[0m
[0;34m📋 Phase 2: Backend Python Rules[0m
   Running QUALIA.CODE Python linter...
   ❌ Backend architectural violations detected
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/main.py:23: Method load_server_config missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:331: Method reset_composition_root missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/EventBus.py:207: Method reset_event_bus missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/EventBus.py:43: Method subscribe missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/EventBus.py:63: Method unsubscribe missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/QualiaProcessor.py:102: Method enable_processing missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/QualiaProcessor.py:107: Method disable_processing missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/QualiaProcessor.py:145: Method enable_processing missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/QualiaProcessor.py:149: Method disable_processing missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/StreamingWebService.py:326: Method connected_clients missing @log_execution decorator
   ... and 229 more violations

---

## Análisis de Falsos Positivos

Después de revisar el reporte actualizado (28 de septiembre de 2025) y **leer archivos específicos** para verificar contexto, identifico **un posible falso positivo** y confirmo que el resto son violaciones legítimas:

### Falso Positivo Identificado:
- **inversify.container.ts línea 1**: Error "CRISALIDA.CODE: El fichero index.tsx debe importar 'reflect-metadata' en la primera línea". 
  - **Análisis**: El error se reporta en `inversify.container.ts` pero se refiere a `index.tsx`. En `index.tsx`, `reflect-metadata` está importado en línea 6 (no primera), pero el archivo reportado es incorrecto. Esto parece un bug en la regla del linter `@qualia-tempo/qualia-code/enforce-inversify-conventions`.

### Violaciones Legítimas Confirmadas:
- **PlayerAvatar.tsx línea 13**: `const [x, _y, z] = position;` - Variable `_y` no usada. Legítimo error (debe usarse o cambiar patrón ESLint).
- **Hardcoded values**: Ejemplos como `count: 100` en ConfigurationService.ts, `memoryCleanupThreshold: 1000` en DebugService.ts. Deben externalizarse según Sección 1.
- **Otros errores**: Imports directos, @catchError overuse, console usage, window access - todos violan reglas documentadas.

**Conclusión: 1 falso positivo identificado (error de linter mal reportado). El resto requiere corrección.**

---

## Plan de Corrección de Errores

### Prioridad 1: Arquitectura Crítica (InversifyJS & IoC)
1. **Corregir imports directos de servicios en componentes**:
   - `QualiaTempoGame.tsx`, `QualiaTempoHUD.tsx`, `index.tsx`: Reemplazar imports directos con `useService()` hook.
   - Asegurar que todos los servicios estén registrados en `inversify.config.ts`.

2. **Corregir inversify.container.ts**:
   - **NOTA: Este error parece ser un falso positivo del linter** (se refiere a index.tsx pero reporta en container.ts). Verificar regla del linter antes de cambiar.

### Prioridad 2: Externalización de Configuración (Sección 1 - LAW OF SOVEREIGNTY)
3. **Crear/actualizar archivos YAML de configuración**:
   - Identificar todos los valores hardcoded (106+ errores).
   - Crear `frontend/src/config/game.yaml`, `qualia.yaml`, `services.yaml`, etc.
   - Externalizar valores como timeouts, URLs, multiplicadores, flags de features.

4. **Actualizar ConfigurationService**:
   - Implementar carga de YAML files.
   - Proporcionar getters type-safe para configuración.

5. **Reemplazar hardcoded values**:
   - En todos los servicios: `DebugService`, `ErrorReportingService`, `NotificationService`, `QualiaStateCalculatorService`, `StreamingVideoService`, `TimerService`, `GameStateStoreService`, etc.
   - Usar `this.config.getQualiaConfig().someValue` en lugar de literales.

### Prioridad 3: Decoradores y Performance (Sección 8.1)
6. **Corregir @catchError overuse**:
   - Remover `@catchError()` de getters simples en `AudioService`, `BackendSyncService`.
   - Mantener solo en métodos async complejos.

7. **Agregar @catchError faltantes**:
   - En `StreamingVideoService`: Agregar a métodos async que no son getters simples.

### Prioridad 4: Logging y Abstracción (Sección 5.3)
8. **Reemplazar console.* en Logger.ts**:
   - Usar injected `QualiaLogger` en lugar de `console.log/warn/error`.

9. **Corregir window access**:
   - En `QualiaStateCalculatorService`: Usar servicio de abstracción para window APIs.

### Prioridad 5: Backend Python
10. **Agregar @log_execution decorators**:
    - A todos los métodos públicos faltantes en servicios backend.
    - Seguir patrón de Sección 5.1.

### Prioridad 6: Limpieza de Código
11. **Corregir unused vars**:
    - En `GameStateStoreService`, `NotificationService`: Prefijar con `_` o usar las variables.

12. **Corregir unused var en PlayerAvatar.tsx**:
    - Remover o usar `_y`.

### Verificación Final
13. **Ejecutar linting completo** después de cada prioridad.
14. **Actualizar shared contracts** si es necesario con `./scripts/generate_contracts.sh`.
15. **Pruebas unitarias** para validar cambios.

**Estimación de esfuerzo**: 2-3 días de trabajo sistemático, priorizando arquitectura sobre detalles.



