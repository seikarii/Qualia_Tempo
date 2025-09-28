/**
 * QUALIA.CODE v1.1 - ApplicationCompositionRoot
 * Handles application bootstrap and initialization without exposing IoC container
 * Implements the Composition Root pattern for dependency injection
 */

import { container } from "./inversify.container";
import { TYPES } from "./inversify.types";
// Environment check handled by Vite's import.meta.env
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import { ILogger } from "./interfaces/ILogger";
import { IDebugService } from "./interfaces/IDebugService";
import { IConfigurationService } from "./interfaces/IConfigurationService";
import { LoggerProvider, QualiaLogger } from "./Logger";

/**
 * ApplicationCompositionRoot - The ONLY class allowed to access container directly
 * Encapsulates all bootstrap logic and IoC container interaction
 */
export class ApplicationCompositionRoot {
  /**
   * Initialize the entire application
   * This method handles ALL bootstrap logic that was previously in index.tsx
   */
  public async initializeApplication(): Promise<void> {
    // Step 0: Load configuration FIRST - CRITICAL for QUALIA.CODE compliance
    const configService = container.get<IConfigurationService>(TYPES.IConfigurationService);
    await configService.loadConfig();

    // Step 1: NOW resolve core services from IoC container (they can access config)
    const logger = container.get<ILogger>(TYPES.ILogger);
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService,
    );

    // Step 2: Register logger for decorator access
    LoggerProvider.register(logger as QualiaLogger);

    logger.info("Application Bootstrap: Initializing services...");

    // Step 3: Start application services
    await appInitializer.start();

    // Step 4: Attach debug interface in development mode
    // Development debug interface setup handled by ConfigurationService
    const config = configService;
    // Debug interface setup using proper configuration access
    const debugConfig = config.getConfigSection("debugService");
    if (debugConfig?.development?.enableDebugOverlay) {
      try {
        const debugService = container.get<IDebugService>(TYPES.IDebugService);
        const debugInterface = debugService.getDebugInterface();
        if (debugInterface) {
          // Global API access is handled by dedicated service
          const globalApiService = debugInterface.getGlobalApiService();
          const debugKey = 'QA_DEBUG';  
          globalApiService.attachToWindow(debugKey, debugInterface);
          logger.info(`🌐 [BOOTSTRAP] Debug interface attached to window.${debugKey}`);
        }
      } catch (error) {
        logger.warn("⚠️ [BOOTSTRAP] Failed to attach debug interface:", error);
      }
    }

    // Application completion message
    logger.info("✅ [BOOTSTRAP] Application initialization completed successfully");
  }

  /**
   * Shutdown the application gracefully
   * Handles cleanup of services and resources
   */
  public async shutdownApplication(): Promise<void> {
    try {
      const logger = container.get<ILogger>(TYPES.ILogger);
      logger.info("Application Shutdown: Cleaning up services...");
      
      // TODO: Add service cleanup logic here
      // const appInitializer = container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
      // await appInitializer.stop();
      
      logger.info("Application Shutdown: Complete.");
    } catch (error) {
      // Emergency fallback - should not reach here in production
      try {
        const logger = container.get<ILogger>(TYPES.ILogger);
        logger.error("[SHUTDOWN ERROR]", error);
      } catch {
        // Last resort - log to external error tracking service
        // In production, this would integrate with error monitoring
      }
    }
  }
}
