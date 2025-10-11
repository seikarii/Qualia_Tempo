/**
 * @fileoverview Semantic Analysis Helpers for SALA (Semantically-Aware Linting Architecture)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * This module provides utilities for TypeScript Type Checker-based semantic analysis.
 * All rules should use these helpers instead of regex/string matching.
 * 
 * PHILOSOPHY: We operate on types, not text. We understand code, not parse strings.
 */

'use strict';

const ts = require('typescript');

/**
 * Validates that parserServices are available and throws descriptive error if not
 * @param {Object} context - ESLint rule context
 * @returns {Object} parserServices with type checker
 * @throws {Error} if parserServices not available
 */
function requireTypeChecker(context) {
  const parserServices = context.parserServices;
  
  if (!parserServices || !parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
    throw new Error(
      'QUALIA.CODE SALA Violation: This rule requires TypeScript parser services. ' +
      'Ensure @typescript-eslint/parser is configured in your ESLint config with ' +
      'parserOptions.project pointing to your tsconfig.json'
    );
  }
  
  return {
    checker: parserServices.program.getTypeChecker(),
    program: parserServices.program,
    tsNodeMap: parserServices.esTreeNodeToTSNodeMap
  };
}

/**
 * Get the source file where a symbol is declared
 * @param {ts.Symbol} symbol - TypeScript symbol
 * @returns {string|null} - File path or null
 */
function getSymbolDeclarationFile(symbol) {
  if (!symbol || !symbol.declarations || symbol.declarations.length === 0) {
    return null;
  }
  
  const declaration = symbol.declarations[0];
  const sourceFile = declaration.getSourceFile();
  return sourceFile ? sourceFile.fileName : null;
}

/**
 * Check if a type originates from a specific file
 * @param {ts.Type} type - TypeScript type
 * @param {string} targetFile - File path pattern to match (e.g., 'api-client.ts')
 * @returns {boolean}
 */
function isTypeFromFile(type, targetFile) {
  if (!type) return false;
  
  const symbol = type.getSymbol();
  if (!symbol) return false;
  
  const filePath = getSymbolDeclarationFile(symbol);
  if (!filePath) return false;
  
  return filePath.includes(targetFile);
}

/**
 * Check if a type is a concrete class (not interface or type alias)
 * @param {ts.Type} type - TypeScript type
 * @returns {boolean}
 */
function isConcreteClass(type) {
  if (!type) return false;
  
  const symbol = type.getSymbol();
  if (!symbol) return false;
  
  return !!(symbol.flags & ts.SymbolFlags.Class);
}

/**
 * Check if a type is an interface
 * @param {ts.Type} type - TypeScript type
 * @returns {boolean}
 */
function isInterface(type) {
  if (!type) return false;
  
  const symbol = type.getSymbol();
  if (!symbol) return false;
  
  return !!(symbol.flags & ts.SymbolFlags.Interface);
}

/**
 * Check if a type extends or implements a specific base type
 * @param {ts.Type} type - TypeScript type to check
 * @param {string} baseTypeName - Name of base type to look for
 * @param {ts.TypeChecker} checker - TypeScript type checker
 * @returns {boolean}
 */
