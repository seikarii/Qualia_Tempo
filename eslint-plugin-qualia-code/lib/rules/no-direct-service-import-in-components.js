/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: no-direct-service-import-in-components
 * 
 * Prohibits direct imports of service classes in React components.
 * Forces the use of useService() hook, reinforcing IoC patterns.
 * 
 * This enforces QUALIA.CODE section 2.2: InversifyJS & True IoC
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit direct service imports in React components - use useService() hook',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const filename = context.getFilename();
    const isComponent = filename.endsWith('.tsx');

    if (!isComponent) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        const sourcePath = node.source.value;
        
        // Check if importing from services directory
        if (typeof sourcePath === 'string' && sourcePath.includes('/services/') && !sourcePath.includes('/interfaces/') && !sourcePath.includes('/hooks')) {
          context.report({
            node,
            message: 'QUALIA.CODE Violation: Direct service imports prohibited in components. Use useService() hook instead. (Section 2.2)'
          });
        }
      }
    };
  }
};