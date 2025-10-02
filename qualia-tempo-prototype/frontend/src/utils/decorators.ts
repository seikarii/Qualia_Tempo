// QUALIA.CODE v1.1 - Frontend Decorators
// Mandatory transversal logic implementation for TypeScript
// Updated for TypeScript 5.9.2 compatibility with stage-3 decorators

import { schemaRegistry } from "../schemas";
import { EmergencyLogger } from "./EmergencyLogger";
import type { ILogger } from "../services/interfaces/ILogger";

// QUALIA.CODE v1.1: Type helper for instances with logger
interface InstanceWithLogger {
  logger?: ILogger;
  constructor: { name: string };
}

// QUALIA.CODE v1.1: Type helper for adapters
interface IMessageAdapter {
  adapt(_rawData: unknown): { type: string; source?: string; [key: string]: unknown };
}

// QUALIA.CODE v1.1: Type helper for event bus
interface IEventBus {
  emit(_event: unknown): void;
  subscribe(_eventType: string, _handler: (...args: unknown[]) => void, _options?: unknown): string;
  unsubscribe(_listenerId: string): void;
}

// QUALIA.CODE v1.1: Type helper for instances with eventBus and adapter
interface InstanceWithDependencies extends InstanceWithLogger {
  eventBus?: IEventBus;
  [key: string | symbol]: unknown;
}

// QUALIA.CODE v1.1: Base Service Interface for Lifecycle Management
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

// Helper function to safely get logger from instance
function getLogger(instance: unknown): ILogger | undefined {
  const typed = instance as Partial<InstanceWithLogger>;
  return typed.logger;
}

// ==================== STAGE-3 DECORATOR IMPLEMENTATIONS ====================
// Compatible with TypeScript 5.9.2 and stage-3 decorator proposal

/**
 * Decorator to log method calls and arguments.
 * Uses instance logger if available, falls back to console only when necessary.
 * Usage: @logMethod
 */
export function logMethod(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const instance = this as InstanceWithLogger;
    const className = instance.constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;

    // Access logger from instance (this) at runtime
    const instanceLogger = getLogger(this);
    if (instanceLogger) {
      instanceLogger.debug(`→ ENTER ${fullMethodName}`, {
        arguments: args.length > 0 ? args : "no arguments",
        timestamp: new Date().toISOString(),
      });
    } else {
      // QUALIA.CODE v1.1: Use EmergencyLogger instead of console
      EmergencyLogger.debug(`→ ENTER ${fullMethodName}`, {
        arguments: args.length > 0 ? args : "no arguments",
        timestamp: new Date().toISOString(),
        note: "Logger not found on instance, using EmergencyLogger",
      });
    }

    try {
      const result = method.apply(this, args);

      // Handle both sync and async results
      if (result instanceof Promise) {
        return result
          .then((res) => {
            if (instanceLogger) {
              instanceLogger.debug(`← EXIT ${fullMethodName}`, {
                result: res,
                timestamp: new Date().toISOString(),
              });
            } else {
              EmergencyLogger.debug(`← EXIT ${fullMethodName}`, {
                result: res,
                timestamp: new Date().toISOString(),
                note: "Logger not found on instance, using EmergencyLogger",
              });
            }
            return res;
          })
          .catch((error) => {
            if (instanceLogger) {
              instanceLogger.error(`✗ ERROR ${fullMethodName}`, {
                error: error.message,
                timestamp: new Date().toISOString(),
              });
            } else {
              EmergencyLogger.error(`✗ ERROR ${fullMethodName}`, {
                error: error.message,
                timestamp: new Date().toISOString(),
                note: "Logger not found on instance, using EmergencyLogger",
              });
            }
            throw error;
          });
      } else {
        if (instanceLogger) {
          instanceLogger.debug(`← EXIT ${fullMethodName}`, {
            result,
            timestamp: new Date().toISOString(),
          });
        } else {
          EmergencyLogger.debug(`← EXIT ${fullMethodName}`, {
            result,
            timestamp: new Date().toISOString(),
            note: "Logger not found on instance, using EmergencyLogger",
          });
        }
        return result;
      }
    } catch (error) {
      if (instanceLogger) {
        instanceLogger.error(`✗ ERROR ${fullMethodName}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      } else {
        EmergencyLogger.error(`✗ ERROR ${fullMethodName}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          note: "Logger not found on instance, using EmergencyLogger",
        });
      }
      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator to throttle method execution.
 * Usage: @throttle(250)
 */
export function throttle(milliseconds: number) {
  const throttleMap = new Map<string, number>();

  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const now = Date.now();
      const lastCall = throttleMap.get(methodKey) ?? 0;

      // Access logger from instance (this) at runtime
      const instanceLogger = getLogger(this);
      if (now - lastCall < milliseconds) {
        if (instanceLogger) {
          instanceLogger.debug(
            `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
          );
        } else {
          EmergencyLogger.debug(
            `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
            { note: "Logger not found on instance, using console fallback" }
          );
        }
        return;
      }
      throttleMap.set(methodKey, now);
      if (instanceLogger) {
        instanceLogger.debug(`Executing ${methodKey}`);
      } else {
        EmergencyLogger.debug(`Executing ${methodKey}`, { note: "Logger not found on instance, using console fallback" });
      }

      return value.apply(this, args);
    };
  };
}

