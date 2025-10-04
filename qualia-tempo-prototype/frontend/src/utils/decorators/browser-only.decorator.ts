// QUALIA.CODE v1.2 - @BrowserOnly Decorator
// Browser Environment Bundle - Ensures methods only execute in browser context
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger } from "./shared-types";

/**
 * Decorator that ensures a method only executes in a browser environment.
 * If not in browser, logs a warning and returns without execution.
 * 
 * CRITICAL FOR PLATFORM ABSTRACTION: Prevents crashes when code runs in non-browser
 * environments (SSR, tests) by checking for window availability.
 * 
 * Usage: @BrowserOnly
 * 
 * Example:
 * ```typescript
 * @BrowserOnly
 * public getWindowDimensions(): { width: number; height: number } {
 *   return { width: window.innerWidth, height: window.innerHeight };
 * }
 * ```
 */
export function BrowserOnly(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    // Check if `typeof window` is `'undefined'`.
    if (typeof window === 'undefined') {
      // Get logger from instance and log warning
      const instanceLogger = getLogger(this);
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;
      
      if (instanceLogger) {
        instanceLogger.warn(`Cannot execute ${fullMethodName} in a non-browser environment.`);
      } else {
        EmergencyLogger.warn(`Cannot execute ${fullMethodName} in a non-browser environment.`);
      }
      return; // Do not execute the original method
    }
    // If in browser, simply call the original method with its arguments:
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
