/**
 * QUALIA.CODE v1.1 - InversifyJS Container
 * Central IoC container for all service instances.
 * 
 * CRITICAL: This is the ONLY place where services are instantiated.
 * All other code must use dependency injection to access services.
 */

import 'reflect-metadata';
import { Container, ContainerOptions } from 'inversify';

/**
 * The central IoC container instance.
 * 
 * Configuration:
 * - defaultScope: 'Singleton' - All services are singletons by default
 */
const containerConfig: ContainerOptions = {
  defaultScope: 'Singleton'
};

// Create and export the container instance
export const container = new Container(containerConfig);

// Container is now ready for service binding via inversify.config.ts