/**
 * Decorator to catch and handle runtime errors.
 * Usage: @catchError
 */
export function catchError(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const className = (this as Record<string, unknown>).constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;

    // Access logger from instance (this) at runtime
    const instanceLogger = getLogger(this);

    try {
      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          if (instanceLogger) {
            instanceLogger.error(`${fullMethodName}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : "No stack trace",
              arguments: args,
              timestamp: new Date().toISOString(),
            });
          } else {
            EmergencyLogger.error(`${fullMethodName}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : "No stack trace",
              arguments: args,
              timestamp: new Date().toISOString(),
              note: "Logger not found on instance, using console fallback",
            });
          }

          // Re-throw the error after logging
          throw error;
        });
      }

      return result;
    } catch (methodError) {
      if (instanceLogger) {
        instanceLogger.error(`${fullMethodName}:`, {
          error:
            methodError instanceof Error
              ? methodError.message
              : String(methodError),
          stack:
            methodError instanceof Error
              ? methodError.stack
              : "No stack trace",
          arguments: args,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Final fallback to console only when no logger available
        EmergencyLogger.error(`${fullMethodName}:`, {
          error:
            methodError instanceof Error
              ? methodError.message
              : String(methodError),
          stack:
            methodError instanceof Error
              ? methodError.stack
              : "No stack trace",
          arguments: args,
          timestamp: new Date().toISOString(),
          note: "Logger not found on instance, using console fallback",
        });
      }

      throw methodError;
    }
  };

  return descriptor;
}

/**
 * Decorator to measure method execution time.
 * Usage: @measureTime
 */
