// QUALIA.CODE v1.1 - @validateEventProperty Decorator
// Validates specific properties of event objects against schemas
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
 * Helper: Extract property from event object.
 */
function extractPropertyFromEvent(
  event: unknown,
  propertyName: string,
  methodName: string,
  logger?: ILogger
): unknown {
  if (!event || typeof event !== "object") {
    throw new Error(`Invalid event object in ${methodName}`);
  }
  
  const propertyValue = (event as Record<string, unknown>)[propertyName];
  if (propertyValue === undefined) {
    const errorMessage = `Property '${propertyName}' not found in event object`;
    if (logger) {
      logger.error(`Event property validation failed for ${propertyName} in ${methodName}:`, { error: errorMessage });
    } else {
      EmergencyLogger.error(`Event property validation failed for ${propertyName} in ${methodName}:`, { error: errorMessage });
    }
    throw new Error(errorMessage);
  }
  
  return propertyValue;
}

/**
 * Helper: Perform property validation.
 */
function performPropertyValidation(
  schema: { safeParse: (_data: unknown) => { success: boolean; error?: { message: string; issues: unknown[] } } },
  propertyValue: unknown,
  context: { propertyName: string; schemaName: string; methodName: string; logger?: ILogger }
) {
  const validationResult = schema.safeParse(propertyValue);
  
  if (!validationResult.success) {
    const error = validationResult.error ?? { message: 'Unknown validation error', issues: [] };
    const errorMessage = `Schema validation failed: ${error.message}`;
    const errorData = {
      error: errorMessage,
      issues: error.issues,
      receivedPropertyData: propertyValue
    };
    
    if (context.logger) {
      context.logger.error(
        `Event property validation failed for ${context.propertyName}.${context.schemaName} in ${context.methodName}:`,
        errorData
      );
    } else {
      EmergencyLogger.error(
        `Event property validation failed for ${context.propertyName}.${context.schemaName} in ${context.methodName}:`,
        { ...errorData, note: "Logger not found on instance, using console fallback" }
      );
    }
    throw new Error(errorMessage);
  }
  
  // Log success
  if (context.logger) {
    context.logger.debug(`✅ Event property validation passed for ${context.propertyName}.${context.schemaName} in ${context.methodName}`);
  } else {
    EmergencyLogger.debug(
      `✅ Event property validation passed for ${context.propertyName}.${context.schemaName} in ${context.methodName}`,
      { note: "Logger not found on instance, using console fallback" }
    );
  }
}

/**
 * Event property validation decorator.
 * Usage: @validateEventProperty('qualiaState', 'QualiaState')
 * Validates a specific property of an event object against a schema.
 */
export function validateEventProperty(
  propertyName: string,
  schemaName: string,
) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const method = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const className = (this as Record<string, unknown>).constructor.name;
      const fullMethodName = `${className}.${propertyKey}`;
      const instanceLogger = getLogger(this);

      // Validate property of first argument if present
      if (args.length > 0 && args[0] && typeof args[0] === "object") {
        try {
          const schema = getSchemaFromRegistry(schemaName, instanceLogger);
          const propertyValue = extractPropertyFromEvent(args[0], propertyName, fullMethodName, instanceLogger);
          performPropertyValidation(schema, propertyValue, {
            propertyName,
            schemaName,
            methodName: fullMethodName,
            logger: instanceLogger
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (instanceLogger) {
            instanceLogger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              { error: errorMessage }
            );
          } else {
            EmergencyLogger.error(
              `Event property validation failed for ${propertyName}.${schemaName} in ${fullMethodName}:`,
              { error: errorMessage, note: "Logger not found on instance, using console fallback" }
            );
          }
          throw new Error(`Event property validation failed: ${errorMessage}`);
        }
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}
