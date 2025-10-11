/**
 * @fileoverview Rule to prevent direct diagnostic method calls between services
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE v1.1 - Event-Driven Diagnostics Enforcement
 * 
 * This rule prevents the anti-pattern of directly calling diagnostic methods
 * (getStatistics, getStatus, isEnabled, etc.) on injected services.
 * Instead, services must emit ServiceStatusUpdateEvent for passive aggregation.
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibit direct diagnostic method calls between services',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/seikarii/Qualia_Tempo/blob/master/qualia-tempo-prototype/frontend/src/services/SERVICE_STATUS_EVENT_GUIDE.md'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          forbiddenMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['getStatistics', 'getStatus', 'isEnabled', 'getConfig', 'getDiagnostics']
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      directDiagnosticCall: '[QUALIA.CODE Violation] Direct call to diagnostic method ".{{methodName}}()" is prohibited. Service status communication must be performed exclusively via ServiceStatusUpdateEvent emission. Consult SERVICE_STATUS_EVENT_GUIDE.md for the correct "push" pattern implementation.'
    }
  },

  create(context) {
    const options = context.options[0] || {};
    const forbiddenMethods = options.forbiddenMethods || [
      'getStatistics',
      'getStatus',
      'isEnabled',
      'getConfig',
      'getDiagnostics',
      'getState',
      'getErrorCount',
      'getMetrics'
    ];

    const filename = context.getFilename();

    // Only check files in src/services/ directory
    if (!filename.includes('src/services/') && !filename.includes('src\\services\\')) {
      return {};
    }

    // Skip test files
    if (filename.includes('.test.') ||
        filename.includes('.spec.') ||
        filename.includes('__tests__') ||
        filename.includes('/tests/') ||
        filename.includes('\\tests\\')) {
      return {};
    }

    // Skip certain special files
    if (filename.includes('CompositionRoot') ||
        filename.includes('inversify.config') ||
        filename.includes('test-container-factory')) {
      return {};
    }

    let isInjectableClass = false;
    let injectedProperties = new Set();

    return {
      // Detect @injectable() decorated classes
      ClassDeclaration(node) {
        const hasInjectableDecorator = node.decorators && node.decorators.some(
          decorator => {
            if (decorator.expression.type === 'Identifier') {
              return decorator.expression.name === 'injectable';
            }
            if (decorator.expression.type === 'CallExpression') {
              return decorator.expression.callee.name === 'injectable';
            }
            return false;
          }
        );

        if (hasInjectableDecorator) {
          isInjectableClass = true;
        }
      },

      // Track injected properties from constructor parameters
      'ClassDeclaration MethodDefinition[kind="constructor"]'(node) {
        if (!isInjectableClass) return;

        if (node.value && node.value.params) {
          node.value.params.forEach(param => {
            // Handle regular parameters with @inject decorator
            if (param.type === 'Identifier' && param.decorators) {
              const hasInjectDecorator = param.decorators.some(
                decorator => {
                  if (decorator.expression.type === 'CallExpression') {
                    return decorator.expression.callee.name === 'inject';
                  }
                  return false;
                }
              );

              if (hasInjectDecorator) {
                injectedProperties.add(param.name);
              }
            }

            // Handle TSParameterProperty (private/public injected params)
            if (param.type === 'TSParameterProperty') {
              const hasInjectDecorator = param.decorators && param.decorators.some(
                decorator => {
                  if (decorator.expression.type === 'CallExpression') {
                    return decorator.expression.callee.name === 'inject';
                  }
                  return false;
                }
              );

              if (hasInjectDecorator && param.parameter) {
                const paramName = param.parameter.name;
                injectedProperties.add(paramName);
              }
            }
          });
        }
      },

      // Detect calls to forbidden methods on injected properties
      CallExpression(node) {
        if (!isInjectableClass) return;
        if (injectedProperties.size === 0) return;

        // Check if this is a method call on a member expression
        if (node.callee && node.callee.type === 'MemberExpression') {
          const object = node.callee.object;
          const property = node.callee.property;

          // Check if we're calling a method on 'this.someProperty'
          if (object.type === 'MemberExpression' &&
              object.object.type === 'ThisExpression' &&
              property.type === 'Identifier') {

            const propertyName = object.property.name;
            const methodName = property.name;

            // Check if the property is injected and the method is forbidden
            if (injectedProperties.has(propertyName) &&
                forbiddenMethods.includes(methodName)) {
              context.report({
                node: node.callee,
                messageId: 'directDiagnosticCall',
                data: {
                  methodName: methodName
                }
              });
            }
          }
        }
      },

      // Reset state when exiting class
      'ClassDeclaration:exit'() {
        isInjectableClass = false;
        injectedProperties.clear();
      }
    };
  }
};
