import { vi } from "vitest";
import type { IWebSocketService } from "../../services/interfaces/IWebSocketService";

export const mockWebSocketService: IWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  onMessage: vi.fn(),
  onOpen: vi.fn(),
  onClose: vi.fn(),
  onError: vi.fn(),
  getReadyState: vi.fn(),
  isConnected: vi.fn(),
  setBinaryType: vi.fn(), // Binary protocol support
};