export function measureTime(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const className = (this as Record<string, unknown>).constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;
    const startTime = performance.now();
    const instanceLogger = getLogger(this);

    try {
      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          logPerformance(fullMethodName, duration, false, instanceLogger);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      logPerformance(fullMethodName, duration, false, instanceLogger);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      logPerformance(fullMethodName, duration, true, instanceLogger);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Helper function to log performance metrics with categorization.
 */
function logPerformance(
  methodName: string,
  duration: number,
  hasError = false,
  instanceLogger?: ILogger,
): void {
  let category = "";
  let level: "log" | "warn" | "error" = "log";

  if (duration < 1) {
    category = "🚀 FAST";
    level = "log";
  } else if (duration < 10) {
    category = "⚡ GOOD";
    level = "log";
  } else if (duration < 100) {
    category = "⏱️ OK";
    level = "warn";
  } else if (duration < 1000) {
    category = "🐌 SLOW";
    level = "warn";
  } else {
    category = "🚨 VERY SLOW";
    level = "error";
  }

  const errorIndicator = hasError ? " ✗" : "";
  const logMessage = `${category} ${methodName}: ${duration.toFixed(2)}ms${errorIndicator}`;

  if (instanceLogger) {
    if (level === "error") {
      instanceLogger.error(logMessage);
    } else if (level === "warn") {
      instanceLogger.warn(logMessage);
    } else {
      instanceLogger.info(logMessage);
    }
  } else {
    if (level === "error") {
      EmergencyLogger.error(logMessage, { note: "Logger not found on instance, using EmergencyLogger" });
    } else if (level === "warn") {
      EmergencyLogger.warn(logMessage, { note: "Logger not found on instance, using EmergencyLogger" });
    } else {
      EmergencyLogger.info(logMessage, { note: "Logger not found on instance, using EmergencyLogger" });
    }
  }
}

/**
 * Schema validation decorator.
 * Usage: @validate('QualiaState')
 */
export function validate(schemaName: string) {
  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);

      // Validate first argument if present
      if (args.length > 0) {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            if (instanceLogger) {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              EmergencyLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage, note: "Logger not found on instance, using console fallback" },
              );
            }
            throw new Error(errorMessage);
          }

          // Validate the data
          const validationResult = schema.safeParse(args[0]);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            if (instanceLogger) {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedData: args[0],
                },
              );
            } else {
              EmergencyLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedData: args[0],
                  note: "Logger not found on instance, using console fallback",
                },
              );
            }
            throw new Error(errorMessage);
          }

          if (instanceLogger) {
            instanceLogger.debug(
              `✅ Schema validation passed for ${schemaName} in ${fullMethodName}`,
            );
          } else {
            EmergencyLogger.debug(
              `✅ Schema validation passed for ${schemaName} in ${fullMethodName}`,
              { note: "Logger not found on instance, using console fallback" },
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (instanceLogger) {
            instanceLogger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
          } else {
            EmergencyLogger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage, note: "Logger not found on instance, using console fallback" },
            );
          }
          throw new Error(`Schema validation failed: ${errorMessage}`);
        }
      }

      return value.apply(this, args);
    };
  };
}

/**
 * Event property validation decorator.
 * Usage: @validateEventProperty('qualiaState', 'QualiaState')
 * Validates a specific property of an event object against a schema.
 */
