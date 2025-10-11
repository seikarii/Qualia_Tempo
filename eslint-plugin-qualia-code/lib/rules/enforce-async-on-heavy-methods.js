/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-async-on-heavy-methods
 * 
 * Flags synchronous methods that appear to perform CPU-intensive operations
 * and should be made async or offloaded to Web Workers to avoid blocking the main thread.
 * 
 * Rationale (QUALIA.CODE §8.1, ANALISIS.md §2.1 item #1):
 * Synchronous heavy computation blocks the main thread at 60 FPS (16.67ms budget).
 * Methods with loops, recursion, large array operations, or mathematical computations
 * should be async to allow yielding control back to the event loop or use Web Workers.
 * 
 * Detection heuristics:
 * - For loops iterating over potentially large datasets
 * - Recursive function calls
 * - Array methods on large collections (.map, .filter, .reduce, .sort)
 * - Heavy mathematical operations (matrix math, vector operations, physics calculations)
 * - String processing on large inputs (.split, .replace, regex operations)
 * - JSON.parse/stringify on potentially large objects
 * 
 * Exemptions:
 * - Methods already marked async
 * - Methods with @performance or @hot-path comments (explicitly optimized)
 * - Methods with "fast" or "simple" in their name (indicating intentionally simple operations)
 * - Private methods (internal optimization decision)
 * - Getter methods (expected to be synchronous)
 * 
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Flag synchronous methods that perform CPU-intensive operations and should be async or use Workers',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      heavyComputation: 'PERFORMANCE: Method "{{methodName}}" performs CPU-intensive operations ({{operations}}) but is synchronous. Consider making it async or offloading to Web Worker to avoid blocking main thread (60 FPS = 16.67ms budget).',
      considerWorker: 'PERFORMANCE: Method "{{methodName}}" has heavy computation patterns. Consider using Web Worker for background processing.',
      asyncSuggestion: 'PERFORMANCE: Synchronous method "{{methodName}}" may block rendering. Consider refactoring to async or Worker-based implementation.'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    /**
     * Check if method is already async
     */
    function isAsyncMethod(node) {
      return node.value?.async === true;
    }

    /**
     * Check if method has performance optimization comment
     */
    function hasPerformanceExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@performance') ||
               text.includes('@hot-path') ||
               text.includes('hot path') ||
               text.includes('performance optimized') ||
               text.includes('intentionally sync') ||
               text.includes('fast operation');
      });
    }

    /**
     * Check if method name suggests it's intentionally simple/fast
     */
    function isIntentionallySimple(node) {
      const methodName = node.key?.name || '';
      const simpleIndicators = ['get', 'is', 'has', 'can', 'should', 'fast', 'simple', 'quick'];
      return simpleIndicators.some(indicator => methodName.toLowerCase().startsWith(indicator));
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
     * Check if node is in a platform abstraction service
     * These services MUST be synchronous wrappers around browser APIs
     */
    function isInPlatformAbstractionService(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'ClassDeclaration') {
          const className = parent.id?.name;
          const platformAbstractionServices = [
            'TimerService',
            'PerformanceService',
            'PerformanceProvider',
            'BrowserTimerProvider',
            'HttpService',  // Thin wrapper around fetch
            'WebSocketService',  // Wrapper around WebSocket API
          ];
          if (className && platformAbstractionServices.includes(className)) {
            return true;
          }
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

      // Skip constructors
      if (node.key?.name === 'constructor') {
        return false;
      }

      return true;
    }

    /**
     * Analyze method for CPU-intensive operations
     * Returns: { isHeavy: boolean, operations: string[], severity: 'high' | 'medium' | 'low' }
     */
    function analyzeComputationalComplexity(node) {
      if (!node.value?.body) {
        return { isHeavy: false, operations: [], severity: 'low' };
      }
      
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      
      const detectedOperations = [];
      let severityScore = 0;

      // High-severity patterns (definite performance concerns)
      const highSeverityPatterns = [
        { pattern: /for\s*\(/g, label: 'for loop', score: 2 },
        { pattern: /while\s*\(/g, label: 'while loop', score: 2 },
        { pattern: /\.forEach\(/g, label: '.forEach()', score: 1 },
        { pattern: /\.map\(/g, label: '.map()', score: 1 },
        { pattern: /\.filter\(/g, label: '.filter()', score: 1 },
        { pattern: /\.reduce\(/g, label: '.reduce()', score: 2 },
        { pattern: /\.sort\(/g, label: '.sort()', score: 3 }, // O(n log n)
        { pattern: /JSON\.parse\(/g, label: 'JSON.parse()', score: 2 },
        { pattern: /JSON\.stringify\(/g, label: 'JSON.stringify()', score: 2 },
      ];

      // Medium-severity patterns (potential concerns with large data)
      const mediumSeverityPatterns = [
        { pattern: /\.find\(/g, label: '.find()', score: 1 },
        { pattern: /\.some\(/g, label: '.some()', score: 1 },
        { pattern: /\.every\(/g, label: '.every()', score: 1 },
        { pattern: /\.split\(/g, label: '.split()', score: 1 },
        { pattern: /\.join\(/g, label: '.join()', score: 1 },
        { pattern: /\.replace\(/g, label: '.replace()', score: 1 },
        { pattern: /new RegExp\(/g, label: 'RegExp construction', score: 1 },
      ];

      // Mathematical/physics computation patterns
      const mathPatterns = [
        { pattern: /Math\.(sin|cos|tan|sqrt|pow|exp|log)/g, label: 'Math operations', score: 1 },
        { pattern: /matrix|Matrix/g, label: 'matrix operations', score: 3 },
        { pattern: /vector|Vector/g, label: 'vector operations', score: 2 },
        { pattern: /physics|Physics/g, label: 'physics calculations', score: 2 },
        { pattern: /calculate|Calculate/g, label: 'calculations', score: 1 },
        { pattern: /compute|Compute/g, label: 'computations', score: 1 },
        { pattern: /transform|Transform/g, label: 'transformations', score: 1 },
      ];

      // Recursive patterns
      const recursivePattern = new RegExp(`\\b${node.key?.name}\\s*\\(`, 'g');
      if (recursivePattern.test(methodText)) {
        detectedOperations.push('recursion');
        severityScore += 3;
      }

      // Analyze all patterns
      const allPatterns = [...highSeverityPatterns, ...mediumSeverityPatterns, ...mathPatterns];
      for (const { pattern, label, score } of allPatterns) {
        const matches = methodText.match(pattern);
        if (matches) {
          detectedOperations.push(label);
          severityScore += score * matches.length;
        }
      }

      // Determine if it's "heavy" based on severity score
      // Threshold: score >= 3 indicates heavy computation
      const isHeavy = severityScore >= 3;
      const severity = severityScore >= 5 ? 'high' : severityScore >= 3 ? 'medium' : 'low';

      return {
        isHeavy,
        operations: [...new Set(detectedOperations)], // Remove duplicates
        severity,
        score: severityScore
      };
    }

    return {
      MethodDefinition(node) {
        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip platform abstraction services (MUST be synchronous)
        if (isInPlatformAbstractionService(node)) {
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

        // Skip if already async
        if (isAsyncMethod(node)) {
          return;
        }

        // Skip if intentionally simple
        if (isIntentionallySimple(node)) {
          return;
        }

        // Skip if has performance exemption
        if (hasPerformanceExemption(node)) {
          return;
        }

        // Analyze computational complexity
        const { isHeavy, operations, severity, score } = analyzeComputationalComplexity(node);

        if (!isHeavy || operations.length === 0) {
          return; // Not heavy, no action needed
        }

        // Report based on severity
        const methodName = node.key?.name || 'unknown';

        if (severity === 'high' && score >= 8) {
          // Very heavy - strongly suggest Worker
          context.report({
            node,
            messageId: 'considerWorker',
            data: {
              methodName
            }
          });
        } else if (severity === 'high' || severity === 'medium') {
          // Heavy - suggest async or Worker
          context.report({
            node,
            messageId: 'heavyComputation',
            data: {
              methodName,
              operations: operations.join(', ')
            }
          });
        }
      }
    };
  }
};
