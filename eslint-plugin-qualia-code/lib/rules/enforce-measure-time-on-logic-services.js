/**
 * @fileoverview SALA: Performance measurement enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @measureTime on logic-heavy methods', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      missingMeasureTime: 'QUALIA.CODE §6: Logic method "{{method}}" should use @measureTime for performance monitoring.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('ViewLogicService') && !filename.includes('CalculatorService')) return {};

    return {
      MethodDefinition(node) {
        // Check for @measureTime or @profile decorators - handle both syntaxes
        const hasMeasureTime = node.decorators?.some(d => {
          const decoratorName = d.expression?.callee?.name || d.expression?.name;
          return decoratorName === 'measureTime' || decoratorName === 'profile';
        });
        if (hasMeasureTime || !node.value?.body) return;

        const bodyLength = node.value.body.body?.length || 0;
        if (bodyLength > 10 || node.key.name?.match(/(calculate|compute|generate|process)/i)) {
          context.report({ node, messageId: 'missingMeasureTime', data: { method: node.key.name } });
        }
      }
    };
  }
};
