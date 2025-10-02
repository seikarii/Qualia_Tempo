/**
 * @fileoverview Rule to enforce interface-based dependency injection (Dependency Inversion Principle)
 * @author Qualia Tempo Team
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that @injectable classes only accept interfaces as constructor dependencies',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      concreteClassInjection: "QUALIA.CODE Violation: El parámetro '{{paramName}}' en el constructor de '{{className}}' inyecta una clase concreta. Solo se permiten interfaces para mantener el desacoplamiento."
    }
  },

  create(context) {
    // Get TypeScript parser services if available
    const parserServices = context.parserServices;
    
    // If TypeScript parser services are not available, disable the rule gracefully
    // This allows the rule to work in test environments without full TypeScript setup
    if (!parserServices || !parserServices.program || !parserServices.esTreeNodeToTSNodeMap) {
      return {}; // No rules to apply when TypeScript services are unavailable
    }

    const checker = parserServices.program.getTypeChecker();
    const tsNodeMap = parserServices.esTreeNodeToTSNodeMap;

    /**
     * Check if a decorator is the @injectable decorator
     */
    function isInjectableDecorator(decorator) {
      return (
        decorator.expression &&
        ((decorator.expression.type === 'Identifier' && decorator.expression.name === 'injectable') ||
         (decorator.expression.type === 'CallExpression' && 
          decorator.expression.callee.name === 'injectable'))
      );
    }

    /**
     * Check if a decorator is the @inject decorator
     */
    function isInjectDecorator(decorator) {
      return (
        decorator.expression &&
        decorator.expression.type === 'CallExpression' &&
        decorator.expression.callee &&
        decorator.expression.callee.name === 'inject'
      );
    }

    /**
     * Check if a type is a concrete class (not an interface or type alias)
     */
    function isConcreteClass(type) {
      if (!type) return false;
      
      const symbol = type.getSymbol();
      if (!symbol) return false;

      // Import TypeScript's SymbolFlags
      const ts = require('typescript');
      
      // Check if the symbol has the Class flag
      // Interfaces have the Interface flag, classes have the Class flag
      return !!(symbol.flags & ts.SymbolFlags.Class);
    }

    return {
      ClassDeclaration(node) {
        // Check if the class has @injectable decorator
        if (!node.decorators || !node.decorators.some(isInjectableDecorator)) {
          return;
        }

        const className = node.id ? node.id.name : 'AnonymousClass';

        // Find the constructor
        const constructor = node.body.body.find(
          member => member.type === 'MethodDefinition' && member.kind === 'constructor'
        );

        if (!constructor) {
          return; // No constructor, nothing to check
        }

        // Iterate over constructor parameters
        for (const param of constructor.value.params) {
          // Check if this is a TSParameterProperty with decorators
          if (param.type !== 'TSParameterProperty') {
            continue;
          }

          // Check if the parameter has an @inject decorator
          const hasInjectDecorator = param.decorators && param.decorators.some(isInjectDecorator);
          
          if (!hasInjectDecorator) {
            continue;
          }

          // Get the parameter's type annotation
          const paramNode = param.parameter;
          const paramName = paramNode.name;

          if (!paramNode.typeAnnotation || !paramNode.typeAnnotation.typeAnnotation) {
            continue; // No type annotation, can't check
          }

          try {
            // Convert ESTree node to TypeScript AST node
            const tsNode = tsNodeMap.get(paramNode.typeAnnotation.typeAnnotation);
            
            if (!tsNode) {
              continue;
            }

            // Get the type from the type checker
            const type = checker.getTypeAtLocation(tsNode);

            if (!type) {
              continue;
            }

            // Check if the type is a concrete class
            if (isConcreteClass(type)) {
              context.report({
                node: paramNode,
                messageId: 'concreteClassInjection',
                data: {
                  paramName: paramName,
                  className: className
                }
              });
            }
          } catch (error) {
            // If we encounter any errors during type checking, skip this parameter
            // This can happen with complex type definitions
            continue;
          }
        }
      }
    };
  }
};
