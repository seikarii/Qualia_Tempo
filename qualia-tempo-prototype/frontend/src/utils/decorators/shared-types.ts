// QUALIA.CODE v1.1 - Shared Types for Decorators
// Common interfaces and type helpers used across all decorators

import type { ILogger } from "../../services/interfaces/ILogger";

/**
 * Type helper for instances with logger
 */
export interface InstanceWithLogger {
  logger?: ILogger;
  constructor: { name: string };
}

/**
 * Type helper for message adapters
 */
export interface IMessageAdapter {
  adapt(_rawData: unknown): { type: string; source?: string; [key: string]: unknown };
}

/**
 * Type helper for event bus
 */
export interface IEventBus {
  emit(_event: unknown): void;
  subscribe(_eventType: string, _handler: (..._args: unknown[]) => void, _options?: unknown): string;
  unsubscribe(_listenerId: string): void;
}

/**
 * Type helper for instances with eventBus and adapter
 */
export interface InstanceWithDependencies extends InstanceWithLogger {
  eventBus?: IEventBus;
  [key: string | symbol]: unknown;
}

/**
 * Base Service Interface for Lifecycle Management
 */
export interface IBaseService {
  /**
   * Initialize service lifecycle, including event subscriptions
   */
  initialize(): void;
  
  /**
   * Cleanup service resources, including event subscriptions
   */
  cleanup(): void;
}

/**
 * Helper function to safely get logger from instance
 */
export function getLogger(instance: unknown): ILogger | undefined {
  const typed = instance as Partial<InstanceWithLogger>;
  return typed.logger;
}
