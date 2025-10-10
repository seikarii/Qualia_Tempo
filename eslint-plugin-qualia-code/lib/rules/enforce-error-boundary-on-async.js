/**
 * @fileoverview Enforce @catchError decorator on all async methods
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE COMPLIANCE: Error Handling (§6)
 * 
 * This rule enforces that ALL async operations are wrapped in error boundaries
 * using the @catchError decorator. Unhandled promise rejections can crash the
 * application or lead to silent failures. While @catchError has 5-10% overhead,
 * this is MANDATORIO per QUALIA.CODE for safety-critical operations.
 * 
 * RATIONALE:
 * - Promises without catch handlers cause UnhandledPromiseRejection
 * - Async operations interact with external systems (I/O, network, filesystem)
 * - @catchError provides centralized error logging and recovery
 * - Hot paths can be exempted with explicit comment
 * 
 * FORBIDDEN PATTERNS:
 * - async method without @catchError decorator
 * - async function without @catchError decorator (in class context)
 * 
 * EXEMPTIONS:
 * - // @catchError-exempt: [reason] comment above method
 * - Test helper functions (*.test.ts, *.spec.ts files)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @catchError decorator on all async methods',
      category: 'Error Handling',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#error-handling'
    },
    messages: {
      missingCatchError: 'Async {{methodType}} "{{methodName}}" lacks mandatory @catchError decorator. All async operations must be wrapped in error boundaries per QUALIA.CODE §6. Add @catchError or exempt with // @catchError-exempt: [reason].'
    },
    schema: [],
    fixable: null
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();
    
    // Exempt test files
    if (filename.endsWith('.test.ts') || 
        filename.endsWith('.spec.ts') || 
        filename.includes('/__tests__/')) {
      return {};
    }

    function hasCatchErrorDecorator(node) {
      if (!node.decorators) return false;
      
      return node.decorators.some(decorator => {
        if (decorator.expression.type === 'Identifier') {
          return decorator.expression.name === 'catchError';
        }
        if (decorator.expression.type === 'CallExpression') {
          return decorator.expression.callee.name === 'catchError';
        }
        return false;
      });
    }

    function hasCatchErrorExemptComment(node) {
      const comments = sourceCode.getCommentsBefore(node);
      return comments.some(comment => 
        comment.value.includes('@catchError-exempt')
      );
    }

    function getMethodName(node) {
      if (node.key && node.key.name) {
        return node.key.name;
      }
      if (node.id && node.id.name) {
        return node.id.name;
      }
      return 'anonymous';
    }

    function checkAsyncMethod(node, methodType) {
      // Skip if async flag is not set
      if (!node.async) return;
      
      // Skip if already has @catchError
      if (hasCatchErrorDecorator(node)) return;
      
      // Skip if has exemption comment
      if (hasCatchErrorExemptComment(node)) return;
      
      const methodName = getMethodName(node);
      
      context.report({
        node,
        messageId: 'missingCatchError',
        data: {
          methodType,
          methodName
        }
      });
    }

    return {
      // Check async method definitions in classes
      MethodDefinition(node) {
        // The async flag is on node.value (the function expression), not on the MethodDefinition itself
        if (node.value && node.value.async) {
          // Skip if already has @catchError
          if (hasCatchErrorDecorator(node)) return;
          
          // Skip if has exemption comment
          if (hasCatchErrorExemptComment(node)) return;
          
          const methodName = getMethodName(node);
          
          context.report({
            node,
            messageId: 'missingCatchError',
            data: {
              methodType: 'method',
              methodName
            }
          });
        }
      },
      
      // Check async function declarations
      FunctionDeclaration(node) {
        // Only check if it's part of a class (not standalone functions)
        const parent = context.getAncestors()[context.getAncestors().length - 1];
        if (parent && parent.type === 'ClassBody') {
          checkAsyncMethod(node, 'function');
        }
      },
      
      // Check async arrow functions assigned as class properties
      'ClassProperty > ArrowFunctionExpression'(node) {
        if (node.async) {
          const parent = node.parent;
          if (!hasCatchErrorExemptComment(parent) && 
              !hasCatchErrorDecorator(parent)) {
            const methodName = parent.key ? parent.key.name : 'anonymous';
            context.report({
              node: parent,
              messageId: 'missingCatchError',
              data: {
                methodType: 'arrow function',
                methodName
              }
            });
          }
        }
      }
    };
  }
};
