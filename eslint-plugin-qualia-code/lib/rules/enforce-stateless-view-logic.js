/**
 * @fileoverview Enforce stateless view logic pattern (QUALIA.CODE §8.1)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * CRITICAL RULE: React components must be "dumb" and only apply visual data
 * calculated by ViewLogicService. No calculations, transformations, or game
 * state processing should occur in useFrame or component render.
 * 
 * PHILOSOPHY: Separate calculation from rendering. Test logic without rendering.
 */

'use strict';

const { requireTypeChecker } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce stateless view logic pattern - components should only apply pre-calculated visual data (QUALIA.CODE §8.1)',
      category: 'Visual Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#81-el-patron-de-logica-de-vista-sin-estado'
    },
    fixable: null,
    schema: [],
    messages: {
      calculationInRender:
        "QUALIA.CODE §8.1 VIOLATION: Calculation detected inside {{location}}. " +
        "STATELESS VIEW-LOGIC MANDATE: Components must be 'dumb' and only apply visual data. " +
        "Move this calculation to ViewLogicService.get{{componentType}}Visuals() and call it in useFrame. " +
        "Detected operation: {{operation}}. " +
        "CORRECT PATTERN: const visuals = viewLogicService.get{{componentType}}Visuals(state, time); then apply visuals.{{property}} directly.",
      stateTransformationInUseFrame:
        "QUALIA.CODE §8.1 VIOLATION: Game state transformation detected in useFrame: {{transformation}}. " +
        "ARCHITECTURAL VIOLATION: useFrame should only call ViewLogicService methods and apply results. " +
        "Game state (state.player, state.boss, etc.) should never be transformed in rendering code. " +
        "Move this logic to a service and consume via ViewLogicService.",
      missingViewLogicServiceCall:
        "QUALIA.CODE §8.1 WARNING: useFrame detected without ViewLogicService call. " +
        "BEST PRACTICE: useFrame should call viewLogicService.get...Visuals() to obtain calculated visual data. " +
        "Direct manipulation of Three.js objects without service-calculated data violates the separation of concerns."
    }
  },

  create(context) {
    // This rule can work without TypeScript services for basic detection
    // but we'll use them for enhanced analysis when available
    let typeServices = null;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // Continue without type services
    }

    /**
     * Check if a node is inside a useFrame hook
     */
    function isInsideUseFrame(node) {
      let current = node;
      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee &&
            current.callee.name === 'useFrame') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    /**
     * Check if expression contains mathematical operations
     */
    function hasMathOperations(node) {
      if (!node) return false;
      
      if (node.type === 'BinaryExpression') {
        const mathOps = ['+', '-', '*', '/', '%', '**'];
        return mathOps.includes(node.operator);
      }
      
      if (node.type === 'UnaryExpression') {
        return ['-', '+', '++', '--'].includes(node.operator);
      }
      
      return false;
    }

    /**
     * Check if expression accesses game state (state.player, state.boss, etc.)
     */
    function accessesGameState(node) {
      if (!node) return false;
      
      if (node.type === 'MemberExpression') {
        const obj = node.object;
        
        // Check for state.player, state.boss, gameState.player, etc.
        if (obj.type === 'Identifier' && 
            (obj.name === 'state' || obj.name === 'gameState')) {
          const prop = node.property;
          if (prop && prop.name && 
              ['player', 'boss', 'enemy', 'combat', 'qualia'].includes(prop.name)) {
            return { stateObject: obj.name, property: prop.name };
          }
        }
        
        // Recursively check nested member expressions
        return accessesGameState(obj);
      }
      
      return false;
    }

    /**
     * Check if a CallExpression is a ViewLogicService method call
     */
    function isViewLogicServiceCall(node) {
      if (node.type !== 'CallExpression') return false;
      if (!node.callee || node.callee.type !== 'MemberExpression') return false;
      
      const obj = node.callee.object;
      const method = node.callee.property;
      
      // Check for viewLogicService.get...Visuals()
      return (obj.name === 'viewLogicService' || obj.property?.name === 'viewLogicService') &&
             method.name && method.name.startsWith('get') && method.name.includes('Visual');
    }

    /**
     * Check if useFrame body contains ViewLogicService call
     */
    function hasViewLogicServiceCall(useFrameNode) {
      let hasCall = false;
      
      function traverse(node) {
        if (!node) return;
        
        if (isViewLogicServiceCall(node)) {
          hasCall = true;
          return;
        }
        
        // Traverse child nodes
        for (const key in node) {
          if (node.hasOwnProperty(key)) {
            const child = node[key];
            if (child && typeof child === 'object') {
              if (Array.isArray(child)) {
                child.forEach(traverse);
              } else {
                traverse(child);
              }
            }
          }
        }
      }
      
      if (useFrameNode.arguments && useFrameNode.arguments[0]) {
        traverse(useFrameNode.arguments[0]);
      }
      
      return hasCall;
    }

    return {
      // Check for math operations in useFrame
      BinaryExpression(node) {
        if (!isInsideUseFrame(node)) return;
        
        if (hasMathOperations(node)) {
          // Check if this is operating on game state
          const leftState = accessesGameState(node.left);
          const rightState = accessesGameState(node.right);
          
          if (leftState || rightState) {
            context.report({
              node,
              messageId: 'stateTransformationInUseFrame',
              data: {
                transformation: context.getSourceCode().getText(node)
              }
            });
          } else {
            context.report({
              node,
              messageId: 'calculationInRender',
              data: {
                location: 'useFrame',
                operation: context.getSourceCode().getText(node),
                componentType: 'Component',
                property: 'property'
              }
            });
          }
        }
      },

      // Check useFrame hooks
      CallExpression(node) {
        if (node.callee && node.callee.name === 'useFrame') {
          // Check if ViewLogicService is being called
          if (!hasViewLogicServiceCall(node)) {
            context.report({
              node,
              messageId: 'missingViewLogicServiceCall'
            });
          }
        }
      },

      // Check for state transformations in assignment expressions inside useFrame
      AssignmentExpression(node) {
        if (!isInsideUseFrame(node)) return;
        
        // Check if right side contains calculations on game state
        const stateAccess = accessesGameState(node.right);
        if (stateAccess && hasMathOperations(node.right)) {
          context.report({
            node,
            messageId: 'stateTransformationInUseFrame',
            data: {
              transformation: context.getSourceCode().getText(node.right)
            }
          });
        }
      }
    };
  }
};
