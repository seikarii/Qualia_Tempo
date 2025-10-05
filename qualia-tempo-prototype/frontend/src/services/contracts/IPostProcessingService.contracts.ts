/**
 * QUALIA.CODE v4.0 - PostProcessingService Contracts
 * Dynamic post-processing orchestrator with modular pass management.
 * Supports TAA, Bloom, Motion Blur, DoF with intelligent dependency wiring.
 */

import type { ILogger } from "../interfaces/ILogger";
import type { IShaderLoaderService } from "../interfaces/IShaderLoaderService";
import type { IShaderIntrospectionService } from "../interfaces/IShaderIntrospectionService";
import type { IPerformanceService } from "../interfaces/IPerformanceService";
import type { IJitterService } from "../interfaces/IJitterService";
import type { BloomPassConfig } from "./IBloomPass.contracts";
import type { TAAPassConfig } from "./ITAAPass.contracts";
import type { MotionBlurPassConfig } from "./IMotionBlurPass.contracts";
import type { DoFPassConfig } from "./IDoFPass.contracts";
import type { JitterServiceConfig } from "./IJitterService.contracts";

/**
 * Orchestration configuration for post-processing pipeline
 */
export interface OrchestrationConfig {
  taaEnabled: boolean;
  bloomEnabled: boolean;
  motionBlurEnabled: boolean;
  dofEnabled: boolean;
  passOrder: string[];
  performance: {
    enableProfiling: boolean;
    targetFrameTime: number;
    autoQualityAdjust: boolean;
  };
}

/**
 * Master post-processing configuration aggregating all pass configs
 */
export interface PostProcessingConfig {
  enabled: boolean;
  renderTargetWidth: number;
  renderTargetHeight: number;
  orchestration: OrchestrationConfig;
  bloom: BloomPassConfig;
  taa: TAAPassConfig;
  motionBlur: MotionBlurPassConfig;
  dof: DoFPassConfig;
  jitter: JitterServiceConfig;
}

/**
 * Dependencies for PostProcessingService
 */
export interface PostProcessingServiceParams {
  logger: ILogger;
  shaderLoader: IShaderLoaderService;
  shaderIntrospection: IShaderIntrospectionService;
  performanceService: IPerformanceService;
  jitterService: IJitterService;
  config: PostProcessingConfig;
}