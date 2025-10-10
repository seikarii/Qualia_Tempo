/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-measure-time-on-logic-services
 * 
 * Suggests @measureTime decorator on public methods of logic services (ViewLogicService, GameplayMechanicsService)
 * that aren't simple getters. Helps with performance monitoring.
 * 
 * Enforces QUALIA.CODE §5.2: Decorator-Driven Development (Advisory)
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest @measureTime decorator on business logic methods for performance monitoring',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      suggestMeasureTime: 'ADVISORY: Method "{{methodName}}" in logic service should consider using @measureTime() for performance monitoring. (QUALIA.CODE §5.2)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check logic service files
    const logicServicePatterns = [
      /ViewLogicService/,
      /GameplayMechanicsService/,
      /CalculatorService/,
      /ProcessorService/,
      /EngineService/,
      /AlgorithmService/
    ];

    const isLogicService = logicServicePatterns.some(pattern => pattern.test(filename));
    
    if (!isLogicService || !filename.endsWith('.ts')) {
      return {};
    }

    function hasDecorator(node, decoratorName) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return false;
      }

      return node.decorators.some(decorator => {
        if (decorator.expression?.type === 'Identifier') {
          return decorator.expression.name === decoratorName;
        }
        if (decorator.expression?.type === 'CallExpression') {
          return decorator.expression.callee?.name === decoratorName;
        }
        return false;
      });
    }

    function isPublicMethod(node) {
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }
      if (node.key?.name?.startsWith('_')) {
        return false;
      }
      return true;
    }

    function isSimpleGetter(node) {
      const methodName = node.key?.name;
      if (!methodName) return false;

      // Check if method name starts with 'get' and has simple implementation
      if (!methodName.startsWith('get')) {
        return false;
      }

      // Check if body is simple (single return statement)
      const body = node.value?.body;
      if (!body || !body.body || body.body.length !== 1) {
        return false;
      }

      const firstStatement = body.body[0];
      return firstStatement.type === 'ReturnStatement';
    }

    return {
      MethodDefinition(node) {
        if (!isPublicMethod(node)) {
          return;
        }

        const methodName = node.key?.name;
        if (!methodName) {
          return;
        }

        // Skip lifecycle methods
        const exemptMethods = ['constructor', 'initialize', 'cleanup', 'start', 'stop', 'destroy'];
        if (exemptMethods.includes(methodName)) {
          return;
        }

        // Skip simple getters
        if (isSimpleGetter(node)) {
          return;
        }

        // Suggest @measureTime if not present
        if (!hasDecorator(node, 'measureTime')) {
          context.report({
            node,
            messageId: 'suggestMeasureTime',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
