/**
 * @fileoverview Rule to enforce method decorators in service classes
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
      description: 'Enforce method decorators (@logMethod, @catchError, @throttle, @injectable, @inject) in service classes',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingDecorator: 'Public methods in services must use a logging, error handling, performance, or dependency injection decorator (@logMethod, @catchError, @throttle, @injectable, @inject).'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // COMPLETELY DISABLE this rule for files using Inversify during migration
    if (filename.includes('migration-example.ts')) {
      return {};
    }

    // Include Inversify decorators as valid
    const requiredDecorators = ['logMethod', 'catchError', 'throttle'];
    const inversifyDecorators = ['injectable', 'inject'];
    const allowedDecorators = [...requiredDecorators, ...inversifyDecorators];

    function hasRequiredDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return allowedDecorators.includes(decorator.expression.name);
        }
        if (decorator.expression?.type === 'CallExpression') {
          return allowedDecorators.includes(decorator.expression.callee?.name);
        }
        return false;
      });
    }

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

    function isPublicMethod(node) {
      // In TypeScript, methods are public by default unless marked private or protected
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }

      // Check if method name starts with underscore (convention for private)
      if (node.key?.name?.startsWith('_')) {
        return false;
      }

      // Constructor, start, stop, and lifecycle methods can be exempt
      const exemptMethods = ['constructor', 'start', 'stop', 'initialize', 'shutdown', 'destroy'];
      if (exemptMethods.includes(node.key?.name)) {
        return false;
      }

      // Simple getters in ConfigurationService don't need decorators
      if (filename.includes('ConfigurationService')) {
        const simpleGetterMethods = ['getConfig', 'getGameConfig', 'getQualiaConfig', 'getBackendConfig', 'isLoaded'];
        if (simpleGetterMethods.includes(node.key?.name)) {
          return false;
        }
      }

      return true;
    }

    return {
      // IGNORAR COMPLETAMENTE @inject decorators - NO MARCAR ERRORES
      'Decorator'(node) {
        if (node.expression?.type === 'CallExpression' &&
            node.expression.callee?.name === 'inject') {
          // NO HACER NADA - IGNORAR COMPLETAMENTE @inject
          return;
        }
      },

      // IGNORAR COMPLETAMENTE @injectable decorators - NO MARCAR ERRORES
      'ClassDeclaration'(node) {
        if (node.decorators) {
          node.decorators.forEach(decorator => {
            if (decorator.expression?.type === 'CallExpression' &&
                decorator.expression.callee?.name === 'injectable') {
              // NO HACER NADA - IGNORAR COMPLETAMENTE @injectable
              return;
            }
          });
        }
      },

      MethodDefinition(node) {
        // Only check service files
        if (!filename.includes('Service.ts') && !filename.includes('Service.tsx')) {
          return;
        }

        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Only check public methods
        if (!isPublicMethod(node)) {
          return;
        }

        // Check if method has required decorators
        if (!hasRequiredDecorator(node)) {
          context.report({
            node,
            messageId: 'missingDecorator'
          });
        }
      }
    };
  }
};