/**
 * @fileoverview Tests for enforce-adapt-and-emit-on-raw-handlers rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-adapt-and-emit-on-raw-handlers');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      experimentalDecorators: true
    }
  }
});

ruleTester.run('enforce-adapt-and-emit-on-raw-handlers', rule, {
  valid: [
    // Correctly decorated raw handler
    {
      code: `
        class WebSocketService {
          @AdaptAndEmit('messageAdapter')
          onRawMessage(data: ArrayBuffer) {}
        }
      `,
      filename: 'src/services/WebSocketService.ts'
    },
    {
      code: `
        class ProtocolService {
          @AdaptAndEmit('packetAdapter')
          handleSocketData(event: MessageEvent) {}
        }
      `,
      filename: 'src/services/ProtocolService.ts'
    },
    // Non-raw handlers don't need decorator
    {
      code: `
        class EventService {
          handleClick() {}
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    // Private methods don't trigger
    {
      code: `
        class WebSocketService {
          private onRawMessage(data: ArrayBuffer) {}
        }
      `,
      filename: 'src/services/WebSocketService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          onRawMessage(data: ArrayBuffer) {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class WebSocketService {
          onRawMessage(data: ArrayBuffer) {}
        }
      `,
      filename: 'src/services/WebSocketService.ts',
      errors: [{ 
        messageId: 'missingAdaptAndEmit'
       }]
    },
    {
      code: `
        class ProtocolService {
          handleSocketData(event: MessageEvent) {}
        }
      `,
      filename: 'src/services/ProtocolService.ts',
      errors: [{ 
        messageId: 'missingAdaptAndEmit'
       }]
    },
    {
      code: `
        class BinaryService {
          handleBinaryData(buffer: Uint8Array) {}
        }
      `,
      filename: 'src/services/BinaryService.ts',
      errors: [{ 
        messageId: 'missingAdaptAndEmit'
       }]
    },
    {
      code: `
        class NetworkService {
          onPacket(data: any) {}
        }
      `,
      filename: 'src/services/NetworkService.ts',
      errors: [{ 
        messageId: 'missingAdaptAndEmit'
       }]
    },
    {
      code: `
        class WsService {
          handleWsMessage() {}
        }
      `,
      filename: 'src/services/WsService.ts',
      errors: [{ 
        messageId: 'missingAdaptAndEmit'
       }]
    }
  ]
});
