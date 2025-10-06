/**
 * QUALIA.CODE v1.2 - IShaderIntrospectionService Interface
 * CRISALIDA.CODE v1.1 COMPLIANT - Async AST-based shader introspection.
 */

import type { IUniform } from 'three';

/**
 * Result of shader introspection with separated shaders and extracted uniforms.
 * This is the canonical data structure for passing shader data to post-processing passes.
 * 
 * ARCHITECTURAL NOTE: Passes should accept this type instead of raw shader strings
 * to eliminate pragma parsing and ensure proper #version directive handling.
 */
export interface IntrospectedShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, IUniform>;
}

export interface IShaderIntrospectionService {
  /**
   * Introspects GLSL shader source to extract vertex/fragment shaders and uniforms.
   * Now async to support AST-based parsing.
   * 
   * @param shaderSource - GLSL source code (supports pragma-separated or fragment-only)
   * @returns Promise resolving to separated shaders and extracted uniforms
   */
  introspect(shaderSource: string): Promise<IntrospectedShader>;
}