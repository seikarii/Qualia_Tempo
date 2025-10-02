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
    // Configuration files that should not be linted for TSConfig issues
    "playwright.config.ts",
    "vite.config.ts",
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
    "@qualia-tempo/qualia-code/no-direct-service-import-in-components": "error",
    "@qualia-tempo/qualia-code/no-manual-event-subscription": "error",
    "@qualia-tempo/qualia-code/no-direct-diagnostic-calls": "error",
    "@qualia-tempo/qualia-code/no-service-locator": "error",
    "@qualia-tempo/qualia-code/enforce-interface-based-injection": "error",
    "@qualia-tempo/qualia-code/enforce-onevent-base-service": "error",
    // DISABLED: enforce-browser-only leads to using @BrowserOnly as a band-aid for violations
    // instead of using proper platform abstraction services (ITimerService, etc.)
    "@qualia-tempo/qualia-code/enforce-browser-only": "off",
    "@qualia-tempo/qualia-code/enforce-event-interfaces-location": "error",
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
    // Testing files - more relaxed rules for IoC patterns
    {
      files: [
        "**/testing/**/*.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-direct-service-instantiation": "off", // Tests need to instantiate services
        "@qualia-tempo/qualia-code/enforce-use-services-hook": "off", // Tests don't use React hooks
        "no-unused-vars": "off",
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
  ],
};
