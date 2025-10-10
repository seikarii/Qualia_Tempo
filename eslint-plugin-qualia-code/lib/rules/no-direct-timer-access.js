/**
 * @fileoverview Enforce use of ITimerService instead of direct timer API calls
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE COMPLIANCE: Platform Abstraction (§4)
 * 
 * This rule enforces that all timer operations (setTimeout, setInterval, etc.)
 * go through the injected ITimerService instead of direct platform API calls.
 * This ensures testability, portability, and architectural compliance.
 * 
 * FORBIDDEN PATTERNS:
 * - setTimeout(fn, delay)
 * - setInterval(fn, delay)
 * - window.setTimeout(fn, delay)
 * - globalThis.setTimeout(fn, delay)
 * - requestAnimationFrame(fn)
 * - cancelAnimationFrame(id)
 * - clearTimeout(id)
 * - clearInterval(id)
 * 
 * CORRECT PATTERNS:
 * - this.timerService.setTimeout(fn, delay)
 * - this.timerService.setInterval(fn, delay)
 * - this.timerService.requestAnimationFrame(fn)
 * 
 * EXEMPTIONS:
 * - Code within TimerProvider.ts (the legitimate platform wrapper)
 * - Code within timer.provider.ts
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce use of ITimerService instead of direct timer API calls',
      category: 'Architectural Compliance - Platform Abstraction',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#platform-abstraction'
    },
    messages: {
      directTimerAccess: 'Direct use of {{api}} is forbidden. Use injected ITimerService.{{method}}() instead. Platform APIs must be abstracted through services for testability and portability.'
    },
    schema: [],
    fixable: null
  },

  create(context) {
    const filename = context.getFilename();
    
    // Exempt TimerProvider files (legitimate platform wrappers)
    if (filename.endsWith('TimerProvider.ts') || filename.endsWith('timer.provider.ts')) {
      return {};
    }

    const FORBIDDEN_TIMER_APIS = {
      'setTimeout': 'setTimeout',
      'setInterval': 'setInterval',
      'clearTimeout': 'clearTimeout',
      'clearInterval': 'clearInterval',
      'requestAnimationFrame': 'requestAnimationFrame',
      'cancelAnimationFrame': 'cancelAnimationFrame'
    };

    return {
      CallExpression(node) {
        let apiName = null;
        let methodName = null;

        // Pattern 1: Direct call (setTimeout, setInterval, etc.)
        if (node.callee.type === 'Identifier' && FORBIDDEN_TIMER_APIS[node.callee.name]) {
          apiName = node.callee.name;
          methodName = FORBIDDEN_TIMER_APIS[apiName];
        }

        // Pattern 2: window.setTimeout, globalThis.setInterval, etc.
        if (node.callee.type === 'MemberExpression') {
          const objectName = node.callee.object.name;
          const propertyName = node.callee.property.name;

          if ((objectName === 'window' || objectName === 'globalThis') && 
              FORBIDDEN_TIMER_APIS[propertyName]) {
            apiName = `${objectName}.${propertyName}`;
            methodName = FORBIDDEN_TIMER_APIS[propertyName];
          }
        }

        // Report violation if detected
        if (apiName && methodName) {
          context.report({
            node,
            messageId: 'directTimerAccess',
            data: {
              api: apiName,
              method: methodName
            }
          });
        }
      }
    };
  }
};
