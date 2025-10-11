/**
 * @fileoverview PHASE 3 - Validate @inject() symbols exist in bindings
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
      description: 'Validate all @inject() symbols have corresponding bindings',
      category: 'QUALIA.CODE - IoC/DI',
      recommended: true
    },
    schema: [],
    messages: {
      unboundInjection: 'QUALIA.CODE §2: Service "{{service}}" injects "{{symbol}}" but no binding exists. Add binding in inversify.config.ts or remove injection.',
      noGraph: 'QUALIA.CODE §2: dependency-graph.json not found. Run `node scripts/parse-inversify-graph.js` to generate it.'
    }
  },

  create(context) {
    const filename = context.getFilename();
    
    // Run on all service files
    if (!filename.includes('/services/') || filename.includes('__tests__') || filename.includes('contracts') || filename.includes('interfaces')) {
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
        
        // Extract service name from filename
        const serviceName = path.basename(filename, path.extname(filename));
        const deps = graph.dependencies[serviceName] || [];
        
        deps.forEach(depTypeSymbol => {
          // Skip config bindings - these are bound via safeBindConstant, not container.bind
          // Config symbols typically end with "Config" and don't start with "I"
          const symbolName = depTypeSymbol.replace('TYPES.', '');
          if (symbolName.endsWith('Config') || !symbolName.startsWith('I')) {
            return; // Config bindings are not tracked in dependency graph
          }
          
          if (!graph.bindings[depTypeSymbol]) {
            context.report({
              node,
              messageId: 'unboundInjection',
              data: {
                service: serviceName,
                symbol: depTypeSymbol
              }
            });
          }
        });
      }
    };
  }
};
