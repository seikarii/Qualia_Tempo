/**
 * @fileoverview Tests for enforce-throttle-on-event-handlers rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-throttle-on-event-handlers');

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

ruleTester.run('enforce-throttle-on-event-handlers', rule, {
  valid: [
    // Correctly decorated high-frequency handler
    {
      code: `
        class EventService {
          @throttle(16)
          handleMouseMove(event: MouseEvent) {}
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    {
      code: `
        class InputService {
          @throttle(100)
          onScroll() {}
        }
      `,
      filename: 'src/services/InputService.ts'
    },
    {
      code: `
        class BrowserEventsService {
          @throttle(250)
          @logMethod()
          handleResize() {}
        }
      `,
      filename: 'src/services/BrowserEventsService.ts'
    },
    // Private methods don't need throttle
    {
      code: `
        class EventService {
          private handleMouseMove() {}
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    // Non-high-frequency methods
    {
      code: `
        class EventService {
          handleClick() {}
          handleSubmit() {}
        }
      `,
      filename: 'src/services/EventService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          handleMouseMove() {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class EventService {
          handleMouseMove(event: MouseEvent) {}
        }
      `,
      filename: 'src/services/EventService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'handleMouseMove' }
      }]
    },
    {
      code: `
        class InputService {
          onScroll() {}
        }
      `,
      filename: 'src/services/InputService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'onScroll' }
      }]
    },
    {
      code: `
        class BrowserEventsService {
          handleResize() {}
        }
      `,
      filename: 'src/services/BrowserEventsService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'handleResize' }
      }]
    },
    {
      code: `
        class AnimationService {
          onFrame() {}
        }
      `,
      filename: 'src/services/AnimationService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'onFrame' }
      }]
    },
    {
      code: `
        class TouchService {
          handleTouchMove() {}
        }
      `,
      filename: 'src/services/TouchService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'handleTouchMove' }
      }]
    },
    {
      code: `
        class PointerService {
          onPointerMove() {}
        }
      `,
      filename: 'src/services/PointerService.ts',
      errors: [{
        messageId: 'missingThrottle',
        data: { methodName: 'onPointerMove' }
      }]
    }
  ]
});
