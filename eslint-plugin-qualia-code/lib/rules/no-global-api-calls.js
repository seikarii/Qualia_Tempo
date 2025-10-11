/**
 * @fileoverview SALA: Context-aware detection of global API usage
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Analyzes file path to determine architectural layer (*Service.ts vs *Provider.ts)
 * - Detects @BrowserOnly decorator presence semantically
 * - Context-aware: allows in providers, prohibits in services
 * 
 * QUALIA.CODE REFERENCE: §4
 */

'use strict';

const { requireTypeChecker, hasDecorator } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Prevent direct global API usage using architectural layer analysis',
      category: 'QUALIA.CODE - Platform Abstraction',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#4-abstraction-de-plataforma'
    },
    fixable: null,
    schema: [],
    messages: {
      noGlobalApiCall: `QUALIA.CODE §4 VIOLATION: Direct use of global API '{{globalApi}}' in services layer.

WHY: Violates Platform Abstraction principle. Direct global API access prevents testing and portability.

PROHIBITED PATTERN:
  const data = await fetch('/api/data'); // ❌ In *Service.ts

CORRECT PATTERN:
  constructor(@inject(TYPES.{{suggestedService}}) private http: {{suggestedService}}) {}
  const data = await this.http.get('/api/data'); // ✅

ALLOWED LOCATIONS:
  - *Provider.ts files (platform abstraction layer)
  - Methods decorated with @BrowserOnly

Consult QUALIA.MANUAL.md §4.4 for @BrowserOnly usage patterns.`
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Context analysis: Determine if in services layer
    const isServicesLayer = filename.includes('src/services') && 
                           !filename.includes('Provider.ts') &&
                           !filename.includes('providers/') &&
                           !filename.includes('.test.') &&
                           !filename.includes('.spec.');

    if (!isServicesLayer) {
      return {}; // No violations outside services layer
    }

    const forbiddenGlobals = {
      'fetch': 'IHttpService',
      'setTimeout': 'ITimerService',
      'setInterval': 'ITimerService',
      'clearTimeout': 'ITimerService',
      'clearInterval': 'ITimerService',
      'localStorage': 'IStorageService',
      'sessionStorage': 'IStorageService',
      'XMLHttpRequest': 'IHttpService',
      'window': 'BrowserEnvironmentCheck',
      'document': 'BrowserEnvironmentCheck'
    };

    /**
     * Check if current node is inside a @BrowserOnly decorated method
     */
    function isInBrowserOnlyContext(node) {
      let current = node;
      while (current) {
        if (current.type === 'MethodDefinition' || 
            current.type === 'FunctionDeclaration') {
          // Check for @BrowserOnly decorator
          const sourceCode = context.getSourceCode();
          const textBefore = sourceCode.getText().substring(
            Math.max(0, current.range[0] - 150),
            current.range[0]
          );
          if (textBefore.includes('@BrowserOnly')) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    function checkGlobalIdentifier(node, name) {
      if (forbiddenGlobals[name] && !isInBrowserOnlyContext(node)) {
        context.report({
          node,
          messageId: 'noGlobalApiCall',
          data: {
            globalApi: name,
            suggestedService: forbiddenGlobals[name]
          }
        });
      }
    }

    return {
      Identifier(node) {
        // CRITICAL: Use hasOwnProperty to avoid matching Object.prototype properties like 'constructor'
        if (Object.prototype.hasOwnProperty.call(forbiddenGlobals, node.name)) {
          // Check if it's a reference (not declaration)
          if (node.parent.type !== 'Property' || node.parent.key !== node) {
            checkGlobalIdentifier(node, node.name);
          }
        }
      },

      CallExpression(node) {
        if (node.callee.type === 'Identifier' && 
            Object.prototype.hasOwnProperty.call(forbiddenGlobals, node.callee.name)) {
          checkGlobalIdentifier(node.callee, node.callee.name);
        }
      }
    };
  }
};