function extendsType(type, baseTypeName, checker) {
  if (!type) return false;
  
  // Check if the type itself matches
  const symbol = type.getSymbol();
  if (symbol && symbol.name === baseTypeName) {
    return true;
  }
  
  // Check base types
  const baseTypes = type.getBaseTypes ? type.getBaseTypes() : [];
  for (const baseType of baseTypes) {
    if (extendsType(baseType, baseTypeName, checker)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get the return type of a function/method
 * @param {ts.Type} functionType - Function type
 * @param {ts.TypeChecker} checker - Type checker
 * @returns {ts.Type|null}
 */
function getReturnType(functionType, checker) {
  if (!functionType) return null;
  
  const signatures = functionType.getCallSignatures();
  if (signatures.length === 0) return null;
  
  return checker.getReturnTypeOfSignature(signatures[0]);
}

/**
 * Check if a type is a Promise
 * @param {ts.Type} type - TypeScript type
 * @param {ts.TypeChecker} checker - Type checker
 * @returns {boolean}
 */
function isPromiseType(type, checker) {
  if (!type) return false;
  
  const symbol = type.getSymbol();
  if (symbol && symbol.name === 'Promise') return true;
  
  // Check if it's a generic Promise<T>
  if (type.symbol && type.symbol.name === 'Promise') return true;
  
  // Check for thenable (has then method)
  const thenProp = type.getProperty('then');
  return !!thenProp;
}

/**
 * Extract the type argument from a Promise<T>
 * @param {ts.Type} promiseType - Promise type
 * @param {ts.TypeChecker} checker - Type checker
 * @returns {ts.Type|null}
 */
function getPromiseTypeArgument(promiseType, checker) {
  if (!promiseType) return null;
  
  // For generic types like Promise<T>
  if (checker.getTypeArguments && promiseType.typeArguments) {
    const typeArgs = promiseType.typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      return typeArgs[0];
    }
  }
  
  return null;
}

/**
 * Get all decorators of a class/method node
 * @param {Object} node - ESTree node
 * @returns {Array} Array of decorator nodes
 */
function getDecorators(node) {
  // TypeScript 4.8+ moved decorators to modifiers
  if (node.decorators) {
    return node.decorators;
  }
  
  if (node.modifiers) {
    return node.modifiers.filter(mod => mod.kind === ts.SyntaxKind.Decorator);
  }
  
  return [];
}

/**
 * Check if a node has a specific decorator
 * @param {Object} node - ESTree node
 * @param {string} decoratorName - Name of decorator to look for
 * @returns {boolean}
 */
function hasDecorator(node, decoratorName) {
  const decorators = getDecorators(node);
  
  return decorators.some(decorator => {
    const expr = decorator.expression;
    
    // Simple decorator: @decoratorName
    if (expr.type === 'Identifier' && expr.name === decoratorName) {
      return true;
    }
    
    // Decorator with arguments: @decoratorName(...)
    if (expr.type === 'CallExpression' && 
        expr.callee && 
        expr.callee.name === decoratorName) {
      return true;
    }
    
    return false;
  });
}

/**
 * Get decorator by name
 * @param {Object} node - ESTree node
 * @param {string} decoratorName - Name of decorator
 * @returns {Object|null} Decorator node or null
 */
function getDecoratorByName(node, decoratorName) {
  const decorators = getDecorators(node);
  
  return decorators.find(decorator => {
    const expr = decorator.expression;
    
    if (expr.type === 'Identifier' && expr.name === decoratorName) {
      return true;
    }
    
    if (expr.type === 'CallExpression' && 
        expr.callee && 
        expr.callee.name === decoratorName) {
      return true;
    }
    
    return false;
  });
}

/**
 * Get the type of a node using TypeScript type checker
 * @param {Object} esNode - ESTree node
 * @param {Map} tsNodeMap - ESTree to TS node map
 * @param {ts.TypeChecker} checker - Type checker
 * @returns {ts.Type|null}
 */
function getNodeType(esNode, tsNodeMap, checker) {
  try {
    const tsNode = tsNodeMap.get(esNode);
    if (!tsNode) return null;
    
    return checker.getTypeAtLocation(tsNode);
  } catch (error) {
    return null;
  }
}

/**
 * Check if a file path matches a pattern
 * @param {string} filePath - File path to check
 * @param {string} pattern - Pattern to match (e.g., 'events.contracts.ts')
 * @returns {boolean}
 */
function filePathMatches(filePath, pattern) {
  if (!filePath) return false;
  return filePath.includes(pattern);
}

module.exports = {
  requireTypeChecker,
  getSymbolDeclarationFile,
  isTypeFromFile,
  isConcreteClass,
  isInterface,
  extendsType,
  getReturnType,
  isPromiseType,
  getPromiseTypeArgument,
  getDecorators,
  hasDecorator,
  getDecoratorByName,
  getNodeType,
  filePathMatches
};
