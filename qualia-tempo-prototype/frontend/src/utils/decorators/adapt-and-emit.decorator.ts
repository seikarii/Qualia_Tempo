// QUALIA.CODE v1.2 - @AdaptAndEmit Decorator
// Protocol Adapter Bundle - IoC Compliant Implementation
// ELIMINATES Service Locator anti-pattern
// Compatible with TypeScript 5.9.2 stage-3 decorators

import { EmergencyLogger } from "../EmergencyLogger";
import { getLogger, type InstanceWithDependencies, type IMessageAdapter } from "./shared-types";

/**
 * @AdaptAndEmit decorator for Protocol Adapter Bundle.
 * QUALIA.CODE v1.2 - IoC Compliant Implementation
 * 
 * Automatically adapts raw data using an adapter and emits via EventBus.
 * CRITICAL: Dependencies (adapter, eventBus) MUST be injected into the class instance.
 * The decorator accesses them through instance properties, NOT through container.get().
 * 
 * @param adapterIdentifier - Symbol or string identifier for the adapter property on the instance
 * @returns Method decorator that intercepts, adapts, and emits data
 * 
 * ARCHITECTURAL REQUIREMENT:
 * Classes using this decorator MUST have:
 * - An 'eventBus' property of type IEventBus (injected via constructor)
 * - An adapter property accessible via adapterIdentifier (injected via constructor)
 * 
 * Example:
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(
 *     @inject(TYPES.IEventBus) private eventBus: IEventBus,
 *     @inject(TYPES.IRawToParticleEventAdapter) private readonly particleAdapter: IMessageAdapter
 *   ) {}
 * 
 *   @AdaptAndEmit(Symbol.for('particleAdapter'))
 *   private onRawMessage(rawData: ArrayBuffer): void {
 *     // Decorator handles adaptation and emission
 *   }
 * }
 * ```
 */
export function AdaptAndEmit(adapterIdentifier: symbol | string) {
  return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const params = {
        instance: this,
        propertyKey,
        adapterIdentifier,
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
  adapterIdentifier: symbol | string;
  originalMethod: (..._args: unknown[]) => unknown;
  args: unknown[];
}): unknown {
  const { instance, propertyKey, adapterIdentifier, originalMethod, args } = params;
  const instanceWithDeps = instance as InstanceWithDependencies;
  const fullMethodName = `${instanceWithDeps.constructor.name}.${propertyKey}`;

  try {
    const { adapter, eventBus } = resolveDependencies(instanceWithDeps, adapterIdentifier);
    const rawData = args[0];

    logAdaptAndEmitStart(instance, fullMethodName, adapterIdentifier, rawData);

    const adaptedEvent = adapter.adapt(rawData);
    eventBus.emit(adaptedEvent);

    logAdaptAndEmitSuccess(instance, fullMethodName, adaptedEvent);

    return originalMethod.apply(instance, args);

  } catch (error) {
    handleAdaptAndEmitError(instance, fullMethodName, adapterIdentifier, error);
    throw error;
  }
}

function resolveDependencies(
  instanceWithDeps: InstanceWithDependencies,
  adapterIdentifier: symbol | string
): { adapter: IMessageAdapter; eventBus: NonNullable<typeof instanceWithDeps.eventBus> } {
  // QUALIA.CODE v1.2: CRITICAL ARCHITECTURAL CHANGE
  // Dependencies are accessed from instance properties, NOT resolved from container
  // This eliminates the Service Locator anti-pattern
  const adapter = instanceWithDeps[adapterIdentifier] as IMessageAdapter | undefined;
  const eventBus = instanceWithDeps.eventBus;
  const className = instanceWithDeps.constructor.name;

  // Architectural Validation: Ensure dependencies are injected
  if (!adapter || !eventBus) {
    const errorMessage = `ARCHITECTURAL VIOLATION: Class '${className}' uses @AdaptAndEmit but is missing injected dependencies. ` +
      `Ensure IEventBus and the adapter with identifier '${String(adapterIdentifier)}' are injected via constructor.`;
    
    const instanceLogger = getLogger(instanceWithDeps);
    if (instanceLogger) {
      instanceLogger.error(errorMessage, {
        missingAdapter: !adapter,
        missingEventBus: !eventBus,
        adapterIdentifier: String(adapterIdentifier)
      });
    } else {
      EmergencyLogger.error(errorMessage, {
        missingAdapter: !adapter,
        missingEventBus: !eventBus,
        adapterIdentifier: String(adapterIdentifier)
      });
    }
    
    throw new Error(errorMessage);
  }

  return { adapter, eventBus };
}

function logAdaptAndEmitStart(
  instance: unknown,
  fullMethodName: string,
  adapterIdentifier: symbol | string,
  rawData: unknown
): void {
  const instanceLogger = getLogger(instance);
  if (instanceLogger) {
    instanceLogger.debug(`🔄 @AdaptAndEmit processing in ${fullMethodName}`, {
      adapterIdentifier: String(adapterIdentifier),
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
  adapterIdentifier: symbol | string,
  error: unknown
): void {
  const instanceLogger = getLogger(instance);
  if (instanceLogger) {
    instanceLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}`, {
      error: error instanceof Error ? error.message : String(error),
      adapterIdentifier: String(adapterIdentifier),
      timestamp: new Date().toISOString()
    });
  } else {
    EmergencyLogger.error(`🚨 @AdaptAndEmit failed in ${fullMethodName}:`, error);
  }
}
