/**
 * @fileoverview SALA: UI input debouncing enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce @debounce on UI input handlers', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      missingDebounce: 'QUALIA.CODE §6: Input handler "{{method}}" should use @debounce(300) to reduce expensive operations.'
    }
  },
  create(context) {
    const inputPatterns = ['input', 'change', 'keypress', 'keyup', 'search'];
    
    return {
      MethodDefinition(node) {
        const hasDebounce = node.decorators?.some(d => d.expression?.callee?.name === 'debounce');
        if (hasDebounce) return;

        const methodName = node.key.name?.toLowerCase() || '';
        if (inputPatterns.some(p => methodName.includes(p)) && (methodName.includes('handle') || methodName.includes('on'))) {
          context.report({ node, messageId: 'missingDebounce', data: { method: node.key.name } });
        }
      }
    };
  }
};
