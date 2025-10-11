/**
 * @fileoverview SALA: Performance anti-pattern detection
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ⚠️ PRIMITIVE - Shallow loop analysis. MUST MERGE into enforce-async-on-heavy-methods with robust complexity scoring
 * AUDIT NOTE (Senior Architect): "MAL. Similar a la anterior, su análisis es superficial"
 */
'use strict';
module.exports = {
  meta: {
    type: 'warning',
    docs: { description: 'Enforce performance best practices', category: 'QUALIA.CODE - Performance', recommended: true },
    schema: [],
    messages: {
      syncInRender: 'QUALIA.CODE §9: Synchronous heavy operation in render path. Move to useEffect or async handler.',
      nestedLoops: 'QUALIA.CODE §9: Nested loops detected (O(n²+)). Consider optimization or caching.',
      nonMemoizedCallback: 'QUALIA.CODE §9: Callback prop without useCallback. May cause unnecessary re-renders.'
    }
  },
  create(context) {
    return {
      FunctionExpression(node) {
        const parent = context.getAncestors().reverse().find(a => a.type === 'MethodDefinition' || a.type === 'FunctionDeclaration');
        const isRenderMethod = parent?.key?.name === 'render' || parent?.name?.name?.startsWith('use');

        if (!isRenderMethod) return;

        let loopDepth = 0;
        node.body.body.forEach(stmt => {
          if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement') {
            loopDepth++;
            if (loopDepth > 1) {
              context.report({ node: stmt, messageId: 'nestedLoops' });
            }
          }
        });
      }
    };
  }
};
