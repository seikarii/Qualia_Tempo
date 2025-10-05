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
    "@typescript-eslint/no-non-null-assertion": "warn", // Allow but warn about non-null assertions
    "@typescript-eslint/prefer-nullish-coalescing": "warn",
    "@typescript-eslint/prefer-optional-chain": "warn",

    // Code quality rules
    "complexity": ["error", 10], // Error about complex functions
    "max-lines-per-function": ["error", 50], // Error about long functions
    "max-params": ["error", 4], // Error about functions with too many parameters

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
    "@qualia-tempo/qualia-code/enforce-method-decorators": "error",
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
    // NEW RULES - QUALIA.CODE v1.2 Data Integrity & Performance
    "@qualia-tempo/qualia-code/enforce-validation-on-boundaries": "error",
    "@qualia-tempo/qualia-code/enforce-performance-best-practices": "error",
    // NEW RULES - QUALIA.CODE v1.3 IoC Binding Order Enforcement
    "@qualia-tempo/qualia-code/enforce-ioc-binding-order": "error",
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
    // Generated contract files - exempt from manual edit checks
    {
      files: [
        "**/types/*.d.ts",
        "**/types/contracts.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-manual-contract-edit": "off", // These ARE the generated files
        "unused-eslint-disable": "off", // Generated files may have unused disables
      },
    },
  ],
};
