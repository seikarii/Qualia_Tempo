/**
 * @fileoverview SALA: Semantic High-Frequency Event Detection & Throttle Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes method body for DOM event subscriptions
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectDOMEventSubscriptions } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'warning',
    docs: { 
      description: 'Enforce @throttle on high-frequency event handlers using semantic body analysis', 
      category: 'QUALIA.CODE - Performance', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingThrottle: `QUALIA.CODE §6: Method "{{method}}" subscribes to high-frequency DOM event "{{eventType}}" without @throttle decorator.

High-frequency events fire rapidly (e.g., every frame during scroll/mousemove) and can cause performance degradation.

Required: Add @throttle(250) decorator to limit event handler execution frequency.

Event subscriptions detected:
{{subscriptions}}`
    }
  },
  create(context) {
    return {
      MethodDefinition(node) {
        // Skip if already has @throttle decorator
        const hasThrottle = node.decorators?.some(d => d.expression?.callee?.name === 'throttle');
        if (hasThrottle) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@throttle-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect DOM event subscriptions in method body
        const subscriptions = detectDOMEventSubscriptions(node);

        // Filter for high-frequency events
        const highFreqSubscriptions = subscriptions.filter(sub => sub.isHighFrequency);

        if (highFreqSubscriptions.length > 0) {
          context.report({
            node,
            messageId: 'missingThrottle',
            data: {
              method: methodName,
              eventType: highFreqSubscriptions[0].eventType,
              subscriptions: highFreqSubscriptions.map(s => `• addEventListener('${s.eventType}', ...)`).join('\n')
            }
          });
        }
      }
    };
  }
};
