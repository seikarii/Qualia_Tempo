/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-readonly-on-config-access
 * 
 * Suggests @readonly decorator on methods that return configuration objects to promote immutability.
 * 
 * Enforces QUALIA.CODE §7: State Management (Advisory)
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest @readonly decorator on methods that return configuration objects',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      suggestReadonly: 'ADVISORY: Method "{{methodName}}" returns configuration data. Consider using @readonly decorator to enforce immutability. (QUALIA.CODE §7)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // Patterns that indicate config accessors
    const configPatterns = [
      /^get(Config|Configuration|Settings|Options|Preferences)/i,
      /^(load|fetch|read)(Config|Configuration|Settings|Options|Preferences)/i
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

    function isPublicMethod(node) {
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }
      if (node.key?.name?.startsWith('_')) {
        return false;
      }
      return true;
    }

    function isConfigAccessor(methodName) {
      return configPatterns.some(pattern => pattern.test(methodName));
    }

    function returnsObject(node) {
      // Check if return type annotation suggests an object
      const returnType = node.value?.returnType?.typeAnnotation;
      if (!returnType) return false;

      // Check for object type annotations
      if (returnType.type === 'TSTypeLiteral') return true;
      if (returnType.type === 'TSTypeReference') {
        const typeName = returnType.typeName?.name;
        return typeName && (typeName.includes('Config') || typeName.includes('Settings') || typeName.includes('Options'));
      }

      return false;
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

        if ((isConfigAccessor(methodName) || returnsObject(node)) && !hasDecorator(node, 'readonly')) {
          context.report({
            node,
            messageId: 'suggestReadonly',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
