// QUALIA.CODE v1.1 - @deprecated Decorator
// Marks methods as deprecated with migration guidance
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

export function deprecated(message: string, migration?: string) {
  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const methodKey = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);

      const warningMessage = `DEPRECATED: ${methodKey} - ${message}${migration ? `\nMigration: ${migration}` : ''}`;
      
      if (instanceLogger) {
        instanceLogger.warn(warningMessage);
      } else {
        EmergencyLogger.warn(warningMessage);
      }

      return value.apply(this, args);
    };
  };
}
