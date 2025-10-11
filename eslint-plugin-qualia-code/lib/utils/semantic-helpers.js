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
  
  // Check base types - ensure we always have an iterable array
  const baseTypes = (type.getBaseTypes && type.getBaseTypes()) || [];
  if (!Array.isArray(baseTypes)) return false; // Safety check
  
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

//------------------------------------------------------------------------------
// Complexity Analysis Helpers (Phase 2 Semantic Upgrade)
//------------------------------------------------------------------------------

/**
 * Analyze computational complexity of a method
 * @param {Object} methodNode - ESTree MethodDefinition or FunctionDeclaration node
 * @param {ts.TypeChecker} checker - TypeScript type checker
 * @param {Map} tsNodeMap - ESTree to TS node map
 * @returns {Object} { score: number, reasons: string[], details: Object }
 */
function analyzeMethodComplexity(methodNode, checker, tsNodeMap) {
  const analysis = {
    score: 0,
    reasons: [],
    details: {
      loops: 0,
      nestedLoops: 0,
      recursiveCalls: 0,
      arrayIterations: [],
      expensiveOperations: []
    }
  };

  if (!methodNode.value || !methodNode.value.body) {
    return analysis;
  }

  const methodName = methodNode.key ? methodNode.key.name : 'anonymous';
  const body = methodNode.value.body;

  // Analyze loop complexity
  const loopAnalysis = countNestedLoops(body);
  analysis.details.loops = loopAnalysis.totalLoops;
  analysis.details.nestedLoops = loopAnalysis.maxNesting;
  
  if (loopAnalysis.totalLoops > 0) {
    analysis.score += loopAnalysis.totalLoops * 10;
    analysis.reasons.push(`${loopAnalysis.totalLoops} loop(s) detected`);
  }
  
  if (loopAnalysis.maxNesting >= 2) {
    const exponentialScore = Math.pow(50, loopAnalysis.maxNesting - 1);
    analysis.score += exponentialScore;
    analysis.reasons.push(`nested loops (depth ${loopAnalysis.maxNesting}) = O(n^${loopAnalysis.maxNesting}) complexity`);
  }

  // Analyze recursion
  const recursionCount = detectRecursion(body, methodName);
  if (recursionCount > 0) {
    analysis.score += 100;
    analysis.details.recursiveCalls = recursionCount;
    analysis.reasons.push(`recursive calls detected (${recursionCount})`);
  }

  // Analyze array iterations with type checker
  const arrayIterations = analyzeArrayIterations(body, checker, tsNodeMap);
  analysis.details.arrayIterations = arrayIterations;
  
  arrayIterations.forEach(iteration => {
    const typeScore = iteration.elementComplexity || 5;
    analysis.score += typeScore;
    if (typeScore > 20) {
      analysis.reasons.push(`iterating over complex type ${iteration.elementType} (${iteration.elementComplexity} complexity)`);
    }
  });

  // Analyze expensive operations (Math operations, string operations, etc.)
  const expensiveOps = detectExpensiveOperations(body);
  analysis.details.expensiveOperations = expensiveOps;
  
  if (expensiveOps.length > 5) {
    analysis.score += expensiveOps.length * 2;
    analysis.reasons.push(`${expensiveOps.length} expensive operations (Math, string manipulation)`);
  }

  return analysis;
}

/**
 * Count loops and determine maximum nesting depth
 * @param {Object} node - ESTree node
 * @returns {Object} { totalLoops: number, maxNesting: number }
 */
