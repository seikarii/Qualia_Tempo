import type { IUniform } from 'three';

export interface IShaderIntrospectionService {
  introspect(shaderSource: string): {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, IUniform>;
  };
}