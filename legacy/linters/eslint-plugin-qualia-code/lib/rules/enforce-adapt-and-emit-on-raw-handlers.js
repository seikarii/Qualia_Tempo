/**
 * @fileoverview SALA: Protocol adapter pattern enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @AdaptAndEmit on raw data handlers', category: 'QUALIA.CODE - Event Architecture', recommended: true },
    schema: [],
    messages: {
      missingAdapter: 'QUALIA.CODE §4: Raw data handler "{{method}}" requires @AdaptAndEmit decorator for protocol adaptation.'
    }
  },
  create(context) {
    return {
      MethodDefinition(node) {
        const methodName = node.key.name?.toLowerCase() || '';
        const rawPatterns = ['onmessage', 'ondata', 'onraw', 'handleraw', 'parsemessage'];
        
        if (!rawPatterns.some(p => methodName.includes(p))) return;

        const hasAdaptAndEmit = node.decorators?.some(d => d.expression?.callee?.name === 'AdaptAndEmit');
        if (!hasAdaptAndEmit) {
          context.report({ node, messageId: 'missingAdapter', data: { method: node.key.name } });
        }
      }
    };
  }
};
