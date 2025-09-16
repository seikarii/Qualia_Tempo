/**
 * QUALIA.CODE v1.0 - CompositionRoot React Provider
 * React Context integration for service access in components.
 *
 * Architecture:
 * - Clean separation between business logic (CompositionRoot.ts) and UI layer
 * - React Context provider for dependency injection in components
 * - Hook-based service access with proper typing
 * - Service lifecycle management integrated with React lifecycle
 */

import { useEffect, useState, ReactNode } from "react";
import {
  CompositionRoot,
  ServiceContainer,
  ServiceStatus,
  CompositionRootConfig,
} from "./CompositionRoot";
import {
  ServiceContext,
  CompositionRootContext,
} from "./CompositionRoot.contexts";

// Provider props interface
export interface CompositionRootProviderProps {
  children: ReactNode;
  config?: Partial<CompositionRootConfig>;
  onServiceStatusChange?: (_status: ServiceStatus) => void;
  onInitializationError?: (_error: Error) => void;
}

/**
 * CompositionRootProvider: React integration for IoC container
 *
 * Provides services to React components via Context API.
 * Manages CompositionRoot lifecycle synchronized with React lifecycle.
 */
export function CompositionRootProvider({
  children,
  config,
  onServiceStatusChange,
  onInitializationError,
}: CompositionRootProviderProps) {
  const [compositionRoot] = useState(() => new CompositionRoot(config));
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(
    null,
  );

  // Initialize services when component mounts
  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      if (isInitializing || isInitialized) {
        return; // Prevent double initialization
      }

      setIsInitializing(true);
      setInitializationError(null);

      try {
        console.log("🏭 [CompositionRootProvider] Initializing services...");

        await compositionRoot.initialize();

        if (isMounted) {
          const services = compositionRoot.getServices();
          console.log(
            "🏭 [CompositionRootProvider] Setting services:",
            !!services,
          );
          setServices(services);
          setIsInitialized(true);
          setIsInitializing(false);

          console.log(
            "✅ [CompositionRootProvider] Services ready for React components",
          );
        }
      } catch (error) {
        const initError =
          error instanceof Error ? error : new Error(String(error));

        if (isMounted) {
          setInitializationError(initError);
          setIsInitializing(false);
          console.error(
            "❌ [CompositionRootProvider] Service initialization failed:",
            initError,
          );

          // Notify parent component of initialization error
          onInitializationError?.(initError);
        }
      }
    };

    // Start initialization if auto-start is enabled
    if (compositionRoot.getConfig().autoStart) {
      initializeServices();
    } else {
      // Services available immediately but not started
      setServices(compositionRoot.getServices());
      setIsInitialized(true);
    }

    return () => {
      isMounted = false;
    };
  }, []); // Removed dependencies to prevent re-initialization

  // Monitor service status changes
  useEffect(() => {
    if (!isInitialized || !onServiceStatusChange) {
      return;
    }

    const statusCheckInterval = setInterval(() => {
      const currentStatus = compositionRoot.getServiceStatus();
      onServiceStatusChange(currentStatus);
    }, 1000); // Check every second

    return () => clearInterval(statusCheckInterval);
  }, [isInitialized]); // Simplified dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(
        "🏭 [CompositionRootProvider] Component unmounting, shutting down services...",
      );

      compositionRoot
        .shutdown()
        .catch((error) => {
          console.error("❌ [CompositionRootProvider] Shutdown error:", error);
        });
        // Note: destroy() removed to prevent EventBus destruction during page reloads
        // destroy() should only be called when the entire application is shutting down
    };
  }, [compositionRoot]);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="composition-root-loading">
        <div>🔄 Initializing services...</div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initializationError) {
    return (
      <div className="composition-root-error">
        <div>❌ Service initialization failed:</div>
        <div
          style={{ color: "red", fontFamily: "monospace", fontSize: "0.9em" }}
        >
          {initializationError.message}
        </div>
        <button
          onClick={() => {
            setInitializationError(null);
            setIsInitialized(false);
          }}
          style={{ marginTop: "10px", padding: "5px 10px" }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  // Don't render children until services are available
  if (!services) {
    return (
      <div className="composition-root-waiting">
        <div>⏳ Waiting for services...</div>
      </div>
    );
  }

  return (
    <CompositionRootContext.Provider value={compositionRoot}>
      <ServiceContext.Provider value={services}>
        {children}
      </ServiceContext.Provider>
    </CompositionRootContext.Provider>
  );
}
