/**
 * QUALIA.CODE v1.2 - ShaderLoaderService
 * Loads external GLSL shader files from /public/shaders/ directory.
 * Implements caching and HttpService abstraction for architectural purity.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "./inversify.types";
import type { IShaderLoaderService } from "./interfaces/IShaderLoaderService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ILogger } from "./interfaces/ILogger";
import { logMethod, catchError } from "../utils/decorators";

@injectable()
export class ShaderLoaderService implements IShaderLoaderService {
  private readonly logger: ILogger;
  private readonly httpService: IHttpService;
  private readonly cache = new Map<string, string>();

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IHttpService) httpService: IHttpService
  ) {
    this.logger = logger;
    this.httpService = httpService;
  }

  @logMethod
  @catchError
  async load(shaderName: string): Promise<string> {
    // Check cache first
    if (this.cache.has(shaderName)) {
      this.logger.debug(`Shader '${shaderName}' loaded from cache`);
      return this.cache.get(shaderName)!;
    }

    const shaderPath = `/shaders/${shaderName}.glsl`;

    try {
      this.logger.debug(`Loading shader from ${shaderPath}`);
      const shaderSource = await this.httpService.get<string>(shaderPath, {
        headers: { 'Content-Type': 'text/plain' }
      });

      // Cache the shader
      this.cache.set(shaderName, shaderSource);

      this.logger.info(`Shader '${shaderName}' loaded and cached successfully`);
      return shaderSource;
    } catch (error) {
      this.logger.error(`Failed to load shader '${shaderName}' from ${shaderPath}`, { error });
      throw new Error(`Shader loading failed: ${shaderName}`);
    }
  }
}