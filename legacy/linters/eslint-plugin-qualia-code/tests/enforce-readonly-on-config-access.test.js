/**
 * @fileoverview Tests for enforce-readonly-on-config-access rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/enforce-readonly-on-config-access');

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

ruleTester.run('enforce-readonly-on-config-access', rule, {
  valid: [
    // Correctly decorated config accessor
    {
      code: `
        class ConfigurationService {
          @readonly
          getConfig(): ConfigObject {
            return this.config;
          }
        }
      `,
      filename: 'src/services/ConfigurationService.ts'
    },
    {
      code: `
        class SettingsService {
          @readonly
          loadSettings(): Settings {
            return this.settings;
          }
        }
      `,
      filename: 'src/services/SettingsService.ts'
    },
    // Non-config methods don't need @readonly
    {
      code: `
        class DataService {
          getData() {
            return this.data;
          }
        }
      `,
      filename: 'src/services/DataService.ts'
    },
    // Private methods don't trigger
    {
      code: `
        class ConfigurationService {
          private getConfig() {
            return this.config;
          }
        }
      `,
      filename: 'src/services/ConfigurationService.ts'
    },
    // Non-service files
    {
      code: `
        class Component {
          getConfig() {
            return {};
          }
        }
      `,
      filename: 'Component.tsx'
    }
  ],

  invalid: [
    // Rule now ONLY flags methods with explicit "Config" return types
    {
      code: `
        class ConfigurationService {
          getAudioConfig(): AudioConfig {
            return this.config;
          }
        }
      `,
      filename: 'src/services/ConfigurationService.ts',
      errors: [{ 
        messageId: 'suggestReadonly'
       }]
    },
    {
      code: `
        class SettingsService {
          loadConfig(): GameConfig {
            return this.settings;
          }
        }
      `,
      filename: 'src/services/SettingsService.ts',
      errors: [{ 
        messageId: 'suggestReadonly'
       }]
    },
    {
      code: `
        class PreferencesService {
          getGraphicsConfig(): GraphicsConfig {
            return this.prefs;
          }
        }
      `,
      filename: 'src/services/PreferencesService.ts',
      errors: [{ 
        messageId: 'suggestReadonly'
       }]
    }
  ]
});
