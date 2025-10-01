/**
 * QUALIA.CODE v1.1 - ShaderIntrospectionService Unit Tests
 * Tests AST-based GLSL shader introspection for automatic uniform extraction and shader separation.
 */

import { createTestContainer } from '../../testing/test-container-factory';
import { IShaderIntrospectionService } from '../interfaces/IShaderIntrospectionService';
import { TYPES } from '../inversify.types';
import { ShaderIntrospectionService } from '../ShaderIntrospectionService';
import * as THREE from 'three';
import { Container } from 'inversify';
import { mockLogger } from '../../testing/mocks/logger.mock';

describe('ShaderIntrospectionService', () => {
  let service: IShaderIntrospectionService;

  beforeEach(() => {
    // Create a minimal container just for this test
    const container = new Container();
    container.bind(TYPES.ILogger).toConstantValue(mockLogger);
    container.bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService).to(ShaderIntrospectionService).inSingletonScope();
    service = container.get<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService);
  });

  it('should correctly parse a shader with multiple uniforms', () => {
    // Arrange
    const shaderSource = `
#pragma VERTEX
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#pragma FRAGMENT
uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D tDiffuse;

void main() {
  gl_FragColor = texture2D(tDiffuse, vUv);
}
`;

    // Act
    const result = service.introspect(shaderSource);

    // Assert
    expect(result.vertexShader).toBeDefined();
    expect(result.fragmentShader).toBeDefined();
    expect(result.uniforms).toHaveProperty('u_time');
    expect(result.uniforms).toHaveProperty('u_resolution');
    expect(result.uniforms).toHaveProperty('tDiffuse');
    expect(result.uniforms.u_time.value).toBe(0.0);
    expect(result.uniforms.tDiffuse.value).toBeNull();
  });

  it('should handle shaders with comments', () => {
    // Arrange
    const shaderSource = `
// Vertex shader
#pragma VERTEX
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

/* Fragment shader */
#pragma FRAGMENT
uniform float u_opacity; // Opacity uniform
uniform vec3 u_color; // Color uniform

void main() {
  gl_FragColor = vec4(u_color, u_opacity);
}
`;

    // Act
    const result = service.introspect(shaderSource);

    // Assert
    expect(result.uniforms).toHaveProperty('u_opacity');
    expect(result.uniforms).toHaveProperty('u_color');
    expect(result.uniforms.u_opacity.value).toBe(0.0);
  });

  it('should throw error for malformed shader without pragmas', () => {
    // Arrange
    const shaderSource = `
uniform float u_test;
void main() {
  gl_FragColor = vec4(1.0);
}
`;

    // Act & Assert
    expect(() => service.introspect(shaderSource)).toThrow('Shader source must contain #pragma VERTEX and #pragma FRAGMENT sections');
  });

  it('should handle vec3 and vec4 uniforms', () => {
    // Arrange
    const shaderSource = `
#pragma VERTEX
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#pragma FRAGMENT
uniform vec3 u_position;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

    // Act
    const result = service.introspect(shaderSource);

    // Assert
    expect(result.uniforms).toHaveProperty('u_position');
    expect(result.uniforms).toHaveProperty('u_color');
    expect(result.uniforms.u_position.value).toBeInstanceOf(THREE.Vector3);
    expect(result.uniforms.u_color.value).toBeInstanceOf(THREE.Vector4);
  });

  it('should handle mat4 uniforms', () => {
    // Arrange
    const shaderSource = `
#pragma VERTEX
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#pragma FRAGMENT
uniform mat4 u_transform;

void main() {
  gl_FragColor = vec4(1.0);
}
`;

    // Act
    const result = service.introspect(shaderSource);

    // Assert
    expect(result.uniforms).toHaveProperty('u_transform');
    expect(result.uniforms.u_transform.value).toBeInstanceOf(THREE.Matrix4);
  });
});