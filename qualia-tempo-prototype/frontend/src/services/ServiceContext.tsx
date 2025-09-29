/**
 * QUALIA.CODE v1.1 - Service Context Provider
 * React Context for IoC container provision - eliminates Service Locator anti-pattern
 * The ONLY professional way to provide container access to React components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Container } from 'inversify';

// Create the context with undefined as default (will be provided by ServiceProvider)
const ServiceContext = createContext<Container | undefined>(undefined);

/**
 * Props for ServiceProvider component
 */
interface ServiceProviderProps {
  container: Container;
  children: ReactNode;
}

/**
 * ServiceProvider - Provides the IoC container via React Context
 * MUST be used to wrap the App component after container initialization
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ container, children }) => {
  return (
    <ServiceContext.Provider value={container}>
      {children}
    </ServiceContext.Provider>
  );
};

/**
 * useContainer - Internal hook to access the container from context
 * Throws error if used outside ServiceProvider (container not initialized)
 */
export const useContainer = (): Container => {
  const container = useContext(ServiceContext);
  if (!container) {
    throw new Error(
      'useContainer must be used within a ServiceProvider. ' +
      'Ensure the App is wrapped with ServiceProvider after initializeApplication() completes.'
    );
  }
  return container;
};