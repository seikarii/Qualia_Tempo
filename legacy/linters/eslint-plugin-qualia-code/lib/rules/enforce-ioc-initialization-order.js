/**
 * @fileoverview PHASE 3 - Enforce topological initialization order
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ SEMANTIC - Uses dependency-graph.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  meta: {
    type: 'warning',
    docs: {
      description: 'Enforce bindings follow topological dependency order',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true
    },
    schema: [],
    messages: {
      wrongOrder: 'QUALIA.CODE §2: Service "{{service}}" bound before its dependency "{{dependency}}". Reorder bindings to follow topological order for clarity.',
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
        const graphPath = path.join(__dirname, '../../dependency-graph.json');
        
        if (!fs.existsSync(graphPath)) {
          context.report({
            node,
            messageId: 'noGraph'
          });
          return;
        }

        const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        
        // Build topological order
        const bindingOrder = Object.keys(graph.bindings);
        const visited = new Set();
        const tempMark = new Set();
        const sorted = [];
        
        function visit(typeSymbol) {
          if (tempMark.has(typeSymbol)) return; // Cycle handled by detect-circular-dependencies
          if (visited.has(typeSymbol)) return;
          
          tempMark.add(typeSymbol);
          const binding = graph.bindings[typeSymbol];
          const deps = graph.dependencies[binding.implementation] || [];
          
          deps.forEach(depType => {
            if (graph.bindings[depType]) {
              visit(depType);
            }
          });
          
          tempMark.delete(typeSymbol);
          visited.add(typeSymbol);
          sorted.push(typeSymbol);
        }
        
        bindingOrder.forEach(t => visit(t));
        
        // Check if actual order matches topological order
        bindingOrder.forEach((typeSymbol, actualIdx) => {
          const expectedIdx = sorted.indexOf(typeSymbol);
          const binding = graph.bindings[typeSymbol];
          const deps = graph.dependencies[binding.implementation] || [];
          
          deps.forEach(depType => {
            const depIdx = bindingOrder.indexOf(depType);
            if (depIdx > actualIdx && graph.bindings[depType]) {
              context.report({
                node,
                messageId: 'wrongOrder',
                data: {
                  service: binding.implementation,
                  dependency: graph.bindings[depType].implementation
                }
              });
            }
          });
        });
      }
    };
  }
};
