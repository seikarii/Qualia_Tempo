import { vi } from "vitest";
import type { IShaderIntrospectionService } from '../../services/interfaces/IShaderIntrospectionService';

export const mockShaderIntrospectionService: IShaderIntrospectionService = {
  introspect: vi.fn(),
};