/**
 * @fileoverview SALA: Semantic validation of interface-based dependency injection
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to validate @inject parameters are interfaces
 * - Detects concrete class injection at type level
 * - Validates TYPES.* identifiers resolve to interfaces
 * 
 * QUALIA.CODE REFERENCE: §2.3
 */

'use strict';

const { requireTypeChecker, getNodeType, isInterface, isConcreteClass } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforce interface-based injection using semantic type analysis',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#23'
    },
    fixable: null,
    schema: [],
    messages: {
      concreteInjection: `QUALIA.CODE §2.3 VIOLATION: Parameter '{{paramName}}' injects concrete class '{{className}}' instead of interface.

WHY: Violates Dependency Inversion Principle. Concrete class injection prevents substitution and mocking.

PROHIBITED PATTERN:
  constructor(@inject(TYPES.{{className}}) service: {{className}}) {} // ❌

CORRECT PATTERN:
  constructor(@inject(TYPES.I{{className}}) service: I{{className}}) {} // ✅

Consult QUALIA.MANUAL.md §1.3 for interface-based injection patterns.`
    }
  },

  create(context) {
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      return {};
    }

    const { checker, tsNodeMap } = typeServices;

    return {
      'MethodDefinition[kind="constructor"]'(node) {
        if (!node.value || !node.value.params) return;

        node.value.params.forEach((param) => {
          if (!param.decorators) return;

          const hasInject = param.decorators.some(d =>
            d.expression?.callee?.name === 'inject' || d.expression?.callee?.name === 'multiInject'
          );

          if (!hasInject) return;

          let typeAnnotation = null;
          if (param.type === 'TSParameterProperty') {
            typeAnnotation = param.parameter?.typeAnnotation;
          } else if (param.typeAnnotation) {
            typeAnnotation = param.typeAnnotation;
          }

          if (!typeAnnotation?.typeAnnotation) return;

          const paramType = getNodeType(typeAnnotation.typeAnnotation, tsNodeMap, checker);
          if (!paramType) return;

          if (isConcreteClass(paramType)) {
            const symbol = paramType.getSymbol();
            const className = symbol ? symbol.name : 'Unknown';
            const paramName = param.parameter?.name || param.name || 'parameter';

            context.report({
              node: param,
              messageId: 'concreteInjection',
              data: { paramName, className }
            });
          }
        });
      }
    };
  }
};
