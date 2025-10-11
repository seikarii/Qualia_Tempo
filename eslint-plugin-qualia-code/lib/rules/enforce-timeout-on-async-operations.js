/**
 * @fileoverview SALA: Async operation timeout enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @timeout on async operations', category: 'QUALIA.CODE - Resilience', recommended: true },
    schema: [],
    messages: {
      missingTimeout: 'QUALIA.CODE §6: Async method "{{method}}" lacks @timeout decorator. Add @timeout(30) to prevent hanging operations.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        if (!node.value?.async) return;
        const hasTimeout = node.decorators?.some(d => d.expression?.callee?.name === 'timeout');
        if (!hasTimeout && node.key.name?.match(/(connect|fetch|load|sync|send)/i)) {
          context.report({ node, messageId: 'missingTimeout', data: { method: node.key.name } });
        }
      }
    };
  }
};
