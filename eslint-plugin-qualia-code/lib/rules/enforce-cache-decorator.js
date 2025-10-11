/**
 * @fileoverview SALA: Semantic Expensive Operation Detection & Cache Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes getter body for expensive operations
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectExpensiveOperations, countNestedLoops } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'warning',
    docs: { 
      description: 'Enforce @cache on expensive pure methods using semantic body analysis', 
      category: 'QUALIA.CODE - Performance', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingCache: `QUALIA.CODE §6: Getter "{{method}}" performs expensive operations without @cache decorator.

Expensive operations detected:
{{operations}}

Performance Impact: Repeated calls will recalculate expensive results unnecessarily.

Required: Add @cache decorator for memoization (ensure getter is pure/side-effect-free).`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Only analyze getters
        if (node.kind !== 'get') return;

        // Skip if already has @cache decorator
        const hasCache = node.decorators?.some(d => d.expression?.callee?.name === 'cache');
        if (hasCache) return;

        // Skip if no body
        if (!node.value?.body) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@cache-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';
        const operations = [];

        // Detect expensive operations in getter body
        const expensiveOps = detectExpensiveOperations(node);
        if (expensiveOps.length > 0) {
          operations.push(`Expensive operations: ${expensiveOps.join(', ')}`);
        }

        // Detect loops (even simple loops in getters are expensive)
        const { totalLoops, maxNesting } = countNestedLoops(node);
        if (totalLoops > 0) {
          operations.push(`Contains ${totalLoops} loop(s) (nesting depth: ${maxNesting})`);
        }

        // Report if expensive operations detected
        if (operations.length > 0) {
          context.report({
            node,
            messageId: 'missingCache',
            data: {
              method: methodName,
              operations: operations.map(op => `• ${op}`).join('\n')
            }
          });
        }
      }
    };
  }
};
