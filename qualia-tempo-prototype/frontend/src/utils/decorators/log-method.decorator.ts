// QUALIA.CODE v1.1 - @logMethod Decorator
// Logs method calls, arguments, results, and errors
// Compatible with TypeScript 5.x experimentalDecorators (stage-2 API)
// CRITICAL: Use @logMethod WITHOUT parentheses. @logMethod() will cause crashes.

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger, type InstanceWithLogger } from "./shared-types";
import type { ILogger } from "../../services/interfaces/ILogger";

/**
 * Decorator to log method calls and arguments.
 * Uses instance logger if available, falls back to EmergencyLogger only when necessary.
 * Usage: @logMethod (NO PARENTHESES)
 * 
 * PROHIBITED: @logMethod() - This will cause the application to crash with "descriptor is undefined"
 */
export function logMethod(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  // Defensive check: Ensure descriptor is defined
  if (!descriptor) {
    const errorMsg = `@logMethod decorator received undefined descriptor. This typically happens when @logMethod() is used with parentheses. Use @logMethod without parentheses instead.`;
    EmergencyLogger.error(errorMsg, { propertyKey });
    throw new Error(errorMsg);
  }
  
  const method = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const fullMethodName = `${(this as InstanceWithLogger).constructor.name}.${propertyKey}`;
    const instanceLogger = getLogger(this);
    
    logMethodEntry(instanceLogger, fullMethodName, args);
    
    try {
      const result = method.apply(this, args);
      return result instanceof Promise 
        ? handleAsyncResult(result, instanceLogger, fullMethodName)
        : handleSyncResult(result, instanceLogger, fullMethodName);
    } catch (error) {
      logMethodError(instanceLogger, fullMethodName, error);
      throw error;
    }
  };

  return descriptor;
}

function logMethodEntry(logger: ILogger | null | undefined, methodName: string, args: unknown[]) {
  const logData = {
    arguments: args.length > 0 ? args : "no arguments",
    timestamp: new Date().toISOString()
  };
  
  if (logger) {
    logger.debug(`→ ENTER ${methodName}`, logData);
  } else {
    EmergencyLogger.debug(`→ ENTER ${methodName}`, { ...logData, note: "Logger not found on instance, using EmergencyLogger" });
  }
}

function handleSyncResult(result: unknown, logger: ILogger | null | undefined, methodName: string) {
  const logData = { result, timestamp: new Date().toISOString() };
  
  if (logger) {
    logger.debug(`← EXIT ${methodName}`, logData);
  } else {
    EmergencyLogger.debug(`← EXIT ${methodName}`, { ...logData, note: "Logger not found on instance, using EmergencyLogger" });
  }
  return result;
}

function handleAsyncResult(promise: Promise<unknown>, logger: ILogger | null | undefined, methodName: string) {
  return promise
    .then((res) => handleSyncResult(res, logger, methodName))
    .catch((error) => {
      logMethodError(logger, methodName, error);
      throw error;
    });
}

function logMethodError(logger: ILogger | null | undefined, methodName: string, error: unknown) {
  const logData = {
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString()
  };
  
  if (logger) {
    logger.error(`✗ ERROR ${methodName}`, logData);
  } else {
    EmergencyLogger.error(`✗ ERROR ${methodName}`, { ...logData, note: "Logger not found on instance, using EmergencyLogger" });
  }
}