function countNestedLoops(node) {
  const result = { totalLoops: 0, maxNesting: 0 };
  
  function traverse(currentNode, depth = 0) {
    if (!currentNode) return;

    const isLoop = currentNode.type === 'ForStatement' ||
                   currentNode.type === 'ForInStatement' ||
                   currentNode.type === 'ForOfStatement' ||
                   currentNode.type === 'WhileStatement' ||
                   currentNode.type === 'DoWhileStatement';

    if (isLoop) {
      result.totalLoops++;
      result.maxNesting = Math.max(result.maxNesting, depth + 1);
      
      // Traverse loop body at increased depth
      if (currentNode.body) {
        if (currentNode.body.type === 'BlockStatement') {
          currentNode.body.body.forEach(stmt => traverse(stmt, depth + 1));
        } else {
          traverse(currentNode.body, depth + 1);
        }
      }
      return; // Don't double-traverse
    }

    // Traverse child nodes
    for (const key in currentNode) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      
      const child = currentNode[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item, depth));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child, depth);
      }
    }
  }

  traverse(node);
  return result;
}

/**
 * Detect if method calls itself (recursion)
 * @param {Object} node - ESTree node
 * @param {string} methodName - Name of the method
 * @returns {number} Count of recursive calls
 */
function detectRecursion(node, methodName) {
  let count = 0;

  function traverse(currentNode) {
    if (!currentNode) return;

    if (currentNode.type === 'CallExpression') {
      // ONLY count as recursive if:
      // 1. this.methodName() - calling own method
      // 2. super.methodName() - calling parent's version
      // 3. Plain methodName() - only for non-method functions
      if (currentNode.callee.type === 'MemberExpression') {
        const object = currentNode.callee.object;
        const property = currentNode.callee.property;
        
        // Only count if calling this.methodName() or super.methodName()
        if (property && property.name === methodName &&
            object.type === 'ThisExpression' || object.type === 'Super') {
          count++;
        }
        // DO NOT count other.methodName() - that's not recursion!
      } else if (currentNode.callee.type === 'Identifier' && 
                 currentNode.callee.name === methodName) {
        // Plain methodName() - only count for standalone functions, not methods
        // For methods, only this.methodName() should count
        count++;
      }
    }

    // Traverse children
    for (const key in currentNode) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      
      const child = currentNode[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return count;
}

/**
 * Analyze array iterations and get element type complexity
 * @param {Object} node - ESTree node
 * @param {ts.TypeChecker} checker - TypeScript type checker
 * @param {Map} tsNodeMap - ESTree to TS node map
 * @returns {Array} Array of { elementType: string, elementComplexity: number }
 */
function analyzeArrayIterations(node, checker, tsNodeMap) {
  const iterations = [];

  function traverse(currentNode) {
    if (!currentNode) return;

    // ForOf: for (const item of array)
    if (currentNode.type === 'ForOfStatement' && currentNode.right) {
      const arrayType = getNodeType(currentNode.right, tsNodeMap, checker);
      if (arrayType) {
        const elementInfo = getArrayElementTypeComplexity(arrayType, checker);
        if (elementInfo) {
          iterations.push(elementInfo);
        }
      }
    }

    // Array methods: array.forEach, array.map, etc.
    if (currentNode.type === 'CallExpression' &&
        currentNode.callee.type === 'MemberExpression' &&
        currentNode.callee.property &&
        ['forEach', 'map', 'filter', 'reduce', 'find', 'some', 'every'].includes(currentNode.callee.property.name)) {
      
      const arrayType = getNodeType(currentNode.callee.object, tsNodeMap, checker);
      if (arrayType) {
        const elementInfo = getArrayElementTypeComplexity(arrayType, checker);
        if (elementInfo) {
          iterations.push(elementInfo);
        }
      }
    }

    // Traverse children
    for (const key in currentNode) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      
      const child = currentNode[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return iterations;
}

/**
 * Get array element type and complexity score
 * @param {ts.Type} arrayType - TypeScript array type
 * @param {ts.TypeChecker} checker - TypeScript type checker
 * @returns {Object|null} { elementType: string, elementComplexity: number }
 */
function getArrayElementTypeComplexity(arrayType, checker) {
  try {
    if (!arrayType) return null;

    // Check if it's an array type
    if (checker.isArrayType && checker.isArrayType(arrayType)) {
      const typeArgs = arrayType.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        const elementType = typeArgs[0];
        const typeName = checker.typeToString(elementType);
        const complexity = getTypeComplexityScore(elementType, checker);
        return { elementType: typeName, elementComplexity: complexity };
      }
    }

    // Try to get type reference for Array<T>
    if (arrayType.symbol && arrayType.symbol.name === 'Array') {
      const typeArgs = checker.getTypeArguments(arrayType);
      if (typeArgs && typeArgs.length > 0) {
        const elementType = typeArgs[0];
        const typeName = checker.typeToString(elementType);
        const complexity = getTypeComplexityScore(elementType, checker);
        return { elementType: typeName, elementComplexity: complexity };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Score type complexity based on properties and methods
 * @param {ts.Type} type - TypeScript type
 * @param {ts.TypeChecker} checker - TypeScript type checker
 * @returns {number} Complexity score
 */
function getTypeComplexityScore(type, checker) {
  if (!type) return 5; // Default for unknown types

  try {
    // Primitive types have low complexity
    if (type.flags & ts.TypeFlags.String) return 1;
    if (type.flags & ts.TypeFlags.Number) return 1;
    if (type.flags & ts.TypeFlags.Boolean) return 1;
    if (type.flags & ts.TypeFlags.Null) return 1;
    if (type.flags & ts.TypeFlags.Undefined) return 1;

    // Object types - count properties and methods
    const properties = type.getProperties();
    if (properties.length === 0) return 5;

    let score = properties.length * 2; // Base score from property count

    // Check for methods (higher complexity)
    properties.forEach(prop => {
      const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration);
      if (propType && propType.getCallSignatures && propType.getCallSignatures().length > 0) {
        score += 5; // Methods add more complexity
      }
    });

    // Cap the score for complex types (e.g., Particle with 20 properties)
    return Math.min(score, 100);
  } catch (error) {
    return 10; // Default for error cases
  }
}

/**
 * Detect expensive operations (Math, string operations, etc.)
 * @param {Object} node - ESTree node
 * @returns {Array} Array of { type: string, operation: string }
 */
function detectExpensiveOperations(node) {
  const operations = [];
  const expensiveMathOps = ['sin', 'cos', 'tan', 'sqrt', 'pow', 'exp', 'log'];
  const expensiveStringOps = ['replace', 'split', 'match', 'search'];

  function traverse(currentNode) {
    if (!currentNode) return;

    if (currentNode.type === 'CallExpression' && currentNode.callee.type === 'MemberExpression') {
      const object = currentNode.callee.object;
      const property = currentNode.callee.property;

      // Math operations
      if (object.type === 'Identifier' && object.name === 'Math' && property && property.name) {
        if (expensiveMathOps.includes(property.name)) {
          operations.push({ type: 'Math', operation: property.name });
        }
      }

      // String operations
      if (property && expensiveStringOps.includes(property.name)) {
        operations.push({ type: 'String', operation: property.name });
      }
    }

    // Traverse children
    for (const key in currentNode) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      
      const child = currentNode[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return operations;
}

//------------------------------------------------------------------------------
// Operation Detection Helpers (For Decorator Rules)
//------------------------------------------------------------------------------

/**
 * Detect DOM event subscriptions in method body
 * @param {Object} methodNode - ESTree MethodDefinition node
 * @returns {Array} Array of {eventType: string, isHighFrequency: boolean}
 */
function detectDOMEventSubscriptions(methodNode) {
  const subscriptions = [];
  const highFreqEvents = ['scroll', 'mousemove', 'resize', 'drag', 'wheel', 'touchmove', 'pointermove'];
  
  function traverse(node) {
    if (!node) return;

    // addEventListener('scroll', ...)
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property &&
        node.callee.property.name === 'addEventListener' &&
        node.arguments && node.arguments.length > 0) {
      
      const eventArg = node.arguments[0];
      if (eventArg.type === 'Literal' && typeof eventArg.value === 'string') {
        subscriptions.push({
          eventType: eventArg.value,
          isHighFrequency: highFreqEvents.includes(eventArg.value.toLowerCase())
        });
      }
    }

    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  const body = methodNode.value && methodNode.value.body;
  if (body) traverse(body);
  return subscriptions;
}

/**
 * Detect state mutations in method body
 * @param {Object} methodNode - ESTree MethodDefinition node
 * @returns {Array} Array of {target: string, property: string}
 */
function detectStateMutations(methodNode) {
  const mutations = [];
  
  function traverse(node) {
    if (!node) return;

    // this.state = ..., this.store.setState(...), store.set(...)
    if (node.type === 'AssignmentExpression' &&
        node.left.type === 'MemberExpression') {
      const object = node.left.object;
      const property = node.left.property;
      
      if (object.type === 'ThisExpression' && property && 
          (property.name === 'state' || property.name === 'store')) {
        mutations.push({
          target: 'this',
          property: property.name
        });
      }
    }

    // store.setState(...), store.set(...)
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression') {
      const property = node.callee.property;
      if (property && (property.name === 'setState' || property.name === 'set' || property.name === 'update')) {
        mutations.push({
          target: 'store',
          property: property.name
        });
      }
    }

    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  const body = methodNode.value && methodNode.value.body;
  if (body) traverse(body);
  return mutations;
}

/**
 * Detect privileged operations (database writes, auth checks, etc.)
 * @param {Object} methodNode - ESTree MethodDefinition node
 * @returns {Array} Array of {type: string, operation: string}
 */
function detectPrivilegedOperations(methodNode) {
  const operations = [];
  const privilegedMethods = ['delete', 'remove', 'destroy', 'update', 'modify', 'admin', 'grant', 'revoke'];
  
  function traverse(node) {
    if (!node) return;

    // Database/API operations
    if (node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression') {
      const property = node.callee.property;
      if (property && privilegedMethods.some(pm => property.name.toLowerCase().includes(pm))) {
        operations.push({
          type: 'database',
          operation: property.name
        });
      }
    }

    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  const body = methodNode.value && methodNode.value.body;
  if (body) traverse(body);
  return operations;
}

/**
 * Detect I/O operations (HTTP, fetch, database calls)
 * @param {Object} methodNode - ESTree MethodDefinition node
 * @returns {Array} Array of {type: string, operation: string}
 */
function detectIOOperations(methodNode) {
  const operations = [];
  
  function traverse(node) {
    if (!node) return;

    // fetch(...), axios.get(...), httpService.post(...)
    if (node.type === 'CallExpression') {
      if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
        operations.push({ type: 'HTTP', operation: 'fetch' });
      }
      
      if (node.callee.type === 'MemberExpression') {
        const object = node.callee.object;
        const property = node.callee.property;
        
        if (property && ['get', 'post', 'put', 'delete', 'patch', 'request'].includes(property.name)) {
          operations.push({ type: 'HTTP', operation: property.name });
        }
      }
    }

    // Traverse children
    for (const key in node) {
      if (key === 'parent' || key === 'range' || key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(item => traverse(item));
      } else if (child && typeof child === 'object' && child.type) {
        traverse(child);
      }
    }
  }

  const body = methodNode.value && methodNode.value.body;
  if (body) traverse(body);
  return operations;
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
  filePathMatches,
  // Complexity analysis helpers
  analyzeMethodComplexity,
  countNestedLoops,
  detectRecursion,
  analyzeArrayIterations,
  getArrayElementTypeComplexity,
  getTypeComplexityScore,
  detectExpensiveOperations,
  // Operation detection helpers (for decorator rules)
  detectDOMEventSubscriptions,
  detectStateMutations,
  detectPrivilegedOperations,
  detectIOOperations
};
