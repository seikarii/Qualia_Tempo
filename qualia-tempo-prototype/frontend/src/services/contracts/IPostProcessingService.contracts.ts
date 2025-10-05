/**
 * QUALIA.CODE v3.2 - PostProcessingService Contracts
 * Configuration contracts for dynamic post-processing pipeline graph.
 */

import type { ILogger } from "../interfaces/ILogger";
import type { IShaderLoaderService } from "../interfaces/IShaderLoaderService";
import type { IShaderIntrospectionService } from "../interfaces/IShaderIntrospectionService";
import type { IPerformanceService } from "../interfaces/IPerformanceService";

export interface PostProcessingPass {
  type: string; // e.g., 'UnrealBloomPass', 'ShaderPass'
  enabled: boolean;
  name?: string; // Optional name for pass result identification
  params?: Record<string, unknown>; // Parameters for the pass
  shader?: string; // Shader name for ShaderPass
  uniforms?: Record<string, { value: unknown }>; // Uniforms for ShaderPass
}

export interface RenderTargetDefinition {
  name: string;
  width: number;
  height: number;
  format: 'HalfFloat' | 'Float' | 'UnsignedByte';
  options?: {
    minFilter?: 'Linear' | 'Nearest';
    magFilter?: 'Linear' | 'Nearest';
    wrapS?: 'ClampToEdge' | 'Repeat' | 'MirroredRepeat';
    wrapT?: 'ClampToEdge' | 'Repeat' | 'MirroredRepeat';
  };
}

export interface PipelineDefinition {
  name: string;
  enabled: boolean;
  input: string; // 'scene' for main scene, or named renderTarget
  output: string; // 'screen' for final output, or named renderTarget
  passes: PostProcessingPass[];
}

export interface PostProcessingConfig {
  enabled: boolean;
  renderTargetWidth: number;
  renderTargetHeight: number;
  renderTargets: RenderTargetDefinition[];
  pipelines: PipelineDefinition[];
  pipelineOrder: string[]; // Order in which pipelines should be executed
  renderTargetPool: {
    enabled: boolean;
    maxPoolSize: number;
    autoCleanup: boolean;
    debugMode: boolean;
  };
}

export interface PostProcessingServiceParams {
  logger: ILogger;
  shaderLoader: IShaderLoaderService;
  shaderIntrospection: IShaderIntrospectionService;
  config: PostProcessingConfig;
  performanceService: IPerformanceService;
}