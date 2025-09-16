/**
 * @fileoverview Rule to prevent direct service instantiation in React components
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit direct service instantiation in React components',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      noDirectInstantiation: 'Direct service instantiation is forbidden by QUALIA.CODE. Access services via the useServices() hook.'
    }
  },

  create(context) {
    return {
      NewExpression(node) {
        // Check if we're in a .tsx or .ts file
        const filename = context.getFilename();
        if (!filename.endsWith('.tsx') && !filename.endsWith('.ts')) {
          return;
        }

        // Allow direct instantiation in test files
        if (filename.includes('.test.') ||
            filename.includes('.spec.') ||
            filename.includes('__tests__') ||
            filename.includes('/tests/')) {
          return;
        }

        // Skip if we're in CompositionRoot.ts (allowed to instantiate services)
        if (filename.includes('CompositionRoot.ts') || filename.includes('CompositionRoot.tsx')) {
          return;
        }

        // Check if the instantiated class name ends with 'Service'
        if (node.callee && node.callee.name && node.callee.name.endsWith('Service')) {
          context.report({
            node,
            messageId: 'noDirectInstantiation'
          });
        }

        // Also check for qualified names (e.g., MyModule.MyService)
        if (node.callee && node.callee.type === 'MemberExpression') {
          const memberName = node.callee.property && node.callee.property.name;
          if (memberName && memberName.endsWith('Service')) {
            context.report({
              node,
              messageId: 'noDirectInstantiation'
            });
          }
        }
      }
    };
  }
};
