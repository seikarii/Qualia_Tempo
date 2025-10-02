/**
 * @fileoverview Rule to enforce use of useServices() hook instead of direct service imports or container access
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
      description: 'Enforce use of useServices() hook instead of direct service imports or container access in React components',
      category: 'Best Practices',
      recommended: true,
      url: null
    },
    fixable: null,
    schema: [],
    messages: {
      useServicesHook: 'Do not import services directly into components. Use the useServices() hook to maintain IoC.',
      noDirectContainerAccess: 'Direct container access (container.get()) is forbidden in React components. Use useService() hook instead.'
    }
  },

  create(context) {
    return {
      ImportDeclaration(node) {
        const filename = context.getFilename();
        
        // Only check .tsx files (React components)
        if (!filename.endsWith('.tsx')) {
          return;
        }

        // Skip CompositionRoot and hooks files
        if (filename.includes('CompositionRoot') || filename.includes('hooks.ts') || filename.includes('hooks.tsx')) {
          return;
        }

        // Check if importing from services directory
        const source = node.source.value;
        if (typeof source === 'string' && source.includes('/services/') && !source.includes('/hooks')) {
          // Allow imports from contracts and interfaces directories
          if (source.includes('/contracts/') || source.includes('/interfaces/')) {
            return;
          }
          
          // Allow type-only imports
          if (node.importKind === 'type') {
            return;
          }

          // Skip EventBus-related imports as they might be legitimately used
          const importedNames = node.specifiers.map(spec => {
            if (spec.type === 'ImportDefaultSpecifier') {
              return spec.local.name;
            }
            if (spec.type === 'ImportSpecifier') {
              return spec.imported.name;
            }
            return null;
          }).filter(Boolean);

          // Allow certain service imports that are not meant to be instantiated directly
          const allowedImports = [
            'EventBus', 'eventBus', 'EventType', 'GameEvent', 'Event',
            'PlayerActionEvent', 'QualiaStateUpdatedEvent', 'GameStateChangedEvent',
            'ErrorEvent', 'BackendSyncEvent'
          ];
          const hasOnlyAllowedImports = importedNames.every(name => 
            allowedImports.some(allowed => name.includes(allowed))
          );

          if (!hasOnlyAllowedImports) {
            context.report({
              node,
              messageId: 'useServicesHook'
            });
          }
        }
      },

      // Check for direct container.get() calls
      CallExpression(node) {
        const filename = context.getFilename();
        
        // Only check .tsx files (React components)
        if (!filename.endsWith('.tsx')) {
          return;
        }

        // Skip service files and hooks
        if (filename.includes('/services/') || filename.includes('hooks.ts') || filename.includes('hooks.tsx')) {
          return;
        }

        // Check for container.get() pattern
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'container' &&
            node.callee.property.name === 'get') {
          context.report({
            node,
            messageId: 'noDirectContainerAccess'
          });
        }

        // Check for imported container access patterns
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'get' &&
            node.callee.object.type === 'Identifier') {
          
          // Look for variable names that suggest container usage
          const containerVariableNames = ['container', 'iocContainer', 'serviceContainer', 'diContainer'];
          if (containerVariableNames.includes(node.callee.object.name)) {
            context.report({
              node,
              messageId: 'noDirectContainerAccess'
            });
          }
        }
      }
    };
  }
};
