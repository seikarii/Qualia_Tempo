/**
 * @fileoverview Rule to enforce the Isolated Container Pattern in test files
 * @author Qualia Tempo Team
 * 
 * QUALIA.CODE Section 10.3: Frontend Mocking & Test Container Architecture
 * 
 * MANDATE: Each test receives a completely new Container() instance via createTestContainer
 * PROHIBITION: Direct service instantiation with `new` in test files
 * PROHIBITION: Using the main application container from inversify.config in tests
 * 
 * This rule ensures absolute isolation between tests and prevents coupling to
 * production container configuration.
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforces the Isolated Container Pattern in test files and prohibits direct service instantiation',
      category: 'Qualia.CODE Compliance',
      recommended: true,
      url: 'https://github.com/qualia-tempo/qualia-tempo/blob/master/docs/QUALIA.CODE.md#103-frontend-mocking--test-container-architecture'
    },
    fixable: null,
    schema: [],
    messages: {
      noNewService: 'VIOLATION QUALIA.CODE: Direct instantiation of service "{{serviceName}}" detected. Use the createTestContainer factory to resolve services: `const container = createTestContainer(); const service = container.get<I{{serviceName}}>(TYPES.I{{serviceName}});`',
      noMainContainer: 'VIOLATION QUALIA.CODE: Usage of main application container detected in test file. Import and use "createTestContainer" from "testing/test-container-factory" instead. This ensures test isolation and prevents coupling to production configuration.',
      noMainContainerImport: 'VIOLATION QUALIA.CODE: Import of main application container detected in test file. Do not import "container" from "services/inversify.config". Use "createTestContainer" from "testing/test-container-factory" instead.'
    }
  },

  create(context) {
    const filename = context.getFilename();
    
    // Only apply this rule to test files
    const isTestFile = 
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('__tests__') ||
      filename.includes('/tests/') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.test.tsx') ||
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.spec.tsx');

    // Skip if not a test file
    if (!isTestFile) {
      return {};
    }

    // Track if the main container is imported and what it's named
    let mainContainerImportName = null;

    return {
      // Visitor 1: Detect 'new XxxService()' instantiation
      NewExpression(node) {
        const calleeName = node.callee.name;
        
        // Check if the instantiated class name ends with 'Service'
        if (calleeName && calleeName.endsWith('Service')) {
          context.report({
            node: node,
            messageId: 'noNewService',
            data: { serviceName: calleeName }
          });
        }

        // Also check for qualified names (e.g., Services.MyService)
        if (node.callee && node.callee.type === 'MemberExpression') {
          const memberName = node.callee.property && node.callee.property.name;
          if (memberName && memberName.endsWith('Service')) {
            context.report({
              node: node,
              messageId: 'noNewService',
              data: { serviceName: memberName }
            });
          }
        }
      },

      // Visitor 2: Detect 'import { container } from services/inversify.config'
      ImportDeclaration(node) {
        const importSource = node.source.value;
        
        // Check if importing from the main inversify config
        if (importSource.includes('services/inversify.config') || 
            importSource.includes('inversify.config')) {
          
          // Find if 'container' is being imported
          const containerSpecifier = node.specifiers.find(
            spec => 
              (spec.type === 'ImportSpecifier' && spec.imported && spec.imported.name === 'container') ||
              (spec.type === 'ImportDefaultSpecifier')
          );
          
          if (containerSpecifier) {
            // Store the local name (could be aliased)
            mainContainerImportName = containerSpecifier.local.name;
            
            // Report the import itself as a violation
            context.report({
              node: node,
              messageId: 'noMainContainerImport'
            });
          }
        }
      },

      // Visitor 3: Detect 'container.get()' calls from main container
      CallExpression(node) {
        // If we detected a main container import, track its usage
        if (mainContainerImportName &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object.name === mainContainerImportName &&
            node.callee.property.name === 'get') {
          
          context.report({
            node: node,
            messageId: 'noMainContainer'
          });
        }
      }
    };
  }
};
