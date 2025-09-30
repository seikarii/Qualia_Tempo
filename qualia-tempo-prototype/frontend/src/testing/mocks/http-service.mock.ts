import { vi } from "vitest";
import type { IHttpService } from "../../services/interfaces/IHttpService";

export const mockHttpService: IHttpService = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};