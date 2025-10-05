/**
 * QUALIA.CODE v1.2 - IShaderIntrospectionService Interface
 * CRISALIDA.CODE v1.1 COMPLIANT - Async AST-based shader introspection.
 */

import type { IUniform } from 'three';

export interface IShaderIntrospectionService {
  /**
   * Introspects GLSL shader source to extract vertex/fragment shaders and uniforms.
   * Now async to support AST-based parsing.
   * 
   * @param shaderSource - GLSL source code (supports pragma-separated or fragment-only)
   * @returns Promise resolving to separated shaders and extracted uniforms
   */
  introspect(shaderSource: string): Promise<{
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, IUniform>;
  }>;
}