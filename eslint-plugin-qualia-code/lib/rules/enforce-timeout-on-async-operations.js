/**
 * @fileoverview SALA: Semantic I/O Operation Detection & Timeout Enforcement
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
      description: 'Enforce @timeout on async I/O operations using semantic body analysis', 
      category: 'QUALIA.CODE - Resilience', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingTimeout: `QUALIA.CODE §6: Method "{{method}}" performs I/O operations without @timeout decorator.

I/O operations detected:
{{operations}}

Resilience Risk: Network/database hangs can freeze the application indefinitely without timeout protection.

Required: Add @timeout(30000) decorator to prevent hanging operations (30s typical for external I/O).`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Skip if already has @timeout decorator
        const hasTimeout = node.decorators?.some(d => d.expression?.callee?.name === 'timeout');
        if (hasTimeout) return;

        // Skip if no body
        if (!node.value?.body) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@timeout-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect I/O operations in method body
        const operations = detectIOOperations(node);

        if (operations.length > 0) {
          context.report({
            node,
            messageId: 'missingTimeout',
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
