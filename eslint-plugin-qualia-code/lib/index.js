/**
 * @qualia-tempo/eslint-plugin-qualia-code
 *
 * ESLint plugin to enforce QUALIA.CODE v1.0 architectural principles
 *
 * This plugin ensures compliance with the architectural patterns defined in
 * QUALIA.CODE.md, specifically:
 * - IoC/DI patterns with CompositionRoot
 * - Event-driven architecture via EventBus
 * - Configuration externalization
 * - Proper service usage patterns
 * - Contract generation enforcement
 */

const noDirectServiceInstantiation = require('./rules/no-direct-service-instantiation');
const enforceUseServicesHook = require('./rules/enforce-use-services-hook');
const noComplexUseState = require('./rules/no-complex-use-state');
const noHardcodedConfig = require('./rules/no-hardcoded-config');
const noManualContractEdit = require('./rules/no-manual-contract-edit');
const deprecateApiClient = require('./rules/deprecate-api-client');
const enforceMethodDecorators = require('./rules/enforce-method-decorators');
const enforceInversifyConventions = require('./rules/enforce-inversify-conventions');
const noGlobalApiCalls = require('./rules/no-global-api-calls');
// NEW RULES - Enhanced QUALIA.CODE Compliance
const noConsoleInServices = require('./rules/no-console-in-services');
const noManualEventSubscription = require('./rules/no-manual-event-subscription');
const noDirectDiagnosticCalls = require('./rules/no-direct-diagnostic-calls');
// NEW RULES - QUALIA.CODE v1.1 IoC Strictness
const noServiceLocator = require('./rules/no-service-locator');
const enforceInterfaceBasedInjection = require('./rules/enforce-interface-based-injection');
// NEW RULES - QUALIA.CODE v1.1 Decorator Enforcement
const enforceOnEventBaseService = require('./rules/enforce-onevent-base-service');
const enforceBrowserOnly = require('./rules/enforce-browser-only');
// NEW RULES - QUALIA.CODE v1.1 Event Architecture
const enforceEventInterfacesLocation = require('./rules/enforce-event-interfaces-location');
// NEW RULES - QUALIA.CODE v1.1 Testing Architecture
const enforceIsolatedTestContainer = require('./rules/enforce-isolated-test-container');
// NEW RULES - QUALIA.CODE v1.2 Data Integrity & Performance
const enforceValidationOnBoundaries = require('./rules/enforce-validation-on-boundaries');
const enforcePerformanceBestPractices = require('./rules/enforce-performance-best-practices');
// NEW RULES - QUALIA.CODE v1.3 IoC Binding Order Enforcement
const enforceIocBindingOrder = require('./rules/enforce-ioc-binding-order');
// NEW RULES - QUALIA.CODE v1.4 Enhanced Decorator Enforcement (ANALISIS.md §2.1)
const enforceCacheDecorator = require('./rules/enforce-cache-decorator');
const enforceMutexOnStateMutations = require('./rules/enforce-mutex-on-state-mutations');
const enforceRetryOnIoOperations = require('./rules/enforce-retry-on-io-operations');
// NEW RULES - QUALIA.CODE v1.5 Performance & Async Patterns
const enforceAsyncOnHeavyMethods = require('./rules/enforce-async-on-heavy-methods');
// NEW RULES - QUALIA.CODE v1.6 Timeout & Error Boundary Enforcement (ANALISIS.md §2.1 items #4, #10)
const enforceTimeoutOnAsyncOperations = require('./rules/enforce-timeout-on-async-operations');
// NEW RULES - QUALIA.CODE v1.7 Worker Offloading & Advanced Performance (ANALISIS.md §2.1 item #2)
const enforceWorkerOffloading = require('./rules/enforce-worker-offloading');
// NEW RULES - QUALIA.CODE v1.8 Stricter Platform Abstraction (Session 27)
const noDirectTimerAccess = require('./rules/no-direct-timer-access');
const enforceValidationOnPublicMethods = require('./rules/enforce-validation-on-public-methods');
const enforceErrorBoundaryOnAsync = require('./rules/enforce-error-boundary-on-async');
// NEW RULES - QUALIA.CODE v1.9 Complete Decorator Coverage (Session 30 - Mission Critical)
const enforceThrottleOnEventHandlers = require('./rules/enforce-throttle-on-event-handlers');
const enforceDebounceOnUiInputs = require('./rules/enforce-debounce-on-ui-inputs');
const enforceRateLimitOnApiCalls = require('./rules/enforce-rate-limit-on-api-calls');
const enforceMeasureTimeOnLogicServices = require('./rules/enforce-measure-time-on-logic-services');
const enforceValidateEventPropertyOnEmit = require('./rules/enforce-validate-event-property-on-emit');
const enforceAdaptAndEmitOnRawHandlers = require('./rules/enforce-adapt-and-emit-on-raw-handlers');
const enforceReadonlyOnConfigAccess = require('./rules/enforce-readonly-on-config-access');
const enforceDeprecatedOnComment = require('./rules/enforce-deprecated-on-comment');
const enforceAuthorizeOnSecureMethods = require('./rules/enforce-authorize-on-secure-methods');
const enforceProfileOnHeavyComputation = require('./rules/enforce-profile-on-heavy-computation');

