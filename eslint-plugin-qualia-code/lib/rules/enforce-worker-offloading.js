/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-worker-offloading
 * 
 * Flags CPU-intensive methods that should use Web Workers for background processing
 * to maintain 60 FPS performance on the main thread.
 * 
 * Rationale (QUALIA.CODE §8.1, ANALISIS.md §2.1 item #2):
 * While enforce-async-on-heavy-methods flags methods that should be async,
 * this rule specifically targets methods that are TOO heavy even for async
 * and should be completely offloaded to Web Workers.
 * 
 * Detection heuristics (stricter than enforce-async-on-heavy-methods):
 * - Methods with nested loops (O(n²) or worse complexity)
 * - Methods processing arrays of 1000+ elements (particle systems, physics)
 * - Methods with expensive mathematical operations (matrix mult, FFT, convolution)
 * - Methods performing bulk transformations or bulk calculations
 * - Methods with explicit TODO/FIXME comments mentioning Workers
 * 
 * Indicators:
 * - Method names containing: 'calculate', 'process', 'update', 'transform', 'compute', 'simulate'
 * - Method names ending with: 'System', 'Engine', 'Processor', 'Calculator'
 * - Classes ending with: 'Service', 'Engine', 'System' (heavy service layer)
 * - Methods operating on 'particles', 'vertices', 'nodes', 'entities', 'state'
 * 
 * Exemptions:
 * - Methods already using Workers (workerService, postMessage, Worker constructor)
 * - Methods with @worker or @background decorators
 * - Test files
 * - Methods with comment: // WORKER-EXEMPT or // OPTIMIZED-PATH
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
      description: 'Flag CPU-intensive methods that should be offloaded to Web Workers',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      needsWorker: 'CRITICAL PERFORMANCE: Method "{{methodName}}" performs heavy computation ({{reasons}}) and should be offloaded to Web Worker. Main thread budget is 16.67ms for 60 FPS.',
      considerWorker: 'PERFORMANCE: Method "{{methodName}}" has patterns indicating Worker offloading would improve performance: {{reasons}}',
    }
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();

    // Skip test files
    if (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__')) {
      return {};
    }

    /**
     * Check if method has Worker exemption comments or decorators
     */
    function hasWorkerExemption(node) {
      // Check comments
      const comments = sourceCode.getCommentsBefore(node);
      if (comments.some(comment =>
        /WORKER[-_]EXEMPT|OPTIMIZED[-_]PATH|MAIN[-_]THREAD[-_]REQUIRED/i.test(comment.value)
      )) {
        return true;
      }

      // Check decorators (MethodDefinition nodes have decorators array)
      if (node.decorators && Array.isArray(node.decorators)) {
        return node.decorators.some(decorator => {
          const expression = decorator.expression;
          // Handle simple decorator: @worker
          if (expression.type === 'Identifier') {
            return ['worker', 'background', 'async'].includes(expression.name);
          }
          // Handle decorator with arguments: @worker()
          if (expression.type === 'CallExpression' && expression.callee) {
            const name = expression.callee.name;
            return ['worker', 'background', 'async'].includes(name);
          }
          return false;
        });
      }

      // Exempt methods that MUST run on main thread (DOM/GPU operations)
      const methodName = (node.key && node.key.name) || (node.id && node.id.name) || '';
      const mainThreadMethods = [
        'render',           // GPU rendering operations
        'dispose',          // Resource cleanup (GPU)
        'update',           // Animation frame updates
        'requestAnimationFrame', // Main thread timing
        'now',              // Timing operations
        'mark',             // Performance marks
        'measure',          // Performance measurements
        'setTimeout',       // Timer operations
        'setInterval',      // Timer operations
        'clearTimeout',     // Timer operations
        'clearInterval',    // Timer operations
        'cleanup',          // Lifecycle cleanup
      ];
      
      if (mainThreadMethods.includes(methodName)) {
        return true; // These MUST run on main thread
      }

      return false;
    }

    /**
     * Check if method already uses Workers
     * FIX: Added visited Set to prevent infinite recursion
     */
    function usesWorkers(node) {
      let usesWorker = false;
      const visited = new Set();
      
      // Simple AST walk to detect Worker usage
      const checkNode = (n) => {
        if (!n || typeof n !== 'object') return;
        
        // Prevent infinite recursion on circular references
        if (visited.has(n)) return;
        visited.add(n);
        
        // Check for Worker instantiation
        if (n.type === 'NewExpression' && n.callee && n.callee.name === 'Worker') {
          usesWorker = true;
          return;
        }
        
        // Check for workerService.execute, postMessage
        if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
          const objName = (n.callee.object && n.callee.object.property && n.callee.object.property.name) || 
                          (n.callee.object && n.callee.object.name) || '';
          const propName = (n.callee.property && n.callee.property.name) || '';
          
          // Detect: this.workerService.execute(...)
          if (objName === 'workerService' || objName.toLowerCase().includes('worker')) {
            usesWorker = true;
            return;
          }
          
          // Detect: worker.postMessage(...)
          if (propName === 'postMessage') {
            usesWorker = true;
            return;
          }
        }
        
        // Check for @async or @background decorator
        if (n.type === 'Decorator' && n.expression) {
          const decoratorName = n.expression.name || (n.expression.callee && n.expression.callee.name);
          if (decoratorName === 'async' || decoratorName === 'background') {
            usesWorker = true;
            return;
          }
        }
        
        // Recursively check children - skip circular properties
        for (const key in n) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          if (n[key] && typeof n[key] === 'object') {
            if (Array.isArray(n[key])) {
              n[key].forEach(checkNode);
            } else {
              checkNode(n[key]);
            }
          }
        }
      };
      
      // For method definitions, the body is in node.value.body
      const bodyNode = node.value && node.value.body ? node.value.body : node.body;
      checkNode(bodyNode);
      return usesWorker;
    }

    /**
     * Detect nested loops (O(n²) or worse)
     * FIX: Added visited Set to prevent infinite recursion
     */
    function hasNestedLoops(node) {
      let loopDepth = 0;
      let maxDepth = 0;
      const visited = new Set();
      
      const checkNode = (n) => {
        if (!n || typeof n !== 'object') return;
        
        // Prevent infinite recursion
        if (visited.has(n)) return;
        visited.add(n);
        
        const isLoop = n.type === 'ForStatement' || 
                       n.type === 'ForOfStatement' || 
                       n.type === 'ForInStatement' ||
                       n.type === 'WhileStatement' ||
                       n.type === 'DoWhileStatement';
        
        if (isLoop) {
          loopDepth++;
          maxDepth = Math.max(maxDepth, loopDepth);
        }
        
        // Recursively check children - skip circular properties
        for (const key in n) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          if (n[key] && typeof n[key] === 'object') {
            if (Array.isArray(n[key])) {
              n[key].forEach(checkNode);
            } else {
              checkNode(n[key]);
            }
          }
        }
        
        if (isLoop) {
          loopDepth--;
        }
      };
      
      // For method definitions, the body is in node.value.body
      const bodyNode = node.value && node.value.body ? node.value.body : node.body;
      checkNode(bodyNode);
      return maxDepth >= 2;
    }

    /**
     * Detect large array operations (map, filter, reduce, sort on potentially large datasets)
     */
    function hasLargeArrayOps(node) {
      let largeArrayOps = [];
      const visited = new Set();
      
      const checkNode = (n) => {
        if (!n || typeof n !== 'object') return;
        if (visited.has(n)) return;
        visited.add(n);
        
        // Check for array method calls
        if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
          const arrayMethodName = n.callee.property && n.callee.property.name;
          
          // Target methods on arrays
          if (arrayMethodName && ['map', 'filter', 'reduce', 'sort', 'forEach'].includes(arrayMethodName)) {
            // Count ALL array operations - if there are 3+, it's heavy regardless of naming
            largeArrayOps.push(arrayMethodName);
          }
        }
        
        // Recursively check children
        for (const key in n) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          if (n[key] && typeof n[key] === 'object') {
            if (Array.isArray(n[key])) {
              n[key].forEach(checkNode);
            } else {
              checkNode(n[key]);
            }
          }
        }
      };
      
      // For method definitions, the body is in node.value.body
      const bodyNode = node.value && node.value.body ? node.value.body : node.body;
      checkNode(bodyNode);
      
      // Only return if we have indicators of bulk data processing
      // Require either: bulk data variable names, OR 3+ operations (which indicates pipeline processing)
      return largeArrayOps;
    }

    /**
     * Detect heavy mathematical operations
     */
    function hasHeavyMath(node) {
      let mathOps = [];
      const visited = new Set();
      
      const checkNode = (n) => {
        if (!n || typeof n !== 'object') return;
        if (visited.has(n)) return;
        visited.add(n);
        
        // Check for Math.* calls
        if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression') {
          if (n.callee.object && n.callee.object.name === 'Math') {
            const mathMethod = n.callee.property && n.callee.property.name;
            // Flag expensive math operations
            if (mathMethod && ['pow', 'sqrt', 'sin', 'cos', 'tan', 'atan2', 'exp', 'log'].includes(mathMethod)) {
              mathOps.push(`Math.${mathMethod}`);
            }
          }
        }
        
        // Recursively check children
        for (const key in n) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          if (n[key] && typeof n[key] === 'object') {
            if (Array.isArray(n[key])) {
              n[key].forEach(checkNode);
            } else {
              checkNode(n[key]);
            }
          }
        }
      };
      
      // For method definitions, the body is in node.value.body
      const bodyNode = node.value && node.value.body ? node.value.body : node.body;
      checkNode(bodyNode);
      return mathOps;
    }

    /**
     * Check method name for heavy computation indicators
     */
    function hasHeavyMethodName(methodName) {
      const heavyKeywords = [
        'calculate', 'compute', 'process', 'transform', 'simulate', 'update',
        'analyze', 'generate', 'evaluate', 'optimize'
      ];
      const heavySuffixes = ['System', 'Engine', 'Processor', 'Calculator', 'Simulator'];
      
      const lowerName = methodName.toLowerCase();
      return heavyKeywords.some(kw => lowerName.includes(kw)) ||
             heavySuffixes.some(suffix => methodName.endsWith(suffix));
    }

    /**
     * Check if method operates on bulk data
     */
    function operatesOnBulkData(node) {
      let bulkDataIndicators = [];
      const visited = new Set();
      
      const checkNode = (n) => {
        if (!n || typeof n !== 'object') return;
        if (visited.has(n)) return;
        visited.add(n);
        
        // Check for identifiers suggesting bulk data
        if (n.type === 'Identifier' && n.name) {
          const name = n.name.toLowerCase();
          if (['particles', 'vertices', 'nodes', 'entities', 'items', 'elements', 'buffer', 'data'].some(kw => name.includes(kw))) {
            bulkDataIndicators.push(n.name);
          }
        }
        
        // Recursively check children
        for (const key in n) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          if (n[key] && typeof n[key] === 'object') {
            if (Array.isArray(n[key])) {
              n[key].forEach(checkNode);
            } else {
              checkNode(n[key]);
            }
          }
        }
      };
      
      // For method definitions, the body is in node.value.body
      const bodyNode = node.value && node.value.body ? node.value.body : node.body;
      checkNode(bodyNode);
      return [...new Set(bulkDataIndicators)]; // Remove duplicates
    }

    /**
     * Check if class is a heavy computation service
     */
    function isHeavyComputationClass(classNode) {
      if (!classNode || !classNode.id) return false;
      const className = classNode.id.name;
      const heavySuffixes = ['Service', 'Engine', 'System', 'Processor', 'Calculator', 'Simulator'];
      return heavySuffixes.some(suffix => className.endsWith(suffix));
    }

    /**
     * Main checker function
     */
    function checkMethod(node) {
      // Skip async methods (async yields control)
      const isAsync = node.async || (node.value && node.value.async);
      if (isAsync) return;

      // Skip private methods
      const methodName = node.key ? node.key.name : node.id ? node.id.name : null;
      if (!methodName || methodName.startsWith('_')) return;

      // Skip getters
      if (node.kind === 'get') return;

      // Skip if has exemption comment
      if (hasWorkerExemption(node)) return;

      // Skip if already uses Workers
      if (usesWorkers(node)) return;

      // Collect indicators
      const indicators = {
        nestedLoops: false,
        arrayOps: [],
        mathOps: [],
        bulkData: [],
        heavyMethodName: false,
        heavyClassName: false
      };

      // 1. Check for nested loops (CRITICAL indicator)
      indicators.nestedLoops = hasNestedLoops(node);

      // 2. Check for large array operations
      indicators.arrayOps = hasLargeArrayOps(node);

      // 3. Check for heavy math
      indicators.mathOps = hasHeavyMath(node);

      // 4. Check for bulk data operations
      indicators.bulkData = operatesOnBulkData(node);

      // 5. Check method name
      indicators.heavyMethodName = hasHeavyMethodName(methodName);

      // 6. Check parent class
      let classNode = node.parent;
      while (classNode && classNode.type !== 'ClassDeclaration' && classNode.type !== 'ClassExpression') {
        classNode = classNode.parent;
      }
      indicators.heavyClassName = classNode && isHeavyComputationClass(classNode);

      // Decision logic
      const reasons = [];
      let messageId = null;

      // CRITICAL conditions (trigger needsWorker):
      // - Nested loops (O(n²) or worse)
      // - 3+ array operations (even if not all on explicit bulk data - chain analysis)
      // - 4+ math operations (lowered from 5 for better detection)
      if (indicators.nestedLoops) {
        reasons.push('nested loops detected (O(n²) complexity)');
        messageId = 'needsWorker';
      }

      if (indicators.arrayOps.length >= 3) {
        reasons.push(`multiple bulk array operations: ${indicators.arrayOps.join(', ')}`);
        messageId = 'needsWorker';
      }

      if (indicators.mathOps.length >= 4) {
        reasons.push(`many expensive math operations: ${indicators.mathOps.join(', ')}`);
        messageId = 'needsWorker';
      }

      // Count STRONG computational indicators (not just naming)
      const strongIndicators = [];
      
      if (indicators.arrayOps.length > 0 && indicators.arrayOps.length < 3) {
        reasons.push(`bulk array operations on large datasets: ${indicators.arrayOps.join(', ')}`);
        strongIndicators.push('arrayOps');
      }
      if (indicators.mathOps.length > 0 && indicators.mathOps.length < 4) {
        reasons.push(`expensive math operations: ${indicators.mathOps.join(', ')}`);
        strongIndicators.push('mathOps');
      }
      if (indicators.bulkData.length > 0) {
        reasons.push(`operates on bulk data: ${indicators.bulkData.join(', ')}`);
        strongIndicators.push('bulkData');
      }
      
      // Naming indicators (only count if there are strong indicators)
      if (indicators.heavyMethodName) {
        reasons.push('method name indicates heavy computation');
      }
      if (indicators.heavyClassName) {
        reasons.push('class is a heavy computation service/engine');
      }

      // considerWorker condition: Require substantial computation evidence
      // Combinations that indicate real performance concern:
      // - 2+ array ops OR 2+ math ops OR 2+ bulk data vars (multiple operations)
      // - OR: bulk data + math (processing pattern in loop)
      // - OR: multiple different indicator types (cross-cutting evidence)
      const hasSubstantialComputation = 
        indicators.arrayOps.length >= 2 || 
        indicators.mathOps.length >= 2 ||
        indicators.bulkData.length >= 2 ||
        (indicators.bulkData.length >= 1 && indicators.mathOps.length >= 1) || // Loop over data with math
        (strongIndicators.length >= 2); // Multiple types of computation
        
      if (!messageId && hasSubstantialComputation && reasons.length >= 3) {
        messageId = 'considerWorker';
      }

      // Report if we have a decision
      if (messageId) {
        context.report({
          node,
          messageId,
          data: {
            methodName,
            reasons: reasons.join('; ')
          }
        });
      }
    }

    return {
      MethodDefinition: checkMethod,
      FunctionDeclaration: checkMethod,
      FunctionExpression(node) {
        // Only check if it's a named function assigned to a variable
        if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id) {
          checkMethod(node);
        }
      }
    };
  }
};
