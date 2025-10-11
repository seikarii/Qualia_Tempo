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

    // Patterns that indicate ACTUAL config accessors (not calculated data)
    const configPatterns = [
      /^get.*Config$/i,              // getConfig, getAudioConfig, etc.
      /^load.*Config$/i,              // loadConfig
      /^(fetch|read)Configuration$/i  // fetchConfiguration, readConfiguration
    ];

    // Methods that return calculated data, NOT configuration
    const excludedPatterns = [
      /^get(Stats|Status|Metrics|Info|Data)/i,     // Runtime stats, not config
      /^get(Window|Viewport|Grid|Direction)/i,     // Calculated dimensions/positions
      /^calculate/i,                                // Calculated values
      /^generate/i,                                 // Generated data
      /^predict/i,                                  // Predictions
      /Visuals$/,                                   // Visual data (calculated)
      /Position$/,                                  // Positions (calculated)
      /Rotation$/,                                  // Rotations (calculated)
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
      // Exclude methods that clearly return calculated data
      if (excludedPatterns.some(pattern => pattern.test(methodName))) {
        return false;
      }
      return configPatterns.some(pattern => pattern.test(methodName));
    }

    function returnsConfigObject(node) {
      // Check if return type annotation suggests a CONFIG object
      const returnType = node.value?.returnType?.typeAnnotation;
      if (!returnType) return false;

      if (returnType.type === 'TSTypeReference') {
        const typeName = returnType.typeName?.name;
        // Only flag if it explicitly ends with "Config"
        return typeName && typeName.endsWith('Config');
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

        if ((isConfigAccessor(methodName) || returnsConfigObject(node)) && !hasDecorator(node, 'readonly')) {
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
