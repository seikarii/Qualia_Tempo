/**
 * QUALIA.CODE v1.1 - IConfigurationService Interface
 * 
 * ARCHITECTURAL MISSION: Generic, type-safe configuration provider.
 * NO knowledge of specific service configuration structures.
 * Eliminates god object anti-pattern through decoupled design.
 */

import type { FullGameConfig } from '../../types/config';

/**
 * Minimal, powerful configuration service interface.
 * 
 * PRINCIPLE: ConfigurationService is a generic configuration provider.
 * It does NOT define configuration contracts - those belong to individual services.
 * It provides type-safe access to externally-defined configuration structures.
 */
export interface IConfigurationService {
  /**
   * Load configuration from external YAML files.
   * @returns Promise that resolves with the complete loaded configuration
   */
  loadConfig(): Promise<FullGameConfig>;

  /**
   * Get the complete configuration object.
   * @returns The full configuration object
   */
  getConfig(): FullGameConfig;

  /**
   * Get specific configuration section with full type safety.
   * 
   * @deprecated ARCHITECTURAL MIGRATION: This method is deprecated as part of the
   * elimination of the Service Locator antipattern. Services should now inject
   * their specific configuration objects directly via @inject(TYPES.ConfigName).
   * 
   * MIGRATION PATH:
   * OLD: constructor(@inject(TYPES.IConfigurationService) config: IConfigurationService)
   *      this.config = config.getConfigSection("myService")
   * NEW: constructor(@inject(TYPES.MyServiceConfig) config: MyServiceConfig)
   *      this.config = config
   * 
   * @param sectionKey - The key of the configuration section
   * @returns The requested configuration section with correct typing
   */
  getConfigSection<K extends keyof FullGameConfig>(sectionKey: K): FullGameConfig[K];

  /**
   * Check if configuration is loaded.
   * @returns True if configuration is loaded, false otherwise
   */
  isLoaded(): boolean;

  /**
   * Reload configuration from external sources.
   * @returns Promise that resolves when configuration is reloaded
   */
  reload(): Promise<void>;
}
