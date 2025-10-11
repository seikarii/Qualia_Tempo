/**
 * @fileoverview SALA: State mutation concurrency control
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ⚠️ PARTIALLY SEMANTIC - Pattern matching. MUST UPGRADE: Analyze method body for state assignments (this.state = ...)
 * AUDIT NOTE (Senior Architect): "A MEDIAS. Similar a otros decoradores"
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @mutex on state mutation methods', category: 'QUALIA.CODE - Concurrency', recommended: true },
    schema: [],
    messages: {
      missingMutex: 'QUALIA.CODE §6: State mutation "{{method}}" requires @mutex decorator to prevent race conditions.'
    }
  },
  create(context) {
    return {
      MethodDefinition(node) {
        const hasMutex = node.decorators?.some(d => d.expression?.callee?.name === 'mutex');
        if (hasMutex) return;

        const methodName = node.key.name?.toLowerCase() || '';
        const mutationPatterns = ['set', 'update', 'modify', 'change', 'mutate', 'write'];
        
        if (mutationPatterns.some(p => methodName.startsWith(p)) && node.value?.async) {
          context.report({ node, messageId: 'missingMutex', data: { method: node.key.name } });
        }
      }
    };
  }
};
