/**
 * @fileoverview Enforce EventBus type safety and contract compliance (QUALIA.CODE §5)
 * @author Qualia Tempo - CRISALIDA Architecture Team
 * 
 * CRITICAL RULE: All events emitted via EventBus must extend BaseEvent and be
 * defined in events.contracts.ts. This prevents circular dependencies and ensures
 * a single source of truth for event contracts.
 * 
 * PHILOSOPHY: We validate event types at compile time, not runtime.
 */

'use strict';

const { requireTypeChecker, getNodeType, extendsType, getSymbolDeclarationFile } = require('../utils/semantic-helpers');

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce type safety for EventBus emissions - all events must extend BaseEvent and be defined in events.contracts.ts (QUALIA.CODE §5)',
      category: 'Event Architecture',
      recommended: true,
      url: 'https://github.com/qualia-tempo/docs/QUALIA.CODE.md#5-communication-event-driven-architecture'
    },
    fixable: null,
    schema: [],
    messages: {
      eventNotFromContract:
        "QUALIA.CODE §5 VIOLATION: Event type '{{eventType}}' emitted to EventBus is not defined in events.contracts.ts. " +
        "EVENT CONTRACT MANDATE: All event interfaces MUST be defined exclusively in 'src/services/contracts/events.contracts.ts'. " +
        "Current definition location: {{currentLocation}}. " +
        "This prevents circular dependencies and provides a single source of truth. " +
        "Move this event interface to events.contracts.ts immediately.",
      eventDoesNotExtendBase:
        "QUALIA.CODE §5 VIOLATION: Event type '{{eventType}}' does not extend BaseEvent. " +
        "TYPE SAFETY MANDATE: All events MUST extend BaseEvent interface (type, timestamp, source, metadata). " +
        "Correct pattern: export interface {{eventType}} extends BaseEvent { ... }. " +
        "This ensures consistent event structure across the system.",
      cannotDetermineEventType:
        "QUALIA.CODE §5 WARNING: Cannot determine type of event being emitted to EventBus. " +
        "Event parameter has type 'any' or is untyped. " +
        "Use explicit typing: eventBus.emit<MyEventType>(event) to enable compile-time validation."
    }
  },

  create(context) {
    let typeServices;
    try {
      typeServices = requireTypeChecker(context);
    } catch (error) {
      // TypeScript services not available
      return {};
    }

    const { checker, tsNodeMap } = typeServices;

    /**
     * Check if a call expression is eventBus.emit()
     */
    function isEventBusEmit(node) {
      if (node.type !== 'CallExpression') return false;
      if (!node.callee || node.callee.type !== 'MemberExpression') return false;
      
      const object = node.callee.object;
      const property = node.callee.property;
      
      // Check for eventBus.emit or this.eventBus.emit
      return property.name === 'emit' && 
             (object.name === 'eventBus' || 
              (object.type === 'MemberExpression' && object.property.name === 'eventBus'));
    }

    /**
     * Get the type argument from eventBus.emit<T>(event)
     */
    function getEmitTypeArgument(node) {
      // Check for type arguments in CallExpression
      if (node.typeParameters && node.typeParameters.params && node.typeParameters.params.length > 0) {
        const typeParam = node.typeParameters.params[0];
        return getNodeType(typeParam, tsNodeMap, checker);
      }
      
      return null;
    }

    /**
     * Get the type of the event argument being passed to emit()
     */
    function getEventArgumentType(node) {
      if (!node.arguments || node.arguments.length === 0) return null;
      
      const eventArg = node.arguments[0];
      return getNodeType(eventArg, tsNodeMap, checker);
    }

    return {
      CallExpression(node) {
        if (!isEventBusEmit(node)) return;

        // Try to get type from explicit type argument first
        let eventType = getEmitTypeArgument(node);
        
        // If no explicit type argument, infer from the event argument
        if (!eventType) {
          eventType = getEventArgumentType(node);
        }

        if (!eventType) {
          // Cannot determine type
          context.report({
            node,
            messageId: 'cannotDetermineEventType'
          });
          return;
        }

        const eventTypeString = checker.typeToString(eventType);
        
        // Check if event type extends BaseEvent
        const extendsBaseEvent = extendsType(eventType, 'BaseEvent', checker);
        
        if (!extendsBaseEvent) {
          context.report({
            node,
            messageId: 'eventDoesNotExtendBase',
            data: {
              eventType: eventTypeString
            }
          });
        }

        // Check if event type is defined in events.contracts.ts
        const symbol = eventType.getSymbol();
        if (!symbol) return;
        
        const declarationFile = getSymbolDeclarationFile(symbol);
        
        if (!declarationFile) return;
        
        const isFromEventsContracts = declarationFile.includes('events.contracts.ts') || 
                                       declarationFile.includes('events.contracts.tsx');
        
        if (!isFromEventsContracts) {
          context.report({
            node,
            messageId: 'eventNotFromContract',
            data: {
              eventType: eventTypeString,
              currentLocation: declarationFile
            }
          });
        }
      }
    };
  }
};
