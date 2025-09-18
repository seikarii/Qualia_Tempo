module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended"
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "**/__tests__/**", "**/*.test.*", "**/*.spec.*"],
  parser: "@typescript-eslint/parser",
  plugins: ["@qualia-tempo/qualia-code"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json"
  },
  rules: {
    "@qualia-tempo/qualia-code/enforce-method-decorators": "error",
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  settings: {
    "import/resolver": {
      typescript: {}
    }
  }
};