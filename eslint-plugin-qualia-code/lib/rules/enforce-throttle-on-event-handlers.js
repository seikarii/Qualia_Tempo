/**
 * @fileoverview SALA: Event handler frequency detection
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @throttle on high-frequency event handlers', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      missingThrottle: 'QUALIA.CODE §6: Event handler "{{method}}" should use @throttle(250) to prevent performance degradation.'
    }
  },
  create(context) {
    const highFreqEvents = ['mouse', 'scroll', 'resize', 'drag', 'wheel', 'move'];
    
    return {
      MethodDefinition(node) {
        const hasThrottle = node.decorators?.some(d => d.expression?.callee?.name === 'throttle');
        if (hasThrottle) return;

        const methodName = node.key.name?.toLowerCase() || '';
        if (highFreqEvents.some(evt => methodName.includes(evt)) && methodName.includes('handle')) {
          context.report({ node, messageId: 'missingThrottle', data: { method: node.key.name } });
        }
      }
    };
  }
};
