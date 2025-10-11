/**
 * @fileoverview Enforce High-Fidelity Mock Standard (QUALIA.CODE §10.3.1)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * CRITICAL RULE: Ensures all service mocks in src/testing/mocks/ are type-safe
 * and respect their interface contracts. Low-fidelity mocks (bare vi.fn()) that
 * return undefined are architectural violations.
 * 
 * PHILOSOPHY: A mock must be a faithful, predictable, type-safe representation
 * of the interface it simulates.
 */

'use strict';

const path = require('path');
const ts = require('typescript');
const { requireTypeChecker, getNodeType, isPromiseType, getPromiseTypeArgument } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce high-fidelity mocks that respect interface contracts (QUALIA.CODE §10.3.1)',
      category: 'Testing Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#1031-high-fidelity-mocking-standard-mandatory'
    },
    fixable: null,
    schema: [],
    messages: {
      lowFidelityMock: 
        "QUALIA.CODE §10.3.1 VIOLATION: Mock method '{{methodName}}' uses bare vi.fn() but interface declares return type '{{returnType}}'. " +
        "HIGH-FIDELITY MANDATE: Use mockReturnValue({{suggestion}}) for synchronous methods or mockResolvedValue({{suggestion}}) for async methods. " +
        "Bare vi.fn() returns undefined, violating the interface contract and causing unpredictable test failures. " +
        "Consult QUALIA.MANUAL.md §10.4 for examples.",
      asyncMismatch:
        "QUALIA.CODE §10.3.1 VIOLATION: Mock method '{{methodName}}' returns Promise<{{promiseType}}> but uses mockReturnValue instead of mockResolvedValue. " +
        "CORRECT PATTERN: Use mockResolvedValue({{suggestion}}) for async methods. " +
        "Current pattern will cause 'Promise<undefined>' errors in tests.",
      syncMismatch:
        "QUALIA.CODE §10.3.1 VIOLATION: Mock method '{{methodName}}' returns {{returnType}} (synchronous) but uses mockResolvedValue (async). " +
        "CORRECT PATTERN: Use mockReturnValue({{suggestion}}) for synchronous methods. " +
        "Over-complicating mocks violates the simplicity principle."
    }
  },

  create(context) {
    const filename = context.getFilename();
    
    // Only apply this rule to files in src/testing/mocks/
    if (!filename.includes('testing/mocks') && !filename.includes('testing\\mocks')) {
      return {};
    }

    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // If TypeScript services not available, skip rule
      return {};
    }

    const { checker, tsNodeMap } = typeServices;

    /**
     * Get the interface type that this mock object is supposed to implement
     * by analyzing the type annotation of the export
     */
    function getMockInterfaceType(variableDeclarator) {
      if (!variableDeclarator.id || !variableDeclarator.id.typeAnnotation) {
        return null;
      }

      const typeAnnotation = variableDeclarator.id.typeAnnotation.typeAnnotation;
      return getNodeType(typeAnnotation, tsNodeMap, checker);
    }

    /**
     * Get default value suggestion based on type
     */
    function getDefaultValueSuggestion(type, checker) {
      if (!type) return 'defaultValue';
      
      const typeString = checker.typeToString(type);
      
      // Common primitive types
      if (typeString === 'string') return "''";
      if (typeString === 'number') return '0';
      if (typeString === 'boolean') return 'false';
      if (typeString === 'void') return 'undefined';
      if (typeString.includes('[]') || typeString.startsWith('Array<')) return '[]';
      
      // Object types
      if (typeString.includes('{') || type.getProperties().length > 0) {
        return '{}';
      }
      
      return 'defaultValue';
    }

    /**
     * Check if a property assignment is a mock function
     */
    function isMockFunction(propertyValue) {
      // Check for vi.fn() pattern
      if (propertyValue.type === 'CallExpression' &&
          propertyValue.callee.type === 'MemberExpression' &&
          propertyValue.callee.object.name === 'vi' &&
          propertyValue.callee.property.name === 'fn') {
        return {
          isMock: true,
          hasMockReturnValue: false,
          hasMockResolvedValue: false
        };
      }

      // Check for vi.fn().mockReturnValue() or vi.fn().mockResolvedValue() chain
      if (propertyValue.type === 'CallExpression' &&
          propertyValue.callee.type === 'MemberExpression') {
        
        const methodName = propertyValue.callee.property.name;
        const hasMockReturnValue = methodName === 'mockReturnValue';
        const hasMockResolvedValue = methodName === 'mockResolvedValue';
        
        // Check if the object is vi.fn()
        const object = propertyValue.callee.object;
        if (object.type === 'CallExpression' &&
            object.callee.type === 'MemberExpression' &&
            object.callee.object.name === 'vi' &&
            object.callee.property.name === 'fn') {
          return {
            isMock: true,
            hasMockReturnValue,
            hasMockResolvedValue
          };
        }
      }

      return {
        isMock: false,
        hasMockReturnValue: false,
        hasMockResolvedValue: false
      };
    }

    return {
      VariableDeclarator(node) {
        // Looking for: export const mockServiceName: IServiceName = { ... }
        if (!node.init || node.init.type !== 'ObjectExpression') {
          return;
        }

        const interfaceType = getMockInterfaceType(node);
        if (!interfaceType) {
          return;
        }

        // Iterate through each property of the mock object
        for (const property of node.init.properties) {
          if (property.type !== 'Property') continue;
          
          const methodName = property.key.name || property.key.value;
          if (!methodName) continue;

          // Get the method signature from the interface
          const methodSymbol = interfaceType.getProperty(methodName);
          if (!methodSymbol) continue;

          const methodType = checker.getTypeOfSymbolAtLocation(methodSymbol, tsNodeMap.get(property));
          if (!methodType) continue;

          // Get the return type of the method
          const signatures = methodType.getCallSignatures();
          if (signatures.length === 0) continue;

          const returnType = checker.getReturnTypeOfSignature(signatures[0]);
          const returnTypeString = checker.typeToString(returnType);

          // Check if this is void - void methods can use bare vi.fn()
          if (returnTypeString === 'void') {
            continue;
          }

          // Analyze the mock implementation
          const mockInfo = isMockFunction(property.value);
          
          if (!mockInfo.isMock) {
            continue; // Not a vi.fn() mock, skip
          }

          const isAsync = isPromiseType(returnType, checker);

          // VIOLATION 1: Bare vi.fn() for non-void method
          if (!mockInfo.hasMockReturnValue && !mockInfo.hasMockResolvedValue) {
            const promiseTypeArg = isAsync ? getPromiseTypeArgument(returnType, checker) : null;
            const suggestion = getDefaultValueSuggestion(
              isAsync ? promiseTypeArg : returnType,
              checker
            );

            context.report({
              node: property.value,
              messageId: 'lowFidelityMock',
              data: {
                methodName,
                returnType: returnTypeString,
                suggestion
              }
            });
          }

          // VIOLATION 2: Async method using mockReturnValue instead of mockResolvedValue
          if (isAsync && mockInfo.hasMockReturnValue && !mockInfo.hasMockResolvedValue) {
            const promiseTypeArg = getPromiseTypeArgument(returnType, checker);
            const suggestion = getDefaultValueSuggestion(promiseTypeArg, checker);

            context.report({
              node: property.value,
              messageId: 'asyncMismatch',
              data: {
                methodName,
                promiseType: promiseTypeArg ? checker.typeToString(promiseTypeArg) : 'unknown',
                suggestion
              }
            });
          }

          // VIOLATION 3: Sync method using mockResolvedValue instead of mockReturnValue
          if (!isAsync && mockInfo.hasMockResolvedValue && !mockInfo.hasMockReturnValue) {
            const suggestion = getDefaultValueSuggestion(returnType, checker);

            context.report({
              node: property.value,
              messageId: 'syncMismatch',
              data: {
                methodName,
                returnType: returnTypeString,
                suggestion
              }
            });
          }
        }
      }
    };
  }
};
