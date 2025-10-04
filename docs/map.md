```
QualiaTempo/
├── .git/                          # Repositorio Git
├── .github/                       # Configuraciones de GitHub (workflows, issues, etc.)
├── .gitignore                     # Archivo de ignorados de Git
├── .kilocodemodes                 # Configuraciones de Kilocode
├── .mypy_cache/                   # Cache de MyPy
├── .ruff_cache/                   # Cache de Ruff
├── .vscode/                       # Configuraciones de VS Code
├── =2.8.0                         # Archivo de versión
├── CHANGELOG.md                   # Registro de cambios
├── ERROR_LOG.md                   # Log de errores
├── README.md                      # Documentación principal del proyecto
├── TODO.md                        # Lista de tareas pendientes

├── docs/                          # Documentación general del proyecto
│   ├── GDD.md                     # Game Design Document
│   ├── Performance.txt            # Notas de rendimiento
│   ├── QUALIA.CODE.md             # Especificaciones de arquitectura
│   ├── QUALIA.MANUAL.md           # Manual de implementación
│   ├── architecture_v2.md         # Arquitectura versión 2
│   ├── arquitectura/              # Documentación de arquitectura
│   ├── crisalida/                 # Documentación de Crisalida
│   ├── data_structures_v2.md      # Estructuras de datos versión 2
│   ├── directiva.txt              # Directiva del proyecto
│   ├── exploracion/               # Documentación de exploración
│   ├── map.md                     # Este archivo (mapa del proyecto)
│   ├── music/                     # Documentación de música
│   ├── music.txt                  # Notas de música
│   ├── qualiaupgrade.txt          # Notas de actualización qualia
│   └── rendering/                 # Documentación de rendering
├── drop/                          # Directorio temporal
├── eslint-plugin-qualia-code/     # Plugin ESLint personalizado
├── htmlcov_backend/               # Reportes de cobertura HTML para backend
├── mypy-qualia-code/              # Configuraciones MyPy personalizadas
├── node_modules/                  # Dependencias de Node.js
├── package-lock.json              # Lockfile de npm
├── package.json                   # Configuración de proyecto Node.js
├── pnpm-lock.yaml                 # Lockfile de pnpm
├── pyproject.toml                 # Configuración de proyecto Python
├── qualia-tempo-prototype/        # Directorio raíz del código de la aplicación prototipo
│   ├── .coverage                  # Archivo de cobertura de pruebas
│   ├── .gitignore                 # Ignorados específicos del prototipo
│   ├── .mypy_cache/               # Cache de MyPy
│   ├── .pytest_cache/             # Cache de pytest
│   ├── README.md                  # README del prototipo
│   ├── backend/                   # Código del servidor (Python/FastAPI)
│   │   ├── .coverage              # Cobertura específica del backend
│   │   ├── .mypy_cache/           # Cache de MyPy
│   │   ├── .pytest_cache/         # Cache de pytest del backend
│   │   ├── .ruff_cache/           # Cache de Ruff
│   │   ├── CompositionRoot.py     # Raíz de composición para IoC
│   │   ├── README.md              # README del backend
│   │   ├── __init__.py
│   │   ├── __pycache__/           # Bytecode Python
│   │   ├── api/                   # Endpoints de la API, modelos de datos y rutas
│   │   │   ├── README.md
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__/
│   │   │   ├── models.py
│   │   │   └── routes.py
│   │   ├── backend.log            # Logs del backend
│   │   ├── config/                # Configuraciones del backend
│   │   ├── engine/                # Motor principal del backend (lógica de partículas, etc.)
│   │   ├── handlers/              # Manejadores del backend
│   │   │   ├── __init__.py
│   │   │   ├── __pycache__/
│   │   │   └── engine_handlers.py
│   │   ├── htmlcov/               # Cobertura HTML del backend
│   │   ├── main.py                # Punto de entrada del backend
│   │   ├── pytest.ini             # Configuración de pytest
│   │   ├── requirements.txt       # Dependencias Python del backend
│   │   ├── services/              # Servicios del backend (ParticleEngine, etc.)
│   │   ├── tests/                 # Pruebas del backend
│   │   ├── utils/                 # Utilidades del backend (decoradores, etc.)
│   │   └── venv/                  # Otro entorno virtual
│   ├── combat_data/               # Archivos de datos para escenarios de combate (JSONs)
│   ├── frontend/                  # Código de la aplicación cliente (TypeScript/React)
│   │   ├── .eslintrc.cjs           # Configuración ESLint CJS
│   │   ├── README.md              # README del frontend
│   │   ├── coverage/              # Reportes de cobertura
│   │   ├── debug-console.js       # Script de depuración de consola
│   │   ├── dist/                  # Archivos compilados/distribuidos
│   │   ├── e2e-test.js            # Pruebas end-to-end
│   │   ├── fix-centering-test.js  # Script de prueba de centrado
│   │   ├── index.html             # HTML principal
│   │   ├── jest.config.js         # Configuración de Jest
│   │   ├── main.js                # Punto de entrada JavaScript
│   │   ├── node_modules/          # Dependencias Node.js del frontend
│   │   ├── package-lock.json      # Lockfile npm del frontend
│   │   ├── package.json           # Configuración proyecto frontend
│   │   ├── playwright-report/     # Reportes de Playwright
│   │   ├── playwright.config.ts   # Configuración de Playwright
│   │   ├── pnpm-lock.yaml         # Lockfile pnpm del frontend
│   │   ├── pnpm-workspace.yaml    # Configuración workspace pnpm
│   │   ├── postcss.config.js      # Configuración PostCSS
│   │   ├── public/                # Archivos estáticos
│   │   │   ├── config/            # Archivos de configuración del juego para el frontend
│   │   │   ├── fonts/             # Fuentes
│   │   │   └── shaders/           # Shaders
│   │   ├── race-condition-test.js # Script de prueba de condición de carrera
│   │   ├── src/                   # Código fuente del frontend
│   │   │   ├── App.tsx            # Componente principal de la aplicación
│   │   │   ├── assets/            # Assets
│   │   │   ├── audio/             # Audio
│   │   │   ├── components/        # Componentes reutilizables de la interfaz de usuario
│   │   │   │   ├── Atmosphere.tsx
│   │   │   │   ├── FrontendRenderer.tsx
│   │   │   │   ├── QualiaMainMenu.tsx
│   │   │   │   ├── Subtitles.tsx
│   │   │   │   ├── debug/
│   │   │   │   ├── game/
│   │   │   │   └── layout/
│   │   │   ├── hooks/             # Hooks de React
│   │   │   │   ├── README.md
│   │   │   │   ├── index.ts
│   │   │   │   └── useServiceHealth.ts
│   │   │   ├── index.css          # Estilos CSS principales
│   │   │   ├── index.tsx          # Punto de entrada React
│   │   │   ├── main.ts            # Punto de entrada TypeScript
│   │   │   ├── providers.ts       # Proveedores de contexto
│   │   │   ├── schemas/           # Esquemas
│   │   │   ├── services/          # Servicios (IoC con InversifyJS)
│   │   │   │   ├── ApplicationCompositionRoot.ts
│   │   │   │   ├── ApplicationInitializerService.ts
│   │   │   │   ├── AudioService.ts
│   │   │   │   ├── BackendSyncService.ts
│   │   │   │   ├── BrowserAudioContextFactory.ts
│   │   │   │   ├── BrowserEventsService.ts
│   │   │   │   ├── BrowserWebSocketFactory.ts
│   │   │   │   ├── ColorService.ts
│   │   │   │   ├── CompositionRoot.provider.ts
│   │   │   │   ├── ConfigurationService.ts
│   │   │   │   ├── CoordinateSystemService.ts
│   │   │   │   ├── DebugOrchestratorService.ts
│   │   │   │   ├── DebugService.ts
│   │   │   │   ├── ErrorReportingService.ts
│   │   │   │   ├── EventBus.ts
│   │   │   │   ├── FrontendRenderingService.ts
│   │   │   │   ├── GameControllerService.ts
│   │   │   │   ├── GameInputControllerService.ts
│   │   │   │   ├── GameStateStore.ts
│   │   │   │   ├── GameStateStoreService.ts
│   │   │   │   ├── GameplayMechanicsService.ts
│   │   │   │   ├── HttpService.ts
│   │   │   │   ├── InputStateService.ts
│   │   │   │   ├── Logger.ts
│   │   │   │   ├── NotificationService.ts
│   │   │   │   ├── PerformanceService.ts
│   │   │   │   ├── PostProcessingService.ts
│   │   │   │   ├── QualiaStateCalculatorService.ts
│   │   │   │   ├── RhythmicMovementController.ts
│   │   │   │   ├── ShaderIntrospectionService.ts
│   │   │   │   ├── ShaderLoaderService.ts
│   │   │   │   ├── StateStreamingService.ts
│   │   │   │   ├── SubtitleService.ts
│   │   │   │   ├── TimerService.ts
│   │   │   │   ├── ToneFactoryService.ts
│   │   │   │   ├── ViewLogicService.ts
│   │   │   │   ├── WebAudioAPIService.ts
│   │   │   │   ├── WebSocketService.ts
│   │   │   │   ├── __tests__/
│   │   │   │   ├── config-validators/
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── validateAudioService.validator.ts
│   │   │   │   │   ├── validateBackendSync.validator.ts
│   │   │   │   │   ├── validateCompositionRoot.validator.ts
│   │   │   │   │   ├── validateDebugService.validator.ts
│   │   │   │   │   ├── validateErrorReporting.validator.ts
│   │   │   │   │   ├── validateEventBus.validator.ts
│   │   │   │   │   ├── validateGameController.validator.ts
│   │   │   │   │   ├── validateNotificationService.validator.ts
│   │   │   │   │   ├── validateQualiaCalculator.validator.ts
│   │   │   │   │   └── validateRhythmicMovement.validator.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── contracts/
│   │   │   │   │   ├── IApplicationCompositionRoot.contracts.ts
│   │   │   │   │   ├── IApplicationInitializerService.contracts.ts
│   │   │   │   │   ├── IAudioService.contracts.ts
│   │   │   │   │   ├── IBackendSyncService.contracts.ts
│   │   │   │   │   ├── ICoordinateSystemService.contracts.ts
│   │   │   │   │   ├── IDebugOrchestratorService.contracts.ts
│   │   │   │   │   ├── IDebugService.contracts.ts
│   │   │   │   │   ├── IErrorReportingService.contracts.ts
│   │   │   │   │   ├── IEventBus.contracts.ts
│   │   │   │   │   ├── IFrontendRenderingService.contracts.ts
│   │   │   │   │   ├── IGBufferPass.contracts.ts
│   │   │   │   │   ├── IGameControllerService.contracts.ts
│   │   │   │   │   ├── IGameInputControllerService.contracts.ts
│   │   │   │   │   ├── IGameStateStoreService.contracts.ts
│   │   │   │   │   ├── IGameplayMechanicsService.contracts.ts
│   │   │   │   │   ├── IHttpService.contracts.ts
│   │   │   │   │   ├── ILogger.contracts.ts
│   │   │   │   │   ├── INotificationService.contracts.ts
│   │   │   │   │   ├── IPostProcessingService.contracts.ts
│   │   │   │   │   ├── IProtocolAdapter.contracts.ts
│   │   │   │   │   ├── IQualiaStateCalculatorService.contracts.ts
│   │   │   │   │   ├── IRhythmicMovementController.contracts.ts
│   │   │   │   │   ├── IStateStreamingService.contracts.ts
│   │   │   │   │   ├── ISubtitleService.contracts.ts
│   │   │   │   │   ├── ITimerService.contracts.ts
│   │   │   │   │   ├── IViewLogicService.contracts.ts
│   │   │   │   │   ├── IWebSocketService.contracts.ts
│   │   │   │   │   ├── constants.ts
│   │   │   │   └── events.contracts.ts
│   │   │   │   ├── hooks.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── IApplicationInitializerService.ts
│   │   │   │   │   ├── IAudioContextFactory.ts
│   │   │   │   │   ├── IAudioService.ts
│   │   │   │   │   ├── IBackendSyncService.ts
│   │   │   │   │   ├── IBaseService.ts
│   │   │   │   │   ├── IBrowserEventsService.ts
│   │   │   │   │   ├── IColorService.ts
│   │   │   │   │   ├── IConfigurationService.ts
│   │   │   │   │   ├── ICoordinateSystemService.ts
│   │   │   │   │   ├── IDebugOrchestratorService.ts
│   │   │   │   │   ├── IDebugService.ts
│   │   │   │   │   ├── IErrorReportingService.ts
│   │   │   │   │   ├── IEventBus.ts
│   │   │   │   │   ├── IEventTransformer.ts
│   │   │   │   │   ├── IFrontendRenderingService.ts
│   │   │   │   │   ├── IGameControllerService.ts
│   │   │   │   │   ├── IGameInputControllerService.ts
│   │   │   │   │   ├── IGameStateStore.ts
│   │   │   │   │   ├── IGameStateStoreService.ts
│   │   │   │   │   ├── IGameplayMechanicsService.ts
│   │   │   │   │   ├── IHttpService.ts
│   │   │   │   │   ├── IInputStateService.ts
│   │   │   │   ├── ILogger.ts
│   │   │   │   ├── IMessageAdapter.ts
│   │   │   │   ├── INotificationService.ts
│   │   │   │   ├── IPerformanceProvider.ts
│   │   │   │   ├── IPerformanceService.ts
│   │   │   │   ├── IPostProcessingService.ts
│   │   │   │   ├── IProtocolAdapter.contracts.ts
│   │   │   │   ├── IQualiaStateCalculatorService.ts
│   │   │   │   ├── IRhythmicMovementController.ts
│   │   │   │   ├── IShaderIntrospectionService.ts
│   │   │   │   ├── IShaderLoaderService.ts
│   │   │   │   ├── IStateStreamingService.ts
│   │   │   │   ├── IStreamingVideoService.ts
│   │   │   │   ├── ISubtitleService.ts
│   │   │   │   ├── ITimerProvider.ts
│   │   │   │   ├── ITimerService.ts
│   │   │   │   ├── IViewLogicService.ts
│   │   │   │   ├── IWebAudioAPIService.ts
│   │   │   │   ├── IWebSocketFactory.ts
│   │   │   │   └── IWebSocketService.ts
│   │   │   │   ├── inversify.config.ts
│   │   │   │   ├── inversify.container.ts
│   │   │   │   ├── inversify.types.ts
│   │   │   │   ├── postprocessing/
│   │   │   │   │   └── GBufferPass.ts
│   │   │   │   ├── protocol/
│   │   │   │   │   ├── IEventTransformer.ts
│   │   │   │   │   ├── IMessageAdapter.ts
│   │   │   │   │   └── adapters/
│   │   │   │   │       ├── KeyToDirectionAdapter.ts
│   │   │   │   │       ├── RawToParticleEventAdapter.ts
│   │   │   │   │       └── __tests__/
│   │   │   │   ├── providers/
│   │   │   │   │   ├── BrowserTimerProvider.ts
│   │   │   │   │   └── PerformanceProvider.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── NotificationQueue.ts
│   │   │   │   │   └── ThrottlingManager.ts
│   │   │   │   ├── CompositionRoot.provider.ts
│   │   │   │   ├── README.md
│   │   │   │   ├── SERVICE_STATUS_EVENT_GUIDE.md
│   │   │   │   ├── ServiceContext.tsx
│   │   │   │   └── ToneFactoryService.ts
│   │   │   ├── state/
│   │   │   │   └── __tests__/
│   │   │   ├── testing/
│   │   │   │   └── mocks/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── tailwind.config.js
│   │   ├── test-results/
│   │   ├── tests/
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── vite.log
│   ├── htmlcov/
│   └── htmlcov_backend/
├── requirements.txt               # Dependencias Python generales
├── ruff-qualia-code/              # Configuraciones Ruff personalizadas
├── scripts/                       # Scripts de automatización
│   ├── debug-full-system.sh       # Script de depuración del sistema completo
│   ├── generate_contracts.sh      # Script para generar contratos
│   └── lint-architecture.sh       # Script para linting de arquitectura
├── shared_contracts/              # Contratos compartidos (JSON Schema para modelos)
├── start.sh                       # Script de inicio
```

