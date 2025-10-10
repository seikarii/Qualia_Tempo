/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-timeout-on-async-operations
 * 
 * Enforces timeout protection on async operations to prevent indefinite hanging.
 * 
 * Rationale (QUALIA.CODE §5.2, ANALISIS.md §2.1 item #4):
 * Async operations (network requests, file I/O, external APIs) can hang indefinitely
 * due to network issues, unresponsive servers, or deadlocks. Without timeout enforcement,
 * the application can become unresponsive, degrading user experience.
 * 
 * Detection strategy:
 * - Async methods performing I/O operations (fetch, HTTP, WebSocket, file operations)
 * - Methods calling external services or APIs
 * - Long-running async computations
 * 
 * Exemptions:
 * - Methods with @timeout decorator
 * - Methods with explicit timeout logic (AbortController, Promise.race with timeout)
 * - Event loops and listeners (intentionally long-lived)
 * - Methods with @no-timeout comment (documented exemption)
 * 
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce timeout protection on async operations to prevent indefinite hanging',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingTimeout: 'QUALIA.CODE §5.2: Async method "{{methodName}}" performs I/O operations ({{operations}}) but lacks timeout protection. Add @timeout decorator or implement explicit timeout logic with AbortController/Promise.race.',
      timeoutExemptionUndocumented: 'Method "{{methodName}}" performs async I/O without timeout. If timeout is intentionally omitted (e.g., event loop), document with @no-timeout comment explaining why.',
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    /**
     * Check if a node has a specific decorator
     */
    function hasDecorator(node, decoratorName) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === decoratorName;
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === decoratorName;
        }
        return false;
      });
    }

    /**
     * Check if method has timeout exemption comment
     */
    function hasTimeoutExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@no-timeout') ||
               text.includes('@timeout-exempt') ||
               text.includes('timeout: exempt') ||
               text.includes('no timeout needed');
      });
    }

    /**
     * Check if method has explicit timeout logic in its body
     */
    function hasExplicitTimeoutLogic(node) {
      if (!node.value?.body?.body) {
        return false;
      }

      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);

      // Check for explicit timeout patterns
      const timeoutPatterns = [
        /AbortController/,
        /AbortSignal/,
        /signal:/,
        /Promise\.race\(/,
        /setTimeout.*throw/,
        /timeout.*reject/,
        /new\s+Promise.*timeout/i,
      ];

      return timeoutPatterns.some(pattern => pattern.test(methodText));
    }

    /**
     * Detect I/O operations in method body
     */
    function detectIOOperations(node) {
      if (!node.value?.body?.body) {
        return [];
      }

      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      const operations = [];

      // HTTP operations
      if (/\b(fetch|axios)\s*\.\s*(get|post|put|delete|request)/.test(methodText) || 
          /\bfetch\s*\(/.test(methodText) ||
          /\bhttp\s*\.\s*(get|post|put|delete)/.test(methodText)) {
        operations.push('HTTP request');
      }

      // Service calls that typically involve I/O
      if (/this\.(httpService|webSocketService|backendSyncService|configurationService)\./.test(methodText)) {
        operations.push('Service I/O call');
      }

      // WebSocket operations
      if (/\.(send|connect|disconnect|close)\s*\(/.test(methodText) && /websocket/i.test(methodText)) {
        operations.push('WebSocket operation');
      }

      // File/Storage operations
      if (/\b(localStorage|sessionStorage|indexedDB|FileReader|fetch)\./.test(methodText)) {
        operations.push('Storage/File operation');
      }

      // External API calls (improved pattern)
      if (/\.(apiClient|api|client)\s*\.\s*(get|post|put|delete|request|call)\s*\(/.test(methodText)) {
        operations.push('External API call');
      }

      // Await on potentially long operations
      if (/await\s+this\.\w+\.(load|fetch|sync|connect|request)/.test(methodText)) {
        operations.push('Awaited I/O operation');
      }

      return operations;
    }

    /**
     * Check if method is an event loop or listener (intentionally long-lived)
     */
    function isEventLoopOrListener(node) {
      const methodName = node.key?.name || '';
      
      // Common event loop/listener patterns
      const longLivedPatterns = [
        /^(start|run|listen|watch|monitor|poll)/i,
        /Loop$/,
        /Listener$/,
        /Handler$/,
      ];

      if (longLivedPatterns.some(pattern => pattern.test(methodName))) {
        return true;
      }

      // Check if method body has infinite loop or event listener
      if (!node.value?.body?.body) {
        return false;
      }

      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);

      return /while\s*\(\s*true\s*\)/.test(methodText) ||
             /for\s*\(\s*;;\s*\)/.test(methodText) ||
             /addEventListener/.test(methodText);
    }

    /**
     * Check if method is in a service class
     */
    function isInServiceClass(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'ClassDeclaration' && parent.id?.name?.endsWith('Service')) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }

    /**
     * Check if method is public
     */
    function isPublicMethod(node) {
      // Skip private/protected methods
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }

      // Skip underscore-prefixed methods (private convention)
      if (node.key?.name?.startsWith('_')) {
        return false;
      }

      return true;
    }

    return {
      MethodDefinition(node) {
        // Only check public methods in service classes
        if (!isInServiceClass(node) || !isPublicMethod(node)) {
          return;
        }

        // Only check async methods
        if (!node.value?.async) {
          return;
        }

        const methodName = node.key?.name || 'anonymous';

        // Skip if method has @timeout decorator
        if (hasDecorator(node, 'timeout')) {
          return;
        }

        // Skip if method has explicit timeout logic
        if (hasExplicitTimeoutLogic(node)) {
          return;
        }

        // Skip if method is event loop/listener (documented exemption)
        if (isEventLoopOrListener(node)) {
          return;
        }

        // Skip if method has timeout exemption comment
        if (hasTimeoutExemption(node)) {
          return;
        }

        // Detect I/O operations
        const ioOperations = detectIOOperations(node);

        if (ioOperations.length > 0) {
          context.report({
            node,
            messageId: 'missingTimeout',
            data: {
              methodName,
              operations: ioOperations.join(', ')
            }
          });
        }
      }
    };
  }
};
