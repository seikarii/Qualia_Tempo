/**
 * @fileoverview Tests for enforce-browser-only rule
 * @author Qualia Tempo Team
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-browser-only');

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

ruleTester.run('enforce-browser-only', rule, {
  valid: [
    // Method with @BrowserOnly accessing window
    {
      code: `
        class BrowserEventsService {
          @BrowserOnly
          public getWindowDimensions(): { width: number; height: number } {
            return {
              width: window.innerWidth,
              height: window.innerHeight
            };
          }
        }
      `,
      filename: 'src/services/BrowserEventsService.ts'
    },

    // Method with @BrowserOnly accessing document
    {
      code: `
        class DOMService {
          @BrowserOnly
          public getElementById(id: string): HTMLElement | null {
            return document.getElementById(id);
          }
        }
      `,
      filename: 'src/services/DOMService.ts'
    },

    // Method with @BrowserOnly accessing multiple browser APIs
    {
      code: `
        class BrowserService {
          @BrowserOnly
          public getBrowserInfo(): any {
            return {
              url: window.location.href,
              userAgent: navigator.userAgent,
              storage: localStorage.getItem('key')
            };
          }
        }
      `,
      filename: 'src/services/BrowserService.ts'
    },

    // Method without browser API access (no decorator needed)
    {
      code: `
        class CalculatorService {
          public calculate(a: number, b: number): number {
            return a + b;
          }
        }
      `,
      filename: 'src/services/CalculatorService.ts'
    },

    // Private method accessing window (exempt)
    {
      code: `
        class InternalService {
          private _getWindow() {
            return window;
          }
        }
      `,
      filename: 'src/services/InternalService.ts'
    },

    // Constructor accessing window (exempt)
    {
      code: `
        class ServiceWithBrowserInit {
          constructor() {
            this.width = window.innerWidth;
          }
        }
      `,
      filename: 'src/services/ServiceWithBrowserInit.ts'
    },

    // Lifecycle method accessing window (exempt)
    {
      code: `
        class ServiceWithLifecycle {
          public initialize(): void {
            this.observer = new window.MutationObserver(() => {});
          }
        }
      `,
      filename: 'src/services/ServiceWithLifecycle.ts'
    },

    // Non-service file (exempt)
    {
      code: `
        class MyComponent {
          handleClick() {
            window.alert('Hello!');
          }
        }
      `,
      filename: 'src/components/MyComponent.tsx'
    }
  ],

  invalid: [
    // Method accessing window without @BrowserOnly
    {
      code: `
        class BrowserEventsService {
          public getWindowWidth(): number {
            return window.innerWidth;
          }
        }
      `,
      filename: 'src/services/BrowserEventsService.ts',
      errors: [{
        messageId: 'missingBrowserOnly',
        data: {
          methodName: 'getWindowWidth',
          apis: 'window'
        }
      }]
    },

    // Method accessing document without @BrowserOnly
    {
      code: `
        class DOMService {
          public getElement(id: string): HTMLElement | null {
            return document.getElementById(id);
          }
        }
      `,
      filename: 'src/services/DOMService.ts',
      errors: [{
        messageId: 'missingBrowserOnly',
        data: {
          methodName: 'getElement',
          apis: 'document'
        }
      }]
    },

    // Method accessing localStorage without @BrowserOnly
    {
      code: `
        class StorageService {
          public saveData(key: string, value: string): void {
            localStorage.setItem(key, value);
          }
        }
      `,
      filename: 'src/services/StorageService.ts',
      errors: [{
        messageId: 'missingBrowserOnly',
        data: {
          methodName: 'saveData',
          apis: 'localStorage'
        }
      }]
    },

    // Method accessing multiple browser APIs without @BrowserOnly
    {
      code: `
        class BrowserService {
          public getInfo(): any {
            return {
              width: window.innerWidth,
              title: document.title,
              url: location.href
            };
          }
        }
      `,
      filename: 'src/services/BrowserService.ts',
      errors: [{
        messageId: 'missingBrowserOnly',
        data: {
          methodName: 'getInfo',
          apis: 'window, document, location'
        }
      }]
    },

    // Method accessing navigator without @BrowserOnly
    {
      code: `
        class DeviceService {
          public getUserAgent(): string {
            return navigator.userAgent;
          }
        }
      `,
      filename: 'src/services/DeviceService.ts',
      errors: [{
        messageId: 'missingBrowserOnly',
        data: {
          methodName: 'getUserAgent',
          apis: 'navigator'
        }
      }]
    }
  ]
});

console.log('✅ All enforce-browser-only tests passed!');
