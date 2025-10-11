/**
 * @fileoverview SALA: Semantic I/O operation detection for retry enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ⚠️ PARTIALLY SEMANTIC - Uses TypeChecker but still pattern matches on method name. MUST UPGRADE: Analyze method body for HttpService/fetch calls
 * AUDIT NOTE (Senior Architect): "A MEDIAS. Tiene TypeChecker pero sigue pattern matching en nombre del método"
 */
'use strict';
const { requireTypeChecker, getNodeType, isPromiseType } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @retry on I/O operations', category: 'QUALIA.CODE - Resilience', recommended: true },
    schema: [],
    messages: {
      missingRetry: 'QUALIA.CODE §6: Method "{{method}}" performs I/O operations without @retry decorator. Add @retry(max_retries=3) for resilience.'
    }
  },
  create(context) {
    try {
      const { checker, tsNodeMap } = requireTypeChecker(context);
      const ioPatterns = ['fetch', 'get', 'post', 'put', 'delete', 'connect', 'send'];
      
      return {
        MethodDefinition(node) {
          if (!node.value?.body) return;
          const hasRetry = node.decorators?.some(d => d.expression?.callee?.name === 'retry');
          if (hasRetry) return;

          const hasIO = ioPatterns.some(pattern => node.key.name?.toLowerCase().includes(pattern));
          if (hasIO && node.value.async) {
            context.report({ node, messageId: 'missingRetry', data: { method: node.key.name } });
          }
        }
      };
    } catch { return {}; }
  }
};
