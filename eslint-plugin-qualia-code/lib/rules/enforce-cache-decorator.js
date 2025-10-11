/**
 * @fileoverview SALA: Expensive operation caching enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @cache on expensive pure methods', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      missingCache: 'QUALIA.CODE §6: Expensive getter "{{method}}" should use @cache decorator for memoization.'
    }
  },
  create(context) {
    return {
      MethodDefinition(node) {
        if (node.kind !== 'get') return;
        
        const hasCache = node.decorators?.some(d => d.expression?.callee?.name === 'cache');
        if (hasCache || !node.value?.body) return;

        const bodyLength = node.value.body.body?.length || 0;
        if (bodyLength > 5 || node.key.name?.match(/(calculate|compute|generate)/i)) {
          context.report({ node, messageId: 'missingCache', data: { method: node.key.name } });
        }
      }
    };
  }
};
