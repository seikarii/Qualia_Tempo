/**
 * @fileoverview Enforce correct decorator ordering (QUALIA.CODE §5.2)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * CRITICAL RULE: Decorators execute in reverse order (bottom to top).
 * This rule enforces that transformation decorators (@logMethod, @catchError)
 * are applied BEFORE (written above) registration decorators (@OnEvent, @AdaptAndEmit).
 * 
 * PHILOSOPHY: We understand execution order and enforce correct layering.
 * Registration decorators must see the original method signature.
 */

'use strict';

const { getDecorators } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce correct decorator ordering based on execution semantics (QUALIA.CODE §5.2)',
      category: 'Decorator Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#52-decorator-driven-development'
    },
    fixable: 'code',
    schema: [],
    messages: {
      incorrectDecoratorOrder:
        "QUALIA.CODE §5.2 VIOLATION: Decorator @{{violatingDecorator}} ({{violatingLayer}}) must be applied AFTER @{{correctDecorator}} ({{correctLayer}}). " +
        "EXECUTION ORDER: Decorators execute bottom-to-top. {{correctLayer}} decorators must see the original method. " +
        "CORRECT ORDER (top to bottom): {{correctOrder}}. " +
        "Consult QUALIA.MANUAL.md §4.4 for the mandatory ordering protocol.",
      registrationBeforeTransformation:
        "QUALIA.CODE §5.2 VIOLATION: Registration decorator @{{registrationDec}} is applied before transformation decorator @{{transformationDec}}. " +
        "Registration decorators (@OnEvent, @AdaptAndEmit, @BrowserOnly) MUST be innermost (closest to method) so they can read the original signature. " +
        "Transformation decorators (@logMethod, @catchError, @validate) MUST be outermost (furthest from method). " +
        "CORRECT PATTERN: Write transformation decorators ABOVE registration decorators in the source code."
    }
  },

  create(context) {
    // Define decorator categories and their priority (lower = must be applied first = written last = closest to method)
    const DECORATOR_LAYERS = {
      // Layer 1: Registration (innermost, closest to method) - Priority 1-10
      'OnEvent': { layer: 'Registration', priority: 1 },
      'AdaptAndEmit': { layer: 'Registration', priority: 2 },
      'BrowserOnly': { layer: 'Registration', priority: 3 },
      
      // Layer 2: Validation (middle) - Priority 11-20
      'validate': { layer: 'Validation', priority: 11 },
      'validateEventProperty': { layer: 'Validation', priority: 12 },
      
      // Layer 3: Transformation (outermost, furthest from method) - Priority 21-50
      'throttle': { layer: 'Transformation', priority: 21 },
      'debounce': { layer: 'Transformation', priority: 22 },
      'rateLimit': { layer: 'Transformation', priority: 23 },
      'mutex': { layer: 'Transformation', priority: 24 },
      'retry': { layer: 'Transformation', priority: 25 },
      'timeout': { layer: 'Transformation', priority: 26 },
      'circuitBreaker': { layer: 'Transformation', priority: 27 },
      'cache': { layer: 'Transformation', priority: 28 },
      'measureTime': { layer: 'Transformation', priority: 29 },
      'catchError': { layer: 'Transformation', priority: 30 },
      'logMethod': { layer: 'Transformation', priority: 31 },
    };

    const CORRECT_ORDER = [
      'Transformation (@logMethod, @catchError, @throttle, @validate, etc.)',
      'Registration (@OnEvent, @AdaptAndEmit, @BrowserOnly)'
    ];

    /**
     * Extract decorator name from decorator node
     */
    function getDecoratorName(decorator) {
      const expr = decorator.expression;
      
      if (expr.type === 'Identifier') {
        return expr.name;
      }
      
      if (expr.type === 'CallExpression' && expr.callee) {
        return expr.callee.name;
      }
      
      return null;
    }

    /**
     * Check if decorators are in correct order
     */
    function validateDecoratorOrder(decorators, node) {
      const decoratorInfo = decorators
        .map((dec, index) => ({
          decorator: dec,
          name: getDecoratorName(dec),
          index,
          sourceIndex: index // Index in source code (0 = topmost)
        }))
        .filter(info => info.name && DECORATOR_LAYERS[info.name])
        .map(info => ({
          ...info,
          ...DECORATOR_LAYERS[info.name]
        }));

      if (decoratorInfo.length < 2) {
        return; // Nothing to validate
      }

      // Decorators are written top-to-bottom but execute bottom-to-top
      // So: sourceIndex 0 (topmost) should have HIGHEST priority (outermost execution)
      //     sourceIndex N (bottommost) should have LOWEST priority (innermost execution)
      
      for (let i = 0; i < decoratorInfo.length - 1; i++) {
        const current = decoratorInfo[i];
        const next = decoratorInfo[i + 1];

        // Current (higher in source) should have higher or equal priority number than next (lower in source)
        // Because higher priority number = outermost = should be written first (topmost)
        if (current.priority < next.priority) {
          // VIOLATION: A lower-priority (inner) decorator is written above a higher-priority (outer) one
          
          // Special check: Is this a registration-before-transformation violation?
          if (current.layer === 'Registration' && next.layer === 'Transformation') {
            context.report({
              node: current.decorator,
              messageId: 'registrationBeforeTransformation',
              data: {
                registrationDec: current.name,
                transformationDec: next.name
              },
              fix(fixer) {
                // Swap the decorators in source
                const currentText = context.getSourceCode().getText(current.decorator);
                const nextText = context.getSourceCode().getText(next.decorator);
                
                return [
                  fixer.replaceText(current.decorator, nextText),
                  fixer.replaceText(next.decorator, currentText)
                ];
              }
            });
          } else {
            context.report({
              node: current.decorator,
              messageId: 'incorrectDecoratorOrder',
              data: {
                violatingDecorator: current.name,
                violatingLayer: current.layer,
                correctDecorator: next.name,
                correctLayer: next.layer,
                correctOrder: CORRECT_ORDER.join(' → ')
              },
              fix(fixer) {
                // Swap the decorators
                const currentText = context.getSourceCode().getText(current.decorator);
                const nextText = context.getSourceCode().getText(next.decorator);
                
                return [
                  fixer.replaceText(current.decorator, nextText),
                  fixer.replaceText(next.decorator, currentText)
                ];
              }
            });
          }
        }
      }
    }

    return {
      MethodDefinition(node) {
        const decorators = getDecorators(node);
        if (decorators.length === 0) return;
        
        validateDecoratorOrder(decorators, node);
      },
      
      // Also check class property methods (arrow functions)
      ClassProperty(node) {
        if (!node.value || node.value.type !== 'ArrowFunctionExpression') return;
        
        const decorators = getDecorators(node);
        if (decorators.length === 0) return;
        
        validateDecoratorOrder(decorators, node);
      }
    };
  }
};
