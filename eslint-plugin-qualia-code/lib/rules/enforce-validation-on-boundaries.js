/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-validation-on-boundaries
 * 
 * Ensures data integrity at critical system boundaries by enforcing validation decorators.
 * 
 * This rule enforces QUALIA.CODE principle of "Trust but Verify" at data entry points:
 * 1. Event handlers with @OnEvent must validate event properties with @validateEventProperty
 * 2. Public service methods accepting DTOs from shared_contracts must use @validate
 * 
 * Rationale: Blind trust in data shape at system boundaries leads to runtime errors.
 * This rule codifies defensive programming as an architectural mandate.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce validation decorators at system boundaries (event handlers and DTO inputs)',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      missingEventValidation: "[QUALIA.CODE] The event handler for '{{eventName}}' accesses event properties but does not validate them with @validateEventProperty. Secure this boundary.",
      missingDtoValidation: "[QUALIA.CODE] The method '{{methodName}}' accepts a DTO ('{{argumentType}}') from shared_contracts but does not validate it with @validate. Protect the service boundary.",
      eventHandlerBestPractice: "[BEST PRACTICE] Event handler '{{methodName}}' for event '{{eventName}}' should validate event properties with @validateEventProperty when accessing event data."
    }
  },

  create(context) {
    const filename = context.getFilename();

    // Only check service files
    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    /**
     * Check if a node has a specific decorator
     */
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

    /**
     * Check if node is in a service class
     */
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

    /**
     * Get the event name from @OnEvent decorator
     */
    function getOnEventName(node) {
      if (!node.decorators || !Array.isArray(node.decorators)) {
        return null;
      }

      for (const decorator of node.decorators) {
        if (decorator.expression?.type === 'CallExpression' &&
            decorator.expression.callee?.name === 'OnEvent' &&
            decorator.expression.arguments.length > 0) {
          const firstArg = decorator.expression.arguments[0];
          if (firstArg.type === 'Literal') {
            return firstArg.value;
          }
        }
      }
      return null;
    }

    /**
     * Check if method body accesses event parameter properties
     */
    function accessesEventProperties(node) {
      if (!node.value?.body?.body) {
        return false;
      }

      const sourceCode = context.getSourceCode();
      const bodyText = sourceCode.getText(node.value.body);

      // Check for common event property access patterns
      // event.payload, event.data, event.action, event.context, etc.
      const eventAccessPatterns = [
        /\bevent\.\w+/,           // event.property
        /\bevent\[/,              // event['property']
        /const\s+\{[^}]+\}\s*=\s*event/,  // destructuring { prop } = event
      ];

      return eventAccessPatterns.some(pattern => pattern.test(bodyText));
    }

    /**
     * Check if method parameters include types from shared_contracts
     */
    function hasSharedContractParameter(node) {
      if (!node.value?.params || node.value.params.length === 0) {
        return null;
      }

      const sourceCode = context.getSourceCode();

      for (const param of node.value.params) {
        if (param.typeAnnotation?.typeAnnotation?.typeName) {
          const typeName = param.typeAnnotation.typeAnnotation.typeName.name;
          
          // Check if this type is likely from shared_contracts
          // Common patterns: QualiaState, CombatData, PlayerState, BossState, etc.
          // These typically end with State, Data, Info, Config, etc.
          const sharedContractPatterns = [
            /State$/,
            /Data$/,
            /Info$/,
            /Config$/,
            /Event$/,
            /Payload$/,
            /Request$/,
            /Response$/
          ];

          if (sharedContractPatterns.some(pattern => pattern.test(typeName))) {
            // Additional check: look for imports from shared_contracts or types/contracts
            const fullText = sourceCode.text;
            const importPattern = new RegExp(`import\\s+.*?\\{[^}]*${typeName}[^}]*\\}.*?from\\s+['"].*?(shared_contracts|types/contracts|contracts\\.ts)['"]`, 's');
            
            if (importPattern.test(fullText)) {
              return {
                paramName: param.name,
                typeName: typeName
              };
            }
          }
        }
      }

      return null;
    }

    /**
     * Check if method is public
     */
    function isPublicMethod(node) {
      // Skip private/protected methods
      if (node.accessibility === 'private' || node.accessibility === 'protected') {
        return false;
      }

      // Skip underscore-prefixed methods (private convention)
      if (node.key?.name?.startsWith('_')) {
        return false;
      }

      return true;
    }

    return {
      MethodDefinition(node) {
        // Only check if we're in a service class
        if (!isInServiceClass(node)) {
          return;
        }

        // Skip methods without body (TypeScript overload declarations)
        if (!node.value?.body) {
          return;
        }

        const methodName = node.key?.name;

        // RULE 1: @OnEvent handlers must validate event properties if they access them
        // NOTE: Event handlers are checked regardless of visibility (private/public)
        const eventName = getOnEventName(node);
        if (eventName) {
          const hasValidateEventProperty = hasDecorator(node, 'validateEventProperty');
          const accessesEvent = accessesEventProperties(node);

          if (accessesEvent && !hasValidateEventProperty) {
            context.report({
              node,
              messageId: 'missingEventValidation',
              data: {
                eventName: eventName
              }
            });
          }
        }

        // RULE 2: Public methods accepting shared_contracts DTOs must use @validate
        // Only check public methods for DTO validation
        if (!isPublicMethod(node)) {
          return;
        }

        const sharedContractParam = hasSharedContractParameter(node);
        if (sharedContractParam) {
          const hasValidate = hasDecorator(node, 'validate');

          if (!hasValidate) {
            context.report({
              node,
              messageId: 'missingDtoValidation',
              data: {
                methodName: methodName,
                argumentType: sharedContractParam.typeName
              }
            });
          }
        }
      }
    };
  }
};
