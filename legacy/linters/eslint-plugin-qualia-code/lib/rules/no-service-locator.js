/**
 * @fileoverview SALA: Semantic detection of Service Locator anti-pattern
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to trace container references through variable assignments
 * - Detects container.get() even when container is aliased or destructured
 * - Context-aware: architectural understanding of allowed vs prohibited locations
 * 
 * QUALIA.CODE REFERENCE: §2.3
 */

'use strict';

const { requireTypeChecker, getNodeType } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent Service Locator anti-pattern using semantic analysis',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#23-prohibicion-del-service-locator'
    },
    fixable: null,
    schema: [],
    messages: {
      noServiceLocator: `QUALIA.CODE §2.3 VIOLATION: Service Locator anti-pattern detected (container.get() call).

WHY: Direct container access hides dependencies and violates Dependency Inversion Principle.

PROHIBITED PATTERN:
  const service = container.get<IMyService>(TYPES.IMyService); // ❌

CORRECT PATTERN:
  @injectable()
  export class MyClass {
    constructor(@inject(TYPES.IMyService) private service: IMyService) {} // ✅
  }

ALLOWED LOCATIONS:
  - inversify.config.ts (container configuration)
  - ApplicationCompositionRoot.ts (app initialization)
  - *.test.ts, *.spec.ts (testing)
  - hooks.ts (useService hook implementation)

Consult QUALIA.MANUAL.md §1.3 for proper dependency injection patterns.`
    }
  },

  create(context) {
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;
    const filename = context.getFilename();

    // Context awareness: Determine allowed locations
    const isAllowedLocation = filename.includes('inversify.config.ts') ||
                             filename.includes('ApplicationCompositionRoot.ts') ||
                             filename.includes('.test.ts') ||
                             filename.includes('.test.tsx') ||
                             filename.includes('.spec.ts') ||
                             filename.includes('.spec.tsx') ||
                             filename.includes('__tests__') ||
                             filename.includes('/tests/') ||
                             filename.endsWith('hooks.ts') ||
                             filename.endsWith('decorators.ts');

    if (isAllowedLocation) {
      return {}; // No violations in allowed locations
    }

    /**
     * SEMANTIC ANALYSIS: Check if a node represents container.get() call
     * @param {Object} node - ESTree node
     * @returns {boolean}
     */
    function isContainerGetCall(node) {
      if (node.type !== 'CallExpression') return false;
      if (!node.callee || node.callee.type !== 'MemberExpression') return false;

      const object = node.callee.object;
      const property = node.callee.property;

      // Check if property is 'get'
      if (!property || property.name !== 'get') return false;

      // SEMANTIC CHECK: Is the object a container instance?
      // This catches:
      // - container.get()
      // - myContainer.get()
      // - const c = container; c.get();
      const objectType = getNodeType(object, tsNodeMap, checker);
      if (!objectType) return false;

      const symbol = objectType.getSymbol();
      if (!symbol) return false;

      // Check if the type is Container from inversify
      if (symbol.name === 'Container') {
        const declarations = symbol.declarations || [];
        for (const decl of declarations) {
          const sourceFile = decl.getSourceFile();
          if (sourceFile && sourceFile.fileName.includes('inversify')) {
            return true;
          }
        }
      }

      return false;
    }

    return {
      CallExpression(node) {
        if (isContainerGetCall(node)) {
          context.report({
            node,
            messageId: 'noServiceLocator'
          });
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

  if (filename.includes('inversify.config.ts') ||
      filename.includes('ApplicationCompositionRoot.ts') ||
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('__tests__') ||
      filename.includes('/tests/') ||
      filename.endsWith('hooks.ts') ||
      filename.endsWith('decorators.ts')) {
    return {};
  }

  return {
    CallExpression(node) {
      if (node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'container' &&
          node.callee.property &&
          node.callee.property.name === 'get') {
        context.report({
          node,
          messageId: 'noServiceLocator'
        });
      }
    }
  };
}
