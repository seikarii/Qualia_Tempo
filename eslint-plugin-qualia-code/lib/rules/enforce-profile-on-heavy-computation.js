/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-profile-on-heavy-computation
 * 
 * Suggests @profile decorator on methods already flagged by enforce-async-on-heavy-methods rule.
 * Enables deep performance profiling beyond basic @measureTime.
 * 
 * Enforces QUALIA.CODE §8.1: Performance Optimization Protocol
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest @profile decorator on heavy computation methods for deep performance profiling',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      suggestProfile: 'ADVISORY: Heavy computation method "{{methodName}}" should consider using @profile() for deep performance profiling. (QUALIA.CODE §8.1)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // Patterns indicating heavy computation
    const heavyComputationPatterns = [
      /^(calculate|compute|process|analyze|transform|generate)/i,
      /^(parse|serialize|deserialize|compress|decompress)/i,
      /^(encrypt|decrypt|hash|verify)/i,
      /^(render|draw|paint|update)(Frame|Scene|Visual)/i
    ];

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

    function isHeavyComputation(node) {
      const methodName = node.key?.name;
      if (!methodName) return false;

      // Check method name pattern
      const nameMatches = heavyComputationPatterns.some(pattern => pattern.test(methodName));

      // Check if method has loops (additional heuristic)
      let hasLoop = false;
      function traverse(current) {
        if (!current) return;
        
        if (
          current.type === 'ForStatement' ||
          current.type === 'ForInStatement' ||
          current.type === 'ForOfStatement' ||
          current.type === 'WhileStatement' ||
          current.type === 'DoWhileStatement'
        ) {
          hasLoop = true;
        }

        // Recursively traverse child nodes (avoid circular refs by skipping 'parent')
        const keysToTraverse = ['body', 'expression', 'callee', 'arguments', 'elements', 'properties', 'consequent', 'alternate', 'init', 'test', 'update', 'left', 'right'];
        for (const key of keysToTraverse) {
          if (current[key]) {
            if (Array.isArray(current[key])) {
              current[key].forEach(child => traverse(child));
            } else if (typeof current[key] === 'object') {
              traverse(current[key]);
            }
          }
        }
      }

      traverse(node.value);
      return nameMatches && hasLoop;
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

        if (isHeavyComputation(node) && !hasDecorator(node, 'profile')) {
          context.report({
            node,
            messageId: 'suggestProfile',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
