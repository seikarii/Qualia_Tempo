/**
 * @fileoverview DEPRECATED - Functionality superseded by semantic rules
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ DEPRECATED - Replaced by enforce-async-on-heavy-methods + enforce-stateless-view-logic
 * UPGRADED: Session 34 - Deprecated per Senior Architect audit
 * 
 * DEPRECATION RATIONALE:
 * - Nested loop detection now handled by analyzeMethodComplexity() in enforce-async-on-heavy-methods
 * - Render path analysis now handled by enforce-stateless-view-logic
 * - This rule's shallow analysis is redundant with semantic complexity scoring
 */
'use strict';

module.exports = {
  meta: {
    type: 'warning',
    docs: { 
      description: 'DEPRECATED: Use enforce-async-on-heavy-methods and enforce-stateless-view-logic instead',
      category: 'QUALIA.CODE - Performance', 
      recommended: false,
      deprecated: true
    },
    deprecated: true,
    schema: [],
    messages: {
      deprecated: `DEPRECATED: This rule has been superseded by semantic analysis.

Use instead:
- enforce-async-on-heavy-methods: For complexity analysis (including nested loops)
- enforce-stateless-view-logic: For React render path concerns

This rule will be removed in the next major version.`
    }
  },
  create(context) {
    // Rule disabled - report deprecation warning only once per file
    return {
      Program(node) {
        // No-op: rule is deprecated and disabled
        // Violations will be caught by the superseding rules
      }
    };
  }
};
