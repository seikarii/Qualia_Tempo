module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@qualia-tempo/qualia-code/recommended"
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "@qualia-tempo/qualia-code"],
  overrides: [
    {
      files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
      env: { jest: true },
    },
  ],
  rules: {
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  globals: {
    process: "readonly",
  },
};
