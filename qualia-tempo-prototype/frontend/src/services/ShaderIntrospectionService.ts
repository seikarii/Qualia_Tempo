/**
 * QUALIA.CODE v1.2 - ShaderIntrospectionService
 * CRISALIDA.CODE v1.1 COMPLIANT - Robust AST-based GLSL shader introspection.
 * 
 * ARCHITECTURAL EVOLUTION:
 * - Replaced fragile regex parsing with robust AST-based parsing via IGlslParser
 * - Injected parser abstraction enables zero-impact Wasm upgrade path
 * - Eliminates #pragma requirements for fragment-only shaders
 * - Maintains decorator compliance per QUALIA.CODE Section 6.2.1
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IShaderIntrospectionService } from './interfaces/IShaderIntrospectionService';
import type { IGlslParser } from './interfaces/IGlslParser';
import type { ILogger } from './interfaces/ILogger';
import * as THREE from 'three';
import type { IUniform } from 'three';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ShaderIntrospectionService implements IShaderIntrospectionService {
  private readonly logger: ILogger;
  private readonly parser: IGlslParser;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IGlslParser) parser: IGlslParser
  ) {
    this.logger = logger;
    this.parser = parser;
  }

  @logMethod
  @catchError
  public async introspect(shaderSource: string): Promise<{
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, IUniform>;
  }> {
    this.logger.debug('Introspecting shader source using AST parsing');

    // Check for pragma-based shader separation
    const vertexMatch = shaderSource.match(/#pragma VERTEX\s*\n([\s\S]*?)(?=#pragma FRAGMENT|$)/);
    const fragmentMatch = shaderSource.match(/#pragma FRAGMENT\s*\n([\s\S]*?)$/);

    let vertexShader: string;
    let fragmentShader: string;

    if (vertexMatch && fragmentMatch) {
      // Shader has explicit pragma sections
      vertexShader = vertexMatch[1].trim();
      fragmentShader = fragmentMatch[1].trim();
      this.logger.debug('Shader uses pragma-based separation');
    } else {
      // Fragment-only shader - generate passthrough vertex shader
      vertexShader = this.generatePassthroughVertexShader();
      fragmentShader = shaderSource.trim();
      this.logger.debug('Fragment-only shader detected, generated passthrough vertex shader');
    }

    // CRITICAL FIX: Strip #version and #extension directives
    // Three.js ShaderMaterial prepends its own shader chunks, pushing #version down
    // GLSL spec requires #version to be the FIRST line, so we must remove it
    // and let Three.js handle the version declaration
    vertexShader = this.stripVersionDirectives(vertexShader);
    fragmentShader = this.stripVersionDirectives(fragmentShader);

    // Parse fragment shader to extract uniforms using AST
    const uniforms = await this.extractUniforms(fragmentShader);

    this.logger.debug(`Extracted ${Object.keys(uniforms).length} uniforms from shader`);

    return {
      vertexShader,
      fragmentShader,
      uniforms
    };
  }

  /**
   * Strips #version and #extension directives from shader source.
   * 
   * CRITICAL: Even RawShaderMaterial adds #define directives before our code,
   * which pushes #version to line 2+, violating GLSL spec. The glslVersion
   * property on RawShaderMaterial handles version declaration correctly.
   * 
   * QUALIA.CODE Compliance: Platform abstraction - let Three.js manage GLSL version
   */
  private stripVersionDirectives(shaderSource: string): string {
    // Remove ALL version and extension directives from source
    // The glslVersion: THREE.GLSL3 property on RawShaderMaterial will handle this
    return shaderSource
      .replace(/#version\s+\d+\s+\w+\s*\n?/g, '')
      .replace(/#extension\s+\S+\s*:\s*\w+\s*\n?/g, '')
      .trim();
  }

  private async extractUniforms(shaderSource: string): Promise<Record<string, IUniform>> {
    const uniforms: Record<string, IUniform> = {};

    try {
      // Parse shader source into AST
      const ast = await this.parser.parse(shaderSource);

      // Extract uniform declarations from AST
      const uniformDeclarations = this.parser.extractUniforms(ast);

      // Convert uniform declarations to Three.js uniform objects
      for (const uniform of uniformDeclarations) {
        const defaultValue = this.getDefaultValueForType(uniform.type);
        uniforms[uniform.name] = { value: defaultValue };
      }

      this.logger.debug(`AST parsing extracted ${uniformDeclarations.length} uniforms`);
    } catch (error) {
      this.logger.error('Failed to extract uniforms via AST parsing', { error });
      throw new Error(`Uniform extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return uniforms;
  }

  /**
   * Generates a default passthrough vertex shader for fragment-only shaders.
   * This shader simply passes through position and UV coordinates.
   */
  private generatePassthroughVertexShader(): string {
    return `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `.trim();
  }

  private getDefaultValueForType(type: string): THREE.Vector2 | THREE.Vector3 | THREE.Vector4 | THREE.Matrix4 | number | null {
    switch (type) {
      case 'sampler2D':
        return null;
      case 'float':
        return 0.0;
      case 'vec2':
        return new THREE.Vector2(0, 0);
      case 'vec3':
        return new THREE.Vector3(0, 0, 0);
      case 'vec4':
        return new THREE.Vector4(0, 0, 0, 0);
      case 'mat4':
        return new THREE.Matrix4();
      default:
        return null;
    }
  }
}