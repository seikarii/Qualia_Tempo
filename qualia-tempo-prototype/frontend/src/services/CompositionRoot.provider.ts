import React from "react";

/**
 * CompositionRootProvider - IoC Container Provider
 *
 * This provider serves as the React context wrapper for the InversifyJS IoC container.
 * Following QUALIA.CODE v1.1 principles, this provides the dependency injection
 * infrastructure for all services used throughout the application.
 *
 * @param props - React component props with children
 * @returns React component wrapping children with IoC container context
 */
export const CompositionRootProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // For now, this is a simple pass-through provider since the InversifyJS container
  // is globally configured. In the future, this could provide container context
  // if we need multiple container instances or container-specific configuration.
  return React.createElement(React.Fragment, null, children);
};
