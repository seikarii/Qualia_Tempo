// QUALIA.CODE v1.1 - @timeout Decorator
// Wraps async operations with timeout to prevent hanging
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

export function timeout(milliseconds: number) {
  return function (
    value: (..._args: unknown[]) => Promise<unknown>,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => Promise<unknown> {
    const methodName = String(context.name);

    return async function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error(`${methodKey} timed out after ${milliseconds}ms`);
          if (instanceLogger) {
            instanceLogger.error(`Timeout: ${methodKey}`, error);
          } else {
            EmergencyLogger.error(`Timeout: ${methodKey}`, error);
          }
          reject(error);
        }, milliseconds);
      });

      return Promise.race([
        value.apply(this, args),
        timeoutPromise
      ]) as Promise<unknown>;
    };
  };
}
