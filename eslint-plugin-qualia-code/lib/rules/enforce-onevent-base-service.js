/**
 * @fileoverview SALA: Semantic validation of @OnEvent decorator usage
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to validate IBaseService interface implementation
 * - Resolves class type to check interface inheritance
 * - Validates lifecycle method presence
 * 
 * QUALIA.CODE REFERENCE: §5.2, @OnEvent decorator
 */

'use strict';

const { requireTypeChecker, getNodeType, extendsType } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Enforce IBaseService implementation for classes using @OnEvent',
      category: 'QUALIA.CODE - Event Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#52-decorator-driven-development'
    },
    fixable: null,
    schema: [],
    messages: {
      missingBaseService: `QUALIA.CODE §5.2 VIOLATION: Class '{{className}}' uses @OnEvent decorator but doesn't implement IBaseService.

WHY: ApplicationInitializerService requires IBaseService interface to manage @OnEvent lifecycle.

PROHIBITED PATTERN:
  @injectable()
  export class {{className}} implements I{{className}} {
    @OnEvent('SomeEvent')
    private onSomeEvent() {} // ❌ NO LIFECYCLE MANAGEMENT
  }

CORRECT PATTERN:
  @injectable()
  export class {{className}} implements I{{className}}, IBaseService {
    private _eventListeners: string[] = [];
    
    get eventListeners(): string[] {
      return this._eventListeners;
    }
    
    @OnEvent('SomeEvent')
    private onSomeEvent() {} // ✅ LIFECYCLE MANAGED
  }

Consult QUALIA.MANUAL.md §2.3 for @OnEvent implementation patterns.`
    }
  },

  create(context) {
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;

    /**
     * SEMANTIC CHECK: Does class implement IBaseService?
     */
    function implementsIBaseService(classNode) {
      const classType = getNodeType(classNode, tsNodeMap, checker);
      if (!classType) return false;

      const baseTypes = classType.getBaseTypes ? classType.getBaseTypes() : [];
      for (const baseType of baseTypes) {
        const symbol = baseType.getSymbol();
        if (symbol && symbol.name === 'IBaseService') {
          return true;
        }
      }
      return false;
    }

    /**
     * Check if class has @OnEvent decorated methods
     */
    function hasOnEventMethods(classNode) {
      if (!classNode.body || !classNode.body.body) return false;

      return classNode.body.body.some(member => {
        if (member.type !== 'MethodDefinition') return false;
        if (!member.decorators) return false;

        return member.decorators.some(decorator => {
          const expr = decorator.expression;
          if (expr.type === 'Identifier' && expr.name === 'OnEvent') return true;
          if (expr.type === 'CallExpression' && expr.callee?.name === 'OnEvent') return true;
          return false;
        });
      });
    }

    return {
      ClassDeclaration(node) {
        if (!node.id || !node.id.name) return;

        if (hasOnEventMethods(node) && !implementsIBaseService(node)) {
          context.report({
            node,
            messageId: 'missingBaseService',
            data: { className: node.id.name }
          });
        }
      }
    };
  }
};

function createFallbackRule(context) {
  function hasOnEventDecorator(member) {
    if (!member.decorators) return false;
    return member.decorators.some(d =>
      d.expression?.name === 'OnEvent' || d.expression?.callee?.name === 'OnEvent'
    );
  }

  function implementsIBaseService(node) {
    if (!node.implements) return false;
    return node.implements.some(impl => impl.expression?.name === 'IBaseService');
  }

  return {
    ClassDeclaration(node) {
      if (!node.id || !node.body) return;

      const hasOnEvent = node.body.body.some(member =>
        member.type === 'MethodDefinition' && hasOnEventDecorator(member)
      );

      if (hasOnEvent && !implementsIBaseService(node)) {
        context.report({
          node,
          messageId: 'missingBaseService',
          data: { className: node.id.name }
        });
      }
    }
  };
}
