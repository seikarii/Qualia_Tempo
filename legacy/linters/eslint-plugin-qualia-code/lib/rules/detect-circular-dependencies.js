/**
 * @fileoverview PHASE 3 - Detect circular dependencies in IoC container
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ SEMANTIC - Uses dependency-graph.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    type: 'error',
    docs: {
      description: 'Detect circular dependencies in InversifyJS container',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true
    },
    schema: [],
    messages: {
      circularDependency: 'QUALIA.CODE §2: Circular dependency detected: {{cycle}}. Refactor to break cycle using interfaces or lazy injection.',
      noGraph: 'QUALIA.CODE §2: dependency-graph.json not found. Run `node scripts/parse-inversify-graph.js` to generate it.'
    }
  },

  create(context) {
    const filename = context.getFilename();
    
    // Only run on inversify.config.ts
    if (!filename.includes('inversify.config')) {
      return {};
    }

    return {
      Program(node) {
        // Load dependency graph
        const graphPath = path.join(__dirname, '../../dependency-graph.json');
        
        if (!fs.existsSync(graphPath)) {
          context.report({
            node,
            messageId: 'noGraph'
          });
          return;
        }

        const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        
        if (graph.cycles && graph.cycles.length > 0) {
          graph.cycles.forEach(cycle => {
            context.report({
              node,
              messageId: 'circularDependency',
              data: {
                cycle: cycle.join(' → ')
              }
            });
          });
        }
      }
    };
  }
};
