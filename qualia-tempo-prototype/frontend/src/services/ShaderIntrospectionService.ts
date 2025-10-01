/**
 * QUALIA.CODE v1.1 - ShaderIntrospectionService
 * AST-based GLSL shader introspection service for automatic uniform extraction and shader separation.
 * Eliminates manual regex parsing and hardcoded shader logic.
 */

import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import type { IShaderIntrospectionService } from './interfaces/IShaderIntrospectionService';
import type { ILogger } from './interfaces/ILogger';
import * as THREE from 'three';
import type { IUniform } from 'three';
import { logMethod, catchError } from '../utils/decorators';

@injectable()
export class ShaderIntrospectionService implements IShaderIntrospectionService {
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.logger = logger;
  }

  @logMethod
  @catchError
  public introspect(shaderSource: string): {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, IUniform>;
  } {
    this.logger.debug('Introspecting shader source');

    // Split shader source by pragmas
    const vertexMatch = shaderSource.match(/#pragma VERTEX\s*\n([\s\S]*?)(?=#pragma FRAGMENT|$)/);
    const fragmentMatch = shaderSource.match(/#pragma FRAGMENT\s*\n([\s\S]*)/);

    if (!vertexMatch || !fragmentMatch) {
      throw new Error('Shader source must contain #pragma VERTEX and #pragma FRAGMENT sections');
    }

    const vertexShader = vertexMatch[1].trim();
    const fragmentShader = fragmentMatch[1].trim();

    // Parse fragment shader to extract uniforms using AST
    const uniforms = this.extractUniforms(fragmentShader);

    this.logger.debug(`Extracted ${Object.keys(uniforms).length} uniforms from shader`);

    return {
      vertexShader,
      fragmentShader,
      uniforms
    };
  }

  private extractUniforms(shaderSource: string): Record<string, IUniform> {
    const uniforms: Record<string, IUniform> = {};

    // Use regex to find all uniform declarations
    const uniformRegex = /uniform\s+(\w+)\s+(\w+)\s*;/g;
    let match;

    while ((match = uniformRegex.exec(shaderSource)) !== null) {
      const type = match[1];
      const name = match[2];
      const defaultValue = this.getDefaultValueForType(type);

      uniforms[name] = { value: defaultValue };
    }

    return uniforms;
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