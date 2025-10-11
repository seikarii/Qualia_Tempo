/**
 * @fileoverview SALA: React state complexity analysis
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Prevent complex useState in React components', category: 'QUALIA.CODE - State Management', recommended: true },
    schema: [],
    messages: {
      complexState: 'QUALIA.CODE §6: Complex state in useState. Use Zustand store for non-transient UI state.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/components/')) return {};

    return {
      CallExpression(node) {
        if (node.callee.name !== 'useState') return;

        const arg = node.arguments[0];
        if (!arg) return;

        const isComplex = (
          arg.type === 'ObjectExpression' && arg.properties.length > 3 ||
          arg.type === 'ArrayExpression' ||
          arg.type === 'CallExpression'
        );

        if (isComplex) {
          context.report({ node, messageId: 'complexState' });
        }
      }
    };
  }
};
