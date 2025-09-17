/**
 * QUALIA.CODE v6 - CompositionRoot React Provider
 * PURE DI: React Context integration for service access in components.
 * CRITICAL: This provider NO LONGER creates services - it receives them as props
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

// Provider props interface - PURE DI: Receives container as prop
export interface CompositionRootProviderProps {
  children: ReactNode;
  container: CompositionRoot; // PURE DI: Pre-initialized container
  config?: Partial<CompositionRootConfig>;
  onServiceStatusChange?: (_status: ServiceStatus) => void;
  onInitializationError?: (_error: Error) => void;
}

/**
 * CompositionRootProvider: React integration for IoC container
 * PURE DI: Provides pre-initialized services to React components via Context API.
 */
export function CompositionRootProvider({
  children,
  container,
  config: _config, // Renamed to avoid unused variable warning
  onServiceStatusChange,
  onInitializationError,
}: CompositionRootProviderProps) {
  const [services, setServices] = useState<ServiceContainer | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<Error | null>(null);

  useEffect(() => {
    // PURE DI: Container is already initialized, just get the services
    try {
      const containerServices = container.getServices();
      setServices(containerServices);
      setIsInitialized(true);
      
      // Monitor service status changes if callback provided
      if (onServiceStatusChange) {
        const status = container.getServiceStatus();
        onServiceStatusChange(status);
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setInitializationError(errorObj);
      if (onInitializationError) {
        onInitializationError(errorObj);
      }
    }

    // Cleanup on unmount
    return () => {
      container.shutdown();
    };
  }, [container, onServiceStatusChange, onInitializationError]);

  // Show loading state while services are being retrieved
  if (!isInitialized && !initializationError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'monospace',
        color: '#00ff88',
        backgroundColor: '#000'
      }}>
        <div>
          <h2>🏭 Initializing Services...</h2>
          <p>Please wait while the application starts up.</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initializationError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#ff4444',
        backgroundColor: '#000'
      }}>
        <h1>🚨 Service Initialization Failed</h1>
        <pre style={{ background: '#222', padding: '20px', borderRadius: '8px' }}>
          {initializationError.message}
        </pre>
      </div>
    );
  }

  // Provide services to React tree
  return (
    <CompositionRootContext.Provider value={container}>
      <ServiceContext.Provider value={services}>
        {children}
      </ServiceContext.Provider>
    </CompositionRootContext.Provider>
  );
}
