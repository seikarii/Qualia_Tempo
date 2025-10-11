/**
 * @fileoverview SALA: IoC binding dependency order validation
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
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

    const bindings = [];
    const dependencies = new Map();

    return {
      CallExpression(node) {
        if (node.callee?.property?.name !== 'bind') return;

        const typeArg = node.arguments[0];
        if (!typeArg || typeArg.type !== 'MemberExpression') return;

        const serviceName = typeArg.property.name;
        const chainedTo = node.parent?.property?.name === 'to' ? node.parent?.parent?.arguments[0] : null;
        
        bindings.push({ service: serviceName, line: node.loc.start.line });

        if (chainedTo?.name) {
          if (!dependencies.has(serviceName)) {
            dependencies.set(serviceName, []);
          }
          dependencies.get(serviceName).push(chainedTo.name);
        }
      },

      'Program:exit'() {
        const boundServices = new Set();
        
        bindings.sort((a, b) => a.line - b.line).forEach(binding => {
          const deps = dependencies.get(binding.service) || [];
          const unboundDeps = deps.filter(dep => !boundServices.has(dep));

          if (unboundDeps.length > 0) {
            context.report({
              node: context.getSourceCode().ast,
              messageId: 'bindBeforeDeps',
              data: { service: binding.service }
            });
          }

          boundServices.add(binding.service);
        });

        // Simple cycle detection
        dependencies.forEach((deps, service) => {
          if (deps.includes(service)) {
            context.report({
              node: context.getSourceCode().ast,
              messageId: 'circularDep',
              data: { cycle: `${service} → ${service}` }
            });
          }
        });
      }
    };
  }
};
