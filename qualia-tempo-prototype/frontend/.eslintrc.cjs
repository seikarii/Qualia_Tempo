module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@qualia-tempo/qualia-code/recommended",
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
  plugins: ["@qualia-tempo/qualia-code"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
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
        "@qualia-tempo/qualia-code/enforce-method-decorators": "off",
        "@qualia-tempo/qualia-code/enforce-inversify-conventions": "off",
      },
    },
    // Abstraction services - allowed to use global APIs they encapsulate
    {
      files: [
        "**/services/TimerService.ts",
        "**/services/HttpService.ts", 
        "**/services/WebAudioAPIService.ts",
        "**/services/EventBus.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-global-api-calls": "off",
      },
    },
    // Static utility classes - don't require IoC decorators
    {
      files: [
        "**/services/Logger.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/enforce-inversify-conventions": "off",
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
    // Testing files - more relaxed rules
    {
      files: [
        "**/testing/**/*.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-direct-service-instantiation": "off",
        "@qualia-tempo/qualia-code/enforce-use-services-hook": "off",
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
        "@qualia-tempo/qualia-code/enforce-use-services-hook": "off",
      },
    },
    // Interface files - method names can reference global APIs for abstraction
    {
      files: [
        "**/interfaces/ITimerService.ts",
      ],
      rules: {
        "@qualia-tempo/qualia-code/no-global-api-calls": "off",
      },
    },
  ],
};
