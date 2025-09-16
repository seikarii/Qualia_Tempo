/**
 * QUALIA.CODE v1.0 - Service Contexts
 * React contexts for service dependency injection.
 */

import { createContext } from "react";
import { CompositionRoot, ServiceContainer } from "./CompositionRoot";

// React Context for service access
export const ServiceContext = createContext<ServiceContainer | null>(null);

// Context for CompositionRoot instance access (for advanced use cases)
export const CompositionRootContext = createContext<CompositionRoot | null>(
  null,
);
