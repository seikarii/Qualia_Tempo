/**
 * @fileoverview Rule to prohibit direct use of global APIs in services layer
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prohibit direct use of fetch, setTimeout, setInterval, localStorage, etc. within services layer',
      category: 'Architectural Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenGlobals: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'fetch',
              'setTimeout', 
              'setInterval',
              'clearTimeout',
              'clearInterval',
              'localStorage',
              'sessionStorage',
              'XMLHttpRequest',
              'navigator',
              'location',
              'window',
              'document'
            ]
          },
          servicesPath: {
            type: 'string',
            default: 'src/services'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      noGlobalApiCall: 'Direct use of "{{globalApi}}" is forbidden in services layer. Use injected {{suggestedService}} instead.',
      noGlobalAccess: 'Direct access to "{{globalApi}}" is forbidden in services layer. Use appropriate abstraction service instead.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const forbiddenGlobals = options.forbiddenGlobals || [
      'fetch',
      'setTimeout', 
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'localStorage',
      'sessionStorage',
      'XMLHttpRequest',
      'navigator',
      'location',
      'window',
      'document'
    ];
    const servicesPath = options.servicesPath || 'src/services';

    // Map forbidden globals to suggested services
    const globalToServiceMap = {
      'fetch': 'IHttpService',
      'setTimeout': 'ITimerService',
      'setInterval': 'ITimerService',
      'clearTimeout': 'ITimerService',
      'clearInterval': 'ITimerService',
      'localStorage': 'IStorageService',
      'sessionStorage': 'IStorageService',
      'XMLHttpRequest': 'IHttpService'
    };

    function isInServicesLayer(filename) {
      return filename.includes(servicesPath);
    }

    function isBrowserOnlyDecorated(node) {
      // Check if the function/method is decorated with @BrowserOnly
      // Since ESLint may not parse decorators the same way as TypeScript compiler,
      // we'll use a different approach: check if we're inside a function that has
      // the @BrowserOnly decorator by looking at the source code around the function
      
      const sourceCode = context.getSourceCode();
      let currentNode = node;
      
      // Walk up to find the function declaration
      while (currentNode && currentNode.type !== 'FunctionDeclaration' && 
             currentNode.type !== 'FunctionExpression' && 
             currentNode.type !== 'ArrowFunctionExpression' &&
             currentNode.type !== 'MethodDefinition') {
        currentNode = currentNode.parent;
      }
      
      if (!currentNode) return false;
      
      // Get the source code before the function to check for @BrowserOnly decorator
      const functionStart = currentNode.range[0];
      const textBefore = sourceCode.getText().substring(
        Math.max(0, functionStart - 200), // Look back up to 200 characters
        functionStart
      );
      
      // Check if the text before contains @BrowserOnly
      return textBefore.includes('@BrowserOnly');
    }

    function hasWindowGuard(node) {
      // Check if there's a typeof window !== 'undefined' guard in the current scope
      let currentNode = node;
      
      // Walk up to find the function/method body
      while (currentNode && currentNode.type !== 'FunctionDeclaration' && 
             currentNode.type !== 'FunctionExpression' && 
             currentNode.type !== 'ArrowFunctionExpression' &&
             currentNode.type !== 'MethodDefinition') {
        currentNode = currentNode.parent;
      }
      
      if (!currentNode || !currentNode.body) return false;
      
      // Simple check: look for typeof window !== 'undefined' in the function body
      // This is a basic implementation - could be enhanced for more complex cases
      const body = currentNode.body;
      if (body.type === 'BlockStatement') {
        return body.body.some(statement => {
          // Check for if (typeof window !== 'undefined') or if (typeof window !== "undefined")
          if (statement.type === 'IfStatement') {
            const test = statement.test;
            if (test.type === 'BinaryExpression' && 
                test.left.type === 'UnaryExpression' && 
                test.left.operator === 'typeof' &&
                test.left.argument.name === 'window' &&
                test.operator === '!==' &&
                test.right.type === 'Literal' && 
                (test.right.value === 'undefined' || test.right.value === "undefined")) {
              return true;
            }
          }
          return false;
        });
      }
      
      return false;
    }

    function isWindowAccessAllowed(node, globalName) {
      // Allow window access if:
      // 1. The function is decorated with @BrowserOnly, OR
      // 2. There's a typeof window !== 'undefined' guard in the function
      if (globalName === 'window') {
        return isBrowserOnlyDecorated(node) || hasWindowGuard(node);
      }
      return false;
    }

    function reportForbiddenGlobal(node, globalName) {
      const suggestedService = globalToServiceMap[globalName];
      
      if (suggestedService) {
        context.report({
          node,
          messageId: 'noGlobalApiCall',
          data: {
            globalApi: globalName,
            suggestedService: suggestedService
          }
        });
      } else {
        context.report({
          node,
          messageId: 'noGlobalAccess',
          data: {
            globalApi: globalName
          }
        });
      }
    }

    // Track reported nodes to avoid double reporting
    const reportedNodes = new Set();

    function shouldReport(node) {
      const nodeKey = `${node.type}:${node.range[0]}:${node.range[1]}`;
      if (reportedNodes.has(nodeKey)) {
        return false;
      }
      reportedNodes.add(nodeKey);
      return true;
    }

    return {
      CallExpression(node) {
        const filename = context.getFilename();
        
        if (!isInServicesLayer(filename)) {
          return;
        }

        // Check direct calls to forbidden globals
        if (node.callee.type === 'Identifier' && 
            forbiddenGlobals.includes(node.callee.name) &&
            shouldReport(node)) {
          // Allow window access if decorated with @BrowserOnly or has guard
          if (!isWindowAccessAllowed(node, node.callee.name)) {
            reportForbiddenGlobal(node, node.callee.name);
          }
        }

        // Check member expressions (e.g., window.fetch, localStorage.getItem)
        if (node.callee.type === 'MemberExpression') {
          const objectName = node.callee.object.name;
          if (forbiddenGlobals.includes(objectName) && shouldReport(node)) {
            // Allow window access if decorated with @BrowserOnly or has guard
            if (!isWindowAccessAllowed(node, objectName)) {
              reportForbiddenGlobal(node, objectName);
            }
          }
        }
      },

      MemberExpression(node) {
        const filename = context.getFilename();
        
        if (!isInServicesLayer(filename)) {
          return;
        }

        // Skip if this is part of a call expression (will be handled by CallExpression)
        if (node.parent && node.parent.type === 'CallExpression' && node.parent.callee === node) {
          return;
        }

        // Check access to forbidden global objects
        if (node.object.type === 'Identifier' && 
            forbiddenGlobals.includes(node.object.name) &&
            shouldReport(node)) {
          // Allow window access if decorated with @BrowserOnly or has guard
          if (!isWindowAccessAllowed(node, node.object.name)) {
            reportForbiddenGlobal(node, node.object.name);
          }
        }
      },

      Identifier(node) {
        const filename = context.getFilename();
        
        if (!isInServicesLayer(filename)) {
          return;
        }

        // Skip if this identifier is part of a member expression or call expression
        const parent = node.parent;
        if (parent.type === 'MemberExpression' || 
            parent.type === 'CallExpression' ||
            parent.type === 'VariableDeclarator' || 
            parent.type === 'FunctionDeclaration' || 
            parent.type === 'ArrowFunctionExpression' ||
            parent.type === 'Property' ||
            parent.type === 'ImportSpecifier' ||
            parent.type === 'ImportDefaultSpecifier') {
          return;
        }

        // Check direct reference to forbidden globals (e.g., const x = fetch;)
        if (forbiddenGlobals.includes(node.name) && shouldReport(node)) {
          // Allow window access if decorated with @BrowserOnly or has guard
          if (!isWindowAccessAllowed(node, node.name)) {
            reportForbiddenGlobal(node, node.name);
          }
        }
      }
    };
  }
};