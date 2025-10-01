/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: no-manual-event-subscription
 *
 * Prohibits the use of eventBus.subscribe() in service files.
 * All event subscriptions MUST use the @OnEvent decorator for automatic lifecycle management.
 *
 * This enforces QUALIA.CODE section 9.1: Event-Driven Architecture
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohíbe la suscripción manual al EventBus para forzar el uso del decorador @OnEvent.',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const filename = context.getFilename();
    const isServiceFile = filename.includes('/services/') && filename.endsWith('.ts');

    if (!isServiceFile) {
      return {};
    }

    return {
      CallExpression(node) {
        // Check if this is a call to subscribe method
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'subscribe') {

          // Check if the object is eventBus or this.eventBus
          const object = node.callee.object;
          let isEventBusCall = false;

          if (object.type === 'Identifier' && object.name === 'eventBus') {
            isEventBusCall = true;
          } else if (object.type === 'MemberExpression' &&
                     object.object.type === 'ThisExpression' &&
                     object.property.name === 'eventBus') {
            isEventBusCall = true;
          }

          if (isEventBusCall) {
            context.report({
              node,
              message: "El uso directo de 'eventBus.subscribe()' está prohibido. Utilice el decorador '@OnEvent' en un método y asegúrese de que el servicio implemente 'IBaseService' para una gestión de ciclo de vida automática y segura. (QUALIA.CODE 9.1)"
            });
          }
        }
      }
    };
  }
};