/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-config-driven-values
 * 
 * Warns about magic literals that should be externalized to configuration.
 * Proactive enforcement of configuration-driven behavior.
 * 
 * This enforces QUALIA.CODE section 1: Core Philosophy - Configuration Sovereignty
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest externalizing magic values to ConfigurationService',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const filename = context.getFilename();
    const isServiceFile = filename.includes('/services/') && filename.endsWith('.ts');

    if (!isServiceFile) {
      return {};
    }

    function isMagicValue(node) {
      if (node.type === 'Literal') {
        // Check for suspicious numeric values
        if (typeof node.value === 'number') {
          return node.value > 100 || (node.value > 1 && node.value % 1000 === 0);
        }
        // Check for suspicious string values (URLs, paths, etc.)
        if (typeof node.value === 'string') {
          return node.value.includes('api/') || 
                 node.value.includes('http') || 
                 node.value.includes('.com') ||
                 node.value.includes('timeout') ||
                 node.value.includes('delay');
        }
      }
      return false;
    }

    return {
      Literal(node) {
        if (isMagicValue(node)) {
          context.report({
            node,
            message: 'QUALIA.CODE Suggestion: Consider externalizing this value to ConfigurationService for runtime configurability. (Section 1)'
          });
        }
      }
    };
  }
};