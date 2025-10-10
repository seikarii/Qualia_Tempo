/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-method-decorators (Enhanced)
 * 
 * Intelligent enforcement of method decorators based on method complexity and type.
 * Requires @catchError on async methods that aren't simple getters.
 * Prohibits @catchError on simple synchronous getters for performance.
 * Suggests @retry on I/O operations for transient failure handling.
 * 
 * This enforces QUALIA.CODE sections 5.2.1, 6.4, and 8.1: Performance-aware decorator usage and error recovery
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Intelligently enforce method decorators based on method complexity and performance impact',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingLogMethod: 'Public methods in services must use @logMethod() decorator.',
      missingCatchError: 'Public async methods that aren\'t simple getters must use @catchError() decorator for proper error boundaries.',
      unnecessaryCatchError: 'Simple synchronous getters should NOT use @catchError() - it adds unnecessary performance overhead. (Section 8.1)',
      performanceWarning: 'Consider removing @catchError from simple getter for better performance on hot paths.',
      advisoryRetry: 'ADVISORY: Method "{{methodName}}" appears to perform I/O operations. Consider adding @retry decorator for automatic transient failure handling (QUALIA.CODE §6.4).'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

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

    function hasPerformanceOptimizationComment(node) {
      // Check if method has a JSDoc comment with @performance or mentions hot-path optimization
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@performance') ||
               text.includes('hot-path') ||
               text.includes('hot path') ||
               text.includes('performance optimized') ||
               text.includes('no @logmethod') ||
               text.includes('performance characteristics');
      });
    }

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
      const exemptMethods = ['constructor', 'start', 'stop', 'initialize', 'shutdown', 'destroy'];
      if (exemptMethods.includes(node.key?.name)) {
        return false;
      }

      return true;
    }

    function isSimpleGetter(node) {
      const methodName = node.key?.name;
      
      // Check if it starts with 'get' or 'is'
      if (!methodName || (!methodName.startsWith('get') && !methodName.startsWith('is'))) {
        return false;
      }

      // Check if method body is simple (single return statement)
      if (!node.value?.body?.body || node.value.body.body.length !== 1) {
        return false;
      }

      const firstStatement = node.value.body.body[0];
      if (firstStatement.type !== 'ReturnStatement') {
        return false;
      }

      // Check if it's returning a simple property access (this.property)
      const returnExpression = firstStatement.argument;
      if (returnExpression?.type === 'MemberExpression' && 
          returnExpression.object?.type === 'ThisExpression') {
        return true;
      }

      return false;
    }

    function isAsyncMethod(node) {
      return node.value?.async === true;
    }

    function isIoOperation(node) {
      if (!node.value?.body) return false;
      
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      
      // I/O operation indicators
      const ioPatterns = [
        /\.fetch\(|fetch\(/,              // HTTP requests
        /\.get\(|\.post\(|\.put\(|\.delete\(/,  // HTTP methods
        /HttpService|httpService/,        // HttpService usage
        /\.request\(/,                    // Request methods
        /axios\.|fetch\(/,                // HTTP libraries
        /\.load\(|\.save\(|\.read\(|\.write\(/,  // File I/O
        /localStorage\.|sessionStorage\./, // Storage I/O
        /\.connect\(|\.disconnect\(/,     // Connection operations
        /WebSocket|websocket/,            // WebSocket operations
      ];
      
      return ioPatterns.some(pattern => pattern.test(methodText));
    }

    return {
      MethodDefinition(node) {
        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip TypeScript overload declarations (they don't have a body)
        if (!node.value?.body) {
          return;
        }

        // Only check public methods
        if (!isPublicMethod(node)) {
          return;
        }

        const hasLogMethod = hasDecorator(node, 'logMethod');
        const hasCatchError = hasDecorator(node, 'catchError');
        const hasRetry = hasDecorator(node, 'retry');
        const isAsync = isAsyncMethod(node);
        const isGetter = isSimpleGetter(node);
        const hasPerformanceExemption = hasPerformanceOptimizationComment(node);
        const isIo = isIoOperation(node);

        // Rule 1: All public methods must have @logMethod() UNLESS explicitly documented as hot-path
        // QUALIA.CODE §11: Performance-critical methods may omit decorators with documentation
        if (!hasLogMethod && !hasPerformanceExemption) {
          context.report({
            node,
            messageId: 'missingLogMethod'
          });
        }

        // Rule 2: Async methods that aren't simple getters must have @catchError()
        if (isAsync && !isGetter && !hasCatchError) {
          context.report({
            node,
            messageId: 'missingCatchError'
          });
        }

        // Rule 3: Simple synchronous getters should NOT have @catchError()
        if (!isAsync && isGetter && hasCatchError) {
          context.report({
            node,
            messageId: 'unnecessaryCatchError'
          });
        }

        // Rule 4 (ADVISORY): I/O operations should consider @retry for transient failures
        // This is a warning, not an error - allows developer discretion
        if (isAsync && isIo && !hasRetry) {
          context.report({
            node,
            messageId: 'advisoryRetry',
            data: {
              methodName: node.key.name
            }
          });
        }
      }
    };
  }
};