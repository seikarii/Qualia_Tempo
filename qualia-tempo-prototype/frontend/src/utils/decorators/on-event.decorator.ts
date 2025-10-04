// QUALIA.CODE v1.1 - @OnEvent Decorator
// Automatic EventBus subscription management for service lifecycle
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { getLogger, type InstanceWithDependencies } from "./shared-types";

/**
 * QUALIA.CODE v1.1 - @OnEvent Decorator
 * Automatically subscribes a method to an EventBus event type.
 * Simplifies event handling by eliminating manual eventBus.subscribe calls in constructors.
 * 
 * CRITICAL: This decorator requires the service to have:
 * - An 'eventBus' property of type IEventBus
 * - A '_eventListeners' array property to track subscriptions
 * - A logger property for debugging
 * 
 * Usage: @OnEvent('PlayerAction')
 *        private handlePlayerAction(event: PlayerActionEvent): void { ... }
 */
export function OnEvent(eventType: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    // Store the event subscription metadata on the class prototype
    interface ConstructorWithSubscriptions {
      _eventSubscriptions?: Array<{ eventType: string; methodName: string; originalMethod: unknown }>;
    }
    const targetConstructor = (target as InstanceWithDependencies).constructor as ConstructorWithSubscriptions;
    if (!targetConstructor._eventSubscriptions) {
      targetConstructor._eventSubscriptions = [];
    }
    
    targetConstructor._eventSubscriptions.push({
      eventType,
      methodName: propertyKey,
      originalMethod
    });

    // Enhanced method that includes logging
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const instanceLogger = getLogger(this);
      if (instanceLogger) {
        instanceLogger.debug(`📡 [${(this as Record<string, unknown>).constructor.name}] Event received: ${eventType}`, {
          method: propertyKey,
          eventData: args[0]
        });
      }
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Helper function to set up event subscriptions for a service instance.
 * This should be called during service initialization.
 * 
 * ARCHITECTURAL NOTE: Co-located with @OnEvent as it's intrinsically tied to its lifecycle.
 */
export function initializeEventSubscriptions(serviceInstance: unknown): void {
  const instance = serviceInstance as InstanceWithDependencies;
  const eventBus = instance.eventBus;
  const logger = getLogger(serviceInstance);
  
  if (!eventBus) {
    if (logger) {
      logger.error('Cannot initialize event subscriptions: eventBus not found on service instance');
    }
    return;
  }

  // Initialize listeners array if not exists
  if (!instance._eventListeners) {
    instance._eventListeners = [];
  }

  interface ConstructorWithSubscriptions {
    _eventSubscriptions?: Array<{ eventType: string; methodName: string }>;
  }
  
  const subscriptions = (instance.constructor as ConstructorWithSubscriptions)._eventSubscriptions ?? [];
  
  for (const subscription of (subscriptions as {eventType: string; methodName: string; originalMethod: unknown}[])) {
    const method = instance[subscription.methodName] as ((..._args: unknown[]) => void) | undefined;
    if (method && typeof method === 'function') {
      const listenerId = eventBus.subscribe(
        subscription.eventType,
        method.bind(serviceInstance),
        { priority: 'normal' }
      );
      
      if (!instance._eventListeners) {
        instance._eventListeners = [];
      }
      (instance._eventListeners as string[]).push(listenerId);
      
      if (logger) {
        logger.debug(`📡 [${instance.constructor.name}] Subscribed to event: ${subscription.eventType}`, {
          method: subscription.methodName,
          listenerId
        });
      }
    }
  }
}

/**
 * Helper function to clean up event subscriptions.
 * This should be called during service cleanup.
 * 
 * ARCHITECTURAL NOTE: Co-located with @OnEvent as it's intrinsically tied to its lifecycle.
 */
export function cleanupEventSubscriptions(serviceInstance: unknown): void {
  const instance = serviceInstance as InstanceWithDependencies;
  const eventBus = instance.eventBus;
  const listeners = (instance._eventListeners || []) as string[];
  const logger = getLogger(serviceInstance);

  if (eventBus && listeners.length > 0) {
    listeners.forEach((listenerId: string) => {
      eventBus.unsubscribe(listenerId);
    });
    
    instance._eventListeners = [];
    
    if (logger) {
      logger.debug(`📡 [${instance.constructor.name}] Cleaned up ${listeners.length} event subscriptions`);
    }
  }
}
