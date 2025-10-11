/**
 * @fileoverview SALA: Heavy computation profiling enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @profile on computationally intensive methods', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      missingProfile: 'QUALIA.CODE §6: Heavy computation "{{method}}" requires @profile decorator for performance analysis.'
    }
  },
  create(context) {
    return {
      MethodDefinition(node) {
        // Check for @profile decorator - handle both @profile and @profile() syntaxes
        const hasProfile = node.decorators?.some(d => 
          d.expression?.callee?.name === 'profile' || d.expression?.name === 'profile'
        );
        if (hasProfile || !node.value?.body) return;

        const bodyLength = node.value.body.body?.length || 0;
        const methodName = node.key.name || '';
        const isHeavy = bodyLength > 20 || methodName.match(/(render|calculate|process|compute|generate|transform)/i);

        if (isHeavy) {
          context.report({ node, messageId: 'missingProfile', data: { method: methodName } });
        }
      }
    };
  }
};
