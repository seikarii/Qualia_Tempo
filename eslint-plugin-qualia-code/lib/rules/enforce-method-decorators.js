/**
 * @fileoverview SALA: Service method decorator enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @logMethod on all public service methods', category: 'QUALIA.CODE - Observability', recommended: true },
    schema: [],
    messages: {
      missingLogMethod: 'QUALIA.CODE §6: Public method "{{method}}" in service lacks @logMethod decorator. Required for observability.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    // Exclude non-service files, Providers, and Composition Roots (special bootstrap classes)
    if (!filename.includes('/services/') || 
        filename.includes('Provider.ts') ||
        filename.includes('CompositionRoot.ts') ||
        filename.includes('inversify.config.ts')) {
      return {};
    }

    return {
      MethodDefinition(node) {
        if (!node.key.name || node.key.name.startsWith('_')) return;
        if (node.accessibility === 'private' || node.accessibility === 'protected') return;
        
        // CRITICAL: Skip constructors - they should NOT have @logMethod
        if (node.kind === 'constructor') return;

        // Check for @logMethod decorator
        // CRITICAL: Handle both syntaxes:
        //   - @logMethod (without parens): d.expression.name === 'logMethod'
        //   - @logMethod() (with parens): d.expression.callee.name === 'logMethod'
        const hasLogMethod = node.decorators?.some(d => {
          const decoratorName = d.expression?.callee?.name || d.expression?.name;
          return decoratorName === 'logMethod';
        });
        
        // Also check for @logMethod-exempt comment (hot path optimization)
        const sourceCode = context.getSourceCode();
        const comments = sourceCode.getCommentsBefore(node);
        const hasExemption = comments.some(c => c.value.includes('@logMethod-exempt'));
        
        if (!hasLogMethod && !hasExemption && node.value?.body) {
          context.report({ node, messageId: 'missingLogMethod', data: { method: node.key.name } });
        }
      }
    };
  }
};
