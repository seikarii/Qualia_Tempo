/**
 * @fileoverview Enforce @BrowserOnly decorator on methods accessing window or document
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
      description: 'Enforce @BrowserOnly decorator on methods that access window or document APIs',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingBrowserOnly: 'QUALIA.CODE: Method "{{methodName}}" accesses browser-only APIs ({{apis}}) but is missing @BrowserOnly decorator. This is required for SSR compatibility and test environment safety.'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    const browserApis = new Set([
      'window',
      'document',
      'navigator',
      'localStorage',
      'sessionStorage',
      'location',
      'history',
      'screen',
      'performance'
    ]);

    function hasBrowserOnlyDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === 'BrowserOnly';
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === 'BrowserOnly';
        }
        return false;
      });
    }

    function findBrowserApiUsage(node) {
      const usedApis = new Set();

      function traverse(currentNode) {
        if (!currentNode || typeof currentNode !== 'object') {
          return;
        }

        // Check for Identifier nodes that reference browser APIs
        if (currentNode.type === 'Identifier' && browserApis.has(currentNode.name)) {
          usedApis.add(currentNode.name);
        }

        // Check for MemberExpression (e.g., window.innerWidth, document.getElementById)
        if (currentNode.type === 'MemberExpression') {
          if (currentNode.object?.name && browserApis.has(currentNode.object.name)) {
            usedApis.add(currentNode.object.name);
          }
        }

        // Recurse through all properties
        for (const key in currentNode) {
          if (key === 'parent') continue; // Avoid circular references
          if (Array.isArray(currentNode[key])) {
            currentNode[key].forEach(child => traverse(child));
          } else if (typeof currentNode[key] === 'object') {
            traverse(currentNode[key]);
          }
        }
      }

      traverse(node.value?.body);
      return usedApis;
    }

    return {
      MethodDefinition(node) {
        // Skip constructors and lifecycle methods
        if (node.kind === 'constructor' || 
            ['initialize', 'cleanup', 'destroy'].includes(node.key?.name)) {
          return;
        }

        // Skip private methods
        if (node.accessibility === 'private' || node.key?.name?.startsWith('_')) {
          return;
        }

        // Skip if method has no body (e.g., interface method declaration)
        if (!node.value?.body) {
          return;
        }

        // Check if method uses browser APIs
        const usedApis = findBrowserApiUsage(node);
        
        if (usedApis.size > 0 && !hasBrowserOnlyDecorator(node)) {
          context.report({
            node,
            messageId: 'missingBrowserOnly',
            data: {
              methodName: node.key.name,
              apis: Array.from(usedApis).join(', ')
            }
          });
        }
      }
    };
  }
};