module.exports = {
  rules: {
    'no-direct-service-instantiation': noDirectServiceInstantiation,
    'enforce-use-services-hook': enforceUseServicesHook,
    'no-complex-use-state': noComplexUseState,
    'no-hardcoded-config': noHardcodedConfig,
    'no-manual-contract-edit': noManualContractEdit,
    'deprecate-api-client': deprecateApiClient,
    'enforce-method-decorators': enforceMethodDecorators,
    'enforce-inversify-conventions': enforceInversifyConventions,
    'no-global-api-calls': noGlobalApiCalls,
    // NEW RULES - Enhanced QUALIA.CODE v1.1 Compliance
    'no-console-in-services': noConsoleInServices,
    'no-manual-event-subscription': noManualEventSubscription,
    'no-direct-diagnostic-calls': noDirectDiagnosticCalls,
    // NEW RULES - QUALIA.CODE v1.1 IoC Strictness
    'no-service-locator': noServiceLocator,
    'enforce-interface-based-injection': enforceInterfaceBasedInjection,
    // NEW RULES - QUALIA.CODE v1.1 Decorator Enforcement
    'enforce-onevent-base-service': enforceOnEventBaseService,
    'enforce-browser-only': enforceBrowserOnly,
    // NEW RULES - QUALIA.CODE v1.1 Event Architecture
    'enforce-event-interfaces-location': enforceEventInterfacesLocation,
    // NEW RULES - QUALIA.CODE v1.1 Testing Architecture
    'enforce-isolated-test-container': enforceIsolatedTestContainer,
    // NEW RULES - QUALIA.CODE v1.2 Data Integrity & Performance
    'enforce-validation-on-boundaries': enforceValidationOnBoundaries,
    'enforce-performance-best-practices': enforcePerformanceBestPractices,
    // NEW RULES - QUALIA.CODE v1.3 IoC Binding Order Enforcement
    'enforce-ioc-binding-order': enforceIocBindingOrder,
    // NEW RULES - QUALIA.CODE v1.4 Enhanced Decorator Enforcement (ANALISIS.md §2.1)
    'enforce-cache-decorator': enforceCacheDecorator,
    'enforce-mutex-on-state-mutations': enforceMutexOnStateMutations,
    'enforce-retry-on-io-operations': enforceRetryOnIoOperations,
    // NEW RULES - QUALIA.CODE v1.5 Performance & Async Patterns
    'enforce-async-on-heavy-methods': enforceAsyncOnHeavyMethods,
    // NEW RULES - QUALIA.CODE v1.6 Timeout & Error Boundary Enforcement (ANALISIS.md §2.1 items #4, #10)
    'enforce-timeout-on-async-operations': enforceTimeoutOnAsyncOperations,
    // NEW RULES - QUALIA.CODE v1.7 Worker Offloading & Advanced Performance (ANALISIS.md §2.1 item #2)
    'enforce-worker-offloading': enforceWorkerOffloading,
    // NEW RULES - QUALIA.CODE v1.8 Stricter Platform Abstraction (Session 27)
    'no-direct-timer-access': noDirectTimerAccess,
    'enforce-validation-on-public-methods': enforceValidationOnPublicMethods,
    'enforce-error-boundary-on-async': enforceErrorBoundaryOnAsync,
    // NEW RULES - QUALIA.CODE v1.9 Complete Decorator Coverage (Session 30 - Mission Critical)
    'enforce-throttle-on-event-handlers': enforceThrottleOnEventHandlers,
    'enforce-debounce-on-ui-inputs': enforceDebounceOnUiInputs,
    'enforce-rate-limit-on-api-calls': enforceRateLimitOnApiCalls,
    'enforce-measure-time-on-logic-services': enforceMeasureTimeOnLogicServices,
    'enforce-validate-event-property-on-emit': enforceValidateEventPropertyOnEmit,
    'enforce-adapt-and-emit-on-raw-handlers': enforceAdaptAndEmitOnRawHandlers,
    'enforce-readonly-on-config-access': enforceReadonlyOnConfigAccess,
    'enforce-deprecated-on-comment': enforceDeprecatedOnComment,
    'enforce-authorize-on-secure-methods': enforceAuthorizeOnSecureMethods,
    'enforce-profile-on-heavy-computation': enforceProfileOnHeavyComputation,
  },
  configs: {
    recommended: {
      plugins: ['@qualia-tempo/qualia-code'],
      rules: {
        '@qualia-tempo/qualia-code/no-direct-service-instantiation': 'error',
        '@qualia-tempo/qualia-code/enforce-use-services-hook': 'error',
        '@qualia-tempo/qualia-code/no-complex-use-state': 'error',
        '@qualia-tempo/qualia-code/no-hardcoded-config': 'error',
        '@qualia-tempo/qualia-code/no-manual-contract-edit': 'error',
        '@qualia-tempo/qualia-code/deprecate-api-client': 'error',
        '@qualia-tempo/qualia-code/enforce-method-decorators': 'error',
        '@qualia-tempo/qualia-code/enforce-inversify-conventions': 'error',
        '@qualia-tempo/qualia-code/no-global-api-calls': 'error',
        // NEW RULES - Enhanced QUALIA.CODE v1.1 Compliance
        '@qualia-tempo/qualia-code/no-console-in-services': 'error',
        '@qualia-tempo/qualia-code/no-manual-event-subscription': 'error',
        '@qualia-tempo/qualia-code/no-direct-diagnostic-calls': 'error',
        // NEW RULES - QUALIA.CODE v1.1 IoC Strictness
        '@qualia-tempo/qualia-code/no-service-locator': 'error',
        '@qualia-tempo/qualia-code/enforce-interface-based-injection': 'error',
        // NEW RULES - QUALIA.CODE v1.1 Decorator Enforcement
        '@qualia-tempo/qualia-code/enforce-onevent-base-service': 'error',
        '@qualia-tempo/qualia-code/enforce-browser-only': 'error',
        // NEW RULES - QUALIA.CODE v1.1 Event Architecture
        '@qualia-tempo/qualia-code/enforce-event-interfaces-location': 'error',
        // NEW RULES - QUALIA.CODE v1.1 Testing Architecture
        '@qualia-tempo/qualia-code/enforce-isolated-test-container': 'error',
        // NEW RULES - QUALIA.CODE v1.2 Data Integrity & Performance
        '@qualia-tempo/qualia-code/enforce-validation-on-boundaries': 'error',
        '@qualia-tempo/qualia-code/enforce-performance-best-practices': 'error',
        // NEW RULES - QUALIA.CODE v1.3 IoC Binding Order Enforcement
        '@qualia-tempo/qualia-code/enforce-ioc-binding-order': 'error',
        // NEW RULES - QUALIA.CODE v1.4 Enhanced Decorator Enforcement (ANALISIS.md §2.1)
        // CONVERTED ALL TO ERROR - NO WARNINGS ALLOWED IN THIS PROJECT
        '@qualia-tempo/qualia-code/enforce-cache-decorator': 'error',
        '@qualia-tempo/qualia-code/enforce-mutex-on-state-mutations': 'error',
        '@qualia-tempo/qualia-code/enforce-retry-on-io-operations': 'error',
        // NEW RULES - QUALIA.CODE v1.5 Performance & Async Patterns
        '@qualia-tempo/qualia-code/enforce-async-on-heavy-methods': 'error',
        // NEW RULES - QUALIA.CODE v1.6 Timeout & Error Boundary Enforcement (ANALISIS.md §2.1 items #4, #10)
        '@qualia-tempo/qualia-code/enforce-timeout-on-async-operations': 'error',
        // NEW RULES - QUALIA.CODE v1.7 Worker Offloading & Advanced Performance (ANALISIS.md §2.1 item #2)
        '@qualia-tempo/qualia-code/enforce-worker-offloading': 'error',
        // NEW RULES - QUALIA.CODE v1.8 Stricter Platform Abstraction (Session 27)
        '@qualia-tempo/qualia-code/no-direct-timer-access': 'error', // MANDATORIO - Platform abstraction is law
        '@qualia-tempo/qualia-code/enforce-validation-on-public-methods': 'error',
        '@qualia-tempo/qualia-code/enforce-error-boundary-on-async': 'error', // MANDATORIO per QUALIA.CODE §6
        // NEW RULES - QUALIA.CODE v1.9 Complete Decorator Coverage (Session 30 - Mission Critical)
        '@qualia-tempo/qualia-code/enforce-throttle-on-event-handlers': 'error', // MANDATORIO - High-frequency events must be throttled
        '@qualia-tempo/qualia-code/enforce-debounce-on-ui-inputs': 'error', // MANDATORIO - UI inputs must be debounced
        '@qualia-tempo/qualia-code/enforce-rate-limit-on-api-calls': 'error', // MANDATORIO - Prevent API throttling
        '@qualia-tempo/qualia-code/enforce-measure-time-on-logic-services': 'error',
        '@qualia-tempo/qualia-code/enforce-validate-event-property-on-emit': 'error', // MANDATORIO - Event validation
        '@qualia-tempo/qualia-code/enforce-adapt-and-emit-on-raw-handlers': 'error', // MANDATORIO - Protocol adaptation
        '@qualia-tempo/qualia-code/enforce-readonly-on-config-access': 'error',
        '@qualia-tempo/qualia-code/enforce-deprecated-on-comment': 'error',
        '@qualia-tempo/qualia-code/enforce-authorize-on-secure-methods': 'error', // MANDATORIO - Security critical
        '@qualia-tempo/qualia-code/enforce-profile-on-heavy-computation': 'error'
      }
    }
  }
};

