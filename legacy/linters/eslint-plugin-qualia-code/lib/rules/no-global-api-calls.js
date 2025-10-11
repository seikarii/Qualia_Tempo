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
     * 
     * CRITICAL BUG FIX: TypeScript decorators are NOT included in the MethodDefinition's range.
     * They exist as separate AST nodes. We must check the decorators property directly,
     * not search backwards in the text.
     * 
     * IMPLEMENTATION:
     * 1. Traverse UP the AST to find the enclosing MethodDefinition or FunctionDeclaration
     * 2. Check the node's `decorators` array for a decorator named 'BrowserOnly'
     * 3. If not in decorators array, fall back to text search (for edge cases)
     */
    function isInBrowserOnlyContext(node) {
      let current = node;
      
      // Traverse up the AST to find the enclosing method/function
      while (current) {
        if (current.type === 'MethodDefinition' || 
            current.type === 'FunctionDeclaration') {
          
          // METHOD 1: Check the AST decorators array (most reliable)
          if (current.decorators && Array.isArray(current.decorators)) {
            for (const decorator of current.decorators) {
              // Decorator structure: { expression: { callee: { name: 'BrowserOnly' } } }
              // Or for decorators without parens: { expression: { name: 'BrowserOnly' } }
              const decoratorName = decorator.expression?.callee?.name || decorator.expression?.name;
              if (decoratorName === 'BrowserOnly') {
                return true;
              }
            }
          }
          
          // METHOD 2: Fallback to text search (for edge cases where AST doesn't capture decorators)
          // This can happen with experimental TypeScript features or parser limitations
          const sourceCode = context.getSourceCode();
          
          // Get the full text of the method including leading comments and decorators
          // We need to look at the tokens BEFORE the method definition
          const methodToken = sourceCode.getFirstToken(current);
          if (methodToken) {
            const tokensBefore = sourceCode.getTokensBefore(methodToken, { count: 20 });
            for (const token of tokensBefore) {
              if (token.type === 'Identifier' && token.value === 'BrowserOnly') {
                return true;
              }
            }
          }
          
          // No decorator found - this is a violation
          return false;
        }
        current = current.parent;
      }
      
      // Not inside any method - this is top-level code (also a violation)
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
            // CRITICAL FIX: Skip identifiers that are property names in MemberExpressions
            // Example: this.timerService.setTimeout() - "setTimeout" here is a PROPERTY NAME, not a global API reference
            // Only flag direct global references like: setTimeout() or window.location
            if (node.parent.type === 'MemberExpression' && node.parent.property === node) {
              // This is a property access like obj.setTimeout - NOT a global API call
              // The object could be an injected service (correct pattern)
              return;
            }
            
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
