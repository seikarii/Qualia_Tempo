// QUALIA.CODE v1.0 - Frontend Decorators
// Mandatory transversal logic implementation for TypeScript
// Updated for TypeScript 5.9.2 compatibility with stage-3 decorators

import { LoggerProvider } from "../services/Logger";
import { schemaRegistry } from "../schemas";

// ==================== STAGE-3 DECORATOR IMPLEMENTATIONS ====================
// Compatible with TypeScript 5.9.2 and stage-3 decorator proposal

/**
 * Decorator to log method calls and arguments.
 * Uses instance logger if available, falls back to console only when necessary.
 * Usage: @logMethod
 */
export function logMethod(
  _target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: any, ...args: any[]) {
    const className = this.constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;

    // Access logger from instance (this) at runtime
    const instanceLogger = (this as any).logger;
    let logger: any;

    if (instanceLogger && typeof instanceLogger.debug === 'function') {
      logger = instanceLogger;
    } else {
      // Try global logger as secondary option
      try {
        logger = LoggerProvider.getLogger();
      } catch (error) {
        // Final fallback: console (only when no instance logger available)
        console.debug(`→ ENTER ${fullMethodName}`, {
          arguments: args.length > 0 ? args : "no arguments",
          timestamp: new Date().toISOString(),
          note: "Logger not found on instance, using console fallback",
        });
        return method.apply(this, args);
      }
    }

    logger.debug(`→ ENTER ${fullMethodName}`, {
      arguments: args.length > 0 ? args : "no arguments",
      timestamp: new Date().toISOString(),
    });

    try {
      const result = method.apply(this, args);

      // Handle both sync and async results
      if (result instanceof Promise) {
        return result
          .then((res) => {
            logger.debug(`← EXIT ${fullMethodName}`, {
              result: res,
              timestamp: new Date().toISOString(),
            });
            return res;
          })
          .catch((error) => {
            logger.error(`✗ ERROR ${fullMethodName}`, {
              error: error.message,
              timestamp: new Date().toISOString(),
            });
            throw error;
          });
      } else {
        logger.debug(`← EXIT ${fullMethodName}`, {
          result,
          timestamp: new Date().toISOString(),
        });
        return result;
      }
    } catch (error) {
      logger.error(`✗ ERROR ${fullMethodName}`, {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
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
    value: any,
    context: ClassMethodDecoratorContext
  ): any {
    const methodName = String(context.name);

    return function (this: any, ...args: any[]) {
      const className = this.constructor.name;
      const methodKey = `${className}.${methodName}`;
      const now = Date.now();
      const lastCall = throttleMap.get(methodKey) || 0;

      // Safe logger access with fallback
      let logger: any;
      try {
        logger = LoggerProvider.getLogger();
      } catch (error) {
        // Fallback: still throttle but use console for logging
        if (now - lastCall < milliseconds) {
          console.debug(
            `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
          );
          return;
        }
        throttleMap.set(methodKey, now);
        console.debug(`Executing ${methodKey}`);
        return value.apply(this, args);
      }

      if (now - lastCall < milliseconds) {
        logger.debug(
          `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
        );
        return;
      }

      throttleMap.set(methodKey, now);
      logger.debug(`Executing ${methodKey}`);

      return value.apply(this, args);
    };
  };
}

/**
 * Decorator to catch and handle runtime errors.
 * Usage: @catchError
 */
export function catchError(
  _target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: any, ...args: any[]) {
    const className = this.constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;

    // Access logger from instance (this) at runtime
    const instanceLogger = (this as any).logger;
    let logger: any;

    if (instanceLogger && typeof instanceLogger.error === 'function') {
      logger = instanceLogger;
    } else {
      // Try global logger as secondary option
      try {
        logger = LoggerProvider.getLogger();
      } catch (error) {
        // Logger not available, proceed with execution and use console fallback if needed
        logger = null;
      }
    }

    try {
      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.catch((error: any) => {
          if (logger) {
            logger.error(`${fullMethodName}:`, {
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
      if (logger) {
        logger.error(`${fullMethodName}:`, {
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
  _target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: any, ...args: any[]) {
    const className = this.constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;
    const startTime = performance.now();

    try {
      const result = method.apply(this, args);

      // Handle async methods
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
}

/**
 * Helper function to log performance metrics with categorization.
 */
function logPerformance(
  methodName: string,
  duration: number,
  hasError = false,
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
  const logger = LoggerProvider.getLogger();

  if (level === "error") {
    logger.error(logMessage);
  } else if (level === "warn") {
    logger.warn(logMessage);
  } else {
    logger.info(logMessage);
  }
}

/**
 * Schema validation decorator.
 * Usage: @validate('QualiaState')
 */
export function validate(schemaName: string) {
  return function (
    value: any,
    context: ClassMethodDecoratorContext
  ): any {
    const methodName = String(context.name);

    return function (this: any, ...args: any[]) {
      const className = this.constructor.name;
      const fullMethodName = `${className}.${methodName}`;
      const logger = LoggerProvider.getLogger();

      // Validate first argument if present
      if (args.length > 0) {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            logger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Validate the data
          const validationResult = schema.safeParse(args[0]);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            logger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              {
                error: errorMessage,
                issues: validationResult.error.issues,
                receivedData: args[0],
              },
            );
            throw new Error(errorMessage);
          }

          logger.debug(
            `✅ Schema validation passed for ${schemaName} in ${fullMethodName}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(
            `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
            { error: errorMessage },
          );
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
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const method = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      const className = this.constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;
      const logger = LoggerProvider.getLogger();

      // Validate property of first argument if present
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        try {
          // Use statically imported schema registry
          const schema =
            schemaRegistry[schemaName as keyof typeof schemaRegistry];
          if (!schema) {
            const errorMessage = `Schema '${schemaName}' not found in registry`;
            logger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Extract the property to validate
          const propertyValue = args[0][propertyName];
          if (propertyValue === undefined) {
            const errorMessage = `Property '${propertyName}' not found in event object`;
            logger.error(
              `Event property validation failed for ${propertyName} in ${fullMethodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Validate the property data
          const validationResult = schema.safeParse(propertyValue);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            logger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              {
                error: errorMessage,
                issues: validationResult.error.issues,
                receivedPropertyData: propertyValue,
              },
            );
            throw new Error(errorMessage);
          }

          logger.debug(
            `✅ Event property validation passed for ${propertyName}.${schemaName} in ${fullMethodName}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(
            `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
            { error: errorMessage },
          );
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
    fallbackValue?: any;
    skipLogging?: boolean;
    skipTiming?: boolean;
    schema?: string;
  } = {},
) {
  return function (
    value: any,
    context: ClassMethodDecoratorContext
  ): any {
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
      _target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) => {
      const method = descriptor.value;
      descriptor.value = function (this: any, ...args: any[]) {
        const className = this.constructor.name;
        const fullMethodName = `${className}.${propertyKey}`;

        const instanceLogger = (this as any).logger;
        let logger: any;

        if (instanceLogger && typeof instanceLogger.error === 'function') {
          logger = instanceLogger;
        } else {
          try {
            logger = LoggerProvider.getLogger();
          } catch (error) {
            logger = null;
          }
        }

        try {
          const result = method.apply(this, args);
          if (result instanceof Promise) {
            return result.catch((error: any) => {
              if (logger) {
                logger.error(`${fullMethodName}:`, {
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
          if (logger) {
            logger.error(`${fullMethodName}:`, {
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
        _target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
      ) => {
        const method = descriptor.value;
        descriptor.value = function (this: any, ...args: any[]) {
          const className = this.constructor.name;
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