---

## SERVICIOS E INTERFACES DISPONIBLES

### 🎯 SERVICIOS IMPLEMENTADOS (Frontend)
| Servicio | Archivo | Descripción |
|----------|---------|-------------|
| **ApplicationCompositionRoot** | `ApplicationCompositionRoot.ts` | Raíz de composición de aplicación |
| **ApplicationInitializerService** | `ApplicationInitializerService.ts` | Inicializador de aplicación |
| **AudioService** | `AudioService.ts` | Servicio de audio |
| **BackendSyncService** | `BackendSyncService.ts` | Sincronización con backend |
| **BrowserAudioContextFactory** | `BrowserAudioContextFactory.ts` | Fábrica de contexto de audio del navegador |
| **BrowserEventsService** | `BrowserEventsService.ts` | Eventos del navegador |
| **BrowserWebSocketFactory** | `BrowserWebSocketFactory.ts` | Fábrica de WebSockets |
| **ColorService** | `ColorService.ts` | Servicio de colores |
| **ConfigurationService** | `ConfigurationService.ts` | Servicio de configuración |
| **CoordinateSystemService** | `CoordinateSystemService.ts` | Sistema de coordenadas |
| **DebugOrchestratorService** | `DebugOrchestratorService.ts` | Orquestador de depuración |
| **DebugService** | `DebugService.ts` | Servicio de depuración |
| **ErrorReportingService** | `ErrorReportingService.ts` | Reporte de errores |
| **EventBus** | `EventBus.ts` | Bus de eventos |
| **FrontendRenderingService** | `FrontendRenderingService.ts` | Renderizado frontend |
| **GameControllerService** | `GameControllerService.ts` | Controlador del juego |
| **GameInputControllerService** | `GameInputControllerService.ts` | Controlador de entrada |
| **GameStateStore** | `GameStateStore.ts` | Store de estado del juego |
| **GameStateStoreService** | `GameStateStoreService.ts` | Servicio del store de estado |
| **GameplayMechanicsService** | `GameplayMechanicsService.ts` | Mecánicas de juego |
| **HttpService** | `HttpService.ts` | Servicio HTTP |
| **InputStateService** | `InputStateService.ts` | Servicio de estado de entrada |
| **Logger** | `Logger.ts` | Logger |
| **NotificationService** | `NotificationService.ts` | Servicio de notificaciones |
| **PerformanceService** | `PerformanceService.ts` | Servicio de rendimiento |
| **PostProcessingService** | `PostProcessingService.ts` | Servicio de post-procesamiento |
| **QualiaStateCalculatorService** | `QualiaStateCalculatorService.ts` | Calculador de estado qualia |
| **RhythmicMovementController** | `RhythmicMovementController.ts` | Controlador de movimiento rítmico |
| **ShaderIntrospectionService** | `ShaderIntrospectionService.ts` | Servicio de introspección de shaders |
| **ShaderLoaderService** | `ShaderLoaderService.ts` | Servicio de carga de shaders |
| **StateStreamingService** | `StateStreamingService.ts` | Servicio de streaming de estado |
| **SubtitleService** | `SubtitleService.ts` | Servicio de subtítulos |
| **TimerService** | `TimerService.ts` | Servicio de temporizador |
| **ToneFactoryService** | `ToneFactoryService.ts` | Servicio de fábrica de tonos |
| **ViewLogicService** | `ViewLogicService.ts` | Servicio de lógica de vista |
| **WebAudioAPIService** | `WebAudioAPIService.ts` | Servicio de Web Audio API |
| **WebSocketService** | `WebSocketService.ts` | Servicio de WebSocket |

