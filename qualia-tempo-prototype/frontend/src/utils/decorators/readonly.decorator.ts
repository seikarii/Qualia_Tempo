// QUALIA.CODE v1.1 - @readonly Decorator
// Freezes return values to prevent mutation
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

export function readonly() {
  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);

      const result = value.apply(this, args);

      if (result && typeof result === 'object') {
        Object.freeze(result);
        if (instanceLogger) {
          instanceLogger.debug(`${methodKey} return value frozen`);
        } else {
          EmergencyLogger.debug(`${methodKey} return value frozen`);
        }
      }

      return result;
    };
  };
}
