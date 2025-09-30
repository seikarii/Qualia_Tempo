import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/testing/setup.ts",
    // QUALIA.CODE: Fast test execution - max 1 second per test
    testTimeout: 1000, // 1 second max per test
    hookTimeout: 500, // 500ms max for hooks
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/e2e/**",
      "**/tests/e2e/**",
      "**/*.spec.ts", // Exclude Playwright specs
      "**/playwright/**",
    ],
  },
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Optimize build for ESM
    target: "esnext",
    minify: "esbuild",
  },
  server: {
    port: 5173,
    strictPort: true,
    // Add CORS for backend communication
    cors: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // WebSocket proxy for video streaming
      "/ws": {
        target: "ws://127.0.0.1:8000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    open: 'firefox',
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
  // Optimize dependencies to avoid CJS warnings
  optimizeDeps: {
    include: ["react", "react-dom"],
    force: false,
  },
  // Use ESM format
  esbuild: {
    target: "esnext",
    format: "esm",
  },
});
