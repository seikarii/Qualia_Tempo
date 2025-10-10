/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-adapt-and-emit-on-raw-handlers
 * 
 * Ensures methods that handle raw external data (WebSocket, ArrayBuffer) use @AdaptAndEmit decorator.
 * Critical for protocol adaptation pattern.
 * 
 * Enforces QUALIA.CODE §5.2.1: Environment Adaptation Bundle
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @AdaptAndEmit decorator on methods that handle raw external data',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingAdaptAndEmit: 'Raw data handler "{{methodName}}" must use @AdaptAndEmit() decorator for protocol adaptation. (QUALIA.CODE §5.2.1)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // Patterns that indicate raw data handling
    const rawDataPatterns = [
      /^(on|handle)(Raw|Socket|Ws|Binary|Buffer|Packet|Message|Data)/i
    ];

    // Type hints that indicate raw data
    const rawDataTypes = [
      'ArrayBuffer',
      'Uint8Array',
      'MessageEvent',
      'WebSocketMessage',
      'BinaryData'
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

    function isRawDataHandler(node) {
      const methodName = node.key?.name;
      if (!methodName) return false;

      // Check method name pattern
      const nameMatches = rawDataPatterns.some(pattern => pattern.test(methodName));

      // Check parameter types
      const params = node.value?.params || [];
      const hasRawDataType = params.some(param => {
        const typeAnnotation = param.typeAnnotation?.typeAnnotation?.typeName?.name;
        return typeAnnotation && rawDataTypes.includes(typeAnnotation);
      });

      return nameMatches || hasRawDataType;
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

        if (isRawDataHandler(node) && !hasDecorator(node, 'AdaptAndEmit')) {
          context.report({
            node,
            messageId: 'missingAdaptAndEmit',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
