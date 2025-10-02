/**
 * @fileoverview Rule to enforce Inversi    function hasInjectDecorator(param) {
      if (!param.decorators || !Array.isArray(param.decorators)) {
        return false;
      }

      return param.decorators.some(decorator => {
        // Handle both regular call expressions and TypeScript decorator syntax
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'inject') {
          return true;
        }
        // Handle member expressions like TYPES.Logger
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'inject' &&
            decorator.expression.arguments?.length > 0) {
          return true;
        }
        return false;
      });
    }ons in service classes
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
      description: 'Enforce InversifyJS conventions: @injectable() on services, @inject() on constructor params, and reflect-metadata import',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingInjectable: 'CRISALIDA.CODE: La clase \'{{className}}\' debe estar decorada con @injectable().',
      missingInject: 'CRISALIDA.CODE: El parámetro \'{{paramName}}\' en el constructor de \'{{className}}\' debe ser inyectado con @inject(TYPES.Identifier).',
      missingReflectMetadata: 'CRISALIDA.CODE: El fichero index.tsx debe importar \'reflect-metadata\' en la primera línea.'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Check if this is the main entry point file or any file that uses inversify
    const isEntryFile = filename.endsWith('index.tsx') || filename.endsWith('index.ts') ||
                       filename.endsWith('main.tsx') || filename.endsWith('main.ts') ||
                       filename.endsWith('app.tsx') || filename.endsWith('app.ts') ||
                       filename.includes('bootstrap.ts') || filename.includes('bootstrap.tsx');

    // Track if we've seen inversify imports and reflect-metadata
    let hasInversifyImport = false;
    let hasReflectMetadataImport = false;
    let firstImportNode = null;

    function isServiceClass(className) {
      const serviceSuffixes = ['Service', 'Controller', 'Repository', 'Provider', 'Calculator'];
      return serviceSuffixes.some(suffix => className.endsWith(suffix));
    }

    function hasInjectDecorator(param) {
      if (!param.decorators || !Array.isArray(param.decorators)) {
        return false;
      }

      return param.decorators.some(decorator => {
        // Handle both regular call expressions and TypeScript decorator syntax
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'inject') {
          return true;
        }
        // Handle member expressions like TYPES.Logger
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'inject' &&
            decorator.expression.arguments?.length > 0) {
          return true;
        }
        return false;
      });
    }

    function hasInjectableDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'injectable') {
          return true;
        }
        return false;
      });
    }

    function getParameterName(param, index) {
      // Handle different parameter types in TypeScript
      if (param.type === 'TSParameterProperty') {
        // For parameters like: constructor(private logger: ILogger)
        // The parameter name is in param.name for TSParameterProperty
        if (param.name && typeof param.name === 'string') {
          return param.name;
        }
        // Fallback for other structures
        return param.parameter?.name || param.parameter?.left?.name || `param${index}`;
      } else if (param.type === 'Identifier') {
        // For regular parameters: constructor(logger: ILogger)
        return param.name;
      } else if (param.left && param.left.name) {
        // For destructured parameters or other cases
        return param.left.name;
      }
      return `param${index}`;
    }

    return {
      // Check for reflect-metadata and inversify imports
      ImportDeclaration(node) {
        if (isEntryFile && node.source.value === 'reflect-metadata') {
          // Check if it's the first import (at the top of the file)
          if (node.loc.start.line === 1) {
            hasReflectMetadataImport = true;
          }
        }
        if (node.source.value === 'inversify') {
          hasInversifyImport = true;
        }
      },

      // Check service classes for @injectable decorator
      ClassDeclaration(node) {
        if (!node.id || !node.id.name) {
          return;
        }

        const className = node.id.name;

        if (isServiceClass(className) && !hasInjectableDecorator(node)) {
          context.report({
            node,
            messageId: 'missingInjectable',
            data: { className }
          });
        }
      },

      // Check constructor parameters for @inject decorator
      'MethodDefinition[kind="constructor"]'(node) {
        const classDeclaration = node.parent.parent;
        if (!classDeclaration || classDeclaration.type !== 'ClassDeclaration') {
          return;
        }

        const className = classDeclaration.id?.name;
        if (!className || !isServiceClass(className)) {
          return;
        }

        // Only check if the class has @injectable
        if (!hasInjectableDecorator(classDeclaration)) {
          return;
        }

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

      // Check if reflect-metadata import is missing when inversify is used in entry files
      'Program:exit'(node) {
        if (isEntryFile && hasInversifyImport && !hasReflectMetadataImport) {
          // Report error without specifying a node to avoid circular reference issues
          context.report({
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
            messageId: 'missingReflectMetadata'
          });
        }
      }
    };
  }
};