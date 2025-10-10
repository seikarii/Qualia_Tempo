/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-rate-limit-on-api-calls
 * 
 * Ensures methods that make HTTP calls in loops or repeated user actions use @rateLimit decorator.
 * Detects patterns like forEach, map with httpService calls, or methods in loops.
 * 
 * Enforces QUALIA.CODE §5.2: Decorator-Driven Development
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @rateLimit decorator on methods that make repetitive API calls',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingRateLimit: 'Method "{{methodName}}" makes HTTP calls in a loop or repeated context. Use @rateLimit() decorator to prevent API throttling. (QUALIA.CODE §5.2)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

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

    function isPublicMethod(node) {
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }
      if (node.key?.name?.startsWith('_')) {
        return false;
      }
      return true;
    }

    function containsHttpCallInLoop(node) {
      // Simplified approach: analyze source code text for patterns
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);

      // Check for loop constructs
      const hasLoop = /\b(for|forEach|map|filter|reduce|while|do\s+\{[\s\S]*?\}\s*while)\b/.test(methodText);
      
      // Check for HTTP service calls or fetch (more permissive regex)
      const hasHttpCall = /(httpService\.(get|post|put|delete|patch)|fetch\s*\()/.test(methodText);
      
      return hasHttpCall && hasLoop;
    }

    return {
      MethodDefinition(node) {
        if (!isPublicMethod(node)) {
          return;
        }

        const methodName = node.key?.name;
        if (!methodName) {
          return;
        }

        if (containsHttpCallInLoop(node) && !hasDecorator(node, 'rateLimit')) {
          context.report({
            node,
            messageId: 'missingRateLimit',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
