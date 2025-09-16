/**
 * @fileoverview Rule to prevent complex state (objects/arrays) in useState
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
      description: 'Prevent complex state (objects/arrays) in useState, use Zustand store instead',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      noComplexUseState: 'Complex state (objects/arrays) is forbidden in useState. Use a Zustand slice in GameStateStore.'
    }
  },

  create(context) {
    return {
      CallExpression(node) {
        // Check if this is a useState call
        if (node.callee.name === 'useState' && node.arguments.length > 0) {
          const initialValue = node.arguments[0];
          
          // Check for object literal
          if (initialValue.type === 'ObjectExpression') {
            context.report({
              node,
              messageId: 'noComplexUseState'
            });
          }
          
          // Check for array literal
          if (initialValue.type === 'ArrayExpression') {
            context.report({
              node,
              messageId: 'noComplexUseState'
            });
          }

          // Check for function calls that might return complex objects
          if (initialValue.type === 'CallExpression') {
            // Allow simple constructor calls like new Date(), new Set(), new Map()
            const allowedConstructors = ['Date', 'Set', 'Map', 'WeakSet', 'WeakMap'];
            if (initialValue.callee.type === 'NewExpression' && 
                allowedConstructors.includes(initialValue.callee.callee?.name)) {
              return;
            }
            
            // For other function calls, we can't easily determine the return type
            // so we'll be conservative and warn
            const functionName = initialValue.callee.name;
            if (functionName && !['Boolean', 'Number', 'String'].includes(functionName)) {
              context.report({
                node,
                messageId: 'noComplexUseState'
              });
            }
          }
        }
      }
    };
  }
};
