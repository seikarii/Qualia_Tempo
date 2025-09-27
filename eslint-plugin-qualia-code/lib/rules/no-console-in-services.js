/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: no-console-in-services
 * 
 * Prohibits the use of console.* methods in service files.
 * All logging MUST be channeled through the injected QualiaLogger.
 * 
 * This enforces QUALIA.CODE section 5.3: Logging Standard
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit console usage in service files - use QualiaLogger instead',
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

    return {
      MemberExpression(node) {
        if (node.object.name === 'console') {
          context.report({
            node,
            message: 'QUALIA.CODE Violation: console.* usage prohibited in services. Use injected QualiaLogger instead. (Section 5.3)'
          });
        }
      }
    };
  }
};