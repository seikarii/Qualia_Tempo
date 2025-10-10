/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-retry-on-io-operations
 * 
 * Enforces @retry decorator on methods performing I/O operations for automatic
 * transient failure handling. This rule makes mandatory what enforce-method-decorators
 * only suggests as advisory.
 * 
 * Rationale (QUALIA.CODE §5.2.1, §6.4):
 * Network operations are inherently unreliable. Transient failures (timeouts, connection drops,
 * server errors 5xx) are common. Manual retry logic is error-prone and inconsistent.
 * The @retry decorator provides centralized, exponential-backoff retry logic.
 * 
 * Detects I/O operations by analyzing method bodies for:
 * - HTTP requests (fetch, HttpService, axios)
 * - WebSocket operations (connect, send, disconnect)
 * - Storage operations (localStorage, sessionStorage)
 * - File I/O (load, save, read, write)
 * - Backend sync operations (BackendSyncService)
 * 
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforce @retry decorator on methods performing I/O operations for automatic transient failure handling',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingRetry: 'QUALIA.CODE §6.4: Method "{{methodName}}" performs I/O operations ({{operations}}) but lacks @retry decorator. Network operations require automatic retry logic for transient failures.',
      retryExemptionUndocumented: 'Method "{{methodName}}" performs I/O but has no @retry decorator. If retry is intentionally omitted, document with @retry-exempt comment explaining why.',
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    /**
     * Check if node has @retry decorator
     */
    function hasRetryDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === 'retry';
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === 'retry';
        }
        return false;
      });
    }

    /**
     * Check if method has @retry-exempt comment
     */
    function hasRetryExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@retry-exempt') ||
               text.includes('retry: exempt') ||
               text.includes('no retry needed') ||
               text.includes('retry intentionally omitted');
      });
    }

    /**
     * Check if node is in a service class
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

      // Skip constructors and lifecycle methods
      const exemptMethods = ['constructor', 'initialize', 'start', 'stop', 'shutdown', 'destroy', 'dispose', 'cleanup'];
      if (exemptMethods.includes(node.key?.name)) {
        return false;
      }

      return true;
    }

    /**
     * Detect I/O operations in method body
     * Returns: { isIo: boolean, operations: string[] }
     */
    function analyzeIoOperations(node) {
      if (!node.value?.body) {
        return { isIo: false, operations: [] };
      }
      
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      
      // I/O operation patterns with labels
      const ioPatterns = [
        { pattern: /\.fetch\(|fetch\(/, label: 'fetch()' },
        { pattern: /\.get\(/, label: 'HTTP GET' },
        { pattern: /\.post\(/, label: 'HTTP POST' },
        { pattern: /\.put\(/, label: 'HTTP PUT' },
        { pattern: /\.delete\(/, label: 'HTTP DELETE' },
        { pattern: /HttpService|httpService/, label: 'HttpService' },
        { pattern: /\.request\(/, label: 'HTTP request' },
        { pattern: /axios\./, label: 'axios' },
        { pattern: /\.load\(/, label: 'load()' },
        { pattern: /\.save\(/, label: 'save()' },
        { pattern: /\.read\(/, label: 'read()' },
        { pattern: /\.write\(/, label: 'write()' },
        { pattern: /localStorage\./, label: 'localStorage' },
        { pattern: /sessionStorage\./, label: 'sessionStorage' },
        { pattern: /\.connect\(/, label: 'connect()' },
        { pattern: /\.disconnect\(/, label: 'disconnect()' },
        { pattern: /\.send\(/, label: 'send()' },
        { pattern: /WebSocket|webSocket|websocket/, label: 'WebSocket' },
        { pattern: /BackendSyncService|backendSyncService/, label: 'BackendSyncService' },
        { pattern: /\.sync\(/, label: 'sync()' },
      ];
      
      const detectedOperations = [];
      for (const { pattern, label } of ioPatterns) {
        if (pattern.test(methodText)) {
          detectedOperations.push(label);
        }
      }
      
      return {
        isIo: detectedOperations.length > 0,
        operations: detectedOperations
      };
    }

    return {
      MethodDefinition(node) {
        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip TypeScript overload declarations (no body)
        if (!node.value?.body) {
          return;
        }

        // Only check public methods
        if (!isPublicMethod(node)) {
          return;
        }

        // Analyze for I/O operations
        const { isIo, operations } = analyzeIoOperations(node);

        if (!isIo) {
          return; // Not an I/O operation, no @retry needed
        }

        const hasRetry = hasRetryDecorator(node);
        const hasExemption = hasRetryExemption(node);

        // If method performs I/O but lacks @retry and has no exemption, report error
        if (!hasRetry && !hasExemption) {
          context.report({
            node,
            messageId: 'missingRetry',
            data: {
              methodName: node.key.name,
              operations: operations.join(', ')
            }
          });
        }

        // If method has exemption but no @retry, this is acceptable (documented decision)
        // No report needed
      }
    };
  }
};
