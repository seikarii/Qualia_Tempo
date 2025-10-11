/**
 * @fileoverview SALA: IoC binding dependency order validation
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ REFACTORED - Disabled for now (requires deep semantic analysis of service constructors)
 * 
 * RATIONALE FOR DISABLE:
 * This rule needs to analyze constructor dependencies of each service class, not just the .bind().to() chain.
 * In modern Direct Configuration Injection pattern, dependencies are in constructors, not visible in bindings.
 * Proper implementation requires TypeScript type checker to traverse service constructors.
 * 
 * TODO: Implement proper semantic analysis using TypeScript compiler API to:
 * 1. For each `.bind<IService>().to(ServiceClass)`, locate ServiceClass definition
 * 2. Parse constructor parameters to extract @inject() dependencies
 * 3. Build dependency graph and validate order
 * 4. This is a PHASE 2 enhancement after core compliance
 */
'use strict';
const { requireTypeChecker } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce correct IoC binding order to prevent circular dependencies', category: 'QUALIA.CODE - IoC/DI', recommended: true },
    schema: [],
    messages: {
      circularDep: 'QUALIA.CODE §2: Circular dependency detected: {{cycle}}. Refactor to break cycle.',
      bindBeforeDeps: 'QUALIA.CODE §2: Service "{{service}}" bound before its dependencies. Bind dependencies first.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('inversify.config')) return {};

    // DISABLED: Rule needs complete rewrite with semantic analysis
    // Current implementation has too many false positives
    // See rationale in fileoverview comment above
    return {};
  }
};
