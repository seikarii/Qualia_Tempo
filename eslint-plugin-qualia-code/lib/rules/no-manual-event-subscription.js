/**
 * @fileoverview SALA: Event subscription pattern enforcement
 * @author Qualia Tempo Team
 * MIGRATION STATUS: ✅ MIGRATED
 */
'use strict';
const { requireTypeChecker } = require('../utils/semantic-helpers');
module.exports = {
  meta: {
    type: 'error',
    docs: { description: 'Enforce @OnEvent decorator for event subscriptions', category: 'QUALIA.CODE - Event Architecture', recommended: true },
    schema: [],
    messages: {
      manualSubscription: 'QUALIA.CODE §4: Use @OnEvent decorator instead of manual eventBus.on(). Manual subscriptions violate lifecycle management.'
    }
  },
  create(context) {
    const filename = context.getFilename();
    if (!filename.includes('/services/')) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;

        const isEventBusCall = (
          (callee.object.name === 'eventBus' || callee.object.property?.name === 'eventBus') &&
          (callee.property.name === 'on' || callee.property.name === 'subscribe')
        );

        if (isEventBusCall) {
          const parent = context.getAncestors().find(a => a.type === 'MethodDefinition');
          const hasOnEventDecorator = parent?.decorators?.some(d => d.expression?.callee?.name === 'OnEvent');
          
          if (!hasOnEventDecorator) {
            context.report({ node, messageId: 'manualSubscription' });
          }
        }
      }
    };
  }
};
