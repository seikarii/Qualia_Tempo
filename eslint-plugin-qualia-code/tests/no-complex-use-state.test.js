/**
 * @fileoverview Tests for no-complex-use-state rule
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('../lib/rules/no-complex-use-state');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  }
});

ruleTester.run('no-complex-use-state', rule, {
  valid: [
    // Simple primitive values
    {
      code: 'const [count, setCount] = useState(0);'
    },
    {
      code: 'const [isVisible, setIsVisible] = useState(true);'
    },
    {
      code: 'const [name, setName] = useState("");'
    },
    {
      code: 'const [status, setStatus] = useState(null);'
    },
    // Allowed constructors
    {
      code: 'const [date, setDate] = useState(new Date());'
    },
    // Simple function calls that return primitives
    {
      code: 'const [id, setId] = useState(Number("123"));'
    }
  ],

  invalid: [
    {
      code: 'const [user, setUser] = useState({name: "John", age: 30});',
      errors: [{
        messageId: 'noComplexUseState'
      }]
    },
    {
      code: 'const [items, setItems] = useState([1, 2, 3]);',
      errors: [{
        messageId: 'noComplexUseState'
      }]
    },
    {
      code: 'const [config, setConfig] = useState({});',
      errors: [{
        messageId: 'noComplexUseState'
      }]
    },
    {
      code: 'const [list, setList] = useState([]);',
      errors: [{
        messageId: 'noComplexUseState'
      }]
    },
    {
      code: 'const [data, setData] = useState(fetchData());',
      errors: [{
        messageId: 'noComplexUseState'
      }]
    }
  ]
});
