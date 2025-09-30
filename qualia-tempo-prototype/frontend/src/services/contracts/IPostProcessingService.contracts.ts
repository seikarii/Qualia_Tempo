/**
 * QUALIA.CODE v3.2 - PostProcessingService Contracts
 * Configuration contracts for dynamic post-processing pipeline graph.
 */

export interface PostProcessingPass {
  type: string; // e.g., 'UnrealBloomPass', 'ShaderPass'
  enabled: boolean;
  name?: string; // Optional name for pass result identification
  params?: Record<string, any>; // Parameters for the pass
  shader?: string; // Shader name for ShaderPass
  uniforms?: Record<string, { value: any }>; // Uniforms for ShaderPass
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
}