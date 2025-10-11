/**
 * @fileoverview SALA: Service method decorator enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @logMethod on all public service methods', category: 'QUALIA.CODE - Observability', recommended: true },
    schema: [],
    messages: {
      missingLogMethod: 'QUALIA.CODE §6: Public method "{{method}}" in service lacks @logMethod decorator. Required for observability.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/') || filename.includes('Provider.ts')) return {};

    return {
      MethodDefinition(node) {
        if (!node.key.name || node.key.name.startsWith('_')) return;
        if (node.accessibility === 'private' || node.accessibility === 'protected') return;

        const hasLogMethod = node.decorators?.some(d => d.expression?.callee?.name === 'logMethod');
        if (!hasLogMethod && node.value?.body) {
          context.report({ node, messageId: 'missingLogMethod', data: { method: node.key.name } });
        }
      }
    };
  }
};