### 🔌 INTERFACES DISPONIBLES
| Interfaz | Archivo | Descripción |
|----------|---------|-------------|
| **IApplicationInitializerService** | `IApplicationInitializerService.ts` | Interfaz del inicializador de aplicación |
| **IAudioContextFactory** | `IAudioContextFactory.ts` | Interfaz de la fábrica de contexto de audio |
| **IAudioService** | `IAudioService.ts` | Interfaz del servicio de audio |
| **IBackendSyncService** | `IBackendSyncService.ts` | Interfaz de sincronización con backend |
| **IBaseService** | `IBaseService.ts` | Interfaz base para servicios |
| **IBrowserEventsService** | `IBrowserEventsService.ts` | Interfaz de eventos del navegador |
| **IColorService** | `IColorService.ts` | Interfaz del servicio de colores |
| **IConfigurationService** | `IConfigurationService.ts` | Interfaz del servicio de configuración |
| **ICoordinateSystemService** | `ICoordinateSystemService.ts` | Interfaz del sistema de coordenadas |
| **IDebugOrchestratorService** | `IDebugOrchestratorService.ts` | Interfaz del orquestador de depuración |
| **IDebugService** | `IDebugService.ts` | Interfaz del servicio de depuración |
| **IErrorReportingService** | `IErrorReportingService.ts` | Interfaz del reporte de errores |
| **IEventBus** | `IEventBus.ts` | Interfaz del bus de eventos |
| **IEventTransformer** | `IEventTransformer.ts` | Interfaz del transformador de eventos |
| **IFrontendRenderingService** | `IFrontendRenderingService.ts` | Interfaz del renderizado frontend |
| **IGameControllerService** | `IGameControllerService.ts` | Interfaz del controlador del juego |
| **IGameInputControllerService** | `IGameInputControllerService.ts` | Interfaz del controlador de entrada |
| **IGameStateStore** | `IGameStateStore.ts` | Interfaz del store de estado del juego |
| **IGameStateStoreService** | `IGameStateStoreService.ts` | Interfaz del servicio del store de estado |
| **IGameplayMechanicsService** | `IGameplayMechanicsService.ts` | Interfaz de mecánicas de juego |
| **IHttpService** | `IHttpService.ts` | Interfaz del servicio HTTP |
| **IInputStateService** | `IInputStateService.ts` | Interfaz del servicio de estado de entrada |
| **ILogger** | `ILogger.ts` | Interfaz del logger |
| **IMessageAdapter** | `IMessageAdapter.ts` | Interfaz del adaptador de mensajes |
| **INotificationService** | `INotificationService.ts` | Interfaz del servicio de notificaciones |
| **IPerformanceProvider** | `IPerformanceProvider.ts` | Interfaz del proveedor de rendimiento |
| **IPerformanceService** | `IPerformanceService.ts` | Interfaz del servicio de rendimiento |
| **IPostProcessingService** | `IPostProcessingService.ts` | Interfaz del servicio de post-procesamiento |
| **IQualiaStateCalculatorService** | `IQualiaStateCalculatorService.ts` | Interfaz del calculador de estado qualia |
| **IRhythmicMovementController** | `IRhythmicMovementController.ts` | Interfaz del controlador de movimiento rítmico |
| **IShaderIntrospectionService** | `IShaderIntrospectionService.ts` | Interfaz del servicio de introspección de shaders |
| **IShaderLoaderService** | `IShaderLoaderService.ts` | Interfaz del servicio de carga de shaders |
| **IStateStreamingService** | `IStateStreamingService.ts` | Interfaz del servicio de streaming de estado |
| **IStreamingVideoService** | `IStreamingVideoService.ts` | Interfaz del servicio de streaming de video |
| **ISubtitleService** | `ISubtitleService.ts` | Interfaz del servicio de subtítulos |
| **ITimerProvider** | `ITimerProvider.ts` | Interfaz del proveedor de temporizador |
| **ITimerService** | `ITimerService.ts` | Interfaz del servicio de temporizador |
| **IViewLogicService** | `IViewLogicService.ts` | Interfaz del servicio de lógica de vista |
| **IWebAudioAPIService** | `IWebAudioAPIService.ts` | Interfaz del servicio de Web Audio API |
| **IWebSocketFactory** | `IWebSocketFactory.ts` | Interfaz de la fábrica de WebSocket |
| **IWebSocketService** | `IWebSocketService.ts` | Interfaz del servicio de WebSocket |

