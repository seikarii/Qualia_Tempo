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
