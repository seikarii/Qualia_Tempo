/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-debounce-on-ui-inputs
 * 
 * Ensures UI input handlers that trigger costly operations use @debounce decorator.
 * Detects methods like handleSearchInputChange, onWindowResize, handleFilterChange, etc.
 * 
 * Enforces QUALIA.CODE §5.2: Decorator-Driven Development
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @debounce decorator on UI input handlers that trigger costly operations',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingDebounce: 'UI input handler "{{methodName}}" should use @debounce() decorator to delay execution until user input stabilizes. (QUALIA.CODE §5.2)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // UI input patterns that typically need debouncing
    const uiInputPatterns = [
      /^(on|handle)(Search|Filter|Query|Input|Type|KeyUp|KeyPress)/i,
      /^(on|handle)(Window|Browser)(Resize|Load)/i,
      /^(on|handle)(Config|Settings|Preference)Change/i,
      /^(on|handle)(Validation|Autocomplete)/i
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

    function isUiInputHandler(methodName) {
      return uiInputPatterns.some(pattern => pattern.test(methodName));
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
        if (!methodName || !isUiInputHandler(methodName)) {
          return;
        }

        if (!hasDecorator(node, 'debounce')) {
          context.report({
            node,
            messageId: 'missingDebounce',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
