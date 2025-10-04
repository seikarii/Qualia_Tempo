// QUALIA.CODE v1.1 - @validate Decorator
// Schema validation decorator for method arguments
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { schemaRegistry } from "../../schemas";
import { getLogger } from "./shared-types";
import type { ILogger } from "../../services/interfaces/ILogger";

/**
 * Helper: Get schema from registry with error handling.
 */
function getSchemaFromRegistry(schemaName: string, logger?: ILogger) {
  const schema = schemaRegistry[schemaName as keyof typeof schemaRegistry];
  if (!schema) {
    const errorMessage = `Schema '${schemaName}' not found in registry`;
    if (logger) {
      logger.error(`Schema not found: ${schemaName}`, { error: errorMessage });
    } else {
      EmergencyLogger.error(`Schema not found: ${schemaName}`, { error: errorMessage });
    }
    throw new Error(errorMessage);
  }
  return schema;
}

/**
 * Helper: Perform schema validation.
 */
function performValidation(
  schema: { safeParse: (_data: unknown) => { success: boolean; error?: { message: string; issues: unknown[] } } },
  data: unknown,
  context: { schemaName: string; methodName: string; logger?: ILogger }
) {
  const validationResult = schema.safeParse(data);
  
  if (!validationResult.success) {
    const error = validationResult.error ?? { message: 'Unknown validation error', issues: [] };
    const errorMessage = `Schema validation failed: ${error.message}`;
    const errorData = {
      error: errorMessage,
      issues: error.issues,
      receivedData: data
    };
    
    if (context.logger) {
      context.logger.error(
        `Schema validation failed for ${context.schemaName} in ${context.methodName}:`,
        errorData
      );
    } else {
      EmergencyLogger.error(
        `Schema validation failed for ${context.schemaName} in ${context.methodName}:`,
        { ...errorData, note: "Logger not found on instance, using console fallback" }
      );
    }
    throw new Error(errorMessage);
  }
  
  // Log success
  if (context.logger) {
    context.logger.debug(`✅ Schema validation passed for ${context.schemaName} in ${context.methodName}`);
  } else {
    EmergencyLogger.debug(
      `✅ Schema validation passed for ${context.schemaName} in ${context.methodName}`,
      { note: "Logger not found on instance, using console fallback" }
    );
  }
}

/**
 * Schema validation decorator.
 * Usage: @validate('QualiaState')
 */
export function validate(schemaName: string) {
  return function (
    value: (..._args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext
  ): (..._args: unknown[]) => unknown {
    const methodName = String(context.name);

    return function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${methodName}`;
      const instanceLogger = getLogger(this);

      // Validate first argument if present
      // GOLD.CODE: Direct logic without redundant try-catch.
      // Let getSchemaFromRegistry and performValidation errors propagate naturally.
      if (args.length > 0) {
        const schema = getSchemaFromRegistry(schemaName, instanceLogger);
        performValidation(schema, args[0], {
          schemaName,
          methodName: fullMethodName,
          logger: instanceLogger
        });
      }

      return value.apply(this, args);
    };
  };
}
