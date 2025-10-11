/**
 * @fileoverview SALA: Semantic detection of browser API usage
 * @author Qualia Tempo Team
 * 
 * MIGRATION STATUS: ✅ FULLY MIGRATED TO SEMANTIC ANALYSIS
 * - Uses TypeChecker to detect DOM type references (Window, Document, HTMLElement)
 * - Analyzes method context for browser API usage
 * - Validates @BrowserOnly decorator presence
 * 
 * QUALIA.CODE REFERENCE: §6.2.1
 */

'use strict';

const { requireTypeChecker, getNodeType, hasDecorator } = require('../utils/semantic-helpers');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce @BrowserOnly decorator using semantic DOM type detection',
      category: 'QUALIA.CODE - Environment Adaptation',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#621-environment-adaptation-bundle'
    },
    fixable: null,
    schema: [],
    messages: {
      missingBrowserOnly: `QUALIA.CODE §6.2.1 VIOLATION: Method '{{methodName}}' accesses browser-only APIs ({{apis}}) without @BrowserOnly decorator.

WHY: Prevents runtime errors in SSR and test environments where DOM is unavailable.

PROHIBITED PATTERN:
  public getWindowSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight }; // ❌ CRASHES IN SSR
  }

CORRECT PATTERN:
  @BrowserOnly
  public getWindowSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight }; // ✅ SAFE
  }

BEHAVIOR: Decorator aborts execution and logs warning in non-browser environments.

Consult QUALIA.MANUAL.md §4.4 for @BrowserOnly implementation patterns.`
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
    const filename = context.getFilename();

    if (!filename.includes('/services/') || !filename.endsWith('.ts')) {
      return {};
    }

    const browserApiNames = new Set([
      'window', 'document', 'navigator', 'localStorage',
      'sessionStorage', 'location', 'history', 'screen', 'performance'
    ]);

    const domTypeNames = new Set([
      'Window', 'Document', 'HTMLElement', 'Element', 'Node',
      'Navigator', 'Location', 'History', 'Screen', 'Performance'
    ]);

    let currentMethod = null;
    let usedApis = new Set();

    /**
     * SEMANTIC CHECK: Is this type a DOM type?
     */
    function isDomType(type) {
      if (!type) return false;
      const symbol = type.getSymbol();
      if (!symbol) return false;

      if (domTypeNames.has(symbol.name)) {
        const declarations = symbol.declarations || [];
        for (const decl of declarations) {
          const sourceFile = decl.getSourceFile();
          if (sourceFile && sourceFile.fileName.includes('lib.dom.d.ts')) {
            return true;
          }
        }
      }
      return false;
    }

    return {
      MethodDefinition(node) {
        currentMethod = node;
        usedApis = new Set();
      },

      'MethodDefinition:exit'(node) {
        if (usedApis.size > 0 && !hasDecorator(node, 'BrowserOnly')) {
          const methodName = node.key.name;
          const apiList = Array.from(usedApis).join(', ');
          context.report({
            node,
            messageId: 'missingBrowserOnly',
            data: { methodName, apis: apiList }
          });
        }
        currentMethod = null;
        usedApis = new Set();
      },

      Identifier(node) {
        if (!currentMethod) return;

        if (browserApiNames.has(node.name)) {
          const nodeType = getNodeType(node, tsNodeMap, checker);
          if (isDomType(nodeType)) {
            usedApis.add(node.name);
          }
        }
      }
    };
  }
};

function createFallbackRule(context) {
  const filename = context.getFilename();
  if (!filename.includes('/services/')) return {};

  const browserApis = ['window', 'document', 'navigator', 'localStorage', 'sessionStorage'];
  let currentMethod = null;
  let usedApis = new Set();

  return {
    MethodDefinition(node) {
      currentMethod = node;
      usedApis = new Set();
    },

    'MethodDefinition:exit'(node) {
      const hasBrowserOnly = node.decorators && node.decorators.some(d =>
        d.expression?.name === 'BrowserOnly' || d.expression?.callee?.name === 'BrowserOnly'
      );

      if (usedApis.size > 0 && !hasBrowserOnly) {
        context.report({
          node,
          messageId: 'missingBrowserOnly',
          data: { methodName: node.key.name, apis: Array.from(usedApis).join(', ') }
        });
      }
      currentMethod = null;
      usedApis = new Set();
    },

    Identifier(node) {
      if (currentMethod && browserApis.includes(node.name)) {
        usedApis.add(node.name);
      }
    }
  };
}
