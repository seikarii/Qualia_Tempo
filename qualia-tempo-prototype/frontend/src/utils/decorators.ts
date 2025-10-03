// QUALIA.CODE v1.1 - Frontend Decorators
// Mandatory transversal logic implementation for TypeScript
// Updated for TypeScript 5.9.2 compatibility with stage-3 decorators

import { schemaRegistry } from "../schemas";
import { EmergencyLogger } from "./EmergencyLogger";
import type { ILogger } from "../services/interfaces/ILogger";

// QUALIA.CODE v1.1: Type helper for instances with logger
interface InstanceWithLogger {
  logger?: ILogger;
  constructor: { name: string };
}

// QUALIA.CODE v1.1: Type helper for adapters
interface IMessageAdapter {
  adapt(_rawData: unknown): { type: string; source?: string; [key: string]: unknown };
}

// QUALIA.CODE v1.1: Type helper for event bus
interface IEventBus {
  emit(_event: unknown): void;
  subscribe(_eventType: string, _handler: (..._args: unknown[]) => void, _options?: unknown): string;
  unsubscribe(_listenerId: string): void;
}

// QUALIA.CODE v1.1: Type helper for instances with eventBus and adapter
interface InstanceWithDependencies extends InstanceWithLogger {
  eventBus?: IEventBus;
  [key: string | symbol]: unknown;
}

// QUALIA.CODE v1.1: Base Service Interface for Lifecycle Management
export interface IBaseService {
  /**
   * Initialize service lifecycle, including event subscriptions
   */
  initialize(): void;
  
  /**
   * Cleanup service resources, including event subscriptions
   */
  cleanup(): void;
}

// Helper function to safely get logger from instance
function getLogger(instance: unknown): ILogger | undefined {
  const typed = instance as Partial<InstanceWithLogger>;
  return typed.logger;
}

// ==================== STAGE-3 DECORATOR IMPLEMENTATIONS ====================
// Compatible with TypeScript 5.9.2 and stage-3 decorator proposal

/**
 * Decorator to log method calls and arguments.
 * Uses instance logger if available, falls back to console only when necessary.
 * Usage: @logMethod
 */
export function logMethod(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
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

/**
 * Decorator to measure method execution time.
 * Usage: @measureTime
 */
export function measureTime(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const method = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    const className = (this as Record<string, unknown>).constructor.name;
    const fullMethodName = `${className}.${propertyKey}`;
    const startTime = performance.now();
    const instanceLogger = getLogger(this);

    try {
      const result = method.apply(this, args);

      // Handle async methods
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;
          logPerformance(fullMethodName, duration, false, instanceLogger);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      logPerformance(fullMethodName, duration, false, instanceLogger);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      logPerformance(fullMethodName, duration, true, instanceLogger);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Helper function to determine performance category and log level based on duration.
 */
function getCategoryAndLevel(duration: number): { category: string; level: "log" | "warn" | "error" } {
  if (duration < 1) return { category: "🚀 FAST", level: "log" };
  if (duration < 10) return { category: "⚡ GOOD", level: "log" };
  if (duration < 100) return { category: "⏱️ OK", level: "warn" };
  if (duration < 1000) return { category: "🐌 SLOW", level: "warn" };
  return { category: "🚨 VERY SLOW", level: "error" };
}

/**
 * Helper function to log message with appropriate level.
 */
function logWithLevel(
  logger: ILogger | undefined,
  message: string,
  level: "log" | "warn" | "error"
): void {
  if (logger) {
    if (level === "error") logger.error(message);
    else if (level === "warn") logger.warn(message);
    else logger.info(message);
  } else {
    if (level === "error") EmergencyLogger.error(message, { note: "Logger not found on instance, using EmergencyLogger" });
    else if (level === "warn") EmergencyLogger.warn(message, { note: "Logger not found on instance, using EmergencyLogger" });
    else EmergencyLogger.info(message, { note: "Logger not found on instance, using EmergencyLogger" });
  }
}

/**
 * Helper function to log performance metrics with categorization.
 */
function logPerformance(
  methodName: string,
  duration: number,
  hasError = false,
  instanceLogger?: ILogger,
): void {
  const { category, level } = getCategoryAndLevel(duration);
  const errorIndicator = hasError ? " ✗" : "";
  const logMessage = `${category} ${methodName}: ${duration.toFixed(2)}ms${errorIndicator}`;
  logWithLevel(instanceLogger, logMessage, level);
}

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
      if (args.length > 0) {
        try {
          const schema = getSchemaFromRegistry(schemaName, instanceLogger);
          performValidation(schema, args[0], {
            schemaName,
            methodName: fullMethodName,
            logger: instanceLogger
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (instanceLogger) {
            instanceLogger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage }
            );
          } else {
            EmergencyLogger.error(
              `Schema validation failed for ${schemaName} in ${fullMethodName}:`,
              { error: errorMessage, note: "Logger not found on instance, using console fallback" }
            );
          }
          throw new Error(`Schema validation failed: ${errorMessage}`);
        }
      }

      return value.apply(this, args);
    };
  };
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

/**
 * @AdaptAndEmit decorator for Protocol Adapter Bundle.
 * Automatically adapts raw data using the injected adapter and emits the result.
 * Implements the architectural pattern for protocol translation at system boundaries.
 * 
 * @param adapterPropertyKey - Name of the property containing the injected adapter
 * @returns Method decorator that intercepts, adapts, and emits data
 */
export function AdaptAndEmit(adapterPropertyKey: string | symbol) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const params = {
        instance: this,
        propertyKey,
        adapterPropertyKey,
        originalMethod,
        args
      };
      return adaptAndEmitImpl(params);
    };

    return descriptor;
  };
}