### 📋 CONTRATOS DE SERVICIOS
| Contrato | Archivo | Descripción |
|----------|---------|-------------|
| **IApplicationCompositionRoot.contracts** | `IApplicationCompositionRoot.contracts.ts` | Contratos para la raíz de composición |
| **IApplicationInitializerService.contracts** | `IApplicationInitializerService.contracts.ts` | Contratos del inicializador |
| **IAudioService.contracts** | `IAudioService.contracts.ts` | Contratos del servicio de audio |
| **IBackendSyncService.contracts** | `IBackendSyncService.contracts.ts` | Contratos de sincronización backend |
| **ICoordinateSystemService.contracts** | `ICoordinateSystemService.contracts.ts` | Contratos del sistema de coordenadas |
| **IDebugOrchestratorService.contracts** | `IDebugOrchestratorService.contracts.ts` | Contratos del orquestador de depuración |
| **IDebugService.contracts** | `IDebugService.contracts.ts` | Contratos del servicio de depuración |
| **IErrorReportingService.contracts** | `IErrorReportingService.contracts.ts` | Contratos del reporte de errores |
| **IEventBus.contracts** | `IEventBus.contracts.ts` | Contratos del bus de eventos |
| **IFrontendRenderingService.contracts** | `IFrontendRenderingService.contracts.ts` | Contratos del renderizado frontend |
| **IGBufferPass.contracts** | `IGBufferPass.contracts.ts` | Contratos del GBuffer Pass |
| **IGameControllerService.contracts** | `IGameControllerService.contracts.ts` | Contratos del controlador del juego |
| **IGameInputControllerService.contracts** | `IGameInputControllerService.contracts.ts` | Contratos del controlador de entrada |
| **IGameStateStoreService.contracts** | `IGameStateStoreService.contracts.ts` | Contratos del servicio del store |
| **IGameplayMechanicsService.contracts** | `IGameplayMechanicsService.contracts.ts` | Contratos de mecánicas de juego |
| **IHttpService.contracts** | `IHttpService.contracts.ts` | Contratos del servicio HTTP |
| **ILogger.contracts** | `ILogger.contracts.ts` | Contratos del logger |
| **INotificationService.contracts** | `INotificationService.contracts.ts` | Contratos del servicio de notificaciones |
| **IPostProcessingService.contracts** | `IPostProcessingService.contracts.ts` | Contratos del post-procesamiento |
| **IProtocolAdapter.contracts** | `IProtocolAdapter.contracts.ts` | Contratos del adaptador de protocolo |
| **IQualiaStateCalculatorService.contracts** | `IQualiaStateCalculatorService.contracts.ts` | Contratos del calculador qualia |
| **IRhythmicMovementController.contracts** | `IRhythmicMovementController.contracts.ts` | Contratos del controlador rítmico |
| **IStateStreamingService.contracts** | `IStateStreamingService.contracts.ts` | Contratos del streaming de estado |
| **ISubtitleService.contracts** | `ISubtitleService.contracts.ts` | Contratos del servicio de subtítulos |
| **ITimerService.contracts** | `ITimerService.contracts.ts` | Contratos del servicio de temporizador |
| **IViewLogicService.contracts** | `IViewLogicService.contracts.ts` | Contratos del servicio de lógica de vista |
| **IWebSocketService.contracts** | `IWebSocketService.contracts.ts` | Contratos del servicio WebSocket |
| **constants** | `constants.ts` | Constantes compartidas |
| **events.contracts** | `events.contracts.ts` | Contratos de eventos |

