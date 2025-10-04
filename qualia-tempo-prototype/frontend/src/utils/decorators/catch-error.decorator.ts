// QUALIA.CODE v1.1 - @catchError Decorator
// Catches and handles runtime errors with structured logging
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";
import type { ILogger } from "../../services/interfaces/ILogger";

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
    const fullMethodName = `${(this as Record<string, unknown>).constructor.name}.${propertyKey}`;
    const instanceLogger = getLogger(this);

    try {
      const result = method.apply(this, args);
      return result instanceof Promise
        ? result.catch((error: unknown) => handleCatchError(instanceLogger, fullMethodName, args, error))
        : result;
    } catch (methodError) {
      handleCatchError(instanceLogger, fullMethodName, args, methodError);
      throw methodError;
    }
  };

  return descriptor;
}

function handleCatchError(logger: ILogger | null | undefined, methodName: string, args: unknown[], error: unknown) {
  const errorData = {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : "No stack trace",
    arguments: args,
    timestamp: new Date().toISOString()
  };

  if (logger) {
    logger.error(`${methodName}:`, errorData);
  } else {
    EmergencyLogger.error(`${methodName}:`, { ...errorData, note: "Logger not found on instance, using console fallback" });
  }
  
  throw error;
}
