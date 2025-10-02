// QUALIA.CODE v1.0 - Frontend Decorators
// Mandatory transversal logic implementation for TypeScript
// Updated for TypeScript 5.9.2 compatibility with stage-3 decorators

import { schemaRegistry } from "../schemas";

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
    const className = (this as Record<string, unknown>).constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;

    // Access logger from instance (this) at runtime
    const instanceLogger = (this as Record<string, unknown>).logger;
    if (instanceLogger && typeof instanceLogger.debug === 'function') {
      instanceLogger.debug(`→ ENTER ${fullMethodName}`, {
        arguments: args.length > 0 ? args : "no arguments",
        timestamp: new Date().toISOString(),
      });
    } else {
      // Fallback to console only when no instance logger available
      console.debug(`→ ENTER ${fullMethodName}`, {
        arguments: args.length > 0 ? args : "no arguments",
        timestamp: new Date().toISOString(),
        note: "Logger not found on instance, using console fallback",
      });
    }

    try {
      const result = method.apply(this, args);

      // Handle both sync and async results
      if (result instanceof Promise) {
        return result
          .then((res) => {
            if (instanceLogger && typeof instanceLogger.debug === 'function') {
              instanceLogger.debug(`← EXIT ${fullMethodName}`, {
                result: res,
                timestamp: new Date().toISOString(),
              });
            } else {
              console.debug(`← EXIT ${fullMethodName}`, {
                result: res,
                timestamp: new Date().toISOString(),
                note: "Logger not found on instance, using console fallback",
              });
            }
            return res;
          })
          .catch((error) => {
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(`✗ ERROR ${fullMethodName}`, {
                error: error.message,
                timestamp: new Date().toISOString(),
              });
            } else {
              console.error(`✗ ERROR ${fullMethodName}`, {
                error: error.message,
                timestamp: new Date().toISOString(),
                note: "Logger not found on instance, using console fallback",
              });
            }
            throw error;
          });
      } else {
        if (instanceLogger && typeof instanceLogger.debug === 'function') {
          instanceLogger.debug(`← EXIT ${fullMethodName}`, {
            result,
            timestamp: new Date().toISOString(),
          });
        } else {
          console.debug(`← EXIT ${fullMethodName}`, {
            result,
            timestamp: new Date().toISOString(),
            note: "Logger not found on instance, using console fallback",
          });
        }
        return result;
      }
    } catch (error) {
      if (instanceLogger && typeof instanceLogger.error === 'function') {
        instanceLogger.error(`✗ ERROR ${fullMethodName}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      } else {
        console.error(`✗ ERROR ${fullMethodName}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          note: "Logger not found on instance, using console fallback",
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
    value: (...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (...args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const now = Date.now();
      const lastCall = throttleMap.get(methodKey) ?? 0;

      // Access logger from instance (this) at runtime
      const instanceLogger = (this as Record<string, unknown>).logger;
      if (now - lastCall < milliseconds) {
        if (instanceLogger && typeof instanceLogger.debug === 'function') {
          instanceLogger.debug(
            `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
          );
        } else {
          console.debug(
            `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
            { note: "Logger not found on instance, using console fallback" }
          );
        }
        return;
      }
      throttleMap.set(methodKey, now);
      if (instanceLogger && typeof instanceLogger.debug === 'function') {
        instanceLogger.debug(`Executing ${methodKey}`);
      } else {
        console.debug(`Executing ${methodKey}`, { note: "Logger not found on instance, using console fallback" });
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
    const instanceLogger = (this as Record<string, unknown>).logger;

    try {
      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.catch((error: unknown) => {
          if (instanceLogger && typeof instanceLogger.error === 'function') {
            instanceLogger.error(`${fullMethodName}:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : "No stack trace",
              arguments: args,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.error(`${fullMethodName}:`, {
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
      if (instanceLogger && typeof instanceLogger.error === 'function') {
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
        console.error(`${fullMethodName}:`, {
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
    const instanceLogger = (this as Record<string, unknown>).logger;

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
  instanceLogger?: unknown,
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

  if (instanceLogger && typeof instanceLogger[level === "error" ? "error" : level === "warn" ? "warn" : "info"] === 'function') {
    if (level === "error") {
      instanceLogger.error(logMessage);
    } else if (level === "warn") {
      instanceLogger.warn(logMessage);
    } else {
      instanceLogger.info(logMessage);
    }
  } else {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](logMessage, { note: "Logger not found on instance, using console fallback" });
  }
}

/**
 * Schema validation decorator.
 * Usage: @validate('QualiaState')
 */
export function validate(schemaName: string) {
  return function (
    value: (...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (...args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${methodName}`;
      const instanceLogger = (this as Record<string, unknown>).logger;

      // Validate first argument if present
      if (args.length > 0) {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              console.error(
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
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedData: args[0],
                },
              );
            } else {
              console.error(
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

          if (instanceLogger && typeof instanceLogger.debug === 'function') {
            instanceLogger.debug(
              `✅ Schema validation passed for ${schemaName} in ${fullMethodName}`,
            );
          } else {
            console.debug(
              `✅ Schema validation passed for ${schemaName} in ${fullMethodName}`,
              { note: "Logger not found on instance, using console fallback" },
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (instanceLogger && typeof instanceLogger.error === 'function') {
            instanceLogger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
          } else {
            console.error(
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
      const instanceLogger = (this as Record<string, unknown>).logger;

      // Validate property of first argument if present
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              console.error(
                `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
                { error: errorMessage, note: "Logger not found on instance, using console fallback" },
              );
            }
            throw new Error(errorMessage);
          }

          // Extract the property to validate
          const propertyValue = args[0][propertyName];
          if (propertyValue === undefined) {
            const errorMessage = `Property '${propertyName}' not found in event object`;
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(
                `Event property validation failed for ${propertyName} in ${fullMethodName}:`,
                { error: errorMessage },
              );
            } else {
              console.error(
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
            if (instanceLogger && typeof instanceLogger.error === 'function') {
              instanceLogger.error(
                `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
                {
                  error: errorMessage,
                  issues: validationResult.error.issues,
                  receivedPropertyData: propertyValue,
                },
              );
            } else {
              console.error(
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

          if (instanceLogger && typeof instanceLogger.debug === 'function') {
            instanceLogger.debug(
              `✅ Event property validation passed for ${propertyName}.${schemaName} in ${fullMethodName}`,
            );
          } else {
            console.debug(
              `✅ Event property validation passed for ${propertyName}.${schemaName} in ${fullMethodName}`,
              { note: "Logger not found on instance, using console fallback" },
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (instanceLogger && typeof instanceLogger.error === 'function') {
            instanceLogger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
          } else {
            console.error(
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
 * Decorator combination helper for common patterns.
 * Usage: @qualiaMethod() applies logging, error handling, and performance measurement
 */
export function qualiaMethod(
  options: {
    throttleMs?: number;
    fallbackValue?: unknown;
    skipLogging?: boolean;
    skipTiming?: boolean;
    schema?: string;
  } = {},
) {
  return function (
    value: (...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (...args: unknown[]) => unknown {
    // Start with the original method
    let decoratedMethod = value;

    // Apply decorators in reverse order (they wrap outward)
    if (options.throttleMs) {
      const throttleDecorator = throttle(options.throttleMs);
      decoratedMethod = throttleDecorator(decoratedMethod, context);
    }

    if (options.schema) {
      const validateDecorator = validate(options.schema);
      decoratedMethod = validateDecorator(decoratedMethod, context);
    }

    // Always apply catchError
    const catchErrorDecorator = (
      _target: unknown,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const method = descriptor.value;
      descriptor.value = function (this: unknown, ...args: unknown[]) {
        const className = (this as Record<string, unknown>).constructor.name;
        const fullMethodName = `${className}.${propertyKey}`;

        const instanceLogger = (this as Record<string, unknown>).logger;

        try {
          const result = method.apply(this, args);
          if (result instanceof Promise) {
            return result.catch((error: unknown) => {
              if (instanceLogger && typeof instanceLogger.error === 'function') {
                instanceLogger.error(`${fullMethodName}:`, {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : "No stack trace",
                  arguments: args,
                  timestamp: new Date().toISOString(),
                });
              } else {
                console.error(`${fullMethodName}:`, {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : "No stack trace",
                  arguments: args,
                  timestamp: new Date().toISOString(),
                  note: "Logger not found on instance, using console fallback",
                });
              }
              throw error;
            });
          }
          return result;
        } catch (methodError) {
          if (instanceLogger && typeof instanceLogger.error === 'function') {
            instanceLogger.error(`${fullMethodName}:`, {
              error: methodError instanceof Error ? methodError.message : String(methodError),
              stack: methodError instanceof Error ? methodError.stack : "No stack trace",
              arguments: args,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.error(`${fullMethodName}:`, {
              error: methodError instanceof Error ? methodError.message : String(methodError),
              stack: methodError instanceof Error ? methodError.stack : "No stack trace",
              arguments: args,
              timestamp: new Date().toISOString(),
              note: "Logger not found on instance, using console fallback",
            });
          }
          throw methodError;
        }
      };
      return descriptor;
    };
    const descriptor = {
      value: decoratedMethod,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    decoratedMethod = catchErrorDecorator({}, String(context.name), descriptor).value;

    if (!options.skipLogging) {
      const logDecorator = logMethod;
      const descriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      decoratedMethod = logDecorator({}, String(context.name), descriptor).value;
    }

    if (!options.skipTiming) {
      const measureDecorator = (
        _target: unknown,
        propertyKey: string,
        descriptor: PropertyDescriptor
      ) => {
        const method = descriptor.value;
        descriptor.value = function (this: unknown, ...args: unknown[]) {
          const className = (this as Record<string, unknown>).constructor.name;
          const fullMethodName = `${className}.${propertyKey}`;
          const startTime = performance.now();

          try {
            const result = method.apply(this, args);
            if (result instanceof Promise) {
              return result.finally(() => {
                const endTime = performance.now();
                const duration = endTime - startTime;
                logPerformance(fullMethodName, duration);
              });
            }
            const endTime = performance.now();
            const duration = endTime - startTime;
            logPerformance(fullMethodName, duration);
            return result;
          } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            logPerformance(fullMethodName, duration, true);
            throw error;
          }
        };
        return descriptor;
      };
      const descriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      decoratedMethod = measureDecorator({}, String(context.name), descriptor).value;
    }

    return decoratedMethod;
  };
}

// ==================== PROTOCOL ADAPTER DECORATORS ====================
// QUALIA.CODE v1.2 - Protocol Adaptation Bundle

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
      const className = this.constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;

      try {
        // ARCHITECTURAL PURITY: Get dependencies from instance (this), not from container
        const adapter = (this as Record<string | symbol, unknown>)[adapterPropertyKey];
        const eventBus = (this as Record<string, unknown>).eventBus;

        // VALIDACIÓN ARQUITECTÓNICA EN TIEMPO DE EJECUCIÓN
        if (!adapter) {
          const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property '${String(adapterPropertyKey)}'. Ensure the adapter is injected and assigned in the constructor.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }

        if (!eventBus) {
          const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property 'eventBus'. Ensure IEventBus is injected and assigned.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Access instance logger if available
        const instanceLogger = (this as Record<string, unknown>).logger;
        if (instanceLogger && typeof instanceLogger.debug === 'function') {
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

        if (instanceLogger && typeof instanceLogger.debug === 'function') {
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
        const instanceLogger = (this as Record<string, unknown>).logger;
        if (instanceLogger && typeof instanceLogger.error === 'function') {
          instanceLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}`, {
            error: error instanceof Error ? error.message : String(error),
            adapterProperty: adapterPropertyKey,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}:`, error);
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
      const instanceLogger = (this as Record<string, unknown>).logger;
      if (instanceLogger && typeof instanceLogger.warn === 'function') {
        instanceLogger.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
      } else {
        console.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
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
    const targetConstructor = (target as Record<string, unknown>).constructor as Record<string, unknown>;
    if (!targetConstructor._eventSubscriptions) {
      targetConstructor._eventSubscriptions = [];
    }
    
    (targetConstructor._eventSubscriptions as unknown[]).push({
      eventType,
      methodName: propertyKey,
      originalMethod
    });

    // Enhanced method that includes logging
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const instanceLogger = (this as Record<string, unknown>).logger;
      if (instanceLogger && typeof instanceLogger.debug === 'function') {
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
  const eventBus = (serviceInstance as Record<string, unknown>).eventBus;
  const logger = (serviceInstance as Record<string, unknown>).logger;
  
  if (!eventBus) {
    if (logger && typeof logger.error === 'function') {
      logger.error('Cannot initialize event subscriptions: eventBus not found on service instance');
    }
    return;
  }

  // Initialize listeners array if not exists
  if (!(serviceInstance as Record<string, unknown>)._eventListeners) {
    (serviceInstance as Record<string, unknown>)._eventListeners = [];
  }

  const subscriptions = ((serviceInstance as Record<string, unknown>).constructor as Record<string, unknown>)._eventSubscriptions || [];
  
  for (const subscription of (subscriptions as {eventType: string; methodName: string; originalMethod: unknown}[])) {
    const method = (serviceInstance as Record<string, unknown>)[subscription.methodName];
    if (method) {
      const listenerId = eventBus.subscribe(
        subscription.eventType,
        method.bind(serviceInstance),
        { priority: 'normal' }
      );
      
      ((serviceInstance as Record<string, unknown>)._eventListeners as string[]).push(listenerId);
      
      if (logger && typeof logger.debug === 'function') {
        logger.debug(`📡 [${((serviceInstance as Record<string, unknown>).constructor as Record<string, unknown>).name}] Subscribed to event: ${subscription.eventType}`, {
          method: subscription.methodName,
          listenerId
        });
      }
    }
  }
}

// Helper function to clean up event subscriptions
export function cleanupEventSubscriptions(serviceInstance: unknown): void {
  const eventBus = (serviceInstance as Record<string, unknown>).eventBus;
  const listeners = ((serviceInstance as Record<string, unknown>)._eventListeners || []) as string[];
  const logger = (serviceInstance as Record<string, unknown>).logger;

  if (eventBus && listeners.length > 0) {
    listeners.forEach((listenerId: string) => {
      eventBus.unsubscribe(listenerId);
    });
    
    (serviceInstance as Record<string, unknown>)._eventListeners = [];
    
    if (logger && typeof logger.debug === 'function') {
      logger.debug(`📡 [${((serviceInstance as Record<string, unknown>).constructor as Record<string, unknown>).name}] Cleaned up ${listeners.length} event subscriptions`);
    }
  }
}