export function validateEventProperty(
  propertyName: string,
  schemaName: string,
) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const method = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;
      const instanceLogger = getLogger(this);

      // Validate property of first argument if present
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            if (instanceLogger) {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              EmergencyLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage, note: "Logger not found on instance, using console fallback" },
              );
            }
            throw new Error(errorMessage);
          }

          // Extract the property to validate
          const propertyValue = (args[0] as Record<string, unknown>)[propertyName];
          if (propertyValue === undefined) {
            const errorMessage = `Property '${propertyName}' not found in event object`;
            if (instanceLogger) {
              instanceLogger.error(
                `Event property validation failed for ${propertyName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              EmergencyLogger.error(
                `Event property validation failed for ${propertyName} in ${fullMethodName}:`,
                { error: errorMessage, note: "Logger not found on instance, using console fallback" },
              );
            }
            throw new Error(errorMessage);
          }

          // Validate the property data
          const validationResult = schema.safeParse(propertyValue);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            if (instanceLogger) {
              instanceLogger.error(
                `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedPropertyData: propertyValue,
                },
              );
            } else {
              EmergencyLogger.error(
                `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedPropertyData: propertyValue,
                  note: "Logger not found on instance, using console fallback",
                },
              );
            }
            throw new Error(errorMessage);
          }

          if (instanceLogger) {
            instanceLogger.debug(
              `✅ Event property validation passed for ${propertyName}.${schemaName} in ${fullMethodName}`,
            );
          } else {
            EmergencyLogger.debug(
              `✅ Event property validation passed for ${propertyName}.${schemaName} in ${fullMethodName}`,
              { note: "Logger not found on instance, using console fallback" },
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (instanceLogger) {
            instanceLogger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
          } else {
            EmergencyLogger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              { error: errorMessage, note: "Logger not found on instance, using console fallback" },
            );
          }
          throw new Error(`Event property validation failed: ${errorMessage}`);
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * @AdaptAndEmit decorator for Protocol Adapter Bundle.
 * Automatically adapts raw data using the injected adapter and emits the result.
 * Implements the architectural pattern for protocol translation at system boundaries.
 * 
 * @param adapterPropertyKey - Name of the property containing the injected adapter
 * @returns Method decorator that intercepts, adapts, and emits data
 */
export function AdaptAndEmit(adapterPropertyKey: string | symbol) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const rawData = args[0];
      const instance = this as InstanceWithDependencies;
      const className = instance.constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;

      try {
        // ARCHITECTURAL PURITY: Get dependencies from instance (this), not from container
        const adapter = instance[adapterPropertyKey] as IMessageAdapter;
        const eventBus = instance.eventBus;

        // VALIDACIÓN ARQUITECTÓNICA EN TIEMPO DE EJECUCIÓN
        if (!adapter) {
          const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property '${String(adapterPropertyKey)}'. Ensure the adapter is injected and assigned in the constructor.`;
          EmergencyLogger.error(errorMsg);
          throw new Error(errorMsg);
        }

        if (!eventBus) {
          const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property 'eventBus'. Ensure IEventBus is injected and assigned.`;
          EmergencyLogger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Access instance logger if available
        const instanceLogger = getLogger(this);
        if (instanceLogger) {
          instanceLogger.debug(`🔄 @AdaptAndEmit processing in ${fullMethodName}`, {
            adapterProperty: adapterPropertyKey,
            rawDataType: typeof rawData,
            timestamp: new Date().toISOString()
          });
        }

        // 2. Adapt the raw message using the injected adapter
        const adaptedEvent = adapter.adapt(rawData);

        // 3. Emit the adapted event through the EventBus
        eventBus.emit(adaptedEvent);

        if (instanceLogger) {
          instanceLogger.debug(`✅ @AdaptAndEmit completed in ${fullMethodName}`, {
            eventType: adaptedEvent.type,
            eventSource: adaptedEvent.source,
            timestamp: new Date().toISOString()
          });
        }

        // Execute the original method (for logic like 'this.messagesReceived++')
        return originalMethod.apply(this, args);

      } catch (error) {
        // Error boundary: Log and re-throw for proper error handling
        const instanceLogger = getLogger(this);
        if (instanceLogger) {
          instanceLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}`, {
            error: error instanceof Error ? error.message : String(error),
            adapterProperty: adapterPropertyKey,
            timestamp: new Date().toISOString()
          });
        } else {
          EmergencyLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}:`, error);
        }
        throw error;
      }
    };

    return descriptor;
  };
}

// ==================== BROWSER ENVIRONMENT DECORATORS ====================
// QUALIA.CODE v1.2 - Browser Environment Bundle

/**
 * Decorador que asegura que un método solo se ejecute en un entorno de navegador.
 * Si no está en el navegador, registra una advertencia y no hace nada.
 * Usage: @BrowserOnly
 */
export function BrowserOnly(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    // Comprobad si `typeof window` es `'undefined'`.
    if (typeof window === 'undefined') {
      // Obtened el logger de la instancia (`this.logger`) y registrad un `warn`.
      const instanceLogger = getLogger(this);
      if (instanceLogger) {
        instanceLogger.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
      } else {
        EmergencyLogger.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
      }
      return; // No ejecutar el método original
    }
    // Si estáis en el navegador, simplemente llamad al método original con sus argumentos:
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

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

// Helper function to set up event subscriptions for a service instance
// This should be called during service initialization
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
  
  const subscriptions = (instance.constructor as ConstructorWithSubscriptions)._eventSubscriptions || [];
  
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

// Helper function to clean up event subscriptions
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
