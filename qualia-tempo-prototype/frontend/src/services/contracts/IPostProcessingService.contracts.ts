/**
 * QUALIA.CODE v1.2 - PostProcessingService Contracts
 * Configuration contracts for post-processing effects pipeline.
 */

export interface PostProcessingPass {
  type: string; // e.g., 'UnrealBloomPass', 'ShaderPass'
  enabled: boolean;
  params?: Record<string, any>; // Parameters for the pass
  shader?: string; // Shader name for ShaderPass
  uniforms?: Record<string, { value: any }>; // Uniforms for ShaderPass
}

export interface PostProcessingConfig {
  enabled: boolean;
  renderTargetWidth: number;
  renderTargetHeight: number;
  passes: PostProcessingPass[];
}