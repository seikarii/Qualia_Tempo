/**
 * QUALIA.CODE v1.1 - ApplicationCompositionRoot
 * Handles application bootstrap and initialization without exposing IoC container
 * Implements the Composition Root pattern for dependency injection
 */

import { container, configureServices } from "./inversify.config";
import { TYPES } from "./inversify.types";
// Environment check handled by Vite's import.meta.env
import type { IApplicationInitializerService } from "./interfaces/IApplicationInitializerService";
import type { IGameStateStoreService } from "./interfaces/IGameStateStoreService";
import { ILogger } from "./interfaces/ILogger";
import { IDebugService } from "./interfaces/IDebugService";
import type { DebugServiceConfig } from "./contracts/IDebugService.contracts";
import { LoggerProvider, QualiaLogger } from "./Logger";

/**
 * ApplicationCompositionRoot - The ONLY class allowed to access container directly
 * Encapsulates all bootstrap logic and IoC container interaction
 */
export class ApplicationCompositionRoot {
  /**
   * Connect the Zustand store to the service layer
   * QUALIA.CODE COMPLIANT: IoC container access only from Composition Root
   */
  private async connectStoreToServices(): Promise<void> {
    try {
      // Import the store API dynamically to avoid circular dependencies
      const { gameStoreApi } = await import("../state/useGameStore");
      
      // Get the GameStateStoreService from IoC container
      const gameStateStoreService = container.get<IGameStateStoreService>(TYPES.IGameStateStoreService);
      
      // Connect the store setter to the service - this creates the UI-Service bridge
      // CRITICAL: gameStoreApi.setState is the non-hook API method
      gameStateStoreService.setStoreSetter(gameStoreApi.setState);
      
      // Get logger for confirmation
      const logger = container.get<ILogger>(TYPES.ILogger);
      logger.info("✅ [BOOTSTRAP] UI-Service bridge established successfully");
      
    } catch (error) {
      const logger = container.get<ILogger>(TYPES.ILogger);
      logger.error("❌ [BOOTSTRAP] Failed to connect store to services:", error);
      throw error;
    }
  }

  /**
   * Initialize the entire application
   * This method handles ALL bootstrap logic that was previously in index.tsx
   */
  public async initializeApplication(): Promise<void> {
    // STEP 0: CRITICAL - Configure services with Direct Configuration Injection
    // This eliminates the Service Locator antipattern across the entire system
    // QUALIA.CODE v1.1: React.StrictMode safe configuration using container.isBound()
    await configureServices();

    // Step 1: NOW resolve core services from IoC container (they have direct config access)
    const logger = container.get<ILogger>(TYPES.ILogger);
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService,
    );

    // Step 2: Register logger for decorator access
    LoggerProvider.register(logger as QualiaLogger);

    logger.info("Application Bootstrap: Initializing services...");

    // Step 3: Connect UI store to service layer - CRITICAL for UI-Service bridge
    await this.connectStoreToServices();

    // Step 4: Start application services
    await appInitializer.start();

    // Step 5: Attach debug interface in development mode
    // Get debug configuration via direct injection
    const debugConfig = container.get<DebugServiceConfig>(TYPES.DebugServiceConfig);
    if (debugConfig?.logging?.enableConsoleOutput) {
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
