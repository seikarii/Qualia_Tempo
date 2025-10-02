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
import type { IGameStateStore } from "./interfaces/IGameStateStore";
import { ILogger } from "./interfaces/ILogger";
import { IDebugService } from "./interfaces/IDebugService";
import type { DebugServiceConfig } from "./contracts/IDebugService.contracts";
import type { CompositionRootConfig } from "./contracts/IApplicationCompositionRoot.contracts";
import type { GameState } from "../state/useGameStore";

/**
 * Type for the game store API provided by Zustand
 */
type GameStoreApi = {
  getState: () => GameState;
  setState: (_partial: GameState | Partial<GameState> | ((state: GameState) => GameState | Partial<GameState>), _replace?: boolean) => void;
  subscribe: (_listener: (state: GameState, _prevState: GameState) => void) => () => void;
};

/**
 * ApplicationCompositionRoot - The ONLY class allowed to access container directly
 * Encapsulates all bootstrap logic and IoC container interaction
 */
export class ApplicationCompositionRoot {
  /**
   * Bridge the UI layer to the service layer
   * QUALIA.CODE COMPLIANT: UI delivers its dependencies to services, not vice versa
   */
  public async bridgeUi(gameStoreApi: GameStoreApi): Promise<void> {
    try {
      // Get the GameStateStoreService from IoC container
      const gameStateStoreService = container.get<IGameStateStoreService>(TYPES.IGameStateStoreService);

      // Connect the store setter to the service - this creates the UI-Service bridge
      // CRITICAL: gameStoreApi.setState is the non-hook API method
      gameStateStoreService.setStoreSetter(gameStoreApi.setState);

      // Get GameStateStore and inject the store API
      const gameStateStore = container.get<IGameStateStore>(TYPES.IGameStateStore);
      // Type-safe access to setStoreApi method (part of GameStateStore implementation)
      if ('setStoreApi' in gameStateStore && typeof gameStateStore.setStoreApi === 'function') {
        (gameStateStore as { setStoreApi: (api: unknown) => void }).setStoreApi(gameStoreApi);
      }

      // Get logger for confirmation
      const logger = container.get<ILogger>(TYPES.ILogger);
      const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);
      logger.info(config.logging.uiBridgeSuccessMessage);

    } catch (error) {
      const logger = container.get<ILogger>(TYPES.ILogger);
      const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);
      const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
      logger.error(config.logging.uiBridgeErrorMessage, errorContext);
      throw error;
    }
  }

  /**
   * Initialize the service layer only (without UI dependencies)
   * This method handles service bootstrap logic without touching UI layer
   */
  public async initializeServices(): Promise<void> {
    // STEP 0: CRITICAL - Configure services with Direct Configuration Injection
    // This eliminates the Service Locator antipattern across the entire system
    // QUALIA.CODE v1.1: React.StrictMode safe configuration using container.isBound()
    await configureServices();

    // Step 1: NOW resolve core services from IoC container (they have direct config access)
    const logger = container.get<ILogger>(TYPES.ILogger);
    const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);

    logger.info(config.logging.serviceInitMessage);

    // Application service layer initialization completed (without starting app)
    logger.info(config.logging.serviceInitCompleteMessage);
  }

  /**
   * Start the application after UI bridge is established
   */
  public async startApplication(): Promise<void> {
    const logger = container.get<ILogger>(TYPES.ILogger);
    const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);
    const appInitializer = container.get<IApplicationInitializerService>(
      TYPES.IApplicationInitializerService,
    );

    logger.info(config.logging.appStartMessage);

    // Step 3: Start application services (NOW that UI bridge is established)
    await appInitializer.start();

    // Step 4: Attach debug interface in development mode
    // Get debug configuration via direct injection
    const debugConfig = container.get<DebugServiceConfig>(TYPES.DebugServiceConfig);
    if (debugConfig?.logging?.enableConsoleOutput) {
      try {
        const debugService = container.get<IDebugService>(TYPES.IDebugService);
        const debugInterface = debugService.getDebugInterface();
        if (debugInterface && typeof window !== 'undefined') {
          // Attach debug interface directly to window for development
          const debugKey = 'QA_DEBUG';
          (window as unknown as Record<string, unknown>)[debugKey] = debugInterface;
          logger.info(`${config.logging.debugAttachMessage}${debugKey}`);
        }
      } catch (error) {
        const errorContext = error instanceof Error ? { message: error.message } : { error: String(error) };
        logger.warn(config.logging.debugAttachErrorMessage, errorContext);
      }
    }

    // Application completion message
    logger.info(config.logging.appStartCompleteMessage);
  }

  /**
   * Shutdown the application gracefully
   * Handles cleanup of services and resources
   */
  public async shutdownApplication(): Promise<void> {
    try {
      const logger = container.get<ILogger>(TYPES.ILogger);
      const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);
      logger.info(config.logging.shutdownStartMessage);
      
      // TODO: Add service cleanup logic here
      // const appInitializer = container.get<IApplicationInitializerService>(TYPES.IApplicationInitializerService);
      // await appInitializer.stop();
      
      logger.info(config.logging.shutdownCompleteMessage);
    } catch (error) {
      // Emergency fallback - should not reach here in production
      try {
        const logger = container.get<ILogger>(TYPES.ILogger);
        const config = container.get<CompositionRootConfig>(TYPES.CompositionRootConfig);
        const errorContext = error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) };
        logger.error(config.logging.shutdownErrorMessage, errorContext);
      } catch {
        // Last resort - log to external error tracking service
        // In production, this would integrate with error monitoring
      }
    }
  }
}
