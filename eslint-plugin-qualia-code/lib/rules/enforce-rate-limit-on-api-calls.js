/**
 * @fileoverview SALA: API rate limiting enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @rateLimit on API call methods', category: 'QUALIA.CODE - Resilience', recommended: true },
    schema: [],
    messages: {
      missingRateLimit: 'QUALIA.CODE §6: API method "{{method}}" should use @rateLimit(10, 60) to prevent quota exhaustion.'
    }
  },
  create(context) {
    const apiPatterns = ['api', 'request', 'fetch', 'call', 'query'];
    
    return {
      MethodDefinition(node) {
        const hasRateLimit = node.decorators?.some(d => d.expression?.callee?.name === 'rateLimit');
        if (hasRateLimit) return;

        const methodName = node.key.name?.toLowerCase() || '';
        if (apiPatterns.some(p => methodName.includes(p)) && node.value?.async) {
          context.report({ node, messageId: 'missingRateLimit', data: { method: node.key.name } });
        }
      }
    };
  }
};
