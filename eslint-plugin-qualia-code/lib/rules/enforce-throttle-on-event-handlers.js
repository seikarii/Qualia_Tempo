/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-throttle-on-event-handlers
 * 
 * Ensures high-frequency event handlers use @throttle decorator.
 * Detects methods like handleMouseMove, onScroll, onMouseMove, etc.
 * 
 * Enforces QUALIA.CODE §5.2: Decorator-Driven Development
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @throttle decorator on high-frequency event handler methods',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingThrottle: 'High-frequency event handler "{{methodName}}" must use @throttle() decorator to prevent performance degradation. (QUALIA.CODE §5.2)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // High-frequency event patterns
    const highFrequencyPatterns = [
      /^(on|handle)(Mouse(Move|Enter|Leave|Over|Out)|Scroll|Resize|Drag|Wheel|Touch(Move|Start|End))/i,
      /^(on|handle)(Pointer(Move|Enter|Leave|Over|Out))/i,
      /^(on|handle)(Animation|Frame|Tick)/i
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

    function isHighFrequencyHandler(methodName) {
      return highFrequencyPatterns.some(pattern => pattern.test(methodName));
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

    return {
      MethodDefinition(node) {
        if (!isPublicMethod(node)) {
          return;
        }

        const methodName = node.key?.name;
        if (!methodName || !isHighFrequencyHandler(methodName)) {
          return;
        }

        if (!hasDecorator(node, 'throttle')) {
          context.report({
            node,
            messageId: 'missingThrottle',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
