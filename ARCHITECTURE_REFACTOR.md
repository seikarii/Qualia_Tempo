
# 🎯 CRISALIDA.CODE v1.1 Architectural Refactoring Directive

**Project:** Qualia Tempo Prototype
**Architect:** Gemini
**Date:** 2024-07-25

## 1. Executive Summary

A health scan of the `frontend/src/services` directory has revealed several critical deviations from the `CRISALIDA.CODE v1.1` architectural standard. While the project exhibits good use of decorators and an event-driven architecture, there are significant violations regarding Inversion of Control (IoC), direct use of global APIs, and hardcoded configuration values.

This document provides a set of mandatory directives to refactor the existing services and introduce new foundational services to ensure compliance with `CRISALIDA.CODE v1.1`.

**THE FOLLOWING DIRECTIVES ARE NOT OPTIONAL. THEY ARE MANDATORY FOR THE CONTINUED DEVELOPMENT OF THIS PROJECT.**

## 2. Foundational Services to be Created

The following new services must be created to abstract away global dependencies and provide a solid foundation for the rest of the application.

### 2.1. `HttpService`

*   **Purpose:** To abstract all HTTP requests and eliminate the direct use of the `fetch` API.
*   **File Location:** `frontend/src/services/HttpService.ts`
*   **Interface:** `IHttpService` in `frontend/src/services/service-contracts.ts`
*   **Implementation Details:**
    *   Must be an `@injectable` class.
    *   Must provide methods for `get`, `post`, `put`, `delete`.
    *   Must handle `AbortController` for timeouts.
    *   Must provide a consistent error handling mechanism.
    *   Must be registered in the `CompositionRoot`.

### 2.2. `TimerService`

*   **Purpose:** To abstract the global `setTimeout` and `setInterval` functions.
*   **File Location:** `frontend/src/services/TimerService.ts`
*   **Interface:** `ITimerService` in `frontend/src/services/service-contracts.ts`
*   **Implementation Details:**
    *   Must be an `@injectable` class.
    *   Must provide methods `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`.
    *   The returned handles for timers should be of a specific type, not `any`.
    *   Must be registered in the `CompositionRoot`.

## 3. Service Refactoring Directives

The following services must be refactored to comply with `CRISALIDA.CODE v1.1`.

### 3.1. `AudioService`

*   **Violation:** Direct instantiation of `OntologicalAudioEngine`.
*   **Directive:**
    1.  Create an `IOntologicalAudioEngine` interface in `frontend/src/audio/IOntologicalAudioEngine.ts`.
    2.  `OntologicalAudioEngine` must implement `IOntologicalAudioEngine`.
    3.  `AudioService` must receive `IOntologicalAudioEngine` in its constructor via dependency injection.
    4.  The `new OntologicalAudioEngine()` line in the `start()` method must be removed.
    5.  The `CompositionRoot` must be updated to bind `IOntologicalAudioEngine` to `OntologicalAudioEngine`.

### 3.2. `BackendSyncService`

*   **Violations:**
    *   Missing decorators on `start` and `stop` methods.
    *   Hardcoded configuration values (`maxRetries`, `retryDelay`).
    *   Direct use of `fetch`, `setTimeout`, and `setInterval`.
*   **Directive:**
    1.  Add `@logMethod()` and `@catchError()` decorators to the `start` and `stop` methods.
    2.  Move the `maxRetries` and `retryDelay` values to the `BackendSyncConfig` interface and the `backend-sync.yaml` file.
    3.  Refactor the service to use the new `HttpService` for all HTTP requests.
    4.  Refactor the service to use the new `TimerService` for all timer-related operations.

### 3.3. `ConfigurationService`

*   **Violations:**
    *   Direct use of `fetch`.
    *   Presence of the `loadUnifiedConfig` method with a large number of hardcoded values.
*   **Directive:**
    1.  Refactor the service to use the new `HttpService` to load configuration files.
    2.  The `loadUnifiedConfig` method is to be considered deprecated. A plan for its removal must be formulated. All configuration must be loaded from individual YAML files.

### 3.4. `DebugService`

*   **Violations:**
    *   Hardcoded `DEFAULT_DEBUG_CONFIG` constant.
    *   Hardcoded `memoryCleanupInterval`.
    *   Direct use of `setInterval`.
*   **Directive:**
    1.  Remove the `DEFAULT_DEBUG_CONFIG` constant. The default configuration must be loaded from `debug-service.yaml`.
    2.  Move the `memoryCleanupInterval` to the `DebugConfig` interface and the `debug-service.yaml` file.
    3.  Refactor the service to use the new `TimerService`.

### 3.5. `ErrorReportingService`

*   **Violation:** Direct use of `setInterval` and `setTimeout`.
*   **Directive:**
    1.  Refactor the service to use the new `TimerService`.

## 4. `CompositionRoot` Updates

The `CompositionRoot` must be updated to:

1.  Register the new `HttpService` and `TimerService`.
2.  Update the bindings for all refactored services to inject the new dependencies.
3.  Register the `IOntologicalAudioEngine` binding.

## 5. Conclusion

These directives are critical for the long-term health, testability, and maintainability of the Qualia Tempo prototype. The engineering team is expected to prioritize these refactoring tasks and implement them as specified.

**Excellence is not a goal, it is the standard.**

