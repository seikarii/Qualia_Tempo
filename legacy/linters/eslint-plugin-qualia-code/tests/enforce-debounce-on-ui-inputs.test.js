/**
 * @fileoverview Tests for enforce-debounce-on-ui-inputs rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-debounce-on-ui-inputs');

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

ruleTester.run('enforce-debounce-on-ui-inputs', rule, {
  valid: [
    // Correctly decorated UI input handler
    {
      code: `
        class SearchService {
          @debounce(300)
          handleSearchInputChange(query: string) {}
        }
      `,
      filename: 'src/services/SearchService.ts'
    },
    {
      code: `
        class BrowserEventsService {
          @debounce(500)
          onWindowResize() {}
        }
      `,
      filename: 'src/services/BrowserEventsService.ts'
    },
    {
      code: `
        class ConfigurationService {
          @debounce(250)
          @logMethod()
          handleConfigChange(config: any) {}
        }
      `,
      filename: 'src/services/ConfigurationService.ts'
    },
    // Private methods don't need debounce
    {
      code: `
        class SearchService {
          private handleSearchInputChange() {}
        }
      `,
      filename: 'src/services/SearchService.ts'
    },
    // Non-UI-input methods
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
          handleSearchInputChange() {}
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    {
      code: `
        class SearchService {
          handleSearchInputChange(query: string) {}
        }
      `,
      filename: 'src/services/SearchService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    },
    {
      code: `
        class BrowserEventsService {
          onWindowResize() {}
        }
      `,
      filename: 'src/services/BrowserEventsService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    },
    {
      code: `
        class FilterService {
          handleFilterChange() {}
        }
      `,
      filename: 'src/services/FilterService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    },
    {
      code: `
        class AutocompleteService {
          handleAutocomplete() {}
        }
      `,
      filename: 'src/services/AutocompleteService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    },
    {
      code: `
        class ValidationService {
          onValidation() {}
        }
      `,
      filename: 'src/services/ValidationService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    },
    {
      code: `
        class InputService {
          handleKeyPress() {}
        }
      `,
      filename: 'src/services/InputService.ts',
      errors: [{ 
        messageId: 'missingDebounce'
       }]
    }
  ]
});
