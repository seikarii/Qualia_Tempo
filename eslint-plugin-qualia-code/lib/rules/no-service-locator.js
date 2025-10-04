/**
 * @fileoverview Rule to prevent Service Locator anti-pattern by prohibiting container.get() outside composition roots
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
      description: 'Prohibit container.get() usage outside of composition roots and tests',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      noServiceLocator: "QUALIA.CODE Violation: El uso de 'container.get()' está prohibido fuera de los puntos de composición (inversify.config.ts, ApplicationCompositionRoot.ts) y tests. Utilice inyección de dependencias en el constructor."
    }
  },

  create(context) {
    return {
      CallExpression(node) {
        // Check if this is a container.get() call
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'container' &&
          node.callee.property &&
          node.callee.property.name === 'get'
        ) {
          // Get the filename
          const filename = context.getFilename();

          // Whitelist: Allow in composition root files
          if (
            filename.includes('inversify.config.ts') ||
            filename.includes('ApplicationCompositionRoot.ts')
          ) {
            return;
          }

          // Whitelist: Allow in test files
          if (
            filename.includes('.test.ts') ||
            filename.includes('.test.tsx') ||
            filename.includes('.spec.ts') ||
            filename.includes('.spec.tsx') ||
            filename.includes('__tests__') ||
            filename.includes('/tests/') ||
            filename.includes('tests/')
          ) {
            return;
          }

          // Whitelist: Allow in hooks.ts (specific exception for useService hook)
          if (filename.endsWith('hooks.ts')) {
            return;
          }

          // Whitelist: Allow in decorators.ts (IoC resolution for @AdaptAndEmit decorator)
          if (filename.endsWith('decorators.ts')) {
            return;
          }

          // If we reach here, it's a violation
          context.report({
            node,
            messageId: 'noServiceLocator'
          });
        }
      }
    };
  }
};
