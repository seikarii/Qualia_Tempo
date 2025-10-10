/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-authorize-on-secure-methods
 * 
 * Ensures security-critical methods (delete, update permissions, grant access) use @authorize decorator.
 * 
 * Enforces QUALIA.CODE §5.1: Security & Authorization Decorators
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @authorize decorator on security-critical methods',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingAuthorize: 'Security-critical method "{{methodName}}" must use @authorize() decorator for access control. (QUALIA.CODE §5.1)'
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    // Patterns that indicate security-critical operations
    const securityPatterns = [
      /^(delete|remove|destroy)(User|Account|Admin|Role|Permission)/i,
      /^(update|modify|change|set)(Permission|Role|Access|Admin|Security)/i,
      /^(grant|revoke|assign)(Access|Permission|Role|Admin)/i,
      /^(create|add)(Admin|SuperUser|Root)/i,
      /^(elevate|escalate)Privilege/i,
      /^(authorize|authenticate|verify)(User|Admin)/i
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

    function isSecurityCriticalMethod(methodName) {
      return securityPatterns.some(pattern => pattern.test(methodName));
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

        if (isSecurityCriticalMethod(methodName) && !hasDecorator(node, 'authorize')) {
          context.report({
            node,
            messageId: 'missingAuthorize',
            data: {
              methodName
            }
          });
        }
      }
    };
  }
};
