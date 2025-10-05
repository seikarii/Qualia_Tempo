/**
 * @fileoverview Rule to enforce IoC binding order - dependencies must be bound before dependents
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
      description: 'Enforce that InversifyJS service Params are bound before they are retrieved via container.get()',
      category: 'IoC Architecture',
      recommended: true,
      url: 'https://github.com/seikarii/Qualia_Tempo/docs/QUALIA.CODE.md#ioc-binding-order-protocol'
    },
    fixable: null,
    schema: [],
    messages: {
      bindingOrderViolation: "QUALIA.CODE Violation: Service '{{dependency}}' is retrieved at line {{getLine}} but its Params are bound later at line {{bindLine}}. Reorder bindings so '{{dependencyParams}}' is bound BEFORE line {{getLine}}.",
      missingBinding: "QUALIA.CODE Violation: Service '{{dependency}}' is retrieved but its Params ('{{dependencyParams}}') are never bound in this file. Add binding for '{{dependencyParams}}' before this retrieval.",
      cyclicDependency: "QUALIA.CODE Violation: Circular dependency detected involving '{{service}}'. Review the dependency graph and break the cycle."
    }
  },

  create(context) {
    // Only run this rule on inversify.config.ts
    const filename = context.getFilename();
    if (!filename.includes('inversify.config.ts')) {
      return {};
    }

    const bindings = new Map(); // TYPES.Symbol → line number
    const retrievals = []; // {symbol, lineNumber, node}
    
    // Infrastructure services and utilities that are bound directly without Params
    const INFRASTRUCTURE_SERVICES = new Set([
      'TYPES.ILogger',
      'TYPES.IEventBus',
      'TYPES.ITimerService',
      'TYPES.IHttpService',
      'TYPES.IPerformanceService',
      'TYPES.IConfigurationService',
      'TYPES.ConfigManifest',
      'TYPES.ITimerProvider',
      'TYPES.IPerformanceProvider',
      'TYPES.IWebSocketFactory',
      'TYPES.IShaderLoaderService',
      'TYPES.ICoordinateSystemService',
      'TYPES.IInputStateService',
      'TYPES.IBrowserEventsService',
      'TYPES.IToneFactoryService',
      'TYPES.IWebAudioAPIService',
      'TYPES.IOntologicalAudioEngine',
      'TYPES.IShaderIntrospectionService',
      // State and utility classes
      'TYPES.IGameStateStore',
      'TYPES.ThrottlingManager',
      'TYPES.NotificationQueue',
      // Bridge services (legacy)
      'TYPES.IAudioSystemBridge',
      // Stores
      'TYPES.IGameStateStoreService',
      // Services without Params (bound directly with .to())
      'TYPES.IGameplayMechanicsService',
      'TYPES.IRhythmicMovementController',
      'TYPES.IViewLogicService',
      'TYPES.ISubtitleService'
    ]);

    /**
     * Maps service interface name to its Params name
     * Example: IAudioService → AudioServiceParams
     */
    function serviceToParams(serviceInterface) {
      let serviceName = serviceInterface;
      
      // Remove TYPES. prefix if present
      if (serviceName.startsWith('TYPES.')) {
        serviceName = serviceName.substring(6);
      }
      
      // Remove 'I' prefix if present (interfaces start with I)
      if (serviceName.startsWith('I')) {
        serviceName = serviceName.substring(1);
      }
      
      // Handle different naming patterns
      if (serviceName.endsWith('Service')) {
        serviceName = serviceName.slice(0, -7); // Remove 'Service'
      } else if (serviceName.endsWith('Controller')) {
        serviceName = serviceName.slice(0, -10); // Remove 'Controller'
      }
      
      // Append 'Params' and add TYPES. prefix
      return `TYPES.${serviceName}ServiceParams`;
    }

    return {
      // Detect safeBindConstant() calls to track when Params are bound
      CallExpression(node) {
        // Track safeBindConstant() calls
        if (
          node.callee &&
          node.callee.name === 'safeBindConstant' &&
          node.arguments.length >= 2
        ) {
          const typeArg = node.arguments[0]; // First arg is TYPES.ServiceParams
          if (typeArg && typeArg.type === 'MemberExpression') {
            const symbol = `${typeArg.object.name}.${typeArg.property.name}`;
            bindings.set(symbol, node.loc.start.line);
          }
        }

        // Track container.get() calls to detect when services are retrieved
        if (
          node.callee &&
          node.callee.type === 'MemberExpression' &&
          node.callee.object &&
          node.callee.object.name === 'container' &&
          node.callee.property &&
          node.callee.property.name === 'get' &&
          node.arguments.length >= 1
        ) {
          const typeArg = node.arguments[0]; // First arg is TYPES.IService
          if (typeArg && typeArg.type === 'MemberExpression') {
            const symbol = `${typeArg.object.name}.${typeArg.property.name}`;
            retrievals.push({
              symbol,
              lineNumber: node.loc.start.line,
              node
            });
          }
        }
      },

      // After file is fully parsed, validate binding order
      'Program:exit'(programNode) {
        retrievals.forEach(({symbol, lineNumber, node}) => {
          // Skip infrastructure services (they don't have Params)
          if (INFRASTRUCTURE_SERVICES.has(symbol)) {
            return;
          }

          // Map service interface to its Params name
          const paramsSymbol = serviceToParams(symbol);

          // Check if the Params are bound
          const bindLine = bindings.get(paramsSymbol);
          
          if (!bindLine) {
            // Params never bound
            context.report({
              node,
              messageId: 'missingBinding',
              data: {
                dependency: symbol,
                dependencyParams: paramsSymbol
              }
            });
          } else if (bindLine > lineNumber) {
            // Params bound AFTER retrieval (binding order violation)
            context.report({
              node,
              messageId: 'bindingOrderViolation',
              data: {
                dependency: symbol,
                dependencyParams: paramsSymbol,
                getLine: lineNumber,
                bindLine: bindLine
              }
            });
          }
        });
      }
    };
  }
};
