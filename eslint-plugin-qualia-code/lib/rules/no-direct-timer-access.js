/**
 * @fileoverview SALA: Context-aware timer API detection
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Architectural layer analysis (services vs providers/decorators)
 * - Whitelist for infrastructure code
 * - Suggests ITimerService injection
 * 
 * QUALIA.CODE REFERENCE: §4
 */

'use strict';

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prevent direct timer API usage in services layer',
      category: 'QUALIA.CODE - Platform Abstraction',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#4'
    },
    fixable: null,
    schema: [],
    messages: {
      noDirectTimer: `QUALIA.CODE §4 VIOLATION: Direct use of '{{api}}' in services layer.

WHY: Platform abstraction violation. Direct timer access prevents testing and control.

PROHIBITED PATTERN:
  setTimeout(() => { /* ... */ }, 1000); // ❌ In *Service.ts

CORRECT PATTERN:
  constructor(@inject(TYPES.ITimerService) private timer: ITimerService) {}
  this.timer.setTimeout(() => { /* ... */ }, 1000); // ✅

Consult QUALIA.MANUAL.md for ITimerService usage patterns.`
    }
  },

  create(context) {
    const filename = context.getFilename();

    const isInfrastructure = filename.includes('decorators') ||
                            filename.includes('Provider.ts') ||
                            filename.includes('providers/') ||
                            filename.includes('.test.') ||
                            filename.includes('.spec.') ||
                            filename.includes('setup.ts') ||
                            filename.includes('performance-profiler');

    if (isInfrastructure) return {};

    const isServicesLayer = filename.includes('src/services') &&
                           !filename.includes('Provider.ts') &&
                           !filename.includes('providers/');

    if (!isServicesLayer) return {};

    const timerApis = ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 
                      'requestAnimationFrame', 'cancelAnimationFrame'];

    return {
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && timerApis.includes(node.callee.name)) {
          context.report({
            node,
            messageId: 'noDirectTimer',
            data: { api: node.callee.name }
          });
        }
      }
    };
  }
};
