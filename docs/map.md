```
QualiaTempo/
├── .git/                          # Repositorio Git
├── .github/                       # Configuraciones de GitHub (workflows, issues, etc.)
├── .gitignore                     # Archivo de ignorados de Git
├── .kilocodemodes                 # Configuraciones de Kilocode
├── .venv/                         # Entorno virtual de Python
├── .vscode/                       # Configuraciones de VS Code
├── README.md                      # Documentación principal del proyecto
├── TODO.md                        # Lista de tareas pendientes
├── cov.md                         # Reporte de cobertura
├── debug-full-system.sh           # Script de depuración del sistema completo
├── debuglogs/                     # Logs de depuración
├── diagnostics/                   # Scripts de diagnóstico
│   ├── core_render_test.py
│   ├── full_system_test.py
│   ├── particle_pipeline_diagnostic.py
│   ├── simple_particle_test.py
│   ├── validate_full_system.sh
│   └── verify_rendering_issue.py
├── docs/                          # Documentación general del proyecto
│   ├── GDD.md                     # Game Design Document
│   ├── Performance.txt            # Notas de rendimiento
│   ├── QUALIA.CODE.md             # Especificaciones de arquitectura
│   ├── architecture_v2.md         # Arquitectura versión 2
│   ├── arquitectura/              # Documentación de arquitectura
│   ├── crisalida/                 # Documentación de Crisalida
│   ├── data_structures_v2.md      # Estructuras de datos versión 2
│   ├── exploracion/               # Documentación de exploración
│   ├── map.md                     # Este archivo (mapa del proyecto)
│   ├── music/                     # Documentación de música
│   └── music.txt                  # Notas de música
├── eslint-plugin-qualia-code/     # Plugin ESLint personalizado
├── examples/                      # Ejemplos de código
│   ├── decorator-examples.ts
│   ├── inversify-migration-example.ts
│   ├── inversify-test.ts
│   └── README.md
├── htmlcov_backend/               # Reportes de cobertura HTML para backend
├── lint-report.md                 # Reporte de linting
├── mypy-qualia-code/              # Configuraciones MyPy personalizadas
├── node_modules/                  # Dependencias de Node.js
├── package-lock.json              # Lockfile de npm
├── package.json                   # Configuración de proyecto Node.js
├── pnpm-lock.yaml                 # Lockfile de pnpm
├── pyproject.toml                 # Configuración de proyecto Python
├── qualia-tempo-prototype/        # Directorio raíz del código de la aplicación prototipo
│   ├── .coverage                  # Archivo de cobertura de pruebas
│   ├── .gitignore                 # Ignorados específicos del prototipo
│   ├── .pytest_cache/             # Cache de pytest
│   ├── .venv/                     # Entorno virtual del prototipo
│   ├── README.md                  # README del prototipo
│   ├── backend/                   # Código del servidor (Python/FastAPI)
│   │   ├── .coverage              # Cobertura específica del backend
│   │   ├── .mypy_cache/           # Cache de MyPy
│   │   ├── .pytest_cache/         # Cache de pytest del backend
│   │   ├── .ruff_cache/           # Cache de Ruff
│   │   ├── .venv/                 # Entorno virtual del backend
│   │   ├── CompositionRoot.py     # Raíz de composición para IoC
│   │   ├── README.md              # README del backend
│   │   ├── __init__.py
│   │   ├── __pycache__/           # Bytecode Python
│   │   ├── api/                   # Endpoints de la API, modelos de datos y rutas
│   │   ├── backend.log            # Logs del backend
│   │   ├── config/                # Configuraciones del backend
│   │   ├── engine/                # Motor principal del backend (lógica de partículas, etc.)
│   │   ├── htmlcov/               # Cobertura HTML del backend
│   │   ├── main.py                # Punto de entrada del backend
│   │   ├── pytest.ini             # Configuración de pytest
│   │   ├── requirements.txt       # Dependencias Python del backend
│   │   ├── services/              # Servicios del backend (ParticleEngine, etc.)
│   │   ├── tests/                 # Pruebas del backend
│   │   ├── utils/                 # Utilidades del backend (decoradores, etc.)
│   │   └── venv/                  # Otro entorno virtual
│   ├── combat_data/               # Archivos de datos para escenarios de combate (JSONs)
│   └── frontend/                  # Código de la aplicación cliente (TypeScript/React)
│       ├── .eslintrc.cjs           # Configuración ESLint CJS
│       ├── .eslintrc.json         # Configuración ESLint JSON
│       ├── README.md              # README del frontend
│       ├── add-vitest-imports.sh  # Script para agregar imports de Vitest
│       ├── browser-test-failure.json # Resultados de pruebas de navegador fallidas
│       ├── browser-test-report-game-view.json # Reporte de pruebas de vista de juego
│       ├── browser-test-report-main-menu.json # Reporte de pruebas de menú principal
│       ├── browser-test.js        # Pruebas de navegador
│       ├── config/                # Configuraciones del frontend
│       ├── debug-console.js       # Script de depuración de consola
│       ├── debug-page-content-game-view.html # Contenido de depuración de vista de juego
│       ├── debug-page-content-main-menu.html # Contenido de depuración de menú principal
│       ├── debug-screenshot-game-view.png # Captura de pantalla de depuración
│       ├── debug-screenshot-main-menu.png # Captura de pantalla de menú
│       ├── dist/                  # Archivos compilados/distribuidos
│       ├── e2e-test.js            # Pruebas end-to-end
│       ├── fix-centering-test.js  # Prueba de centrado
│       ├── frontend.log           # Logs del frontend
│       ├── index.html             # HTML principal
│       ├── jest.config.js         # Configuración de Jest
│       ├── main.js                # Punto de entrada JavaScript
│       ├── node_modules/          # Dependencias Node.js del frontend
│       ├── package-lock.json      # Lockfile npm del frontend
│       ├── package.json           # Configuración proyecto frontend
│       ├── playwright-report/     # Reportes de Playwright
│       ├── playwright.config.ts   # Configuración de Playwright
│       ├── pnpm-lock.yaml         # Lockfile pnpm del frontend
│       ├── pnpm-workspace.yaml    # Configuración workspace pnpm
│       ├── postcss.config.js      # Configuración PostCSS
│       ├── public/                # Archivos estáticos
│       │   └── config/            # Archivos de configuración del juego para el frontend
│       ├── race-condition-test.js # Prueba de condición de carrera
│       ├── src/                   # Código fuente del frontend
│       │   ├── components/        # Componentes reutilizables de la interfaz de usuario (HUD, etc.)
│       │   ├── services/          # Servicios (IoC con InversifyJS: EventBus, QualiaService, etc.)
│       │   ├── state/             # Manejo del estado global (Zustand stores)
│       │   ├── types/             # Definiciones de tipos TypeScript
│       │   └── utils/             # Funciones y utilidades auxiliares
│       ├── tailwind.config.js     # Configuración Tailwind CSS
│       ├── test-results/          # Resultados de pruebas
│       ├── tests/                 # Pruebas del frontend
│       ├── tsconfig.json          # Configuración TypeScript
│       ├── vite.config.ts         # Configuración Vite
│       └── vite.log               # Logs de Vite
├── requirements.txt               # Dependencias Python generales
├── ruff-qualia-code-rust/         # Configuraciones Ruff personalizadas
├── scripts/                       # Scripts de automatización
│   ├── generate_contracts.sh      # Script para generar contratos
│   └── lint-architecture.sh       # Script para linting de arquitectura
├── shared_contracts/              # Contratos compartidos (JSON Schema para modelos)
│   ├── CombatData.json            # Esquema para datos de combate
│   ├── PlayerState.json           # Esquema para estado del jugador
│   └── QualiaState.json           # Esquema para estado qualia
├── start.sh                       # Script de inicio
└── wasted/                        # Directorio para archivos obsoletos o temporales
```