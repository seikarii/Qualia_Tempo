/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-deprecated-on-comment
 * 
 * Detects methods with deprecation comments (// DEPRECATED, // TO BE REMOVED) and suggests using @deprecated decorator.
 * 
 * Enforces QUALIA.CODE §5.1: Python Decorators - Complete Catalog (Frontend equivalent)
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest @deprecated decorator instead of deprecation comments',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      useDeprecatedDecorator: 'Method "{{methodName}}" has deprecation comment. Use @deprecated() decorator instead for formal deprecation tracking. (QUALIA.CODE §5.1)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    const deprecationPatterns = [
      /deprecated/i,
      /to be removed/i,
      /will be removed/i,
      /obsolete/i,
      /do not use/i,
      /legacy/i
    ];

    function hasDecorator(node, decoratorName) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === decoratorName;
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === decoratorName;
        }
        return false;
      });
    }

    function hasDeprecationComment(node) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);
      
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return deprecationPatterns.some(pattern => pattern.test(text));
      });
    }

    return {
      MethodDefinition(node) {
        const methodName = node.key?.name;
        if (!methodName) {
          return;
        }

        if (hasDeprecationComment(node) && !hasDecorator(node, 'deprecated')) {
          context.report({
            node,
            messageId: 'useDeprecatedDecorator',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