function adaptAndEmitImpl(params: {
  instance: unknown;
  propertyKey: string;
  adapterPropertyKey: string | symbol;
  originalMethod: (..._args: unknown[]) => unknown;
  args: unknown[];
}): unknown {
  const { instance, propertyKey, adapterPropertyKey, originalMethod, args } = params;
  const rawData = args[0];
  const instanceWithDeps = instance as InstanceWithDependencies;
  const className = instanceWithDeps.constructor.name;
  const fullMethodName = `${className}.${propertyKey}`;

  try {
    validateDependencies(instanceWithDeps, adapterPropertyKey, className);
    const adapter = instanceWithDeps[adapterPropertyKey] as IMessageAdapter;
    const eventBus = instanceWithDeps.eventBus; // Validated above, no non-null assertion needed

    if (!eventBus) {
      throw new Error('EventBus should be validated by validateDependencies');
    }

    logAdaptAndEmitStart(instance, fullMethodName, adapterPropertyKey, rawData);

    const adaptedEvent = adapter.adapt(rawData);
    eventBus.emit(adaptedEvent);

    logAdaptAndEmitSuccess(instance, fullMethodName, adaptedEvent);

    return originalMethod.apply(instance, args);

  } catch (error) {
    handleAdaptAndEmitError(instance, fullMethodName, adapterPropertyKey, error);
    throw error;
  }
}

