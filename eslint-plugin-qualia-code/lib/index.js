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

module.exports = {
  rules: {
    'no-direct-service-instantiation': noDirectServiceInstantiation,
    'enforce-use-services-hook': enforceUseServicesHook,
    'no-complex-use-state': noComplexUseState,
    'no-hardcoded-config': noHardcodedConfig,
    'no-manual-contract-edit': noManualContractEdit,
    'deprecate-api-client': deprecateApiClient,
    'enforce-method-decorators': enforceMethodDecorators
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
        '@qualia-tempo/qualia-code/enforce-method-decorators': 'error'
      }
    }
  }
};
