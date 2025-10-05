/**
 * QUALIA.CODE v1.2 - High-Fidelity Mock for IGlslParser
 * CRISALIDA.CODE v1.1 COMPLIANT
 * 
 * This mock follows the High-Fidelity Mocking Standard (Section 10.3.1):
 * - All methods return type-safe default values
 * - Async methods use mockResolvedValue
 * - Default AST structure prevents undefined errors
 */

import { vi } from 'vitest';
import type { IGlslParser, GlslAst, UniformDeclaration } from '../../services/interfaces/IGlslParser';

/**
 * High-fidelity mock implementation of IGlslParser.
 * Provides sensible defaults that satisfy the interface contract.
 */
export const createMockGlslParser = (): IGlslParser => ({
  // High-fidelity: Returns a resolved promise with valid empty AST
  parse: vi.fn().mockResolvedValue({
    type: 'program' as const,
    program: [],
    scopes: []
  } as GlslAst),

  // High-fidelity: Returns empty array (valid return type)
  extractUniforms: vi.fn().mockReturnValue([] as UniformDeclaration[])
});

/**
 * Convenience export for direct usage in tests.
 */
export const mockGlslParser = createMockGlslParser();
