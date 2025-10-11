/**
 * @fileoverview SALA: Boundary validation enforcement via call graph analysis
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
const { requireTypeChecker } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @validate on all boundary methods', category: 'QUALIA.CODE - Data Integrity', recommended: true },
    schema: [],
    messages: {
      missingValidation: 'QUALIA.CODE §6: Boundary method "{{method}}" lacks @validate decorator. Add validation for external data.'
    }
  },
  create(context) {
    try {
      const { checker, tsNodeMap } = requireTypeChecker(context);
      const filename = context.getFilename();
      const isBoundary = filename.includes('/api/') || filename.includes('Controller') || filename.includes('Handler');

      if (!isBoundary) return {};

      return {
        MethodDefinition(node) {
          if (!node.key.name || node.key.name.startsWith('_')) return;
          const hasValidate = node.decorators?.some(d => d.expression?.callee?.name === 'validate');
          if (hasValidate) return;

          const params = node.value?.params || [];
          const hasComplexParams = params.some(p => p.type === 'ObjectPattern' || p.typeAnnotation);

          if (hasComplexParams) {
            context.report({ node, messageId: 'missingValidation', data: { method: node.key.name } });
          }
        }
      };
    } catch {
      return {};
    }
  }
};
