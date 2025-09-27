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
  141:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  165:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  191:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  462:65  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  617:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  652:8   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  695:62  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  705:16  error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead          @qualia-tempo/qualia-code/no-global-api-calls
  750:21  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  811:6   error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead          @qualia-tempo/qualia-code/no-global-api-calls
  826:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  847:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/ErrorReportingService.ts
  108:46  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  109:58  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  115:64  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  119:17  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  121:16  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  124:18  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  141:68  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  147:66  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  216:18  error  CRISALIDA.CODE: El parámetro 'config' en el constructor de 'ErrorReportingService' debe ser inyectado con @inject(TYPES.Identifier)  @qualia-tempo/qualia-code/enforce-inversify-conventions
  234:21  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  235:27  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  241:30  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  245:19  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  247:18  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  250:20  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  262:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  286:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  292:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  306:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  310:25  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  432:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  464:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  508:66  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  533:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  542:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  566:57  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  576:16  error  Direct access to "navigator" is forbidden in services layer. Use appropriate abstraction service instead                             @qualia-tempo/qualia-code/no-global-api-calls
  576:44  error  Direct access to "navigator" is forbidden in services layer. Use appropriate abstraction service instead                             @qualia-tempo/qualia-code/no-global-api-calls
  577:19  error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead                                @qualia-tempo/qualia-code/no-global-api-calls
  577:44  error  Direct access to "window" is forbidden in services layer. Use appropriate abstraction service instead                                @qualia-tempo/qualia-code/no-global-api-calls
  594:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  617:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  641:8   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  685:57  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  712:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  723:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  762:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  792:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  854:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config
  893:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                        @qualia-tempo/qualia-code/no-hardcoded-config

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
    99:15  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   109:13  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   114:32  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   119:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   178:23  error  'config' is defined but never used. Allowed unused args must match /^_/u                                                           no-unused-vars
   218:29  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   236:33  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   310:18  error  CRISALIDA.CODE: El parámetro 'config' en el constructor de 'NotificationService' debe ser inyectado con @inject(TYPES.Identifier)  @qualia-tempo/qualia-code/enforce-inversify-conventions
   336:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   354:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   361:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   461:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   515:25  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   700:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   710:11  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   819:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   829:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
   931:64  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
  1174:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config
  1208:9   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService                      @qualia-tempo/qualia-code/no-hardcoded-config

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

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/inversify.container.ts
  1:1  error  CRISALIDA.CODE: El fichero index.tsx debe importar 'reflect-metadata' en la primera línea  @qualia-tempo/qualia-code/enforce-inversify-conventions

