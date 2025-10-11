/**
 * @fileoverview SALA: Deprecation metadata validation
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @deprecated decorator on JSDoc @deprecated methods', category: 'QUALIA.CODE - Maintenance', recommended: true },
    schema: [],
    messages: {
      missingDecorator: 'QUALIA.CODE §6: Method has @deprecated JSDoc but lacks @deprecated decorator. Add decorator with metadata.'
    }
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      MethodDefinition(node) {
        const comments = sourceCode.getCommentsBefore(node);
        const hasJSDocDeprecated = comments.some(c => c.value.includes('@deprecated'));
        const hasDecorator = node.decorators?.some(d => d.expression?.callee?.name === 'deprecated');

        if (hasJSDocDeprecated && !hasDecorator) {
          context.report({ node, messageId: 'missingDecorator' });
        }
      }
    };
  }
};
