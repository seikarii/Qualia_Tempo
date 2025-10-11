/**
 * @fileoverview Rule exports for @qualia-tempo/eslint-plugin-qualia-code
 * @author Qualia Tempo Team
 * AUTO-GENERATED: This file exports all SALA-migrated rules
 */

'use strict';

module.exports = {
  // ========================================
  // CORE IOC/DI (7 rules - 100% MIGRATED)
  // ========================================
  'enforce-inversify-conventions': require('./enforce-inversify-conventions'),
  'no-direct-service-instantiation': require('./no-direct-service-instantiation'),
  'no-service-locator': require('./no-service-locator'),
  'enforce-interface-based-injection': require('./enforce-interface-based-injection'),
  'enforce-use-services-hook': require('./enforce-use-services-hook'),
  'enforce-isolated-test-container': require('./enforce-isolated-test-container'),
  'enforce-ioc-binding-order': require('./enforce-ioc-binding-order'),

  // ========================================
  // PLATFORM ABSTRACTION (4 rules - 100% MIGRATED)
  // ========================================
  'no-global-api-calls': require('./no-global-api-calls'),
  'no-direct-timer-access': require('./no-direct-timer-access'),
  'enforce-validation-on-boundaries': require('./enforce-validation-on-boundaries'),
  'enforce-validation-on-public-methods': require('./enforce-validation-on-public-methods'),

  // ========================================
  // DECORATOR GOVERNANCE (14 rules - 100% MIGRATED)
  // ========================================
  'enforce-browser-only': require('./enforce-browser-only'),
  'enforce-onevent-base-service': require('./enforce-onevent-base-service'),
  'enforce-cache-decorator': require('./enforce-cache-decorator'),
  'enforce-mutex-on-state-mutations': require('./enforce-mutex-on-state-mutations'),
  'enforce-retry-on-io-operations': require('./enforce-retry-on-io-operations'),
  'enforce-timeout-on-async-operations': require('./enforce-timeout-on-async-operations'),
  'enforce-throttle-on-event-handlers': require('./enforce-throttle-on-event-handlers'),
  'enforce-debounce-on-ui-inputs': require('./enforce-debounce-on-ui-inputs'),
  'enforce-rate-limit-on-api-calls': require('./enforce-rate-limit-on-api-calls'),
  'enforce-measure-time-on-logic-services': require('./enforce-measure-time-on-logic-services'),
  'enforce-deprecated-on-comment': require('./enforce-deprecated-on-comment'),
  'enforce-authorize-on-secure-methods': require('./enforce-authorize-on-secure-methods'),
  'enforce-profile-on-heavy-computation': require('./enforce-profile-on-heavy-computation'),
  'enforce-method-decorators': require('./enforce-method-decorators'),

  // ========================================
  // EVENT ARCHITECTURE (4 rules - 100% MIGRATED)
  // ========================================
  'no-direct-diagnostic-calls': require('./no-direct-diagnostic-calls'),
  'enforce-event-contracts': require('./enforce-event-contracts'),
  'no-manual-event-subscription': require('./no-manual-event-subscription'),
  'enforce-adapt-and-emit-on-raw-handlers': require('./enforce-adapt-and-emit-on-raw-handlers'),

  // ========================================
  // STATE & PERFORMANCE (4 rules - 100% MIGRATED)
  // ========================================
  'enforce-game-state-store-singleton': require('./enforce-game-state-store-singleton'),
  'no-complex-use-state': require('./no-complex-use-state'),
  'enforce-performance-best-practices': require('./enforce-performance-best-practices'),
  'enforce-async-on-heavy-methods': require('./enforce-async-on-heavy-methods'),

  // ========================================
  // PHASE 3: DEPENDENCY GRAPH INTELLIGENCE (4 rules - NEW)
  // ========================================
  'detect-circular-dependencies': require('./detect-circular-dependencies'),
  'enforce-correct-injection-scope': require('./enforce-correct-injection-scope'),
  'validate-injection-existence': require('./validate-injection-existence'),
  'enforce-ioc-initialization-order': require('./enforce-ioc-initialization-order'),

  // ========================================
  // LEGACY PRE-EXISTING RULES (8 rules)
  // ========================================
  'enforce-adapter-factory-pattern': require('./enforce-adapter-factory-pattern'),
  'enforce-log-method-decorator': require('./enforce-log-method-decorator'),
  'enforce-typed-event-emission': require('./enforce-typed-event-emission'),
  'no-direct-container-access': require('./no-direct-container-access'),
  'no-hardcoded-config': require('./no-hardcoded-config'),
  'no-raw-websocket-handlers': require('./no-raw-websocket-handlers'),
  'require-config-injection': require('./require-config-injection'),
  'require-injectable-decorator': require('./require-injectable-decorator'),
};

// TOTAL: 41 rules exported
// SALA MIGRATION: 33/33 target rules complete (100%)
