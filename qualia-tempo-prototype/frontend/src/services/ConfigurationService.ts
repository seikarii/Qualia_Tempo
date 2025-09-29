/**
 * QUALIA.CODE v1.1 - ConfigurationService
 * Service responsible for loading and managing game configuration from YAML files.
 *
 * Architecture:
 * - Loads configuration from multiple external YAML files
 * - Provides type-safe configuration access to all services
 * - Integrates with BackendSyncService for runtime updates
 * - Supports configuration validation and defaults
 * - Follows Configuration-First Mandate: NO HARDCODED VALUES
 * - InversifyJS dependency injection support
 */

import { injectable, inject } from "inversify";
import type { IConfigurationService } from "./interfaces/IConfigurationService";
import type { IHttpService } from "./interfaces/IHttpService";
import type { ILogger } from "./interfaces/ILogger";
import type { FullGameConfig } from "../types/config";
import { TYPES } from "./inversify.types";
import * as yaml from "js-yaml";
import { logMethod, catchError } from "../utils/decorators";
import { validateFullGameConfig } from "./config-validators";

// === CONFIGURATION INTERFACES MIGRATED ===
// All configuration interfaces have been migrated to their respective service contract files.
// This eliminates the god object anti-pattern and creates proper separation of concerns.
// Import the composed configuration type from the centralized composition file.

/**
 * QUALIA.CODE v1.1 - ConfigurationService Implementation
 * Loads and manages configuration from multiple YAML files
 */
@injectable()
export class ConfigurationService implements IConfigurationService {
  private configBasePath: string;
  private loadedConfig: FullGameConfig | null = null;
  private logger: ILogger;
  private httpService: IHttpService;

  // Configuration files discovery - NO HARDCODING
  private configFileManifest: Record<string, string> = {};

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    @inject(TYPES.IHttpService) httpService: IHttpService,
    @inject(TYPES.ConfigBasePath) configBasePath: string,
    @inject(TYPES.ConfigManifest) configManifest: Record<string, string>,
  ) {
    this.logger = logger;
    this.httpService = httpService;
    this.configBasePath = configBasePath;

    // Accept configuration file manifest externally
    this.configFileManifest = configManifest;
  }



  /**
   * Load all configuration files from YAML
   * @returns Promise that resolves with the loaded configuration
   */

  // QUALIA.CODE EXCEPTION: @catchError decorator is intentionally omitted from loadConfig method.
  // This method is part of critical application bootstrap. Failures here must be fatal and stop the application.
  // The try...catch block within the method handles logging but re-throws the exception for proper fatal error handling.
  // eslint-disable-next-line @qualia-tempo/qualia-code/enforce-method-decorators

  @logMethod
  public async loadConfig(): Promise<FullGameConfig> {
    try {
      this.logger.info("Loading configuration from multiple YAML files...");

      // Load all configuration files in parallel
      const configPromises = Object.entries(this.configFileManifest).map(
        async ([key, path]) => {
          const fullPath = this.configBasePath + path;
          this.logger.debug(`Loading ${key} from ${fullPath}`);

          const yamlText = await this.httpService.get<string>(fullPath);
          return { key, config: yaml.load(yamlText) };
        },
      );

      const loadedConfigs = await Promise.all(configPromises);

      // Merge all configurations with proper typing
      const mergedConfig = {} as Partial<FullGameConfig>;
      loadedConfigs.forEach(({ key, config }) => {
        (mergedConfig as any)[key] = config;
      });

      // Validate configuration using modular validators
      validateFullGameConfig(mergedConfig as FullGameConfig);

      this.loadedConfig = mergedConfig as FullGameConfig;
      this.logger.info("All configurations loaded successfully");

      return this.loadedConfig;
    } catch (error) {
      this.logger.error("Failed to load configuration:", { error });
      throw error;
    }
  }

  /**
   * Get the complete configuration
   */
  @logMethod
  public getConfig(): FullGameConfig {
    if (!this.loadedConfig) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }
    return this.loadedConfig;
  }

  /**
   * @deprecated ARCHITECTURAL MIGRATION: Service Locator antipattern elimination
   * This method is deprecated. Services should inject their configuration directly.
   * See inversify.config.ts configureServices() function for the new approach.
   */
  @logMethod
  public getConfigSection<K extends keyof FullGameConfig>(sectionKey: K): FullGameConfig[K] {
    if (!this.loadedConfig) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }

    const section = this.loadedConfig[sectionKey];
    if (!section) {
      throw new Error(`Configuration section '${sectionKey}' not found.`);
    }

    return section;
  }

  // === VALIDATION REMOVED ===
  // Monolithic validation method replaced with modular validators.
  // See config-validators/ directory for individual validation functions.

  // === DEPRECATED GETTERS REMOVED ===
  // All specific getter methods (getQualiaConfig, getAudioConfig, etc.) have been removed.
  // Services should now use the generic getConfigSection<T>(sectionKey) method with proper typing.
  // This eliminates tight coupling and creates a truly generic configuration service.

  /**
   * Check if configuration is loaded
   */
  @logMethod
  public isLoaded(): boolean {
    return this.loadedConfig !== null;
  }

  /**
   * Reload configuration from external sources
   */
  @logMethod
  @catchError
  public async reload(): Promise<void> {
    this.loadedConfig = null;
    await this.loadConfig();
  }
}
