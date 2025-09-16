/**
 * @fileoverview Rule to deprecate direct ApiClient usage
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
      description: 'Deprecate direct ApiClient usage in favor of event-driven architecture',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      deprecatedApiClient: 'ApiClient is deprecated. Use the event-driven architecture via EventBus for all communication.'
    }
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        
        // Check for imports of ApiClient
        if (typeof source === 'string' && source.includes('ApiClient')) {
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
          return; // Avoid duplicate reporting
        }

        // Check for imports from api client modules
        const apiClientPatterns = [
          '/api-client',
          '/apiClient'
        ];

        if (typeof source === 'string' && apiClientPatterns.some(pattern => source.includes(pattern))) {
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
        }
      },

      VariableDeclarator(node) {
        // Check for variable declarations that create ApiClient instances
        if (node.init && node.init.type === 'NewExpression') {
          const calleeName = node.init.callee?.name;
          if (calleeName && calleeName.includes('ApiClient')) {
            context.report({
              node,
              messageId: 'deprecatedApiClient'
            });
          }
        }
      },

      CallExpression(node) {
        // Check for method calls on ApiClient instances
        if (node.callee && node.callee.type === 'MemberExpression') {
          const objectName = node.callee.object?.name;
          if (objectName && objectName.toLowerCase().includes('apiclient')) {
            context.report({
              node,
              messageId: 'deprecatedApiClient'
            });
            return;
          }

          // Check for nested property access (e.g., someObject.apiClient.method())
          if (node.callee.object && node.callee.object.type === 'MemberExpression') {
            const propertyName = node.callee.object.property?.name;
            if (propertyName && propertyName.toLowerCase().includes('apiclient')) {
              context.report({
                node,
                messageId: 'deprecatedApiClient'
              });
              return;
            }
          }

          // Check for this.apiClient pattern
          if (node.callee.object && node.callee.object.type === 'ThisExpression') {
            const thisPropertyName = node.callee.property?.name;
            if (thisPropertyName && thisPropertyName.toLowerCase().includes('apiclient')) {
              context.report({
                node,
                messageId: 'deprecatedApiClient'
              });
            }
          }
        }
      }
    };
  }
};
