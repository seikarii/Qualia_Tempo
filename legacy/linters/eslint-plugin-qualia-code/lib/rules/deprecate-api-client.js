/**
 * @fileoverview Semantic deprecation of ApiClient (QUALIA.CODE SALA)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * SEMANTIC RULE: Uses TypeScript Type Checker to identify ApiClient usage
 * by resolving import types, not string matching. Even if renamed in import,
 * this rule will detect it.
 * 
 * BEFORE (Incorrect): Searches for string "ApiClient"
 * AFTER (Correct): Resolves type origin using Type Checker
 */

'use strict';

const { requireTypeChecker, isTypeFromFile, getNodeType } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Deprecate ApiClient using semantic analysis - detects even if renamed (QUALIA.CODE §5)',
      category: 'Event Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#5-communication-event-driven-architecture'
    },
    fixable: null,
    schema: [],
    messages: {
      deprecatedApiClient: 
        "QUALIA.CODE §5 VIOLATION: ApiClient is deprecated and detected via semantic analysis. " +
        "ARCHITECTURAL MANDATE: Use event-driven architecture via EventBus for all communication. " +
        "ApiClient introduces tight coupling and bypasses the event system. " +
        "Replace with: eventBus.emit<BackendSyncRequestEvent>({ ... }) and listen to response events. " +
        "Even if you renamed this import, the Type Checker identified it as ApiClient by its origin."
    }
  },

  create(context) {
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // If type services unavailable, fall back to basic string matching
      return createFallbackRule(context);
    }

    const { checker, tsNodeMap } = typeServices;

    return {
      ImportDeclaration(node) {
        // Get the type of each imported specifier
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' || 
              specifier.type === 'ImportDefaultSpecifier' ||
              specifier.type === 'ImportNamespaceSpecifier') {
            
            const type = getNodeType(specifier, tsNodeMap, checker);
            
            if (!type) continue;
            
            // Check if this type originates from api-client.ts or ApiClient.ts
            if (isTypeFromFile(type, 'api-client.ts') || 
                isTypeFromFile(type, 'ApiClient.ts') ||
                isTypeFromFile(type, 'apiClient.ts')) {
              
              context.report({
                node: specifier,
                messageId: 'deprecatedApiClient'
              });
            }
          }
        }
      },

      NewExpression(node) {
        // Check for new ApiClient() even if renamed
        if (!node.callee) return;
        
        const type = getNodeType(node.callee, tsNodeMap, checker);
        if (!type) return;
        
        if (isTypeFromFile(type, 'api-client.ts') || 
            isTypeFromFile(type, 'ApiClient.ts') ||
            isTypeFromFile(type, 'apiClient.ts')) {
          
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
        }
      },

      MemberExpression(node) {
        // Check for method calls on ApiClient instances
        const objectType = getNodeType(node.object, tsNodeMap, checker);
        if (!objectType) return;
        
        if (isTypeFromFile(objectType, 'api-client.ts') || 
            isTypeFromFile(objectType, 'ApiClient.ts') ||
            isTypeFromFile(objectType, 'apiClient.ts')) {
          
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
        }
      }
    };
  }
};

/**
 * Fallback rule when TypeScript services are unavailable
 * (Graceful degradation to string matching)
 */
function createFallbackRule(context) {
  return {
    ImportDeclaration(node) {
      const source = node.source.value;
      
      if (typeof source === 'string' && 
          (source.includes('ApiClient') || 
           source.includes('api-client') || 
           source.includes('apiClient'))) {
        context.report({
          node,
          messageId: 'deprecatedApiClient'
        });
      }
    },

    VariableDeclarator(node) {
      if (node.init && node.init.type === 'NewExpression') {
        const calleeName = node.init.callee?.name;
        if (calleeName && calleeName.includes('ApiClient')) {
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
        }
      }
    },

    CallExpression(node) {
      if (node.callee && node.callee.type === 'MemberExpression') {
        const objectName = node.callee.object?.name;
        if (objectName && objectName.toLowerCase().includes('apiclient')) {
          context.report({
            node,
            messageId: 'deprecatedApiClient'
          });
        }
      }
    }
  };
}
