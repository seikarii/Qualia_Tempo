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
      }
    }
  }
};

