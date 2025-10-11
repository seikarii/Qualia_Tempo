/**
 * @fileoverview SALA: Heavy computation async enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce async on heavy computational methods', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      shouldBeAsync: 'QUALIA.CODE §9: Heavy method "{{method}}" should be async to prevent blocking. Consider using async/await with requestIdleCallback.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        if (node.value?.async) return;
        if (!node.value?.body) return;

        const bodyLength = node.value.body.body?.length || 0;
        const methodName = node.key.name || '';
        const isHeavy = bodyLength > 30 || methodName.match(/(calculate|compute|process|generate|transform|render)/i);

        if (isHeavy) {
          context.report({ node, messageId: 'shouldBeAsync', data: { method: methodName } });
        }
      }
    };
  }
};
