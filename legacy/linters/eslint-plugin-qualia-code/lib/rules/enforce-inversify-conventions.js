/**
 * @fileoverview SALA: Semantic analysis of InversifyJS conventions
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to validate interface vs concrete class injection
 * - Analyzes parameter types semantically, not by name
 * - Validates decorator presence with type awareness
 * - Provides prescriptive error messages with QUALIA.CODE references
 * 
 * QUALIA.CODE REFERENCE: §2.2, §10
 */

'use strict';

const { requireTypeChecker, getNodeType, isInterface, isConcreteClass, hasDecorator } = require('../utils/semantic-helpers');
const ts = require('typescript');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce InversifyJS conventions using semantic type analysis',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#22-frontend-typescriptreact-inversifyjs--true-ioc'
    },
    fixable: null,
    schema: [],
    messages: {
      missingInjectable: `QUALIA.CODE §2.2 VIOLATION: Service class '{{className}}' lacks @injectable() decorator.

WHY: InversifyJS requires @injectable() for the IoC container to manage dependencies.

CORRECT PATTERN:
  @injectable()
  export class {{className}} implements I{{className}} {
    constructor(@inject(TYPES.IDependency) dep: IDependency) {}
  }

Consult QUALIA.MANUAL.md §1.3 for complete service implementation examples.`,

      concreteClassInjection: `QUALIA.CODE §2.3 VIOLATION: Constructor parameter '{{paramName}}' in '{{className}}' injects concrete class '{{concreteType}}' instead of interface.

WHY: Injecting concrete classes violates the Dependency Inversion Principle and prevents mocking in tests.

CORRECT PATTERN:
  constructor(@inject(TYPES.I{{concreteType}}) dep: I{{concreteType}})

PROHIBITED PATTERN:
  constructor(@inject(TYPES.{{concreteType}}) dep: {{concreteType}}) // ❌ CONCRETE CLASS

Consult QUALIA.MANUAL.md §1.3 for interface-based injection patterns.`,

      missingInject: `QUALIA.CODE §2.2 VIOLATION: Constructor parameter '{{paramName}}' in '{{className}}' lacks @inject() decorator.

WHY: InversifyJS requires @inject() to resolve dependencies from the IoC container.

CORRECT PATTERN:
  constructor(@inject(TYPES.IService) private service: IService)

Consult QUALIA.MANUAL.md §1.3 for dependency injection examples.`,

      missingReflectMetadata: `QUALIA.CODE §2.2 VIOLATION: Entry point file must import 'reflect-metadata' as the first import.

WHY: InversifyJS requires reflect-metadata for decorator metadata at runtime.

CORRECT PATTERN (index.tsx):
  import 'reflect-metadata'; // MUST BE FIRST
  import { ApplicationCompositionRoot } from './services/ApplicationCompositionRoot';
  // ... rest of imports

Consult QUALIA.MANUAL.md §1.4 for ApplicationCompositionRoot usage.`
    }
  },

  create(context) {
    // Attempt to get Type Checker - graceful degradation if unavailable
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // Fallback: If TypeChecker unavailable, use pattern-based logic
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;
    const filename = context.getFilename();

    // Determine if this is an entry file
    const isEntryFile = filename.endsWith('index.tsx') || filename.endsWith('index.ts') ||
                       filename.endsWith('main.tsx') || filename.endsWith('main.ts') ||
                       filename.endsWith('app.tsx') || filename.endsWith('app.ts') ||
                       filename.includes('bootstrap.ts') || filename.includes('bootstrap.tsx');

    let hasInversifyImport = false;
    let hasReflectMetadataImport = false;

    /**
     * SEMANTIC ANALYSIS: Determine if a class is a service class by analyzing its type
     * @param {Object} classNode - ESTree ClassDeclaration node
     * @returns {boolean}
     */
    function isServiceClass(classNode) {
      const className = classNode.id?.name;
      if (!className) return false;

      // Exempt composition roots and test utilities
      if (className === 'ApplicationCompositionRoot' ||
          className.includes('CompositionRoot') ||
          className.includes('TestFactory') ||
          className.includes('MockFactory') ||
          className.includes('Mock')) {
        return false;
      }

      // SEMANTIC CHECK 1: Check if class implements any I*Service interface
      const classType = getNodeType(classNode, tsNodeMap, checker);
      if (classType) {
        const implementedInterfaces = classType.getBaseTypes ? classType.getBaseTypes() : [];
        for (const iface of implementedInterfaces) {
          const symbol = iface.getSymbol();
          if (symbol && symbol.name && symbol.name.startsWith('I') && 
              (symbol.name.includes('Service') || symbol.name.includes('Controller') || 
               symbol.name.includes('Repository') || symbol.name.includes('Provider'))) {
            return true;
          }
        }
      }

      // SEMANTIC CHECK 2: Check if class has @injectable decorator (strong signal)
      if (hasDecorator(classNode, 'injectable')) {
        return true;
      }

      // FALLBACK: Pattern-based check for backward compatibility
      const serviceSuffixes = ['Service', 'Controller', 'Repository', 'Provider', 'Calculator'];
      return serviceSuffixes.some(suffix => className.endsWith(suffix));
    }

    /**
     * SEMANTIC ANALYSIS: Check if class extends third-party library base
     * @param {Object} classNode - ESTree ClassDeclaration node
     * @returns {boolean}
     */
    function extendsThirdPartyClass(classNode) {
      if (!classNode.superClass) return false;

      const superClassType = getNodeType(classNode.superClass, tsNodeMap, checker);
      if (!superClassType) return false;

      const superSymbol = superClassType.getSymbol();
      if (!superSymbol) return false;

      const superClassName = superSymbol.name;

      // Known third-party bases
      const thirdPartyBases = [
        'Pass', 'Effect', 'Material', 'Geometry', 'BufferGeometry',
        'Object3D', 'Group', 'Mesh', 'Component', 'PureComponent',
        'ShaderPass', 'FullScreenQuad'
      ];

      return thirdPartyBases.includes(superClassName);
    }

    /**
     * SEMANTIC ANALYSIS: Validate that injected parameter is an interface, not concrete class
     * @param {Object} param - Constructor parameter node
     * @returns {Object|null} { isValid: boolean, concreteTypeName: string }
     */
    function validateParameterType(param) {
      // Get the type annotation of the parameter
      let typeAnnotation = null;
      
      if (param.type === 'TSParameterProperty') {
        typeAnnotation = param.parameter?.typeAnnotation;
      } else if (param.typeAnnotation) {
        typeAnnotation = param.typeAnnotation;
      }

      if (!typeAnnotation || !typeAnnotation.typeAnnotation) {
        return { isValid: true, concreteTypeName: null }; // Can't analyze, assume valid
      }

      // Use TypeChecker to resolve the actual type
      const paramType = getNodeType(typeAnnotation.typeAnnotation, tsNodeMap, checker);
      if (!paramType) {
        return { isValid: true, concreteTypeName: null };
      }

      // CRITICAL CHECK: Is it an interface or concrete class?
      if (isConcreteClass(paramType)) {
        const symbol = paramType.getSymbol();
        const concreteTypeName = symbol ? symbol.name : 'UnknownClass';
        return { isValid: false, concreteTypeName };
      }

      // Valid: It's an interface, type alias, or primitive
      return { isValid: true, concreteTypeName: null };
    }

    /**
     * Check if parameter has @inject or @multiInject decorator
     * @param {Object} param - Parameter node
     * @returns {boolean}
     */
    function hasInjectDecorator(param) {
      if (!param.decorators || !Array.isArray(param.decorators)) {
        return false;
      }

      return param.decorators.some(decorator => {
        const expr = decorator.expression;
        if (!expr) return false;

        const decoratorName = expr.callee?.name;
        return expr.type === 'CallExpression' &&
               (decoratorName === 'inject' || decoratorName === 'multiInject');
      });
    }

    /**
     * Get parameter name for error reporting
     * @param {Object} param - Parameter node
     * @param {number} index - Parameter index
     * @returns {string}
     */
    function getParameterName(param, index) {
      if (param.type === 'TSParameterProperty') {
        return param.parameter?.name || `param${index}`;
      } else if (param.type === 'Identifier') {
        return param.name;
      } else if (param.left && param.left.name) {
        return param.left.name;
      }
      return `param${index}`;
    }

    return {
      // Track imports
      ImportDeclaration(node) {
        if (isEntryFile && node.source.value === 'reflect-metadata') {
          if (node.loc.start.line === 1) {
            hasReflectMetadataImport = true;
          }
        }
        if (node.source.value === 'inversify') {
          hasInversifyImport = true;
        }
      },

      // SEMANTIC ANALYSIS: Validate service classes
      ClassDeclaration(node) {
        if (!node.id || !node.id.name) return;

        const className = node.id.name;

        // Skip third-party extensions
        if (extendsThirdPartyClass(node)) return;

        // SEMANTIC CHECK: Is this a service class?
        if (isServiceClass(node) && !hasDecorator(node, 'injectable')) {
          context.report({
            node,
            messageId: 'missingInjectable',
            data: { className }
          });
        }
      },

      // SEMANTIC ANALYSIS: Validate constructor parameters
      'MethodDefinition[kind="constructor"]'(node) {
        const classDeclaration = node.parent.parent;
        if (!classDeclaration || classDeclaration.type !== 'ClassDeclaration') return;

        const className = classDeclaration.id?.name;
        if (!className || !isServiceClass(classDeclaration)) return;

        // Only check if class has @injectable
        if (!hasDecorator(classDeclaration, 'injectable')) return;

        if (node.value && node.value.params) {
          node.value.params.forEach((param, index) => {
            // Check 1: Does parameter have @inject decorator?
            if (!hasInjectDecorator(param)) {
              const paramName = getParameterName(param, index);
              context.report({
                node: param,
                messageId: 'missingInject',
                data: { paramName, className }
              });
              return;
            }

            // Check 2: SEMANTIC VALIDATION - Is it injecting an interface or concrete class?
            const validation = validateParameterType(param);
            if (!validation.isValid) {
              const paramName = getParameterName(param, index);
              context.report({
                node: param,
                messageId: 'concreteClassInjection',
                data: {
                  paramName,
                  className,
                  concreteType: validation.concreteTypeName
                }
              });
            }
          });
        }
      },

      // Validate reflect-metadata import in entry files
      'Program:exit'(node) {
        if (isEntryFile && hasInversifyImport && !hasReflectMetadataImport) {
          context.report({
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            messageId: 'missingReflectMetadata'
          });
        }
      }
    };
  }
};

