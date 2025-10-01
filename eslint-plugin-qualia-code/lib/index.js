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
const noDirectServiceImportInComponents = require('./rules/no-direct-service-import-in-components');
const enforceConfigDrivenValues = require('./rules/enforce-config-driven-values');
const noManualEventSubscription = require('./rules/no-manual-event-subscription');

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
    'no-direct-service-import-in-components': noDirectServiceImportInComponents,
    'enforce-config-driven-values': enforceConfigDrivenValues,
    'no-manual-event-subscription': noManualEventSubscription,
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
        '@qualia-tempo/qualia-code/no-direct-service-import-in-components': 'error',
        '@qualia-tempo/qualia-code/enforce-config-driven-values': 'warn',
        '@qualia-tempo/qualia-code/no-manual-event-subscription': 'error',
      }
    }
  }
};
