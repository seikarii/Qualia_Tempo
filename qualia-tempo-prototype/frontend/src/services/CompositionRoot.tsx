/**
 * QUALIA.CODE v1.0 - Frontend CompositionRoot
 * Central IoC container for frontend service initialization and dependency injection.
 *
 * Architecture:
 * - Single responsibility for service creation and lifecycle management
 * - Dependency injection through React Context
 * - Configurable service initialization order
 * - Centralized error handling and recovery
 * - Service health monitoring and restart capabilities
 */

import React, { createContext, useEffect, useState, ReactNode } from "react";
import { EventBus } from "./EventBus";
import { QualiaStateCalculatorService } from "./QualiaStateCalculatorService";
import { BackendSyncService } from "./BackendSyncService";
import { BackendSyncConfig } from "./ConfigurationService";
import { QualiaLogger, LogLevel } from "./Logger";

// Service container interface
export interface ServiceContainer {
  eventBus: EventBus;
  qualiaCalculator: QualiaStateCalculatorService;
  backendSync: BackendSyncService;
}

// Service status tracking
export interface ServiceStatus {
  eventBus: "initializing" | "running" | "stopped" | "error";
  qualiaCalculator: "initializing" | "running" | "stopped" | "error";
  backendSync: "initializing" | "running" | "stopped" | "error";
}

// Configuration for CompositionRoot
export interface CompositionRootConfig {
  autoStart: boolean;
  enableBackendSync: boolean;
  enableHealthMonitoring: boolean;
  healthCheckIntervalMs: number;
  retryInitializationOnError: boolean;
  maxInitializationRetries: number;
}

// Default configuration
const DEFAULT_CONFIG: CompositionRootConfig = {
  autoStart: true,
  enableBackendSync: true,
  enableHealthMonitoring: true,
  healthCheckIntervalMs: 10000, // 10 seconds
  retryInitializationOnError: true,
  maxInitializationRetries: 3,
};

/**
 * Central composition root for frontend services.
 * Manages service lifecycle, dependencies, and provides React Context.
 */
export class CompositionRoot {
  private services: ServiceContainer;
  private config: CompositionRootConfig;
  private status: ServiceStatus;
  private healthCheckIntervalId: number | null = null;
  private initializationRetries = 0;
  private isDestroyed = false;

  // Event handlers for status changes
  private statusChangeHandlers: Array<(_status: ServiceStatus) => void> = [];

  constructor(config?: Partial<CompositionRootConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      eventBus: "initializing",
      qualiaCalculator: "initializing",
      backendSync: "initializing",
    };

    // Initialize services with proper dependency injection
    const eventBus = new EventBus();
    const logger = new QualiaLogger('CompositionRoot', LogLevel.INFO);
    
    // Default configuration for BackendSync if none provided
    const defaultBackendConfig: BackendSyncConfig = {
      api: {
        baseUrl: "http://localhost:8000",
        qualiaEndpoint: "/update_qualia",
        healthEndpoint: "/health",
        timeout: 5000
      },
      sync: {
        throttleDelay: 250,
        batchSize: 5,
        maxRetries: 3,
        retryDelay: 1000
      },
      connection: {
        healthCheckInterval: 30000,
        connectionTimeout: 10000,
        maxFailedAttempts: 5
      },
      validation: {
        enableSchemaValidation: true,
        strictMode: false,
        logValidationErrors: true
      },
      performance: {
        enableCompression: false,
        maxPayloadSize: 1024 * 1024,
        enableBuffering: false,
        bufferFlushInterval: 1000
      },
      errorHandling: {
        enableCircuitBreaker: false,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 30000,
        enableFallbackMode: true
      },
      messages: {
        backendNotConnected: "Backend not connected",
        serviceAlreadyRunning: "Service already running"
      }
    };

    const qualiaCalculator = new QualiaStateCalculatorService(eventBus);
    const backendSync = new BackendSyncService(eventBus, logger, defaultBackendConfig);

    // Initialize service container with singleton instances
    this.services = {
      eventBus,
      qualiaCalculator,
      backendSync,
    };

