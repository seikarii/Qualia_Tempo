// QUALIA.CODE v1.0 - Frontend Decorators
// Mandatory transversal logic implementation for TypeScript

import { LoggerProvider } from "../services/Logger";
import { schemaRegistry } from "../schemas";

// ==================== UNIVERSAL DECORATOR FACTORY ====================
// Resolves dual signature problem ONCE. No more repetition.

type UniversalDecorator = {
  // eslint-disable-next-line no-unused-vars
  (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): PropertyDescriptor | void;
};

type DecoratorLogic = (
  // eslint-disable-next-line no-unused-vars
  originalMethod: Function,
  // eslint-disable-next-line no-unused-vars
  context: { target: any; propertyKey: string },
) => Function;

/**
 * Universal Decorator Factory - Eliminates signature duplication.
 * All decorators use this pattern. Zero exceptions.
 */
function createUniversalDecorator(logic: DecoratorLogic): UniversalDecorator {
  return function (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): PropertyDescriptor | void {
    if (!descriptor && propertyKey) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {
        value: target[propertyKey],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }

    if (!descriptor || typeof descriptor.value !== "function") {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey || "unknown");

    descriptor.value = logic(originalMethod, {
      target,
      propertyKey: methodName,
    });

    return descriptor;
  };
}

// ==================== CLEAN DECORATOR IMPLEMENTATIONS ====================

/**
 * Decorator to log method calls and arguments.
 * Uses instance logger if available, falls back to console only when necessary.
 * Usage: @logMethod()
 */
export function logMethod(): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodName = `${className}.${context.propertyKey}`;

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
          console.debug(`→ ENTER ${methodName}`, {
            arguments: args.length > 0 ? args : "no arguments",
            timestamp: new Date().toISOString(),
            note: "Logger not found on instance, using console fallback",
          });
          return originalMethod.apply(this, args);
        }
      }

      logger.debug(`→ ENTER ${methodName}`, {
        arguments: args.length > 0 ? args : "no arguments",
        timestamp: new Date().toISOString(),
      });

      try {
        const result = originalMethod.apply(this, args);

        // Handle both sync and async results
        if (result instanceof Promise) {
          return result
            .then((res) => {
              logger.debug(`← EXIT ${methodName}`, {
                result: res,
                timestamp: new Date().toISOString(),
              });
              return res;
            })
            .catch((error) => {
              logger.error(`✗ ERROR ${methodName}`, {
                error: error.message,
                timestamp: new Date().toISOString(),
              });
              throw error;
            });
        } else {
          logger.debug(`← EXIT ${methodName}`, {
            result: result,
            timestamp: new Date().toISOString(),
          });
          return result;
        }
      } catch (error) {
        logger.error(`✗ ERROR ${methodName}`, {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
        throw error;
      }
    };
  });
}

/**
 * Decorator to throttle method execution.
 * Usage: @throttle(250)
 */
export function throttle(milliseconds: number): UniversalDecorator {
  const throttleMap = new Map<string, number>();

  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodKey = `${className}.${context.propertyKey}`;
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
        return originalMethod.apply(this, args);
      }

      if (now - lastCall < milliseconds) {
        logger.debug(
          `Skipping ${methodKey} (${now - lastCall}ms < ${milliseconds}ms)`,
        );
        return;
      }

      throttleMap.set(methodKey, now);
      logger.debug(`Executing ${methodKey}`);

      return originalMethod.apply(this, args);
    };
  });
}

/**
 * Decorator to catch and handle runtime errors.
 * Usage: @catchError()
 */
