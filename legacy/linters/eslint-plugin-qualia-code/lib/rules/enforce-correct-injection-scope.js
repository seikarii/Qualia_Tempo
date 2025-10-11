/**
 * @fileoverview PHASE 3 - Enforce correct injection scope (singleton→transient violations)
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
      description: 'Enforce correct injection scope to prevent memory leaks',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true
    },
    schema: [],
    messages: {
      singletonToTransient: 'QUALIA.CODE §2: Singleton service "{{singleton}}" injects transient service "{{transient}}". This causes memory leaks. Make {{transient}} singleton or refactor.',
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
        
        // Check each binding
        Object.entries(graph.bindings).forEach(([typeSymbol, binding]) => {
          if (binding.scope !== 'singleton') return;
          
          const serviceName = binding.implementation;
          const deps = graph.dependencies[serviceName] || [];
          
          deps.forEach(depTypeSymbol => {
            const depBinding = graph.bindings[depTypeSymbol];
            if (depBinding && depBinding.scope === 'transient') {
              context.report({
                node,
                messageId: 'singletonToTransient',
                data: {
                  singleton: serviceName,
                  transient: depBinding.implementation
                }
              });
            }
          });
        });
      }
    };
  }
};
