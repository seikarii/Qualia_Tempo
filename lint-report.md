🏗️  QUALIA.CODE Architectural Enforcement
=========================================
📋 Phase 1: Frontend ESLint Rules
   Running ESLint with QUALIA.CODE rules...

> qualia-tempo-frontend@1.0.0 lint
> eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0

=============

WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescr
ipt-estree.                                                                                                               
You may find that it works just fine, or you may not.

SUPPORTED TYPESCRIPT VERSIONS: >=4.3.5 <5.4.0

YOUR TYPESCRIPT VERSION: 5.9.2

Please only submit bug reports when using the officially supported version.

=============

/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/components/game/QualiaTempoGame.tsx
  12:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/components/game/QualiaTempoHUD.tsx
  7:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/index.tsx
  12:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
  13:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
  14:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
  19:1  error  QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)  @qualia-tempo/qualia-code/no-direct-service-import-in-components
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/AudioService.ts
  87:3  error  Simple synchronous getters should NOT use @catchError() - it adds unnecessary performance overhead. (Section 8.1)  @qualia-tempo/qualia-code/enforce-method-decorators
  87:3  error  Consider removing @catchError from simple getter for better performance on hot paths
        @qualia-tempo/qualia-code/enforce-method-decorators
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/BackendSyncService.ts
   70:46  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  275:3   error    Simple synchronous getters should NOT use @catchError() - it adds unnecessary performance overhead. (Section 8.1)           @qualia-tempo/qualia-code/enforce-method-decorators
  275:3   error    Consider removing @catchError from simple getter for better performance on hot paths
                     @qualia-tempo/qualia-code/enforce-method-decorators
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/ConfigurationService.ts
  701:24  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/DebugService.ts
  145:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  169:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  195:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  466:65  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  621:56  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  650:42  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  650:42  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  656:8   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  656:8   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  691:62  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  699:62  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  755:21  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  831:11  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  852:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  876:31  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/ErrorReportingService.ts
  112:33   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  225:7    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  244:24   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  252:11   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  258:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  272:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  276:25   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  398:7    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  430:7    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  474:66   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  499:22   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  508:7    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  526:113  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  532:57   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  559:11   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  582:7    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  606:45   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  606:45   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  612:47   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  650:57   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  677:11   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  688:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  727:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  757:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  787:68   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  819:9    error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  846:41   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  847:73   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  858:24   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/GameStateStoreService.ts
   51:47  error  'eventBus' is defined but never used. Allowed unused args must match /^_/u
      no-unused-vars
   52:45  error  'logger' is defined but never used. Allowed unused args must match /^_/u
      no-unused-vars
   53:49  error  'setStore' is defined but never used. Allowed unused args must match /^_/u
      no-unused-vars
   55:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
   71:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  109:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  156:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  256:7   error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
  270:22  error  Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService  @qualia-tempo/qualia-code/no-hardcoded-config
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/Logger.ts
   97:9  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
  100:9  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
  103:9  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
  106:9  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
  124:7  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
  140:7  error  QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)  @qualia-tempo/qualia-code/no-console-in-services
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/NotificationService.ts
   156:23  error    'config' is defined but never used. Allowed unused args must match /^_/u
                      no-unused-vars
  187:61  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  196:57  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  196:57  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  214:66  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  214:66  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  319:24  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  320:20  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  320:20  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  321:25  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  321:25  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  325:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  342:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  349:25  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  351:24  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  357:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  457:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  511:25  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  696:11  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  706:11  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  815:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  825:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  927:64  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
 1170:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
 1204:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/QualiaStateCalculatorService.ts
   77:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
   93:11  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
   97:11  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  130:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  213:22  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  284:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  303:22  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  317:22  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  332:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  373:53  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  419:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  480:22  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  491:53  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/RhythmicMovementController.ts
  103:43  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  385:43  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  586:38  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/StreamingVideoService.ts
   41:37  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
   97:61  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
   98:57  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
   98:57  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
   99:55  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
   99:55  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  102:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  124:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  138:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  161:13  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  161:13  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  165:45  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  172:12  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  182:13  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  197:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  234:28  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  328:3   error    Public async methods that aren't simple getters must use @catchError() decorator for proper error boundaries                @qualia-tempo/qualia-code/enforce-method-decorators
  351:26  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  362:10  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  450:22  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  451:22  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  460:9   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  533:36  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  561:7   error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
  561:7   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/TimerService.ts
   20:23  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
   38:25  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  159:22  error    Hardcoded configuration value detected. Externalize to a YAML config file and access via ConfigurationService               @qualia-tempo/qualia-code/no-hardcoded-config
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/inversify.config.ts
  77:3   warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
  77:11  warning  QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)  @qualia-tempo/qualia-code/enforce-config-driven-values
/media/seikarii/Nvme/QualiaTempo/qualia-tempo-prototype/frontend/src/services/inversify.container.ts
  1:1  error  CRISALIDA.CODE: El fichero index.tsx debe importar 'reflect-metadata' en la primera línea  @qualia-tempo/qualia-code/enforce-inversify-conventions

✖ 143 problems (105 errors, 38 warnings)

   ❌ Frontend architectural violations detected
📋 Phase 2: Backend Python Rules
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
- **Direct service imports**: Ejemplos como `QualiaTempoGame.tsx`, `QualiaTempoHUD.tsx`, `index.tsx` - violan Sección 2.2.
- **Hardcoded values**: Más de 100 errores de valores hardcoded que deben externalizarse según Sección 1.
- **@catchError overuse**: En `AudioService`, `BackendSyncService` - getters simples no deben usar este decorador.
- **Console usage**: En `Logger.ts` - violan Sección 5.3.
- **Unused vars**: En `GameStateStoreService`, `NotificationService` - parámetros no usados.
- **Backend @log_execution**: Más de 230 métodos faltantes del decorador.

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
   - Identificar todos los valores hardcoded (105+ errores).
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
