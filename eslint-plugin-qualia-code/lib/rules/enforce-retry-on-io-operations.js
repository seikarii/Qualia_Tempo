/**
 * @fileoverview SALA: Semantic I/O Operation Detection & Retry Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes method body for actual I/O operations
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectIOOperations } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: { 
      description: 'Enforce @retry on I/O operations using semantic body analysis', 
      category: 'QUALIA.CODE - Resilience', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingRetry: `QUALIA.CODE §6: Method "{{method}}" performs I/O operations without @retry decorator.

I/O operations detected:
{{operations}}

Resilience Risk: Network/database failures can crash the application without retry logic.

Required: Add @retry({ maxRetries: 3, backoff: 'exponential' }) decorator for fault tolerance.`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Skip if already has @retry decorator
        const hasRetry = node.decorators?.some(d => d.expression?.callee?.name === 'retry');
        if (hasRetry) return;

        // Skip if no body
        if (!node.value?.body) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@retry-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect I/O operations in method body
        const operations = detectIOOperations(node);

        if (operations.length > 0) {
          context.report({
            node,
            messageId: 'missingRetry',
            data: {
              method: methodName,
              operations: operations.map(op => `• ${op.type}: ${op.operation}()`).join('\n')
            }
          });
        }
      }
    };
  }
};
