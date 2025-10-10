// QUALIA.CODE v1.1 - @debounce Decorator
// Delays method execution until after specified time has elapsed since last call
// Perfect for search inputs, resize handlers, etc.
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

/**
 * Decorator to debounce method execution.
 * Delays execution until the specified time has elapsed since the last call.
 * 
 * Usage: @debounce(500) // Wait 500ms after last call
 * 
 * @param milliseconds - Delay in milliseconds
 * @returns Decorated method
 */
export function debounce(milliseconds: number) {
  const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;

      // Access logger from instance (this) at runtime
      const instanceLogger = getLogger(this);

      // Clear existing timeout
      const existingTimeout = timeoutMap.get(methodKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        if (instanceLogger) {
          instanceLogger.debug(`Debouncing ${methodKey} - clearing previous timeout`);
        } else {
          EmergencyLogger.debug(`Debouncing ${methodKey} - clearing previous timeout`, {
            note: "Logger not found on instance, using console fallback"
          });
        }
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        if (instanceLogger) {
          instanceLogger.debug(`Executing debounced ${methodKey} after ${milliseconds}ms`);
        } else {
          EmergencyLogger.debug(`Executing debounced ${methodKey} after ${milliseconds}ms`, {
            note: "Logger not found on instance, using console fallback"
          });
        }
        timeoutMap.delete(methodKey);
        value.apply(this, args);
      }, milliseconds);

      timeoutMap.set(methodKey, timeout);
    };
  };
}
