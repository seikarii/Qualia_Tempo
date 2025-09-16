// Mock Electron app
jest.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

// Mock process.env
const originalEnv = process.env;

describe("env utilities", () => {
  beforeEach(() => {
    jest.resetModules();
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  test("isDev returns true in development mode", () => {
    process.env.NODE_ENV = "development";

    // Re-evaluate the module to get updated value
    jest.resetModules();
    const { isDev: isDevDev } = require("../env");

    expect(isDevDev).toBe(true);
  });

  test("isDev returns true when app is not packaged", () => {
    process.env.NODE_ENV = "production";

    // Re-evaluate the module to get updated value
    jest.resetModules();
    const { isDev: isDevProd } = require("../env");

    expect(isDevProd).toBe(true);
  });

  test("isDev returns false in production when app is packaged", () => {
    // Mock app as packaged for this test
    jest.doMock("electron", () => ({
      app: {
        isPackaged: true,
      },
    }));

    process.env.NODE_ENV = "production";

    // Re-evaluate the module to get updated value
    jest.resetModules();
    const { isDev: isDevPackaged } = require("../env");

    expect(isDevPackaged).toBe(false);
  });
});
