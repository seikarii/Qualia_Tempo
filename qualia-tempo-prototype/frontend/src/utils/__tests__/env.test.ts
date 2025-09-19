import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
// Mock Electron app
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

// Mock process.env
const originalEnv = process.env;

describe("env utilities", () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  test("isDev returns true in development mode", async () => {
    process.env.NODE_ENV = "development";

    // Re-evaluate the module to get updated value
    vi.resetModules();
    const { isDev: isDevDev } = await import("../env");

    expect(isDevDev).toBe(true);
  });

  test("isDev returns true when app is not packaged", async () => {
    process.env.NODE_ENV = "production";

    // Re-evaluate the module to get updated value
    vi.resetModules();
    const { isDev: isDevProd } = await import("../env");

    expect(isDevProd).toBe(true);
  });

  test("isDev returns false in production when app is packaged", async () => {
    // Mock app as packaged for this test
    vi.doMock("electron", () => ({
      app: {
        isPackaged: true,
      },
    }));

    process.env.NODE_ENV = "production";

    // Re-evaluate the module to get updated value
    vi.resetModules();
    const { isDev: isDevPackaged } = await import("../env");

    expect(isDevPackaged).toBe(false);
  });
});
