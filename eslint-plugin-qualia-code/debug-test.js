const { RuleTester } = require('eslint');
const rule = require('./lib/rules/deprecate-api-client');

console.log('Testing rule...');

const linter = new (require('eslint').ESLint)({
  useEslintrc: false,
  overrideConfig: {
    rules: {
      'test-rule': 'error'
    },
    plugins: {
      'test': {
        rules: {
          'test-rule': rule
        }
      }
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

const code = `
class MyClass {
  method() {
    this.apiClient.post("/update");
  }
}
`;

linter.lintText(code, { filePath: 'test.ts' }).then(results => {
  console.log('Results:', JSON.stringify(results, null, 2));
});
