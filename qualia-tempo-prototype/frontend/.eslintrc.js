module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@qualia-tempo/qualia-code/recommended"
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
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
  settings: {
    "import/resolver": {
      typescript: {}
    }
  }
};