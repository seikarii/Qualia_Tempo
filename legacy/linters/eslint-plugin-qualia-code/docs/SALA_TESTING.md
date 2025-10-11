# SALA Testing Guide

## Testing Philosophy

SALA rules require **full TypeScript Type Checker access**, which means they need:
1. A valid `tsconfig.json` project
2. TypeScript parser services configured
3. Access to type information at analysis time

This makes unit testing SALA rules more complex than traditional ESLint rules.

## Testing Strategies

### Strategy 1: Integration Testing (Recommended)

Test SALA rules by running ESLint on real project files with proper TypeScript configuration.

```bash
# Run architectural linter on actual codebase
./scripts/lint-architecture.sh

# Or test specific files
cd qualia-tempo-prototype/frontend
npx eslint src/testing/mocks/*.ts --fix
```

### Strategy 2: Manual Validation

Create test files that deliberately violate SALA rules and verify detection:

```typescript
// test-fixtures/high-fidelity-mocks/violation.ts
interface IDataService {
  getData(): string;
}

// ❌ This should be caught by enforce-high-fidelity-mocks
export const mockDataService: IDataService = {
  getData: vi.fn() // VIOLATION: Bare vi.fn() for non-void method
};
```

Run ESLint:
```bash
npx eslint test-fixtures/high-fidelity-mocks/violation.ts
```

Expected output:
```
QUALIA.CODE §10.3.1 VIOLATION: Mock method 'getData' uses bare vi.fn() 
but interface declares return type 'string'.
```

### Strategy 3: Unit Testing with TypeScript Project

For true unit tests, you need a TypeScript project context:

```javascript
const { RuleTester } = require('@typescript-eslint/rule-tester');

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.test.json' // CRITICAL: Must point to valid tsconfig
  }
});

ruleTester.run('enforce-high-fidelity-mocks', rule, {
  valid: [/* ... */],
  invalid: [/* ... */]
});
```

**Limitation**: This requires maintaining a separate `tsconfig.test.json` and can be brittle.

## Current Test Coverage

### Existing Tests (Passing)
- All pre-SALA rules have unit tests
- 38 test suites, all passing
- These test rules that don't require Type Checker

### SALA Rules (Integration Testing Only)
Due to Type Checker requirements, SALA rules are validated via:
1. **Architectural Linter**: `./scripts/lint-architecture.sh`
2. **Manual Testing**: Apply to real codebase and verify detection
3. **Continuous Integration**: Run linter in CI/CD pipeline

## Validation Checklist

### For Each SALA Rule

- [ ] **Manual Violation Test**: Create file with deliberate violation
- [ ] **Detection Verification**: Run ESLint, confirm violation caught
- [ ] **Error Message Quality**: Verify prescriptive, helpful message
- [ ] **Auto-Fix Test** (if applicable): Verify fix produces correct code
- [ ] **Edge Cases**: Test with renamed imports, complex types, etc.
- [ ] **Performance**: Verify rule doesn't timeout on large files

## Test Fixtures

Create test fixtures in `test-fixtures/` directory:

```
test-fixtures/
├── high-fidelity-mocks/
│   ├── violation-bare-fn.ts
│   ├── violation-async-mismatch.ts
│   ├── violation-sync-mismatch.ts
│   └── compliant.ts
├── decorator-order/
│   ├── violation-registration-before-transformation.ts
│   └── compliant.ts
├── event-bus-type-safety/
│   ├── violation-not-base-event.ts
│   ├── violation-not-from-contracts.ts
│   └── compliant.ts
└── stateless-view-logic/
    ├── violation-calculation-in-useframe.ts
    └── compliant.ts
```

## Running SALA Validation

### Full Validation
```bash
./scripts/lint-architecture.sh
```

### Frontend Only (SALA Rules)
```bash
cd qualia-tempo-prototype/frontend
npx eslint 'src/**/*.{ts,tsx}' --config .eslintrc.cjs
```

### Specific File
```bash
npx eslint src/testing/mocks/logger.mock.ts
```

### Auto-Fix
```bash
npx eslint src/testing/mocks/*.ts --fix
```

## Debugging SALA Rules

### Enable TypeScript Logging
```javascript
// In semantic-helpers.js
console.log('Type:', checker.typeToString(type));
console.log('Symbol:', symbol?.name);
console.log('Declaration File:', getSymbolDeclarationFile(symbol));
```

### Check Parser Services Availability
```javascript
create(context) {
  try {
    const { checker } = requireTypeChecker(context);
    console.log('✅ Type Checker available');
  } catch (error) {
    console.log('❌ Type Checker unavailable:', error.message);
  }
}
```

### Verify TypeScript Configuration
```bash
# Check if project compiles
cd qualia-tempo-prototype/frontend
npx tsc --noEmit

# Verify parser services in ESLint
npx eslint --print-config src/services/EventBus.ts | grep parser
```

## Best Practices

1. **Integration Over Unit**: Prefer integration testing for SALA rules
2. **Real Codebase**: Use actual project code as test cases
3. **Continuous Validation**: Run linter in CI/CD on every commit
4. **Manual Review**: Periodically review SALA rule effectiveness
5. **Performance Monitoring**: Watch for Type Checker overhead

## Troubleshooting

### "Cannot read config file: tsconfig.json"
- Ensure `parserOptions.project` points to valid tsconfig
- Use absolute path or relative from ESLint config location

### "Parser services not available"
- Verify `@typescript-eslint/parser` is configured
- Check `parserOptions.project` is set
- Ensure TypeScript is installed

### "Type Checker returns undefined"
- Node might not be in TypeScript AST
- Type might not be resolvable (e.g., `any` type)
- Check if file is included in tsconfig

## Future Improvements

- [ ] Create comprehensive test fixture suite
- [ ] Automate fixture validation in CI/CD
- [ ] Build custom RuleTester with Type Checker mocking
- [ ] Generate performance benchmarks for SALA rules
- [ ] Create visual dashboard for rule coverage

---

**Remember**: SALA rules are architectural guardians. They must be validated in real-world conditions, not just isolated unit tests.
