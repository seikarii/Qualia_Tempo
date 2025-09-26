/**
 * QUALIA.CODE v1.1 - Environment Utilities Tests
 * Comprehensive test suite for environment detection utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { env } from "../env";

describe("Environment Utilities", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset environment variables
    delete process.env.NODE_ENV;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe("env.isDev", () => {
    it("should return true when NODE_ENV is development", () => {
      process.env.NODE_ENV = "development";
      expect(env.isDev).toBe(true);
    });

    it("should return false when NODE_ENV is not set and app is not packaged", () => {
      delete process.env.NODE_ENV;
      expect(env.isDev).toBe(false);
    });

    it("should return false when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      expect(env.isDev).toBe(false);
    });

    it("should return false when NODE_ENV is test", () => {
      process.env.NODE_ENV = "test";
      expect(env.isDev).toBe(false);
    });

    it("should handle undefined electron app gracefully", () => {
      // Remove electron from global scope
      delete (global as any).electron;

      process.env.NODE_ENV = "production";
      expect(env.isDev).toBe(false);
    });

    it("should handle null electron app gracefully", () => {
      (global as any).electron = { app: null };

      process.env.NODE_ENV = "production";
      expect(env.isDev).toBe(false);
    });

    it("should handle electron app without isPackaged property", () => {
      (global as any).electron = { app: {} };

      process.env.NODE_ENV = "production";
      expect(env.isDev).toBe(false);
    });

    it("should return true when app.isPackaged is true but NODE_ENV is development", () => {
      process.env.NODE_ENV = "development";
      (global as any).electron = { app: { isPackaged: true } };

      expect(env.isDev).toBe(true);
    });

    it("should return false when app.isPackaged is true and NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      (global as any).electron = { app: { isPackaged: true } };

      expect(env.isDev).toBe(false);
    });

    it("should handle various NODE_ENV values correctly", () => {
      const testCases = [
        { env: "development", expected: true },
        { env: "dev", expected: false },
        { env: "production", expected: false },
        { env: "prod", expected: false },
        { env: "test", expected: false },
        { env: "staging", expected: false },
        { env: "", expected: false },
        { env: undefined, expected: false },
      ];

      testCases.forEach(({ env, expected }) => {
        process.env.NODE_ENV = env;
        expect(env.isDev).toBe(expected);
      });
    });

    it("should be consistent across multiple calls", () => {
      process.env.NODE_ENV = "development";

      expect(env.isDev).toBe(true);
      expect(env.isDev).toBe(true);
      expect(env.isDev).toBe(true);
    });

    it("should handle rapid environment changes", () => {
      process.env.NODE_ENV = "development";
      expect(env.isDev).toBe(true);

      process.env.NODE_ENV = "production";
      expect(env.isDev).toBe(false);

      process.env.NODE_ENV = "development";
      expect(env.isDev).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle process.env being undefined", () => {
      const originalProcess = process;
      (global as any).process = undefined;

      // This should not throw an error
      expect(() => env.isDev).not.toThrow();

      // Restore process
      (global as any).process = originalProcess;
    });

    it("should handle process.env.NODE_ENV being null", () => {
      process.env.NODE_ENV = null as any;
      expect(env.isDev).toBe(false); // null !== 'development'
    });

    it("should handle process.env.NODE_ENV being an empty string", () => {
      process.env.NODE_ENV = "";
      expect(env.isDev).toBe(false);
    });

    it("should handle process.env.NODE_ENV being a number", () => {
      process.env.NODE_ENV = 123 as any;
      expect(env.isDev).toBe(false); // Non-development string
    });

    it("should handle process.env.NODE_ENV being an object", () => {
      process.env.NODE_ENV = { env: "development" } as any;
      expect(env.isDev).toBe(false); // Non-development string
    });
  });

  describe("Integration with Electron App States", () => {
    it("should work correctly with different app packaged states", () => {
      const testCases = [
        { isPackaged: true, nodeEnv: "development", expected: true },
        { isPackaged: true, nodeEnv: "production", expected: false },
        { isPackaged: false, nodeEnv: "development", expected: true },
        { isPackaged: false, nodeEnv: "production", expected: false },
        { isPackaged: undefined, nodeEnv: "development", expected: true },
        { isPackaged: null, nodeEnv: "production", expected: false },
      ];

      testCases.forEach(({ isPackaged, nodeEnv, expected }) => {
        process.env.NODE_ENV = nodeEnv;
        (global as any).electron = { app: { isPackaged } };

        expect(env.isDev).toBe(expected);
      });
    });
  });
});
