// QUALIA.CODE v1.2 - Decorators Barrel File
// Central re-export point for all decorator modules
// This file is intentionally minimal - all logic resides in individual decorator files

// ==================== SHARED TYPES ====================
export type { 
  InstanceWithLogger, 
  IMessageAdapter, 
  IEventBus, 
  InstanceWithDependencies, 
  IBaseService 
} from './decorators/shared-types';
export { getLogger } from './decorators/shared-types';

// ==================== DECORATORS ====================
export { logMethod } from './decorators/log-method.decorator';
export { throttle } from './decorators/throttle.decorator';
export { catchError } from './decorators/catch-error.decorator';
export { measureTime } from './decorators/measure-time.decorator';
export { validate } from './decorators/validate.decorator';
export { validateEventProperty } from './decorators/validate-event-property.decorator';
export { AdaptAndEmit } from './decorators/adapt-and-emit.decorator';
export { BrowserOnly } from './decorators/browser-only.decorator';
export { 
  OnEvent, 
  initializeEventSubscriptions, 
  cleanupEventSubscriptions 
} from './decorators/on-event.decorator';
