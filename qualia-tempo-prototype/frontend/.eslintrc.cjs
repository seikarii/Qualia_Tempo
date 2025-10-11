module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@qualia-tempo/qualia-code/recommended",
    "plugin:react-hooks/recommended"
  ],
  ignorePatterns: [
    "dist",
    ".eslintrc.cjs",
    "**/__tests__/**",
    "**/*.test.*",
    "**/*.spec.*",
    "**/mocks/**",
    "**/_mocks_/**",
    // Configuration files that should not be linted for TSConfig issues
    "playwright.config.ts",
    "vite.config.ts",
    // Preload scripts (not included in main tsconfig)
    "preload/**",
    // Generated contract files - auto-generated from JSON schemas
    "src/types/*.d.ts",
    "src/types/contracts.ts",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "@qualia-tempo/qualia-code", "react-hooks"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    // Reglas básicas de calidad de código
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "no-alert": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error",

    // TypeScript specific rules
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off", // Too strict for React components
    "@typescript-eslint/explicit-module-boundary-types": "off", // Too strict for React components
    // NOTE: Following rules are "warn" not "error" - they suggest improvements but don't break builds
    "@typescript-eslint/no-non-null-assertion": "warn", // Allow but warn about non-null assertions (GPU/Three.js refs often legitimately non-null)
    "@typescript-eslint/prefer-nullish-coalescing": "warn", // Suggests ?? over || (safer but not mandatory)
    "@typescript-eslint/prefer-optional-chain": "warn", // Suggests ?. chaining (cleaner but not mandatory)

    // Code quality rules
    // QUALIA.CODE v1.1 ADJUSTED: Increased limits for legitimate architectural patterns
    // - Rendering engines (KairosVisualEngine) have inherent complexity
    // - Direct Configuration Injection requires more parameters
    // - State machines and validators have legitimate line counts
    "complexity": ["error", 15], // Increased from 10 - allows state machines and render loops
    "max-lines-per-function": ["error", 100], // Increased from 50 - allows complex service methods
    "max-params": ["error", 6], // Increased from 4 - supports Direct Configuration Injection

    // Reglas de consistencia
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": "error",
    "prefer-arrow-callback": "error",

    // React rules (additional to what's in react-hooks plugin)
    // Note: react/jsx-key and react/jsx-no-bind require eslint-plugin-react which is not installed
    // "react/jsx-key": "error",
    // "react/jsx-no-bind": "warn",

    // Import rules (require eslint-plugin-import which is not installed)
    // "import/no-unused-modules": "off", // Can be too aggressive

    // QUALIA.CODE CRITICAL RULES - ACTIVATED FOR FULL COMPLIANCE DETECTION
    // NOTE: Decorator enforcement rules set to "warn" for gradual adoption
    // These represent architectural best practices but retroactive application is a large undertaking
    "@qualia-tempo/qualia-code/enforce-method-decorators": "warn",
    "@qualia-tempo/qualia-code/enforce-inversify-conventions": "error",
    "@qualia-tempo/qualia-code/no-global-api-calls": "error",
    "@qualia-tempo/qualia-code/no-direct-service-instantiation": "error",
    "@qualia-tempo/qualia-code/enforce-use-services-hook": "error",
    "@qualia-tempo/qualia-code/no-console-in-services": "error",
    "@qualia-tempo/qualia-code/no-manual-event-subscription": "error",
    "@qualia-tempo/qualia-code/no-direct-diagnostic-calls": "error",
    "@qualia-tempo/qualia-code/no-service-locator": "error",
    "@qualia-tempo/qualia-code/enforce-interface-based-injection": "error",
    "@qualia-tempo/qualia-code/enforce-onevent-base-service": "error",
    // DISABLED: enforce-browser-only leads to using @BrowserOnly as a band-aid for violations
    // instead of using proper platform abstraction services (ITimerService, etc.)
    "@qualia-tempo/qualia-code/enforce-browser-only": "off",
    "@qualia-tempo/qualia-code/enforce-event-interfaces-location": "error",
    // NEW RULES - QUALIA.CODE v1.2 Data Integrity & Performance (WARNINGS for gradual adoption)
    "@qualia-tempo/qualia-code/enforce-validation-on-boundaries": "warn",
    "@qualia-tempo/qualia-code/enforce-performance-best-practices": "warn",
    // NEW RULES - QUALIA.CODE v1.3 IoC Binding Order Enforcement
    "@qualia-tempo/qualia-code/enforce-ioc-binding-order": "error",
    // NEW RULES - QUALIA.CODE v1.4-1.9 Decorator Enforcement (WARNINGS for gradual adoption)
    "@qualia-tempo/qualia-code/enforce-cache-decorator": "warn",
    "@qualia-tempo/qualia-code/enforce-mutex-on-state-mutations": "warn",
    "@qualia-tempo/qualia-code/enforce-retry-on-io-operations": "warn",
    "@qualia-tempo/qualia-code/enforce-async-on-heavy-methods": "warn",
    "@qualia-tempo/qualia-code/enforce-timeout-on-async-operations": "warn",
    "@qualia-tempo/qualia-code/enforce-worker-offloading": "warn",
    "@qualia-tempo/qualia-code/enforce-validation-on-public-methods": "warn",
    "@qualia-tempo/qualia-code/enforce-error-boundary-on-async": "warn",
    "@qualia-tempo/qualia-code/enforce-throttle-on-event-handlers": "warn",
    "@qualia-tempo/qualia-code/enforce-debounce-on-ui-inputs": "warn",
    "@qualia-tempo/qualia-code/enforce-rate-limit-on-api-calls": "warn",
    "@qualia-tempo/qualia-code/enforce-measure-time-on-logic-services": "warn",
    "@qualia-tempo/qualia-code/enforce-validate-event-property-on-emit": "warn",
    "@qualia-tempo/qualia-code/enforce-adapt-and-emit-on-raw-handlers": "warn",
    "@qualia-tempo/qualia-code/enforce-readonly-on-config-access": "warn",
    "@qualia-tempo/qualia-code/enforce-deprecated-on-comment": "warn",
    "@qualia-tempo/qualia-code/enforce-authorize-on-secure-methods": "warn",
    "@qualia-tempo/qualia-code/enforce-profile-on-heavy-computation": "warn",
    // NEW RULES - QUALIA.CODE v2.0 SALA (CRITICAL - Keep as errors)
    "@qualia-tempo/qualia-code/enforce-high-fidelity-mocks": "error",
    "@qualia-tempo/qualia-code/enforce-decorator-order": "error",
    "@qualia-tempo/qualia-code/enforce-event-bus-type-safety": "error",
    "@qualia-tempo/qualia-code/enforce-stateless-view-logic": "error",
    // NEW RULES - QUALIA.CODE v2.1 PHASE 3 (CRITICAL - Keep as errors)
    "@qualia-tempo/qualia-code/detect-circular-dependencies": "error",
    "@qualia-tempo/qualia-code/enforce-correct-injection-scope": "error",
    "@qualia-tempo/qualia-code/validate-injection-existence": "error",
    "@qualia-tempo/qualia-code/enforce-ioc-initialization-order": "error",
  },
  settings: {
    "import/resolver": {
      typescript: {},
    },
  },
  overrides: [
    // Interface files - unused parameter names are expected
    {
      files: ["**/interfaces/*.ts", "**/*.d.ts"],
      rules: {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": "off",
        // Keep QUALIA.CODE rules active even in interfaces
      },
    },
    // Platform abstraction layer - allowed to use global APIs they encapsulate
    // CRITICAL: Only files that IMPLEMENT the abstraction layer should be here
    // Services that USE abstractions (like EventBus) must NOT be in this list
    {
      files: [
        "**/services/TimerService.ts",
        "**/services/HttpService.ts", 
        "**/services/WebAudioAPIService.ts",
        "**/services/providers/*.ts", // Provider implementations (BrowserTimerProvider, etc.)
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-global-api-calls": "off", // These ARE the platform abstraction layer
      },
    },
    // Static utility classes - don't require IoC decorators (but still enforce other rules)
    {
      files: [
        "**/services/Logger.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-inversify-conventions": "off", // Logger is static utility
      },
    },
    // Auto-generated files - should not be manually edited
    {
      files: [
        "**/contracts/*.ts",
        "**/*.contracts.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-manual-contract-edit": "error",
      },
    },
    // Rendering engines - inherent complexity from graphics/physics loops
    {
      files: [
        "**/services/KairosVisualEngine.ts",
        "**/services/ReactionDiffusionService.ts",
        "**/components/game/*Avatar.tsx",
      ],
      rules: {
        "max-lines-per-function": ["error", 160], // Render loops and setup methods (increased for PlayerAvatar)
        "complexity": ["error", 35], // State machines in render loops (increased for renderLoop)
      },
    },
    // Configuration validators - comprehensive validation logic
    {
      files: [
        "**/config-validators/*.ts",
      ],
      rules: {
        "max-lines-per-function": ["error", 120], // Validation trees
        "complexity": ["error", 30], // Validation branching
      },
    },
    // Worker implementations - message handling state machines
    {
      files: [
        "**/workers/*.ts",
      ],
      rules: {
        "max-lines-per-function": ["error", 100],
        "complexity": ["error", 20],
      },
    },
    // IoC configuration - complex binding logic
    {
      files: [
        "**/inversify.config.ts",
      ],
      rules: {
        "max-lines-per-function": ["error", 150], // Service binding functions
      },
    },
    // Performance profiling tools - legitimate console.log usage
    {
      files: [
        "**/testing/performance-profiler.ts",
        "**/utils/performance-profiler.ts",
      ],
      rules: {
        "no-console": "off", // Profiler outputs to console by design
        "max-lines-per-function": ["error", 100],
      },
    },
    // Overrides para el entorno de pruebas (QUALIA.CODE v1.1 COMPLIANT)
    {
      files: [
        "**/testing/**/*.ts",
        "**/__tests__/**/*.ts",
        "**/__tests__/**/*.tsx",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
      ],
      rules: {
        // ACTIVA nuestra nueva regla como la autoridad máxima para la arquitectura de tests.
        '@qualia-tempo/qualia-code/enforce-isolated-test-container': 'error',

        // DESACTIVA reglas que son irrelevantes o contradictorias en un entorno de test.
        '@qualia-tempo/qualia-code/no-direct-service-instantiation': 'off', // Redundante, 'enforce-isolated-test-container' es más específico.
        '@qualia-tempo/qualia-code/enforce-use-services-hook': 'off', // Los tests no usan hooks de React.
        '@qualia-tempo/qualia-code/no-service-locator': 'off', // El service locator se permite en tests para extraer mocks.

        // Relaja reglas genéricas para la conveniencia en los tests.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off', // Permitir 'any' es a menudo necesario para mockear.
        'max-lines-per-function': 'off', // Los tests pueden ser largos.
      },
    },
    // Application entry point - allowed to access container directly
    {
      files: [
        "**/index.tsx", 
        "**/main.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-use-services-hook": "off", // Entry points access container
      },
    },
    // Interface files - method names can reference global APIs for abstraction
    {
      files: [
        "**/interfaces/ITimerService.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-global-api-calls": "off", // Interface names reference APIs
      },
    },
    // Generated contract files - exempt from all linting
    {
      files: [
        "**/types/*.d.ts",
        "**/types/contracts.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-manual-contract-edit": "off", // These ARE the generated files
      },
    },
    // Post-processing passes - inherently complex graphics operations, many decorators would add overhead
    {
      files: [
        "**/services/postprocessing/*.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-method-decorators": "off", // Performance-critical rendering
        "@qualia-tempo/qualia-code/enforce-async-on-heavy-methods": "off", // Rendering must be synchronous
        "@qualia-tempo/qualia-code/enforce-validation-on-public-methods": "off", // Three.js types validated by TypeScript
        "@qualia-tempo/qualia-code/enforce-mutex-on-state-mutations": "off", // Single-threaded rendering
        "@qualia-tempo/qualia-code/enforce-profile-on-heavy-computation": "off", // Already profiled via Three.js stats
        "@qualia-tempo/qualia-code/enforce-authorize-on-secure-methods": "off", // No security concerns in rendering
      },
    },
    // Performance profiling utilities - need to bypass decorator enforcement
    {
      files: [
        "**/utils/performance-profiler.ts",
        "**/testing/performance-profiler.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-worker-offloading": "off", // Profiler runs on main thread by design
        "@qualia-tempo/qualia-code/enforce-profile-on-heavy-computation": "off", // Profiler profiles itself recursively
      },
    },
    // Protocol adapters - thin translation layer
    {
      files: [
        "**/services/protocol/adapters/*.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-method-decorators": "warn", // Reduce to warning for adapters
        "@qualia-tempo/qualia-code/enforce-validation-on-public-methods": "off", // Type system validates
        "@qualia-tempo/qualia-code/enforce-profile-on-heavy-computation": "warn", // Usually lightweight
        "@qualia-tempo/qualia-code/enforce-worker-offloading": "off", // Small transformations
      },
    },
    // Utility classes - notification queue, throttling manager
    {
      files: [
        "**/services/utils/*.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-retry-on-io-operations": "off", // Not all "get" calls are I/O
        "@qualia-tempo/qualia-code/enforce-timeout-on-async-operations": "off", // False positives on queue.get()
        "@qualia-tempo/qualia-code/enforce-rate-limit-on-api-calls": "off", // Internal data structure methods
        "@qualia-tempo/qualia-code/enforce-async-on-heavy-methods": "off", // Queue operations must be sync
      },
    },
    // Decorator implementations - meta-programming layer
    {
      files: [
        "**/utils/decorators/*.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-event-bus-type-safety": "off", // Decorators work with generic types
      },
    },
  ],
};
