/**
 * QUALIA.CODE v1.0 - Service Hooks
 * React hooks for accessing services from CompositionRoot.
 * Separated from CompositionRoot to enable Fast Refresh.
 */

import { useContext } from "react";
import { ServiceContainer } from "./CompositionRoot";
import { ServiceContext } from "./CompositionRoot.contexts";

/**
 * Hook for accessing all services from the CompositionRoot.
 */
export const useServices = (): ServiceContainer => {
  const services = useContext(ServiceContext);
  if (!services) {
    throw new Error(
      "useServices must be used within a CompositionRootProvider",
    );
  }
  return services;
};

/**
 * Hook for accessing EventBus service.
 */
export const useEventBus = () => useServices().eventBus;

/**
 * Hook for accessing QualiaCalculator service.
 */
export const useQualiaCalculator = () => useServices().qualiaCalculator;

/**
 * Hook for accessing BackendSync service.
 */
export const useBackendSync = () => useServices().backendSync;

/**
 * Hook for accessing GameController service.
 */
export const useGameController = () => useServices().gameController;

/**
 * Hook for accessing Configuration service.
 */
export const useConfiguration = () => useServices().configService;