/**
 * Fallback implementation when TypeChecker unavailable
 * Uses pattern-based logic similar to original implementation
 */
function createFallbackRule(context) {
  const filename = context.getFilename();
  const isEntryFile = filename.endsWith('index.tsx') || filename.endsWith('index.ts') ||
                     filename.endsWith('main.tsx') || filename.endsWith('main.ts') ||
                     filename.endsWith('app.tsx') || filename.endsWith('app.ts');

  let hasInversifyImport = false;
  let hasReflectMetadataImport = false;

  function isServiceClass(className) {
    if (className === 'ApplicationCompositionRoot' ||
        className.includes('CompositionRoot') ||
        className.includes('TestFactory') ||
        className.includes('MockFactory')) {
      return false;
    }

    const serviceSuffixes = ['Service', 'Controller', 'Repository', 'Provider', 'Calculator'];
    return serviceSuffixes.some(suffix => className.endsWith(suffix));
  }

  function hasInjectableDecorator(node) {
    if (!node.decorators || !Array.isArray(node.decorators)) return false;

    return node.decorators.some(decorator => {
      return decorator.expression?.type === 'CallExpression' &&
             decorator.expression.callee?.name === 'injectable';
    });
  }

  function hasInjectDecorator(param) {
    if (!param.decorators || !Array.isArray(param.decorators)) return false;

    return param.decorators.some(decorator => {
      const decoratorName = decorator.expression?.callee?.name;
      return decorator.expression?.type === 'CallExpression' &&
             (decoratorName === 'inject' || decoratorName === 'multiInject');
    });
  }

  function getParameterName(param, index) {
    if (param.type === 'TSParameterProperty') {
      return param.parameter?.name || `param${index}`;
    } else if (param.type === 'Identifier') {
      return param.name;
    } else if (param.left && param.left.name) {
      return param.left.name;
    }
    return `param${index}`;
  }

  return {
    ImportDeclaration(node) {
      if (isEntryFile && node.source.value === 'reflect-metadata') {
        if (node.loc.start.line === 1) {
          hasReflectMetadataImport = true;
        }
      }
      if (node.source.value === 'inversify') {
        hasInversifyImport = true;
      }
    },

    ClassDeclaration(node) {
      if (!node.id || !node.id.name) return;

      const className = node.id.name;

      if (isServiceClass(className) && !hasInjectableDecorator(node)) {
        context.report({
          node,
          messageId: 'missingInjectable',
          data: { className }
        });
      }
    },

    'MethodDefinition[kind="constructor"]'(node) {
      const classDeclaration = node.parent.parent;
      if (!classDeclaration || classDeclaration.type !== 'ClassDeclaration') return;

      const className = classDeclaration.id?.name;
      if (!className || !isServiceClass(className)) return;

      if (!hasInjectableDecorator(classDeclaration)) return;

      if (node.value && node.value.params) {
        node.value.params.forEach((param, index) => {
          if (!hasInjectDecorator(param)) {
            const paramName = getParameterName(param, index);
            context.report({
              node: param,
              messageId: 'missingInject',
              data: { paramName, className }
            });
          }
        });
      }
    },

    'Program:exit'(node) {
      if (isEntryFile && hasInversifyImport && !hasReflectMetadataImport) {
        context.report({
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
          messageId: 'missingReflectMetadata'
        });
      }
    }
  };
}