    console.log("🏗️ [CompositionRoot] Initialized");
  }

  /**
   * Initialize all services in the correct order.
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();
    console.log("🚀 [CompositionRoot] Starting service initialization");

    try {
      if (this.isDestroyed) {
        throw new Error("CompositionRoot has been destroyed");
      }

      // Initialize EventBus (always first)
      await this.initializeService("eventBus", () => Promise.resolve());

      // Initialize QualiaCalculator
      await this.initializeService("qualiaCalculator", async () => {
        this.services.qualiaCalculator.start();
      });

      // Initialize BackendSync (if enabled)
      if (this.config.enableBackendSync) {
        await this.initializeService("backendSync", async () => {
          await this.services.backendSync.start();
        });
      } else {
        this.status.backendSync = "stopped";
        console.log(
          "⏭️ [CompositionRoot] BackendSync disabled, skipping initialization",
        );
      }

      // Start health monitoring if enabled
      if (this.config.enableHealthMonitoring) {
        this.startHealthMonitoring();
      }

      const duration = performance.now() - startTime;
      console.log(
        `✅ [CompositionRoot] All services initialized - ${duration.toFixed(2)}ms`,
      );

      this.initializationRetries = 0; // Reset retry counter on success
      this.notifyStatusChange();
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `🚨 [CompositionRoot] Service initialization failed - ${duration.toFixed(2)}ms:`,
        error,
      );

      // Handle retry logic
      if (
        this.config.retryInitializationOnError &&
        this.initializationRetries < this.config.maxInitializationRetries
      ) {
        this.initializationRetries++;
        console.log(
          `🔄 [CompositionRoot] Retrying initialization (${this.initializationRetries}/${this.config.maxInitializationRetries})`,
        );

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 * this.initializationRetries),
        );
        return this.initialize();
      }

      throw error;
    }
  }

  /**
   * Shutdown all services and clean up resources.
   */
  public async shutdown(): Promise<void> {
    const startTime = performance.now();
    console.log("🛑 [CompositionRoot] Starting service shutdown");

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Shutdown services in reverse order
      if (this.status.backendSync === "running") {
        await this.shutdownService("backendSync", () => {
          this.services.backendSync.stop();
        });
      }

      if (this.status.qualiaCalculator === "running") {
        await this.shutdownService("qualiaCalculator", () => {
          this.services.qualiaCalculator.stop();
        });
      }

      if (this.status.eventBus === "running") {
        await this.shutdownService("eventBus", () => {
          this.services.eventBus.destroy();
        });
      }

      const duration = performance.now() - startTime;
      console.log(
        `✅ [CompositionRoot] All services shutdown - ${duration.toFixed(2)}ms`,
      );

      this.notifyStatusChange();
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `🚨 [CompositionRoot] Service shutdown failed - ${duration.toFixed(2)}ms:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Destroy the composition root and all services.
   */
  public async destroy(): Promise<void> {
    console.log("💀 [CompositionRoot] Destroying composition root");

    try {
      await this.shutdown();
      this.isDestroyed = true;
      this.statusChangeHandlers = [];

      console.log("💀 [CompositionRoot] Composition root destroyed");
    } catch (error) {
      console.error("🚨 [CompositionRoot] Destroy failed:", error);
      throw error;
    }
  }

  /**
   * Get the service container.
   */
  public getServices(): ServiceContainer {
    if (this.isDestroyed) {
      throw new Error("CompositionRoot has been destroyed");
    }
    return this.services;
  }

  /**
   * Get current service status.
   */
  public getStatus(): ServiceStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to status changes.
   */
  public onStatusChange(handler: (_status: ServiceStatus) => void): () => void {
    this.statusChangeHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.statusChangeHandlers.indexOf(handler);
      if (index > -1) {
        this.statusChangeHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Restart a specific service.
   */
  public async restartService(serviceName: keyof ServiceStatus): Promise<void> {
    console.log(`🔄 [CompositionRoot] Restarting service: ${serviceName}`);

    try {
      // Stop the service first
      if (this.status[serviceName] === "running") {
        switch (serviceName) {
          case "backendSync":
            this.services.backendSync.stop();
            break;
          case "qualiaCalculator":
            this.services.qualiaCalculator.stop();
            break;
          case "eventBus":
            // EventBus cannot be easily restarted, would need full re-initialization
            throw new Error(
              "EventBus restart not supported, use full re-initialization",
            );
        }
        this.status[serviceName] = "stopped";
      }

      // Start the service again
      switch (serviceName) {
        case "backendSync":
          if (this.config.enableBackendSync) {
            await this.services.backendSync.start();
            this.status[serviceName] = "running";
          }
          break;
        case "qualiaCalculator":
          this.services.qualiaCalculator.start();
          this.status[serviceName] = "running";
          break;
      }

      console.log(`✅ [CompositionRoot] Service restarted: ${serviceName}`);
      this.notifyStatusChange();
    } catch (error) {
      console.error(
        `🚨 [CompositionRoot] Service restart failed for ${serviceName}:`,
        error,
      );
      this.status[serviceName] = "error";
      this.notifyStatusChange();
      throw error;
    }
  }

  // Private methods

  private async initializeService(
    serviceName: keyof ServiceStatus,
    initFunction: () => Promise<void>,
  ): Promise<void> {
    try {
      console.log(`🔧 [CompositionRoot] Initializing ${serviceName}`);
      this.status[serviceName] = "initializing";

      await initFunction();

      this.status[serviceName] = "running";
      console.log(
        `✅ [CompositionRoot] ${serviceName} initialized successfully`,
      );
    } catch (error) {
      this.status[serviceName] = "error";
      console.error(
        `🚨 [CompositionRoot] ${serviceName} initialization failed:`,
        error,
      );
      throw error;
    }
  }

  private async shutdownService(
    serviceName: keyof ServiceStatus,
    shutdownFunction: () => void,
  ): Promise<void> {
    try {
      console.log(`🔧 [CompositionRoot] Shutting down ${serviceName}`);

      shutdownFunction();

      this.status[serviceName] = "stopped";
      console.log(`✅ [CompositionRoot] ${serviceName} shutdown successfully`);
    } catch (error) {
      this.status[serviceName] = "error";
      console.error(
        `🚨 [CompositionRoot] ${serviceName} shutdown failed:`,
        error,
      );
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    this.stopHealthMonitoring(); // Ensure no duplicate intervals

    this.healthCheckIntervalId = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);

    console.log(
      `🏥 [CompositionRoot] Health monitoring started (${this.config.healthCheckIntervalMs}ms interval)`,
    );
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckIntervalId !== null) {
      clearInterval(this.healthCheckIntervalId);
      this.healthCheckIntervalId = null;
      console.log("🏥 [CompositionRoot] Health monitoring stopped");
    }
  }

  private performHealthCheck(): void {
    console.log("🏥 [CompositionRoot] Performing health check");

    try {
      // Check EventBus
      const eventBusStats = this.services.eventBus.getStats();
      if (eventBusStats.isDestroyed && this.status.eventBus === "running") {
        console.error(
          "🚨 [CompositionRoot] EventBus health check failed: destroyed",
        );
        this.status.eventBus = "error";
      }

      // Check BackendSync connection
      if (
        this.config.enableBackendSync &&
        this.status.backendSync === "running"
      ) {
        if (!this.services.backendSync.isBackendConnected()) {
          console.warn(
            "⚠️ [CompositionRoot] BackendSync health check: not connected",
          );
          // Don't mark as error since it might be temporary
        }
      }

      this.notifyStatusChange();
    } catch (error) {
      console.error("🚨 [CompositionRoot] Health check failed:", error);
    }
  }

  private notifyStatusChange(): void {
    for (const handler of this.statusChangeHandlers) {
      try {
        handler(this.getStatus());
      } catch (error) {
        console.error(
          "🚨 [CompositionRoot] Status change handler error:",
          error,
        );
      }
    }
  }
}

// React Context for service injection
const ServiceContext = createContext<ServiceContainer | null>(null);

// CompositionRoot provider component
interface CompositionRootProviderProps {
  children: ReactNode;
  config?: Partial<CompositionRootConfig>;
}

export const CompositionRootProvider: React.FC<
  CompositionRootProviderProps
> = ({ children, config }) => {
  const [compositionRoot] = useState(() => new CompositionRoot(config));
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Subscribe to status changes
        const unsubscribe = compositionRoot.onStatusChange((newStatus) => {
          setStatus(newStatus);
        });

        // Initialize services
        await compositionRoot.initialize();
        setServices(compositionRoot.getServices());

        // Cleanup function
        return () => {
          unsubscribe();
          compositionRoot.destroy().catch((error) => {
            console.error("🚨 [CompositionRoot] Cleanup error:", error);
          });
        };
      } catch (error) {
        console.error(
          "🚨 [CompositionRoot] Provider initialization failed:",
          error,
        );
      }
    };

    const cleanup = initializeServices();

    return () => {
      cleanup.then((cleanupFn) => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, [compositionRoot]);

  // Show loading state while services are initializing
  if (!services || !status) {
    return (
      <div className="composition-root-loading">
        <div>🔧 Initializing services...</div>
        {status && (
          <div className="service-status">
            {Object.entries(status).map(([service, serviceStatus]) => (
              <div key={service}>
                {service}: {serviceStatus}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

// Export context for use in hooks
export { ServiceContext };
