/**
 * @fileoverview SALA: Semantic Privileged Operation Detection & Authorization Enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ FULLY SEMANTIC - Analyzes method body for privileged operations
 * UPGRADED: Session 34 - Complete semantic rewrite per Senior Architect audit
 */
'use strict';

const { detectPrivilegedOperations } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: { 
      description: 'Enforce @authorize on security-sensitive methods using semantic body analysis', 
      category: 'QUALIA.CODE - Security', 
      recommended: true 
    },
    schema: [],
    messages: {
      missingAuthorize: `QUALIA.CODE §6: Method "{{method}}" performs privileged operations without @authorize decorator.

Privileged operations detected:
{{operations}}

Security Risk: Unauthorized access to sensitive operations can compromise system integrity.

Required: Add @authorize(['role']) decorator with appropriate role validation.`
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      MethodDefinition(node) {
        // Skip if already has @authorize decorator
        const hasAuthorize = node.decorators?.some(d => d.expression?.callee?.name === 'authorize');
        if (hasAuthorize) return;

        // Skip if has exemption comment
        const comments = context.getSourceCode().getCommentsBefore(node);
        if (comments.some(c => /@authorize-exempt/i.test(c.value))) {
          return;
        }

        const methodName = node.key.name || 'anonymous';

        // Perform semantic analysis: detect privileged operations in method body
        const operations = detectPrivilegedOperations(node);

        if (operations.length > 0) {
          context.report({
            node,
            messageId: 'missingAuthorize',
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
