/**
 * @fileoverview SALA: Semantic detection of direct container access in React components
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Detects React components via JSX.Element return type
 * - Uses TypeChecker to identify container.get() calls
 * - Suggests useService() hook with correct type
 * 
 * QUALIA.CODE REFERENCE: §2.3
 */

'use strict';

const { requireTypeChecker, getNodeType, getReturnType } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforce useService() hook in React components',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#23'
    },
    fixable: null,
    schema: [],
    messages: {
      useServiceHook: `QUALIA.CODE §2.3 VIOLATION: Direct container access in React component. Use useService() hook.

WHY: React components must use hooks for service access, not direct container references.

PROHIBITED PATTERN:
  const MyComponent = () => {
    const service = container.get<IMyService>(TYPES.IMyService); // ❌
    return <div>...</div>;
  }

CORRECT PATTERN:
  const MyComponent = () => {
    const service = useService<IMyService>(TYPES.IMyService); // ✅
    return <div>...</div>;
  }

Consult QUALIA.MANUAL.md §5.2 for useService() hook usage.`
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

    if (!filename.endsWith('.tsx') && !filename.endsWith('.jsx')) {
      return {};
    }

    let insideComponent = false;

    function isReactComponent(node) {
      if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
        const returnType = getReturnType(getNodeType(node, tsNodeMap, checker), checker);
        if (returnType) {
          const symbol = returnType.getSymbol();
          if (symbol && (symbol.name === 'Element' || symbol.name === 'JSX')) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      FunctionDeclaration(node) {
        if (isReactComponent(node)) insideComponent = true;
      },
      'FunctionDeclaration:exit'() {
        insideComponent = false;
      },
      ArrowFunctionExpression(node) {
        if (isReactComponent(node)) insideComponent = true;
      },
      'ArrowFunctionExpression:exit'() {
        insideComponent = false;
      },

      CallExpression(node) {
        if (!insideComponent) return;

        if (node.callee?.type === 'MemberExpression' &&
            node.callee.object?.name === 'container' &&
            node.callee.property?.name === 'get') {
          context.report({
            node,
            messageId: 'useServiceHook'
          });
        }
      }
    };
  }
};

function createFallbackRule(context) {
  const filename = context.getFilename();
  if (!filename.endsWith('.tsx')) return {};

  let insideFunction = false;

  return {
    FunctionDeclaration() { insideFunction = true; },
    'FunctionDeclaration:exit'() { insideFunction = false; },
    ArrowFunctionExpression() { insideFunction = true; },
    'ArrowFunctionExpression:exit'() { insideFunction = false; },

    CallExpression(node) {
      if (insideFunction &&
          node.callee?.type === 'MemberExpression' &&
          node.callee.object?.name === 'container' &&
          node.callee.property?.name === 'get') {
        context.report({ node, messageId: 'useServiceHook' });
      }
    }
  };
}
