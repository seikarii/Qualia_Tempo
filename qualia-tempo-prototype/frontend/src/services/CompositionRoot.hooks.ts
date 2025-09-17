/**
 * QUALIA.CODE v1.0 - Service Hooks
 * React hooks for accessing services from components.
 */

import { useContext, useEffect, useState } from "react";
import {
  CompositionRoot,
  ServiceContainer,
  ServiceStatus,
} from "./CompositionRoot";
import {
  ServiceContext,
  CompositionRootContext,
} from "./CompositionRoot.contexts";

/**
 * Hook to access services from React components
 *
 * @throws Error if used outside of CompositionRootProvider
 */
export function useServices(): ServiceContainer {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error(
      "useServices must be used within a CompositionRootProvider. " +
        "Ensure your component is wrapped with <CompositionRootProvider>.",
    );
  }

  return services;
}

/**
 * Hook to access CompositionRoot instance (for advanced use cases)
 *
 * @throws Error if used outside of CompositionRootProvider
 */
export function useCompositionRoot(): CompositionRoot {
  const compositionRoot = useContext(CompositionRootContext);

  if (!compositionRoot) {
    throw new Error(
      "useCompositionRoot must be used within a CompositionRootProvider. " +
        "Ensure your component is wrapped with <CompositionRootProvider>.",
    );
  }

  return compositionRoot;
}

/**
 * Hook to get current service status
 */
export function useServiceStatus(): ServiceStatus {
  const compositionRoot = useCompositionRoot();
  const [status, setStatus] = useState<ServiceStatus>(
    compositionRoot.getServiceStatus(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(compositionRoot.getServiceStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [compositionRoot]);

  return status;
}

/**
 * Hook for manual service control (advanced use cases)
 */
export function useServiceControl() {
  const compositionRoot = useCompositionRoot();

  return {
    initialize: () => compositionRoot.initialize(),
    shutdown: () => compositionRoot.shutdown(),
    getStatus: () => compositionRoot.getServiceStatus(),
    performHealthCheck: () => compositionRoot.performHealthCheck(),
  };
}
