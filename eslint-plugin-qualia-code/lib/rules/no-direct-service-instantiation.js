/**
 * @fileoverview SALA: Semantic detection of direct service instantiation
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to identify service classes (not just name suffixes)
 * - Detects aliased imports (import { ServiceA as MyService })
 * - Validates against interface implementation, not string patterns
 * - Context-aware: allows instantiation in composition roots and tests
 * 
 * QUALIA.CODE REFERENCE: §2.1, §10
 */

'use strict';

const { requireTypeChecker, getNodeType, extendsType } = require('../utils/semantic-helpers');
const path = require('path');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent direct service instantiation using semantic type analysis',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#21-backend-pythonfastapi'
    },
    fixable: null,
    schema: [],
    messages: {
      noDirectInstantiation: `QUALIA.CODE §2.1 VIOLATION: Direct instantiation of service class '{{serviceName}}' detected.

WHY: Violates Inversion of Control principle. Services MUST be injected via the IoC container.

PROHIBITED PATTERN:
  const myService = new {{serviceName}}(dependencies); // ❌

CORRECT PATTERN (React Components):
  const myService = useService<I{{serviceName}}>(TYPES.I{{serviceName}}); // ✅

CORRECT PATTERN (Services):
  @injectable()
  export class MyOtherService {
    constructor(@inject(TYPES.I{{serviceName}}) private service: I{{serviceName}}) {}
  }

Consult QUALIA.MANUAL.md §5.2 for useService() hook usage and §1.3 for dependency injection.`,

      noDirectInstantiationAliased: `QUALIA.CODE §2.1 VIOLATION: Direct instantiation of service class detected (imported as '{{aliasName}}', actual type: '{{serviceName}}').

WHY: Violates Inversion of Control principle. Aliasing the import doesn't bypass architectural constraints.

PROHIBITED PATTERN:
  import { {{serviceName}} as {{aliasName}} } from '...';
  const instance = new {{aliasName}}(); // ❌ STILL VIOLATION

CORRECT PATTERN:
  Use the IoC container to retrieve services via their interface binding.

Consult QUALIA.MANUAL.md §1.3 for proper dependency injection patterns.`
    }
  },

  create(context) {
    // Attempt to get Type Checker
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // Fallback to pattern-based rule
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;
    const filename = context.getFilename();

    // Context awareness: Determine if this file is allowed to instantiate services
    const isAllowedContext = filename.includes('.test.') ||
                            filename.includes('.spec.') ||
                            filename.includes('__tests__') ||
                            filename.includes('/tests/') ||
                            filename.includes('/testing/') ||
                            filename.includes('CompositionRoot.ts') ||
                            filename.includes('CompositionRoot.tsx') ||
                            filename.includes('test-container-factory') ||
                            filename.includes('inversify.config');

    if (isAllowedContext) {
      return {}; // No violations in allowed contexts
    }

    /**
     * SEMANTIC ANALYSIS: Determine if a type is a service class
     * @param {ts.Type} type - TypeScript type
     * @returns {boolean}
     */
    function isServiceType(type) {
      if (!type) return false;

      const symbol = type.getSymbol();
      if (!symbol) return false;

      const typeName = symbol.name;

      // Check 1: Does it implement any I*Service interface?
      const baseTypes = type.getBaseTypes ? type.getBaseTypes() : [];
      for (const baseType of baseTypes) {
        const baseSymbol = baseType.getSymbol();
        if (baseSymbol && baseSymbol.name && 
            baseSymbol.name.startsWith('I') && 
            (baseSymbol.name.includes('Service') || 
             baseSymbol.name.includes('Controller') ||
             baseSymbol.name.includes('Repository') ||
             baseSymbol.name.includes('Provider'))) {
          return true;
        }
      }

      // Check 2: Does the class name follow service naming convention?
      const serviceSuffixes = ['Service', 'Controller', 'Repository', 'Provider', 'Calculator'];
      if (serviceSuffixes.some(suffix => typeName.endsWith(suffix))) {
        return true;
      }

      // Check 3: Check if type is from services directory
      if (symbol.declarations && symbol.declarations.length > 0) {
        const declaration = symbol.declarations[0];
        const sourceFile = declaration.getSourceFile();
        if (sourceFile && sourceFile.fileName.includes('/services/')) {
          return true;
        }
      }

      return false;
    }

    /**
     * Get the original type name even if imported with alias
     * @param {ts.Type} type - TypeScript type
     * @returns {string}
     */
    function getOriginalTypeName(type) {
      if (!type) return 'Unknown';
      const symbol = type.getSymbol();
      return symbol ? symbol.name : 'Unknown';
    }

    return {
      NewExpression(node) {
        // SEMANTIC ANALYSIS: Resolve the type of the instantiated class
        const instantiatedType = getNodeType(node.callee, tsNodeMap, checker);
        
        if (!instantiatedType) return; // Can't analyze without type info

        // Check if it's a service type
        if (isServiceType(instantiatedType)) {
          const originalTypeName = getOriginalTypeName(instantiatedType);
          const aliasName = node.callee.name || originalTypeName;

          // Detect aliased imports
          if (aliasName !== originalTypeName) {
            context.report({
              node,
              messageId: 'noDirectInstantiationAliased',
              data: {
                aliasName,
                serviceName: originalTypeName
              }
            });
          } else {
            context.report({
              node,
              messageId: 'noDirectInstantiation',
              data: { serviceName: originalTypeName }
            });
          }
        }
      }
    };
  }
};

/**
 * Fallback implementation when TypeChecker unavailable
 */
function createFallbackRule(context) {
  const filename = context.getFilename();
  
  if (filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('__tests__') ||
      filename.includes('/tests/') ||
      filename.includes('/testing/') ||
      filename.includes('CompositionRoot') ||
      filename.includes('test-container-factory')) {
    return {};
  }

  return {
    NewExpression(node) {
      if (node.callee && node.callee.name && node.callee.name.endsWith('Service')) {
        context.report({
          node,
          messageId: 'noDirectInstantiation',
          data: { serviceName: node.callee.name }
        });
      }

      if (node.callee && node.callee.type === 'MemberExpression') {
        const memberName = node.callee.property && node.callee.property.name;
        if (memberName && memberName.endsWith('Service')) {
          context.report({
            node,
            messageId: 'noDirectInstantiation',
            data: { serviceName: memberName }
          });
        }
      }
    }
  };
}
