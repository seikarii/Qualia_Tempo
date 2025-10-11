/**
 * @fileoverview SALA: Semantic State Mutation Detection & Mutex Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes method body for state mutations
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectStateMutations } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: { 
      description: 'Enforce @mutex on state mutation methods using semantic body analysis', 
      category: 'QUALIA.CODE - Concurrency', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingMutex: `QUALIA.CODE §6: Method "{{method}}" mutates shared state without @mutex decorator.

State mutations detected:
{{mutations}}

Risk: Concurrent access to shared state can cause race conditions and data corruption.

Required: Add @mutex decorator to ensure atomic state updates.`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Skip if already has @mutex decorator - handle both syntaxes
        const hasMutex = node.decorators?.some(d => 
          d.expression?.callee?.name === 'mutex' || d.expression?.name === 'mutex'
        );
        if (hasMutex) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@mutex-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect state mutations in method body
        const mutations = detectStateMutations(node);

        if (mutations.length > 0) {
          context.report({
            node,
            messageId: 'missingMutex',
            data: {
              method: methodName,
              mutations: mutations.map(m => `• ${m.target}.${m.property}`).join('\n')
            }
          });
        }
      }
    };
  }
};
