/**
 * @fileoverview SALA: Semantic Heavy Computation Detection & Async Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Uses complexity scoring with TypeChecker analysis
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { requireTypeChecker, analyzeMethodComplexity } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'warning',
    docs: { 
      description: 'Enforce async on computationally heavy methods using semantic complexity analysis', 
      category: 'QUALIA.CODE - Performance', 
      recommended: true 
    },
    schema: [],
    messages: {
      shouldBeAsync: `QUALIA.CODE §9: Method "{{method}}" has high computational complexity (score: {{score}}).
Should be async to prevent blocking the main thread (16.67ms budget for 60 FPS).

Complexity analysis:
{{reasons}}

Recommendation: Make method async and use requestIdleCallback or Web Worker for heavy computation.`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    // Try to get TypeChecker, fallback to name-based heuristic if unavailable
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // Graceful degradation: use name-based heuristic if TypeChecker unavailable
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;

    return {
      MethodDefinition(node) {
        // Skip if already async
        if (node.value?.async) return;
        if (!node.value?.body) return;

        const methodName = node.key.name || 'anonymous';

        // Check for exemption comments
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@async-exempt|@worker|@background/i.test(c.value))) {
          return;
        }

        // Perform semantic complexity analysis
        const analysis = analyzeMethodComplexity(node, checker, tsNodeMap);

        // Thresholds:
        // < 50: Low complexity, no action
        // 50-100: Medium complexity, warning
        // > 100: High complexity, must be async
        if (analysis.score >= 100) {
          context.report({
            node,
            messageId: 'shouldBeAsync',
            data: {
              method: methodName,
              score: analysis.score.toString(),
              reasons: analysis.reasons.join('\n• ')
            }
          });
        }
      }
    };
  }
};

/**
 * Fallback rule when TypeChecker is unavailable
 * Uses simple heuristics but marks limitation in error message
 */
function createFallbackRule(context) {
  return {
    MethodDefinition(node) {
      if (node.value?.async) return;
      if (!node.value?.body) return;

      const methodName = node.key.name || '';
      const bodyLength = node.value.body.body?.length || 0;
      
      // Simple heuristics when TypeChecker unavailable
      const isHeavy = bodyLength > 50 || 
                      methodName.match(/(calculate|compute|process|generate|transform|render)/i);

      if (isHeavy) {
        context.report({
          node,
          messageId: 'shouldBeAsync',
          data: {
            method: methodName,
            score: 'estimated high',
            reasons: 'TypeChecker unavailable - using name/length heuristic'
          }
        });
      }
    }
  };
}
