import { vi } from "vitest";
import type { ILogger } from "../../services/interfaces/ILogger";

export const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn().mockReturnValue("info"),
  child: vi.fn().mockReturnThis(),
};