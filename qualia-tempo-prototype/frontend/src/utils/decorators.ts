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

// ==================== NEW DECORATORS (QUALIA.CODE v1.4) ====================
// ANALISIS.md §2.1: Critical missing decorators for production systems
export { retry, isTransientError } from './decorators/retry.decorator';
export type { RetryOptions } from './decorators/retry.decorator';
export { mutex, lock } from './decorators/mutex.decorator';
export { cache, memoize } from './decorators/cache.decorator';
export type { CacheOptions } from './decorators/cache.decorator';

// ==================== SESSION 30 DECORATORS (Phase III) ====================
// Frontend implementation of authorization and profiling decorators
export { authorize, UnauthorizedError } from './decorators/authorize.decorator';
export type { AuthorizeOptions, UserContext } from './decorators/authorize.decorator';
export { 
  profile, 
  getProfilingStats, 
  getAllProfilingStats, 
  clearProfilingStats, 
  exportProfilingStats 
} from './decorators/profile.decorator';
export type { ProfileOptions, ProfileResult } from './decorators/profile.decorator';
