import { vi } from "vitest";
import type { IHttpService } from "../../services/interfaces/IHttpService";

export const mockHttpService: IHttpService = {
  get: vi.fn().mockResolvedValue({ data: null }),
  post: vi.fn().mockResolvedValue({ data: null }),
  put: vi.fn().mockResolvedValue({ data: null }),
  delete: vi.fn().mockResolvedValue({ success: true }),
};