/**
 * @fileoverview SALA: Security-sensitive method authorization
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @authorize on security-sensitive methods', category: 'QUALIA.CODE - Security', recommended: true },
    schema: [],
    messages: {
      missingAuthorize: 'QUALIA.CODE §6: Security-sensitive method "{{method}}" requires @authorize decorator with role validation.'
    }
  },
  create(context) {
    const securePatterns = ['admin', 'secure', 'protected', 'delete', 'remove', 'destroy', 'modify', 'update'];

    return {
      MethodDefinition(node) {
        const hasAuthorize = node.decorators?.some(d => d.expression?.callee?.name === 'authorize');
        if (hasAuthorize) return;

        const methodName = node.key.name?.toLowerCase() || '';
        if (securePatterns.some(p => methodName.includes(p))) {
          context.report({ node, messageId: 'missingAuthorize', data: { method: node.key.name } });
        }
      }
    };
  }
};