function validateDependencies(
  instance: InstanceWithDependencies,
  adapterPropertyKey: string | symbol,
  className: string
): void {
  const adapter = instance[adapterPropertyKey];
  if (!adapter) {
    const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property '${String(adapterPropertyKey)}'. Ensure the adapter is injected and assigned in the constructor.`;
    EmergencyLogger.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!instance.eventBus) {
    const errorMsg = `Architectural Violation: Decorated class ${className} is missing required property 'eventBus'. Ensure IEventBus is injected and assigned.`;
    EmergencyLogger.error(errorMsg);
    throw new Error(errorMsg);
  }
}

function logAdaptAndEmitStart(
  instance: unknown,
  fullMethodName: string,
  adapterPropertyKey: string | symbol,
  rawData: unknown
): void {
  const instanceLogger = getLogger(instance);
  if (instanceLogger) {
    instanceLogger.debug(`🔄 @AdaptAndEmit processing in ${fullMethodName}`, {
      adapterProperty: adapterPropertyKey,
      rawDataType: typeof rawData,
      timestamp: new Date().toISOString()
    });
  }
}

function logAdaptAndEmitSuccess(
  instance: unknown,
  fullMethodName: string,
  adaptedEvent: { type: string; source?: string; [key: string]: unknown }
): void {
  const instanceLogger = getLogger(instance);
  if (instanceLogger) {
    instanceLogger.debug(`✅ @AdaptAndEmit completed in ${fullMethodName}`, {
      eventType: adaptedEvent.type,
      eventSource: adaptedEvent.source,
      timestamp: new Date().toISOString()
    });
  }
}

function handleAdaptAndEmitError(
  instance: unknown,
  fullMethodName: string,
  adapterPropertyKey: string | symbol,
  error: unknown
): void {
  const instanceLogger = getLogger(instance);
  if (instanceLogger) {
    instanceLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}`, {
      error: error instanceof Error ? error.message : String(error),
      adapterProperty: adapterPropertyKey,
      timestamp: new Date().toISOString()
    });
  } else {
    EmergencyLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}:`, error);
  }
}

// ==================== BROWSER ENVIRONMENT DECORATORS ====================
// QUALIA.CODE v1.2 - Browser Environment Bundle

/**
 * Decorador que asegura que un método solo se ejecute en un entorno de navegador.
 * Si no está en el navegador, registra una advertencia y no hace nada.
 * Usage: @BrowserOnly
 */
export function BrowserOnly(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (this: unknown, ...args: unknown[]) {
    // Comprobad si `typeof window` es `'undefined'`.
    if (typeof window === 'undefined') {
      // Obtened el logger de la instancia (`this.logger`) y registrad un `warn`.
      const instanceLogger = getLogger(this);
      if (instanceLogger) {
        instanceLogger.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
      } else {
        EmergencyLogger.warn(`Cannot execute ${propertyKey} in a non-browser environment.`);
      }
      return; // No ejecutar el método original
    }
    // Si estáis en el navegador, simplemente llamad al método original con sus argumentos:
    return originalMethod.apply(this, args);
  };

  return descriptor;
}

/**
 * QUALIA.CODE v1.1 - @OnEvent Decorator
 * Automatically subscribes a method to an EventBus event type.
 * Simplifies event handling by eliminating manual eventBus.subscribe calls in constructors.
 * 
 * CRITICAL: This decorator requires the service to have:
 * - An 'eventBus' property of type IEventBus
 * - A '_eventListeners' array property to track subscriptions
 * - A logger property for debugging
 * 
 * Usage: @OnEvent('PlayerAction')
 *        private handlePlayerAction(event: PlayerActionEvent): void { ... }
 */
export function OnEvent(eventType: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    // Store the event subscription metadata on the class prototype
    interface ConstructorWithSubscriptions {
      _eventSubscriptions?: Array<{ eventType: string; methodName: string; originalMethod: unknown }>;
    }
    const targetConstructor = (target as InstanceWithDependencies).constructor as ConstructorWithSubscriptions;
    if (!targetConstructor._eventSubscriptions) {
      targetConstructor._eventSubscriptions = [];
    }
    
    targetConstructor._eventSubscriptions.push({
      eventType,
      methodName: propertyKey,
      originalMethod
    });

    // Enhanced method that includes logging
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const instanceLogger = getLogger(this);
      if (instanceLogger) {
        instanceLogger.debug(`📡 [${(this as Record<string, unknown>).constructor.name}] Event received: ${eventType}`, {
          method: propertyKey,
          eventData: args[0]
        });
      }
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Helper function to set up event subscriptions for a service instance
// This should be called during service initialization
export function initializeEventSubscriptions(serviceInstance: unknown): void {
  const instance = serviceInstance as InstanceWithDependencies;
  const eventBus = instance.eventBus;
  const logger = getLogger(serviceInstance);
  
  if (!eventBus) {
    if (logger) {
      logger.error('Cannot initialize event subscriptions: eventBus not found on service instance');
    }
    return;
  }

  // Initialize listeners array if not exists
  if (!instance._eventListeners) {
    instance._eventListeners = [];
  }

  interface ConstructorWithSubscriptions {
    _eventSubscriptions?: Array<{ eventType: string; methodName: string }>;
  }
  
  const subscriptions = (instance.constructor as ConstructorWithSubscriptions)._eventSubscriptions ?? [];
  
  for (const subscription of (subscriptions as {eventType: string; methodName: string; originalMethod: unknown}[])) {
    const method = instance[subscription.methodName] as ((..._args: unknown[]) => void) | undefined;
    if (method && typeof method === 'function') {
      const listenerId = eventBus.subscribe(
        subscription.eventType,
        method.bind(serviceInstance),
        { priority: 'normal' }
      );
      
      if (!instance._eventListeners) {
        instance._eventListeners = [];
      }
      (instance._eventListeners as string[]).push(listenerId);
      
      if (logger) {
        logger.debug(`📡 [${instance.constructor.name}] Subscribed to event: ${subscription.eventType}`, {
          method: subscription.methodName,
          listenerId
        });
      }
    }
  }
}

// Helper function to clean up event subscriptions
export function cleanupEventSubscriptions(serviceInstance: unknown): void {
  const instance = serviceInstance as InstanceWithDependencies;
  const eventBus = instance.eventBus;
  const listeners = (instance._eventListeners || []) as string[];
  const logger = getLogger(serviceInstance);

  if (eventBus && listeners.length > 0) {
    listeners.forEach((listenerId: string) => {
      eventBus.unsubscribe(listenerId);
    });
    
    instance._eventListeners = [];
    
    if (logger) {
      logger.debug(`📡 [${instance.constructor.name}] Cleaned up ${listeners.length} event subscriptions`);
    }
  }
}
