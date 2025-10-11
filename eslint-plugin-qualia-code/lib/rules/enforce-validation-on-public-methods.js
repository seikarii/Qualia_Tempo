/**
 * @fileoverview SALA: Public method validation enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
const { requireTypeChecker } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @validate on complex public service methods', category: 'QUALIA.CODE - Data Integrity', recommended: true },
    schema: [],
    messages: {
      missingValidation: 'QUALIA.CODE §6: Public method "{{method}}" with complex parameters should use @validate decorator.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        if (!node.key.name || node.key.name.startsWith('_')) return;
        if (node.accessibility === 'private' || node.accessibility === 'protected') return;

        const hasValidate = node.decorators?.some(d => d.expression?.callee?.name === 'validate');
        if (hasValidate) return;

        const params = node.value?.params || [];
        const hasComplexParams = params.length > 2 || params.some(p => 
          p.type === 'ObjectPattern' || 
          (p.typeAnnotation?.typeAnnotation?.type === 'TSTypeReference')
        );

        if (hasComplexParams) {
          context.report({ node, messageId: 'missingValidation', data: { method: node.key.name } });
        }
      }
    };
  }
};
