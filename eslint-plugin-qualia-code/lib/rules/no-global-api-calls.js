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
          reportForbiddenGlobal(node, node.callee.name);
        }

        // Check member expressions (e.g., window.fetch, localStorage.getItem)
        if (node.callee.type === 'MemberExpression') {
          const objectName = node.callee.object.name;
          if (forbiddenGlobals.includes(objectName) && shouldReport(node)) {
            reportForbiddenGlobal(node, objectName);
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
          reportForbiddenGlobal(node, node.object.name);
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
          reportForbiddenGlobal(node, node.name);
        }
      }
    };
  }
};