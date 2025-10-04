// QUALIA.CODE v1.1 - @throttle Decorator
// Throttles method execution to prevent excessive calls
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

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