export function catchError(fallbackValue?: any): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodName = `${className}.${context.propertyKey}`;

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
        const result = originalMethod.apply(this, args);

        // Handle async methods
        if (result instanceof Promise) {
          return result.catch((error: any) => {
            if (logger) {
              logger.error(`${methodName}:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : "No stack trace",
                arguments: args,
                timestamp: new Date().toISOString(),
              });
            } else {
              console.error(`${methodName}:`, {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : "No stack trace",
                arguments: args,
                timestamp: new Date().toISOString(),
                note: "Logger not found on instance, using console fallback",
              });
            }

            if (fallbackValue !== undefined) {
              return fallbackValue;
            }

            throw error;
          });
        }

        return result;
      } catch (methodError) {
        if (logger) {
          logger.error(`${methodName}:`, {
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
          console.error(`${methodName}:`, {
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

        if (fallbackValue !== undefined) {
          return fallbackValue;
        }

        throw methodError;
      }
    };
  });
}

/**
 * Decorator to measure method execution time.
 * Usage: @measureTime()
 */
export function measureTime(): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodName = `${className}.${context.propertyKey}`;
      const startTime = performance.now();

      try {
        const result = originalMethod.apply(this, args);

        // Handle async methods
        if (result instanceof Promise) {
          return result.finally(() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            logPerformance(methodName, duration);
          });
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        logPerformance(methodName, duration);

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        logPerformance(methodName, duration, true);
        throw error;
      }
    };
  });
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
export function validate(schemaName: string): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodName = `${className}.${context.propertyKey}`;
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
              `Schema validation failed for ${schemaName} in ${methodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Validate the data
          const validationResult = schema.safeParse(args[0]);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            logger.error(
              `Schema validation failed for ${schemaName} in ${methodName}:`,
              {
                error: errorMessage,
                issues: validationResult.error.issues,
                receivedData: args[0],
              },
            );
            throw new Error(errorMessage);
          }

          logger.debug(
            `✅ Schema validation passed for ${schemaName} in ${methodName}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(
            `Schema validation failed for ${schemaName} in ${methodName}:`,
            { error: errorMessage },
          );
          throw new Error(`Schema validation failed: ${errorMessage}`);
        }
      }

      return originalMethod.apply(this, args);
    };
  });
}

/**
 * Event property validation decorator.
 * Usage: @validateEventProperty('qualiaState', 'QualiaState')
 * Validates a specific property of an event object against a schema.
 */
export function validateEventProperty(
  propertyName: string,
  schemaName: string,
): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    return function (this: any, ...args: any[]) {
      const className = context.target.constructor.name;
      const methodName = `${className}.${context.propertyKey}`;
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
              `Schema validation failed for ${schemaName} in ${methodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Extract the property to validate
          const propertyValue = args[0][propertyName];
          if (propertyValue === undefined) {
            const errorMessage = `Property '${propertyName}' not found in event object`;
            logger.error(
              `Event property validation failed for ${propertyName} in ${methodName}:`,
              { error: errorMessage },
            );
            throw new Error(errorMessage);
          }

          // Validate the property data
          const validationResult = schema.safeParse(propertyValue);

          if (!validationResult.success) {
            const errorMessage = `Schema validation failed: ${validationResult.error.message}`;
            logger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${methodName}:`,
              {
                error: errorMessage,
                issues: validationResult.error.issues,
                receivedPropertyData: propertyValue,
              },
            );
            throw new Error(errorMessage);
          }

          logger.debug(
            `✅ Event property validation passed for ${propertyName}.${schemaName} in ${methodName}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(
            `Event property validation failed for ${propertyName}.${schemaName} in ${methodName}:`,
            { error: errorMessage },
          );
          throw new Error(`Event property validation failed: ${errorMessage}`);
        }
      }

      return originalMethod.apply(this, args);
    };
  });
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
): UniversalDecorator {
  return createUniversalDecorator((originalMethod, context) => {
    let decoratedMethod = originalMethod;

    // Apply decorators in reverse order (they wrap outward)
    if (options.throttleMs) {
      const throttleDecorator = throttle(options.throttleMs);
      const tempDescriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      const result = throttleDecorator(
        context.target,
        context.propertyKey,
        tempDescriptor,
      );
      if (result && typeof result.value === "function") {
        decoratedMethod = result.value;
      }
    }

    if (options.schema) {
      const validateDecorator = validate(options.schema);
      const tempDescriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      const result = validateDecorator(
        context.target,
        context.propertyKey,
        tempDescriptor,
      );
      if (result && typeof result.value === "function") {
        decoratedMethod = result.value;
      }
    }

    const catchErrorDecorator = catchError(options.fallbackValue);
    let tempDescriptor = {
      value: decoratedMethod,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    let result = catchErrorDecorator(
      context.target,
      context.propertyKey,
      tempDescriptor,
    );
    if (result && typeof result.value === "function") {
      decoratedMethod = result.value;
    }

    if (!options.skipLogging) {
      const logDecorator = logMethod();
      tempDescriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      result = logDecorator(
        context.target,
        context.propertyKey,
        tempDescriptor,
      );
      if (result && typeof result.value === "function") {
        decoratedMethod = result.value;
      }
    }

    if (!options.skipTiming) {
      const measureDecorator = measureTime();
      tempDescriptor = {
        value: decoratedMethod,
        writable: true,
        enumerable: true,
        configurable: true,
      };
      result = measureDecorator(
        context.target,
        context.propertyKey,
        tempDescriptor,
      );
      if (result && typeof result.value === "function") {
        decoratedMethod = result.value;
      }
    }

    return decoratedMethod;
  });
}
