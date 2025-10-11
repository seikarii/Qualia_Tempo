/**
 * @fileoverview SALA: Semantic HTTP API Detection & Rate Limit Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes method body for actual HTTP API calls
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectIOOperations } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'warning',
    docs: { 
      description: 'Enforce @rateLimit on API call methods using semantic body analysis', 
      category: 'QUALIA.CODE - Resilience', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingRateLimit: `QUALIA.CODE §6: Method "{{method}}" makes HTTP API calls without @rateLimit decorator.

API calls detected:
{{operations}}

Resilience Risk: Uncontrolled API calls can exhaust rate quotas, incur costs, or trigger DDoS protections.

Required: Add @rateLimit({ maxCalls: 10, windowMs: 60000 }) decorator to throttle API usage.`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Skip if already has @rateLimit decorator
        const hasRateLimit = node.decorators?.some(d => d.expression?.callee?.name === 'rateLimit');
        if (hasRateLimit) return;

        // Skip if no body
        if (!node.value?.body) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@ratelimit-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect HTTP operations (API calls)
        const operations = detectIOOperations(node);
        const httpOperations = operations.filter(op => op.type === 'HTTP');

        if (httpOperations.length > 0) {
          context.report({
            node,
            messageId: 'missingRateLimit',
            data: {
              method: methodName,
              operations: httpOperations.map(op => `• ${op.operation}()`).join('\n')
            }
          });
        }
      }
    };
  }
};
