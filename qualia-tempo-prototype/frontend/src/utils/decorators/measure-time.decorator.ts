// QUALIA.CODE v1.1 - @measureTime Decorator
// Measures and logs method execution time with performance categorization
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";
import type { ILogger } from "../../services/interfaces/ILogger";

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
 * Helper function to determine performance category and log level based on duration.
 */
function getCategoryAndLevel(duration: number): { category: string; level: "log" | "warn" | "error" } {
  if (duration < 1) return { category: "�� FAST", level: "log" };
  if (duration < 10) return { category: "⚡ GOOD", level: "log" };
  if (duration < 100) return { category: "⏱️ OK", level: "warn" };
  if (duration < 1000) return { category: "🐌 SLOW", level: "warn" };
  return { category: "🚨 VERY SLOW", level: "error" };
}

/**
 * Helper function to log message with appropriate level.
 */
function logWithLevel(
  logger: ILogger | undefined,
  message: string,
  level: "log" | "warn" | "error"
): void {
  if (logger) {
    if (level === "error") logger.error(message);
    else if (level === "warn") logger.warn(message);
    else logger.info(message);
  } else {
    if (level === "error") EmergencyLogger.error(message, { note: "Logger not found on instance, using EmergencyLogger" });
    else if (level === "warn") EmergencyLogger.warn(message, { note: "Logger not found on instance, using EmergencyLogger" });
    else EmergencyLogger.info(message, { note: "Logger not found on instance, using EmergencyLogger" });
  }
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
  const { category, level } = getCategoryAndLevel(duration);
  const errorIndicator = hasError ? " ✗" : "";
  const logMessage = `${category} ${methodName}: ${duration.toFixed(2)}ms${errorIndicator}`;
  logWithLevel(instanceLogger, logMessage, level);
}
