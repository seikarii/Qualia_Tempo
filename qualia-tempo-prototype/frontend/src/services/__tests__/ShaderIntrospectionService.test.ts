/**
 * QUALIA.CODE v1.2 - ShaderIntrospectionService Test Suite
 * CRISALIDA.CODE v1.1 COMPLIANT
 * 
 * Test Strategy:
 * - Uses createTestContainer factory (no direct instantiation)
 * - High-fidelity mocks for IGlslParser
 * - Tests pragma-based and fragment-only shader handling
 * - Validates uniform extraction from realistic AST
 * - 100% code coverage mandate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from 'inversify';
import { TYPES } from '../inversify.types';
import type { IShaderIntrospectionService } from '../interfaces/IShaderIntrospectionService';
import type { IGlslParser, GlslAst, UniformDeclaration } from '../interfaces/IGlslParser';
import type { ILogger } from '../interfaces/ILogger';
import { ShaderIntrospectionService } from '../ShaderIntrospectionService';
import { createMockGlslParser } from '../../testing/mocks/glsl-parser.mock';
import { mockLogger } from '../../testing/mocks/logger.mock';

describe('ShaderIntrospectionService (CRISALIDA.CODE v1.1)', () => {
  let container: Container;
  let service: IShaderIntrospectionService;
  let parser: IGlslParser;
  let logger: ILogger;

  beforeEach(() => {
    // Create isolated test container per QUALIA.CODE Section 10.3
    container = new Container();

    // Bind mocks
    parser = createMockGlslParser();
    logger = mockLogger;

    container.bind<IGlslParser>(TYPES.IGlslParser).toConstantValue(parser);
    container.bind<ILogger>(TYPES.ILogger).toConstantValue(logger);

    // Bind service under test
    container
      .bind<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService)
      .to(ShaderIntrospectionService)
      .inSingletonScope();

    // Resolve service
    service = container.get<IShaderIntrospectionService>(TYPES.IShaderIntrospectionService);
  });

  describe('Pragma-Based Shader Introspection', () => {
    it('should correctly parse shader with #pragma VERTEX and #pragma FRAGMENT', async () => {
      // Arrange
      const shaderSource = `
        #pragma VERTEX
        void main() { gl_Position = vec4(position, 1.0); }
        
        #pragma FRAGMENT
        uniform vec3 uColor;
        void main() { gl_FragColor = vec4(uColor, 1.0); }
      `;

      const mockAst: GlslAst = {
        type: 'program',
        program: [
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'vec3' }
            },
            declarators: [{ identifier: { identifier: 'uColor' } }]
          }
        ]
      };

      const mockUniforms: UniformDeclaration[] = [
        { name: 'uColor', type: 'vec3', qualifier: 'uniform' }
      ];

      vi.mocked(parser.parse).mockResolvedValue(mockAst);
      vi.mocked(parser.extractUniforms).mockReturnValue(mockUniforms);

      // Act
      const result = await service.introspect(shaderSource);

      // Assert
      expect(result.vertexShader).toContain('gl_Position');
      expect(result.fragmentShader).toContain('uColor');
      expect(result.uniforms).toHaveProperty('uColor');
      expect(result.uniforms.uColor.value).toBeDefined();
      expect(parser.parse).toHaveBeenCalledWith(expect.stringContaining('uColor'));
      expect(parser.extractUniforms).toHaveBeenCalledWith(mockAst);
    });
  });

  describe('Fragment-Only Shader Introspection', () => {
    it('should generate passthrough vertex shader for fragment-only input', async () => {
      // Arrange
      const fragmentOnlySource = `
        uniform sampler2D tDiffuse;
        uniform float uIntensity;
        varying vec2 vUv;
        
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          gl_FragColor = texel * uIntensity;
        }
      `;

      const mockAst: GlslAst = {
        type: 'program',
        program: [
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'sampler2D' }
            },
            declarators: [{ identifier: { identifier: 'tDiffuse' } }]
          },
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'float' }
            },
            declarators: [{ identifier: { identifier: 'uIntensity' } }]
          }
        ]
      };

      const mockUniforms: UniformDeclaration[] = [
        { name: 'tDiffuse', type: 'sampler2D', qualifier: 'uniform' },
        { name: 'uIntensity', type: 'float', qualifier: 'uniform' }
      ];

      vi.mocked(parser.parse).mockResolvedValue(mockAst);
      vi.mocked(parser.extractUniforms).mockReturnValue(mockUniforms);

      // Act
      const result = await service.introspect(fragmentOnlySource);

      // Assert
      expect(result.vertexShader).toContain('varying vec2 vUv');
      expect(result.vertexShader).toContain('projectionMatrix');
      expect(result.fragmentShader).toContain('tDiffuse');
      expect(result.uniforms).toHaveProperty('tDiffuse');
      expect(result.uniforms).toHaveProperty('uIntensity');
      expect(result.uniforms.tDiffuse.value).toBeNull(); // sampler2D defaults to null
      expect(result.uniforms.uIntensity.value).toBe(0.0); // float defaults to 0
    });
  });

  describe('Realistic SSR v2 Shader Test', () => {
    it('should extract all uniforms from ssr_v2.glsl shader', async () => {
      // Arrange - Simulating real ssr_v2.glsl shader
      const ssrShaderSource = `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform sampler2D tNormal;
        uniform mat4 cameraProjectionMatrix;
        uniform mat4 cameraInverseProjectionMatrix;
        uniform float uIntensity;
        uniform float uReflectionStrength;
        uniform vec2 uResolution;
        
        varying vec2 vUv;
        
        void main() {
          // Complex SSR logic...
          gl_FragColor = vec4(1.0);
        }
      `;

      const mockAst: GlslAst = {
        type: 'program',
        program: [
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'sampler2D' }
            },
            declarators: [
              { identifier: { identifier: 'tDiffuse' } },
              { identifier: { identifier: 'tDepth' } },
              { identifier: { identifier: 'tNormal' } }
            ]
          },
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'mat4' }
            },
            declarators: [
              { identifier: { identifier: 'cameraProjectionMatrix' } },
              { identifier: { identifier: 'cameraInverseProjectionMatrix' } }
            ]
          },
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'float' }
            },
            declarators: [
              { identifier: { identifier: 'uIntensity' } },
              { identifier: { identifier: 'uReflectionStrength' } }
            ]
          },
          {
            type: 'declaration',
            specified_type: {
              qualifiers: [{ token: 'uniform' }],
              specifier: { token: 'vec2' }
            },
            declarators: [{ identifier: { identifier: 'uResolution' } }]
          }
        ]
      };

      const mockUniforms: UniformDeclaration[] = [
        { name: 'tDiffuse', type: 'sampler2D', qualifier: 'uniform' },
        { name: 'tDepth', type: 'sampler2D', qualifier: 'uniform' },
        { name: 'tNormal', type: 'sampler2D', qualifier: 'uniform' },
        { name: 'cameraProjectionMatrix', type: 'mat4', qualifier: 'uniform' },
        { name: 'cameraInverseProjectionMatrix', type: 'mat4', qualifier: 'uniform' },
        { name: 'uIntensity', type: 'float', qualifier: 'uniform' },
        { name: 'uReflectionStrength', type: 'float', qualifier: 'uniform' },
        { name: 'uResolution', type: 'vec2', qualifier: 'uniform' }
      ];

      vi.mocked(parser.parse).mockResolvedValue(mockAst);
      vi.mocked(parser.extractUniforms).mockReturnValue(mockUniforms);

      // Act
      const result = await service.introspect(ssrShaderSource);

      // Assert
      expect(Object.keys(result.uniforms)).toHaveLength(8);
      expect(result.uniforms).toHaveProperty('tDiffuse');
      expect(result.uniforms).toHaveProperty('cameraProjectionMatrix');
      expect(result.uniforms).toHaveProperty('uResolution');
      
      // Validate type mappings
      expect(result.uniforms.tDiffuse.value).toBeNull();
      expect(result.uniforms.uIntensity.value).toBe(0.0);
      expect(result.uniforms.uResolution.value).toHaveProperty('x');
      expect(result.uniforms.cameraProjectionMatrix.value).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when parser fails', async () => {
      // Arrange
      const invalidShader = 'invalid glsl syntax ###';
      vi.mocked(parser.parse).mockRejectedValue(new Error('Parse error'));

      // Act & Assert
      await expect(service.introspect(invalidShader)).rejects.toThrow('Uniform extraction failed');
    });

    it('should handle parser returning empty AST', async () => {
      // Arrange
      const emptyShader = 'void main() {}';
      vi.mocked(parser.parse).mockResolvedValue({ type: 'program', program: [] });
      vi.mocked(parser.extractUniforms).mockReturnValue([]);

      // Act
      const result = await service.introspect(emptyShader);

      // Assert
      expect(Object.keys(result.uniforms)).toHaveLength(0);
    });
  });

  describe('Type Mapping', () => {
    it('should correctly map GLSL types to Three.js values', async () => {
      // Arrange
      const mockUniforms: UniformDeclaration[] = [
        { name: 'uFloat', type: 'float', qualifier: 'uniform' },
        { name: 'uVec2', type: 'vec2', qualifier: 'uniform' },
        { name: 'uVec3', type: 'vec3', qualifier: 'uniform' },
        { name: 'uVec4', type: 'vec4', qualifier: 'uniform' },
        { name: 'uMat4', type: 'mat4', qualifier: 'uniform' },
        { name: 'uSampler', type: 'sampler2D', qualifier: 'uniform' },
        { name: 'uUnknown', type: 'customType', qualifier: 'uniform' }
      ];

      vi.mocked(parser.parse).mockResolvedValue({ type: 'program', program: [] });
      vi.mocked(parser.extractUniforms).mockReturnValue(mockUniforms);

      // Act
      const result = await service.introspect('test');

      // Assert
      expect(result.uniforms.uFloat.value).toBe(0.0);
      expect(result.uniforms.uVec2.value).toHaveProperty('x');
      expect(result.uniforms.uVec3.value).toHaveProperty('z');
      expect(result.uniforms.uVec4.value).toHaveProperty('w');
      expect(result.uniforms.uMat4.value).toHaveProperty('elements');
      expect(result.uniforms.uSampler.value).toBeNull();
      expect(result.uniforms.uUnknown.value).toBeNull();
    });
  });
});
