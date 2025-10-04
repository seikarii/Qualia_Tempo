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

        // Suggest @measureTime for hot-path methods (warning, not error)
        if ((inRenderLoop || classInRenderLoop) && !hasMeasureTime) {
          // Only suggest for methods that seem computationally intensive
          const methodText = context.getSourceCode().getText(node.value);
          const seemsComputational = methodText.length > 200 || // Non-trivial method
                                    /for\s*\(|while\s*\(|\.map\(|\.filter\(|\.reduce\(/.test(methodText);

          if (seemsComputational) {
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
