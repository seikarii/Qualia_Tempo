/**
 * @qualia-tempo/eslint-plugin-qualia-code
 * Rule: enforce-event-interfaces-location
 * 
 * Prohibits defining event interfaces outside of events.contracts.ts
 * All event data structures MUST be defined in events.contracts.ts for
 * single source of truth and to eliminate circular dependencies.
 * 
 * This enforces QUALIA.CODE section 5: Event-Driven Architecture
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Event interfaces must be defined in events.contracts.ts only',
      category: 'QUALIA.CODE Compliance',
      recommended: true
    },
    fixable: null,
    schema: []
  },

  create(context) {
    const filename = context.getFilename();
    const isEventsContractsFile = filename.includes('events.contracts.ts');

    return {
      TSInterfaceDeclaration(node) {
        // Skip if we're in the correct file
        if (isEventsContractsFile) {
          return;
        }

        // Check if interface name ends with "Event"
        if (node.id.name.endsWith('Event')) {
          context.report({
            node: node.id,
            message: 'QUALIA.CODE Violation: Event interfaces MUST be defined in events.contracts.ts only. Move interface {{interfaceName}} to events.contracts.ts to maintain single source of truth.',
            data: {
              interfaceName: node.id.name
            }
          });
        }
      }
    };
  }
};
