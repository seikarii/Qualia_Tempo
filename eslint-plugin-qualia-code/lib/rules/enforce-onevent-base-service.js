/**
 * @fileoverview Enforce that services using @OnEvent decorator implement IBaseService
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
      description: 'Enforce that services using @OnEvent decorator implement IBaseService interface',
      category: 'QUALIA.CODE Compliance',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      missingIBaseService: 'QUALIA.CODE: Service "{{className}}" uses @OnEvent decorator but does not implement IBaseService. This is required for proper lifecycle management by ApplicationInitializerService.',
      missingInitialize: 'QUALIA.CODE: Service "{{className}}" implements IBaseService but is missing initialize() method.',
      missingCleanup: 'QUALIA.CODE: Service "{{className}}" implements IBaseService but is missing cleanup() method.'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    function hasOnEventDecorator(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === 'OnEvent';
        }
        return false;
      });
    }

    function implementsIBaseService(classNode) {
      if (!classNode.implements || !Array.isArray(classNode.implements)) {
        return false;
      }

      return classNode.implements.some(impl => {
        const name = impl.expression?.name || impl.id?.name;
        return name === 'IBaseService';
      });
    }

    function hasMethod(classNode, methodName) {
      if (!classNode.body || !classNode.body.body) {
        return false;
      }

      return classNode.body.body.some(member => {
        return member.type === 'MethodDefinition' &&
               member.key?.name === methodName;
      });
    }

    return {
      ClassDeclaration(node) {
        if (!node.id || !node.id.name) {
          return;
        }

        const className = node.id.name;
        let hasOnEvent = false;

        // Check if any method has @OnEvent decorator
        if (node.body && node.body.body) {
          for (const member of node.body.body) {
            if (member.type === 'MethodDefinition' && hasOnEventDecorator(member)) {
              hasOnEvent = true;
              break;
            }
          }
        }

        if (hasOnEvent) {
          // Verify class implements IBaseService
          if (!implementsIBaseService(node)) {
            context.report({
              node,
              messageId: 'missingIBaseService',
              data: { className }
            });
          } else {
            // Verify required methods exist
            if (!hasMethod(node, 'initialize')) {
              context.report({
                node,
                messageId: 'missingInitialize',
                data: { className }
              });
            }
            if (!hasMethod(node, 'cleanup')) {
              context.report({
                node,
                messageId: 'missingCleanup',
                data: { className }
              });
            }
          }
        }
      }
    };
  }
};
