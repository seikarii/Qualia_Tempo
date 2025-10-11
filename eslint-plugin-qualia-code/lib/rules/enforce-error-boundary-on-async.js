/**
 * @fileoverview Enforce @catchError decorator on all async methods
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE COMPLIANCE: Error Handling (§6)
 * 
 * This rule enforces that ALL async operations are wrapped in error boundaries
 * using the @catchError decorator. Unhandled promise rejections can crash the
 * application or lead to silent failures. While @catchError has 5-10% overhead,
 * this is MANDATORIO per QUALIA.CODE for safety-critical operations.
 * 
 * RATIONALE:
 * - Promises without catch handlers cause UnhandledPromiseRejection
 * - Async operations interact with external systems (I/O, network, filesystem)
 * - @catchError provides centralized error logging and recovery
 * - Hot paths can be exempted with explicit comment
 * 
 * FORBIDDEN PATTERNS:
 * - async method without @catchError decorator
 * - async function without @catchError decorator (in class context)
 * 
 * EXEMPTIONS:
 * - // @catchError-exempt: [reason] comment above method
 * - Test helper functions (*.test.ts, *.spec.ts files)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @catchError decorator on all async methods',
      category: 'Error Handling',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#error-handling'
    },
    messages: {
      missingCatchError: 'Async {{methodType}} "{{methodName}}" lacks mandatory @catchError decorator. All async operations must be wrapped in error boundaries per QUALIA.CODE §6. Add @catchError or exempt with // @catchError-exempt: [reason].'
    },
    schema: [],
    fixable: null
  },

  create(context) {
    const sourceCode = context.getSourceCode();
    const filename = context.getFilename();
    
    // Exempt test files
    if (filename.endsWith('.test.ts') || 
        filename.endsWith('.spec.ts') || 
        filename.includes('/__tests__/')) {
      return {};
    }

    // QUALIA.CODE §IX: Hot Path Identification - Exempt entire services that run in render loops
    // These services are called 60+ FPS and MUST NOT have 5-10% @catchError overhead
    function isHotPathFile(filename) {
      const hotPathServices = [
        'ViewLogicService.ts',           // Called per-frame for every entity
        'FrontendRenderingService.ts',   // Core render loop
        'CoordinateSystemService.ts',    // Coordinate transforms per-frame
        'PostProcessingService.ts',      // GPU shader operations
        'ShaderIntrospectionService.ts', // Shader compilation (main thread GPU)
        'GBufferPass.ts',                // Rendering pass
        'PerformanceProvider.ts'         // Performance.now() wrapper (hot)
      ];
      
      return hotPathServices.some(service => filename.endsWith(service));
    }
    
    // Auto-exempt hot path files entirely
    if (isHotPathFile(filename)) {
      return {};
    }

    function hasCatchErrorDecorator(node) {
      if (!node.decorators) return false;
      
      return node.decorators.some(decorator => {
        if (decorator.expression.type === 'Identifier') {
          return decorator.expression.name === 'catchError';
        }
        if (decorator.expression.type === 'CallExpression') {
          return decorator.expression.callee.name === 'catchError';
        }
        return false;
      });
    }

    function hasCatchErrorExemptComment(node) {
      const comments = sourceCode.getCommentsBefore(node);
      return comments.some(comment => 
        comment.value.includes('@catchError-exempt')
      );
    }

    // QUALIA.CODE §IX: Hot Path Method Detection
    // Methods called >100 times/sec MUST NOT have @catchError overhead
    function isHotPathMethod(methodName) {
      // 1. Rendering/Frame loop methods (CRITICAL - 60 FPS)
      const renderingMethods = [
        'update', 'render', 'tick', 'frame', 'animate', 'draw',
        'onBeforeRender', 'onAfterRender', 'useFrame', 'onFrame',
        'renderScene', 'renderPass', 'renderToTarget'
      ];
      
      // 2. High-frequency event handlers (CRITICAL - can be called 100+ times/sec)
      const highFreqEvents = [
        'onMouseMove', 'onPointerMove', 'onScroll', 'onResize',
        'onWheel', 'onTouchMove', 'onDrag', 'onPan', 'onZoom'
      ];
      
      // 3. Timer/Performance measurement (CRITICAL - no overhead allowed)
      const timerMethods = ['now', 'measure', 'mark', 'clearMarks', 'clearMeasures'];
      
      // 4. ViewLogic calculation patterns (called per-frame per-entity)
      const viewLogicPatterns = [
        /^get.*Visuals$/,      // getBossVisuals, getPlayerVisuals, getNoteVisuals
        /^calculate.*$/,       // calculatePosition, calculateScale, calculateOpacity
        /^compute.*$/,         // computeTransform, computeColor
        /^update.*Visual.*$/   // updateVisualState, updateVisuals
      ];
      
      // Check exact matches
      if (renderingMethods.includes(methodName)) return true;
      if (highFreqEvents.includes(methodName)) return true;
      if (timerMethods.includes(methodName)) return true;
      
      // Check patterns
      if (viewLogicPatterns.some(pattern => pattern.test(methodName))) return true;
      
      return false;
    }

    function getMethodName(node) {
      if (node.key && node.key.name) {
        return node.key.name;
      }
      if (node.id && node.id.name) {
        return node.id.name;
      }
      return 'anonymous';
    }

    function checkAsyncMethod(node, methodType) {
      // Skip if async flag is not set
      if (!node.async) return;
      
      // Skip if already has @catchError
      if (hasCatchErrorDecorator(node)) return;
      
      // Skip if has exemption comment
      if (hasCatchErrorExemptComment(node)) return;
      
      const methodName = getMethodName(node);
      
      // QUALIA.CODE §IX: Auto-exempt hot path methods
      // These are called >100 times/sec and @catchError overhead (5-10%) is unacceptable
      if (isHotPathMethod(methodName)) return;
      
      context.report({
        node,
        messageId: 'missingCatchError',
        data: {
          methodType,
          methodName
        }
      });
    }

    return {
      // Check async method definitions in classes
      MethodDefinition(node) {
        // The async flag is on node.value (the function expression), not on the MethodDefinition itself
        if (node.value && node.value.async) {
          // Skip if already has @catchError
          if (hasCatchErrorDecorator(node)) return;
          
          // Skip if has exemption comment
          if (hasCatchErrorExemptComment(node)) return;
          
          const methodName = getMethodName(node);
          
          // QUALIA.CODE §IX: Auto-exempt hot path methods
          if (isHotPathMethod(methodName)) return;
          
          context.report({
            node,
            messageId: 'missingCatchError',
            data: {
              methodType: 'method',
              methodName
            }
          });
        }
      },
      
      // Check async function declarations
      FunctionDeclaration(node) {
        // Only check if it's part of a class (not standalone functions)
        const parent = context.getAncestors()[context.getAncestors().length - 1];
        if (parent && parent.type === 'ClassBody') {
          checkAsyncMethod(node, 'function');
        }
      },
      
      // Check async arrow functions assigned as class properties
      'ClassProperty > ArrowFunctionExpression'(node) {
        if (node.async) {
          const parent = node.parent;
          if (!hasCatchErrorExemptComment(parent) && 
              !hasCatchErrorDecorator(parent)) {
            const methodName = parent.key ? parent.key.name : 'anonymous';
            context.report({
              node: parent,
              messageId: 'missingCatchError',
              data: {
                methodType: 'arrow function',
                methodName
              }
            });
          }
        }
      }
    };
  }
};
