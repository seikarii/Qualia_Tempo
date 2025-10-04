/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-performance-best-practices
 * 
 * Codifies performance best practices to prevent bottlenecks and optimize system response.
 * 
 * This rule enforces QUALIA.CODE Section 11: Performance Optimization Protocol:
 * 1. High-frequency event listeners (resize, scroll, mousemove) must use @throttle
 * 2. Methods in render loops (useFrame) should use @measureTime for diagnostics
 * 
 * Rationale: Performance degradation is often introduced gradually through small oversights.
 * This rule acts as a performance guardrail, catching issues at compile-time rather than
 * discovering them in production profiling.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce performance best practices for high-frequency events and hot-path methods',
      category: 'QUALIA.CODE Performance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingThrottle: "[QUALIA.CODE §11] The handler for the '{{eventName}}' event is high-frequency and can cause performance degradation. Apply the @throttle decorator.",
      suggestMeasureTime: "[PERFORMANCE] Consider adding @measureTime to method '{{methodName}}' as it appears to operate in a hot-path (render loop). This aids performance diagnostics.",
      highFrequencyEventWarning: "[BEST PRACTICE] High-frequency event '{{eventName}}' detected. Consider throttling or debouncing for optimal performance."
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check TypeScript files in services and components
    if (!filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
      return {};
    }

    /**
     * High-frequency browser events that should be throttled
     */
    const HIGH_FREQUENCY_EVENTS = [
      'resize',
      'scroll',
      'mousemove',
      'pointermove',
      'touchmove',
      'wheel',
      'mousewheel',
      'drag',
      'dragover'
    ];

    /**
     * Platform abstraction services that are thin wrappers around browser APIs.
     * These services delegate immediately and should not have @measureTime overhead.
     * Rationale: QUALIA.CODE §11.1 - "Methods >100 calls/sec minimize decorators"
     */
    const PLATFORM_ABSTRACTION_SERVICES = [
      'TimerService',
      'HttpService',
      'BrowserEventsService'
    ];

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
     */
    function isInPlatformAbstractionService(node) {
      let parent = node.parent;
      while (parent) {
        if (parent.type === 'ClassDeclaration' && parent.id?.name) {
          return PLATFORM_ABSTRACTION_SERVICES.includes(parent.id.name);
        }
        parent = parent.parent;
      }
      return false;
    }

    /**
     * Check if method is likely in a render loop (uses useFrame or similar)
     */
    function isInRenderLoop(node) {
      if (!node.value?.body?.body) {
        return false;
      }

      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);

      // Check for render loop indicators
      const renderLoopPatterns = [
        /useFrame/,              // React Three Fiber hook
        /requestAnimationFrame/, // Browser API
        /\.onBeforeRender/,      // Three.js lifecycle
        /\.render\s*\(/,         // Render method calls
      ];

      return renderLoopPatterns.some(pattern => pattern.test(methodText));
    }

    /**
     * Check if class or component uses render loops
     */
    function classUsesRenderLoop(node) {
      if (!node.body?.body) {
        return false;
      }

      const sourceCode = context.getSourceCode();
      const classText = sourceCode.getText(node);

      return /useFrame|requestAnimationFrame|onBeforeRender/.test(classText);
    }

    /**
     * Check if method has performance exemption comment
     */
    function hasPerformanceExemption(node) {
      const comments = context.getSourceCode().getCommentsBefore(node);
      return comments.some(comment => {
        const text = comment.value.toLowerCase();
        return text.includes('@performance-exempt') ||
               text.includes('performance: exempt') ||
               text.includes('no throttle needed');
      });
    }

    /**
     * CONTEXTUAL INTELLIGENCE: Detect if method is computationally intensive
     * 
     * RATIONALE (QUALIA.CODE SUGGESTION #2):
     * - Computationally intensive methods: SHOULD measure (GPU ops, loops, async)
     * - Simple delegators/getters: SHOULD NOT measure (overhead > work)
     * 
     * This function uses heuristics to distinguish between:
     * 1. Methods that benefit from performance instrumentation
     * 2. Trivial methods where @measureTime overhead exceeds operation time
     */
    function isComputationallyIntensive(node) {
      const sourceCode = context.getSourceCode();
      const methodText = sourceCode.getText(node.value);
      
      // Indicator 1: Method contains loops (iterative work)
      const hasLoops = /for\s*\(|while\s*\(|do\s+\{|\.forEach\(|\.map\(|\.filter\(|\.reduce\(/.test(methodText);
      
      // Indicator 2: Method performs GPU operations (WebGL, Three.js)
      const hasGPUOps = /\.setAttribute|\.setUniform|\.render|BufferGeometry|WebGL|ShaderMaterial|\.updateMatrix/.test(methodText);
      
      // Indicator 3: Method is long enough to contain non-trivial logic
      const isLongMethod = methodText.length > 300;
      
      // Indicator 4: Method has async operations (I/O, promises)
      const hasAsyncOps = /await\s+|Promise\.|async\s+function|\.then\(/.test(methodText);
      
      // Indicator 5: Method has complex calculations
      const hasComplexCalc = /Math\.\w+|calculate|compute|process|transform/i.test(methodText);
      
      // EXCLUSION: Simple getters/setters are NOT intensive
      // Pattern: short methods with just return or assignment
      const isSimpleAccessor = (
        (/^(get|set)\w+/.test(node.key?.name) || /^(is|has)\w+/.test(node.key?.name)) &&
        methodText.length < 100 &&
        !/for\s*\(|while\s*\(/.test(methodText)
      );
      
      // EXCLUSION: Pure delegation methods (just calling another service)
      const isPureDelegation = (
        methodText.split('\n').length <= 5 &&
        /return\s+this\.\w+\.\w+\(/.test(methodText) &&
        !hasLoops &&
        !hasGPUOps
      );
      
      // Method is intensive if it has multiple indicators and is not a simple accessor
      const intensityScore = (
        (hasLoops ? 2 : 0) +
        (hasGPUOps ? 3 : 0) +
        (isLongMethod ? 1 : 0) +
        (hasAsyncOps ? 1 : 0) +
        (hasComplexCalc ? 1 : 0)
      );
      
      return intensityScore >= 2 && !isSimpleAccessor && !isPureDelegation;
    }

    /**
     * Extract event name from addEventListener call
     */
    function getEventListenerName(node) {
      if (node.callee?.property?.name === 'addEventListener' &&
          node.arguments.length >= 1) {
        const eventArg = node.arguments[0];
        if (eventArg.type === 'Literal') {
          return eventArg.value;
        }
      }
      return null;
    }

    /**
     * Check if a handler is wrapped in throttle/debounce
     */
    function isWrappedInThrottle(handlerNode) {
      // Check if handler is a direct argument to throttle/debounce
      if (handlerNode.type === 'CallExpression') {
        const callee = handlerNode.callee;
        if (callee?.name === 'throttle' || callee?.name === 'debounce') {
          return true;
        }
      }

      return false;
    }

    /**
     * Check if a method reference points to a @throttle decorated method
     */
    function isMethodThrottled(handlerNode, classNode) {
      // Handler is a method reference like this.handleScroll or this.handleScroll.bind(this)
      let methodName = null;

      if (handlerNode.type === 'MemberExpression' &&
          handlerNode.object?.type === 'ThisExpression' &&
          handlerNode.property?.name) {
        methodName = handlerNode.property.name;
      } else if (handlerNode.type === 'CallExpression' &&
                 handlerNode.callee?.type === 'MemberExpression' &&
                 handlerNode.callee.property?.name === 'bind' &&
                 handlerNode.callee.object?.type === 'MemberExpression' &&
                 handlerNode.callee.object.object?.type === 'ThisExpression') {
        methodName = handlerNode.callee.object.property?.name;
      }

      if (!methodName || !classNode) {
        return false;
      }

      // Find the method in the class and check if it has @throttle decorator
      const methods = classNode.body?.body || [];
      const methodDef = methods.find(m => 
        m.type === 'MethodDefinition' && m.key?.name === methodName
      );

      return methodDef && hasDecorator(methodDef, 'throttle');
    }

    return {
      // RULE 1: High-frequency event listeners must be throttled
      CallExpression(node) {
        const eventName = getEventListenerName(node);
        
        if (eventName && HIGH_FREQUENCY_EVENTS.includes(eventName)) {
          // Get the handler function (second argument)
          const handlerArg = node.arguments[1];
          
          if (handlerArg) {
            // Check if wrapped in throttle/debounce
            if (isWrappedInThrottle(handlerArg)) {
              return; // Valid - handler is throttled
            }

            // Check if it's a method reference to a @throttle decorated method
            let parentClass = node;
            while (parentClass && parentClass.type !== 'ClassDeclaration') {
              parentClass = parentClass.parent;
            }

            if (isMethodThrottled(handlerArg, parentClass)) {
              return; // Valid - method has @throttle decorator
            }

            // Neither wrapped nor decorated - report error
            context.report({
              node,
              messageId: 'missingThrottle',
              data: {
                eventName: eventName
              }
            });
          }
        }
      },

      // RULE 2: Methods in render loops should have @measureTime for diagnostics
      MethodDefinition(node) {
        // Only check service classes
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip platform abstraction services (thin wrappers with minimal overhead)
        if (isInPlatformAbstractionService(node)) {
          return;
        }

        // Skip private methods
        if (node.accessibility === 'private' || 
            node.accessibility === 'protected' ||
            node.key?.name?.startsWith('_')) {
          return;
        }

        // Skip methods without body
        if (!node.value?.body) {
          return;
        }

        // Skip lifecycle methods
        const exemptMethods = ['constructor', 'start', 'stop', 'initialize', 'cleanup'];
        if (exemptMethods.includes(node.key?.name)) {
          return;
        }

        // Check if method has performance exemption
        if (hasPerformanceExemption(node)) {
          return;
        }

        const hasMeasureTime = hasDecorator(node, 'measureTime');
        const inRenderLoop = isInRenderLoop(node);

        // Get parent class to check if it uses render loops
        let parentClass = node.parent;
        while (parentClass && parentClass.type !== 'ClassDeclaration') {
          parentClass = parentClass.parent;
        }

        const classInRenderLoop = parentClass && classUsesRenderLoop(parentClass);

        // ENHANCED: Suggest @measureTime ONLY for computationally intensive methods (SUGGESTION #2)
        // This eliminates false positives for simple getters, delegators, and thin wrappers
        if ((inRenderLoop || classInRenderLoop) && !hasMeasureTime) {
          const isIntensive = isComputationallyIntensive(node);

          // Only suggest @measureTime if method is truly computationally intensive
          // Simple accessors and delegators are exempt to avoid measurement overhead
          if (isIntensive) {
            context.report({
              node,
              messageId: 'suggestMeasureTime',
              data: {
                methodName: node.key?.name || 'anonymous'
              }
            });
          }
        }
      },

      // Additional check: Detect inline event listeners in JSX/TSX
      JSXAttribute(node) {
        if (!filename.endsWith('.tsx')) {
          return;
        }

        // Check for high-frequency events in JSX (onScroll, onMouseMove, etc.)
        const attributeName = node.name?.name;
        if (attributeName && typeof attributeName === 'string') {
          const eventName = attributeName.replace(/^on/, '').toLowerCase();
          
          if (HIGH_FREQUENCY_EVENTS.includes(eventName)) {
            // Check if the handler is throttled
            const handlerValue = node.value?.expression;
            if (handlerValue && !isWrappedInThrottle(handlerValue)) {
              context.report({
                node,
                messageId: 'highFrequencyEventWarning',
                data: {
                  eventName: eventName
                }
              });
            }
          }
        }
      }
    };
  }
};