### 🔧 UTILIDADES Y PROVEEDORES
| Utilidad/Proveedor | Archivo | Descripción |
|--------------------|---------|-------------|
| **BrowserTimerProvider** | `providers/BrowserTimerProvider.ts` | Proveedor de temporizador del navegador |
| **PerformanceProvider** | `providers/PerformanceProvider.ts` | Proveedor de rendimiento |
| **NotificationQueue** | `utils/NotificationQueue.ts` | Cola de notificaciones |
| **ThrottlingManager** | `utils/ThrottlingManager.ts` | Gestor de throttling |

### 🔌 ADAPTADORES DE PROTOCOLO
| Adaptador | Archivo | Descripción |
|-----------|---------|-------------|
| **KeyToDirectionAdapter** | `protocol/adapters/KeyToDirectionAdapter.ts` | Adaptador de teclas a dirección |
| **RawToParticleEventAdapter** | `protocol/adapters/RawToParticleEventAdapter.ts` | Adaptador de datos crudos a eventos de partículas |

### 🎨 POST-PROCESAMIENTO
| Componente | Archivo | Descripción |
|------------|---------|-------------|
| **GBufferPass** | `postprocessing/GBufferPass.ts` | Pasa GBuffer para post-procesamiento |

### ✅ VALIDADORES DE CONFIGURACIÓN
| Validador | Archivo | Descripción |
|----------------|---------|-------------|
| **validateAudioService** | `config-validators/validateAudioService.validator.ts` | Validador del servicio de audio |
| **validateBackendSync** | `config-validators/validateBackendSync.validator.ts` | Validador de sincronización backend |
| **validateCompositionRoot** | `config-validators/validateCompositionRoot.validator.ts` | Validador de la raíz de composición |
| **validateDebugService** | `config-validators/validateDebugService.validator.ts` | Validador del servicio de depuración |
| **validateErrorReporting** | `config-validators/validateErrorReporting.validator.ts` | Validador del reporte de errores |
| **validateEventBus** | `config-validators/validateEventBus.validator.ts` | Validador del bus de eventos |
| **validateGameController** | `config-validators/validateGameController.validator.ts` | Validador del controlador del juego |
| **validateNotificationService** | `config-validators/validateNotificationService.validator.ts` | Validador del servicio de notificaciones |
| **validateQualiaCalculator** | `config-validators/validateQualiaCalculator.validator.ts` | Validador del calculador qualia |
| **validateRhythmicMovement** | `config-validators/validateRhythmicMovement.validator.ts` | Validador del movimiento rítmico |

---

**Última actualización:** 3 de octubre de 2025
**Total de servicios:** 34
**Total de interfaces:** 35
**Total de contratos:** 29
**Total de validadores:** 10
**Arquitectura:** QUALIA.CODE v1.1 - IoC con InversifyJS