✖ 108 problems (108 errors, 0 warnings)

   [0;31m❌ Frontend architectural violations detected[0m
[0;34m📋 Phase 2: Backend Python Rules[0m
   Running QUALIA.CODE Python linter...
   ❌ Backend architectural violations detected
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/main.py:23: Method load_server_config missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:323: Method get_composition_root missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:331: Method reset_composition_root missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:224: Method get_service missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:250: Method get_event_bus missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:254: Method get_particle_system missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:258: Method get_qualia_processor missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:262: Method get_rendering_service missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/CompositionRoot.py:266: Method get_streaming_web_service missing @log_execution decorator
   /media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/backend/services/EventBus.py:199: Method get_event_bus missing @log_execution decorator
   ... and 262 more violations

[0;34m📋 Phase 3: Summary[0m
   Frontend Compliance: [0;31mFAILED[0m
   Backend Compliance:  [0;32mPASSED[0m

[0;31m🚫 ARCHITECTURAL ENFORCEMENT: VIOLATIONS DETECTED[0m
[0;31m   1 system(s) have architectural violations[0m

[1;33m💡 Quick Fixes:[0m
   • Frontend: Use useService() hooks instead of direct imports
   • Backend: Add @log_execution decorators to service methods
   • Backend: Inject services via CompositionRoot, never 'new Service()'

## Análisis Preliminar

### ¿Detectó el linter el uso de APIs globales (window, navigator) en los servicios modificados por el junior (ahora revertidos)?

Sí, el linter detectó múltiples violaciones relacionadas con el acceso directo a APIs globales en la capa de servicios:

- En `DebugService.ts`: Líneas 705 y 811 - Acceso directo a `window`
- En `ErrorReportingService.ts`: Líneas 576 (navigator), 577 (window) - Acceso directo a `navigator` y `window`
- En `QualiaStateCalculatorService.ts`: Líneas 352 y 359 - Acceso directo a `window`

Estas violaciones corresponden exactamente a la regla `@qualia-tempo/qualia-code/no-global-api-calls`, que prohíbe el uso directo de APIs globales como `window`, `navigator`, etc. en la capa de servicios. El linter identificó correctamente estos patrones como violaciones arquitectónicas críticas.

### ¿Hay alguna regla en QUALIA.CODE que no tenga una correspondiente regla de ESLint activa?

Basándome en la documentación QUALIA.CODE.md y la salida del linter, todas las reglas principales parecen tener implementación activa:

- ✅ `no-hardcoded-config`: Activa y detectando múltiples violaciones
- ✅ `no-global-api-calls`: Activa y detectando violaciones de `window`/`navigator`
- ✅ `enforce-inversify-conventions`: Activa y detectando problemas de inyección de dependencias
- ✅ `enforce-method-decorators`: No visible en esta ejecución, pero configurada
- ✅ `no-direct-service-instantiation`: No visible, pero configurada
- ✅ `enforce-use-services-hook`: No visible, pero configurada

Sin embargo, hay una discrepancia en el reporte final: indica "Backend Compliance: PASSED" pero luego lista "❌ Backend architectural violations detected" con 262+ violaciones. Esto sugiere un posible bug en el script de reporte o en la lógica de conteo de violaciones.

### ¿Consideras que las reglas actuales son lo suficientemente estrictas? ¿Propones alguna mejora o nueva regla para evitar incidentes similares?

Las reglas actuales son insuficientemente estrictas para prevenir incidentes similares. El sistema permitió que se introdujeran múltiples violaciones críticas sin activar alarmas efectivas durante el desarrollo. Propongo las siguientes mejoras:

#### 1. **Nueva Regla: `no-console-log-in-services`**
   - **Rationale**: El uso de `console.log` en servicios viola el principio de logging centralizado. Debe requerir el uso exclusivo del `QualiaLogger` inyectado.
   - **Implementación**: Detectar cualquier uso de `console.*` métodos en archivos de servicios.

#### 2. **Mejora: `enforce-method-decorators` con mayor granularidad**
   - **Problema actual**: La regla permite `@catchError` solo en "métodos de sistema", pero no es lo suficientemente específica.
   - **Propuesta**: Implementar análisis semántico para distinguir:
     - Métodos síncronos simples (getters) → Sin `@catchError`
     - Métodos con I/O (async, fetch, etc.) → Requieren `@catchError`
     - Métodos de cálculo complejo → Requieren `@catchError`

#### 3. **Nueva Regla: `no-async-without-catch-error`**
   - **Rationale**: Cualquier método `async` que no sea un getter simple debe tener `@catchError` para prevenir excepciones no manejadas.
   - **Implementación**: AST analysis para detectar métodos async sin el decorador apropiado.

#### 4. **Mejora del sistema de reporte**
   - **Problema**: El reporte indica "PASSED" para backend cuando hay 262 violaciones.
   - **Propuesta**: Implementar verificación de integridad en el script de linting para asegurar que el conteo de violaciones sea preciso.

#### 5. **Nueva Regla: `enforce-dependency-injection-only`**
   - **Rationale**: Prevenir cualquier importación directa de servicios en componentes, forzando el uso exclusivo de `useService()` hooks.
   - **Implementación**: Detectar imports de servicios en archivos `.tsx` que no sean a través de hooks.


Estas mejoras convertirían el sistema de linting de un "detector de problemas" a un "preventor de incidentes", activando alarmas mucho antes de que las violaciones se conviertan en bugs en producción.
