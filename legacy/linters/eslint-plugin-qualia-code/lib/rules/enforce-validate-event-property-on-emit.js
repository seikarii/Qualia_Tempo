/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-validate-event-property-on-emit
 * 
 * Ensures methods that emit events to EventBus with complex object properties use @validateEventProperty decorator.
 * 
 * Enforces QUALIA.CODE §5.2: Decorator-Driven Development
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @validateEventProperty decorator on methods that emit events with complex objects',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingValidateEventProperty: 'Method "{{methodName}}" emits events with complex object properties. Use @validateEventProperty() decorator. (QUALIA.CODE §5.2)'
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

    function emitsEventWithComplexObject(node) {
      let emitsEvent = false;

      // Traverse the method body to find eventBus.emit calls
      function traverse(current) {
        if (!current) return;

        // Check for eventBus.emit() calls
        if (
          current.type === 'CallExpression' &&
          current.callee?.type === 'MemberExpression' &&
          current.callee?.object?.name === 'eventBus' &&
          current.callee?.property?.name === 'emit'
        ) {
          // Check if the second argument is an object literal with properties
          const eventData = current.arguments?.[1];
          if (eventData && eventData.type === 'ObjectExpression' && eventData.properties.length > 2) {
            emitsEvent = true;
          }
        }

        // Check for this.eventBus.emit() calls
        if (
          current.type === 'CallExpression' &&
          current.callee?.type === 'MemberExpression' &&
          current.callee?.object?.type === 'MemberExpression' &&
          current.callee?.object?.property?.name === 'eventBus' &&
          current.callee?.property?.name === 'emit'
        ) {
          const eventData = current.arguments?.[1];
          if (eventData && eventData.type === 'ObjectExpression' && eventData.properties.length > 2) {
            emitsEvent = true;
          }
        }

        // Recursively traverse child nodes (avoid circular refs by skipping 'parent')
        const keysToTraverse = ['body', 'expression', 'callee', 'arguments', 'elements', 'properties', 'consequent', 'alternate', 'init', 'test', 'update', 'left', 'right'];
        for (const key of keysToTraverse) {
          if (current[key]) {
            if (Array.isArray(current[key])) {
              current[key].forEach(child => traverse(child));
            } else if (typeof current[key] === 'object') {
              traverse(current[key]);
            }
          }
        }
      }

      traverse(node.value);
      return emitsEvent;
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

        if (emitsEventWithComplexObject(node) && !hasDecorator(node, 'validateEventProperty')) {
          context.report({
            node,
            messageId: 'missingValidateEventProperty',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
