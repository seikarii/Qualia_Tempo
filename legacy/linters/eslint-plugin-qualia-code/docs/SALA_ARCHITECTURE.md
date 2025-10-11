# SALA - Semantically-Aware Linting Architecture

## Philosophy

SALA represents a paradigm shift from syntactic pattern matching to semantic code understanding. We don't search for strings; we analyze types, resolve symbols, and understand the architectural intent of code.

**Core Principle**: "We operate on types, not text. We understand code, not parse strings."

## Architecture Overview

### Layer 1: Type Checker Foundation

All SALA rules require TypeScript parser services and access to the Type Checker. This is enforced via the `requireTypeChecker()` utility, which throws a descriptive error if parser services are unavailable.

```javascript
const { requireTypeChecker } = require('../utils/semantic-helpers');

create(context) {
  const { checker, tsNodeMap } = requireTypeChecker(context);
  // Rule implementation with full type information
}
```

### Layer 2: Semantic Helpers Library

Location: `lib/utils/semantic-helpers.js`

Provides reusable semantic analysis functions:

- **Type Resolution**: `getNodeType()`, `isTypeFromFile()`
- **Type Classification**: `isConcreteClass()`, `isInterface()`, `isPromiseType()`
- **Type Relationships**: `extendsType()`, `getReturnType()`
- **Decorator Analysis**: `hasDecorator()`, `getDecoratorByName()`, `getDecorators()`
- **Symbol Analysis**: `getSymbolDeclarationFile()`

### Layer 3: Semantic Rules

#### Phase 2 Rules (Implemented)

1. **enforce-high-fidelity-mocks** (CRITICAL - §10.3.1)
   - Analyzes mock objects against interface contracts
   - Validates that mock methods respect return types
   - Distinguishes between sync (`mockReturnValue`) and async (`mockResolvedValue`)
   - Prevents bare `vi.fn()` for non-void methods
   
2. **enforce-decorator-order** (CRITICAL - §5.2)
   - Understands decorator execution order (bottom-to-top)
   - Enforces layering: Registration < Validation < Transformation
   - Provides auto-fix to swap incorrectly ordered decorators
   - Prevents registration decorators from being wrapped by transformation decorators
   
3. **enforce-event-bus-type-safety** (CRITICAL - §5)
   - Validates EventBus emissions use types from `events.contracts.ts`
   - Checks that all events extend `BaseEvent`
   - Uses Type Checker to resolve event type arguments
   - Prevents circular dependencies through contract location enforcement
   
4. **enforce-stateless-view-logic** (CRITICAL - §8.1)
   - Detects calculations in `useFrame` hooks
   - Identifies game state transformations in rendering code
   - Validates presence of ViewLogicService calls
   - Enforces separation between calculation and rendering

#### Phase 2 Rule Migration (Completed)

1. **deprecate-api-client** (Migrated to Semantic)
   - OLD: String matching for "ApiClient"
   - NEW: Type origin resolution
   - Detects ApiClient usage even when renamed in imports
   - Example: `import { ApiClient as OldClient }` is still caught

## Configuration Requirements

SALA rules require proper TypeScript parser configuration:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "project": "./tsconfig.json"
  }
}
```

**CRITICAL**: The `project` option must point to a valid `tsconfig.json`. Without this, the Type Checker is unavailable and SALA rules will fail.

## Error Message Philosophy

Every SALA error message is prescriptive and educational:

1. **Identification**: What violation was detected
2. **Context**: Which QUALIA.CODE section applies (e.g., §10.3.1)
3. **Explanation**: Why this is a violation
4. **Correction**: Exact pattern to use instead
5. **Reference**: Link to QUALIA.MANUAL.md for examples

Example:
```
QUALIA.CODE §10.3.1 VIOLATION: Mock method 'getData' uses bare vi.fn() 
but interface declares return type 'Promise<string>'. 

HIGH-FIDELITY MANDATE: Use mockResolvedValue('') for async methods. 

Bare vi.fn() returns undefined, violating the interface contract and 
causing unpredictable test failures. 

Consult QUALIA.MANUAL.md §10.4 for examples.
```

## Performance Considerations

### Type Checker Overhead

- Type resolution adds ~5-10ms per node analyzed
- Acceptable for linting (not hot path)
- Benefits far outweigh cost (surgical precision vs. regex guesswork)

### Graceful Degradation

Some rules (e.g., `deprecate-api-client`) provide fallback implementations when Type Checker unavailable:

```javascript
create(context) {
  let typeServices;
  try {
    typeServices = requireTypeChecker(context);
  } catch (error) {
    return createFallbackRule(context); // Degrades to string matching
  }
  // Full semantic analysis
}
```

## Testing SALA Rules

SALA rules require special test setup to provide TypeScript services:

```javascript
const { RuleTester } = require('@typescript-eslint/rule-tester');

const ruleTester = new RuleTester({
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    project: './tsconfig.test.json'
  }
});
```

## Future Roadmap (Phase 3)

### Dependency Graph Analysis

Create a dependency graph parser that reads `inversify.config.ts` and generates `dependency-graph.json`:

```json
{
  "bindings": {
    "ILogger": {
      "implementation": "QualiaLogger",
      "scope": "singleton",
      "file": "services/Logger.ts"
    }
  },
  "dependencies": {
    "GameControllerService": ["ILogger", "IEventBus", "IGameState"]
  }
}
```

### Graph-Based Rules

1. **detect-circular-dependencies**
   - Analyze binding graph for cycles
   - Impossible to detect with file-by-file analysis
   
2. **enforce-correct-injection-scope**
   - Warn if transient service injects stateful singleton
   - Requires global view of container bindings
   
3. **validate-injection-existence**
   - Verify `@inject(TYPES.IService)` has corresponding binding
   - Prevents runtime container resolution failures

## Philosophical Foundation

SALA embodies the QUALIA.CODE principle: **"Architecture is Code, Code is Architecture."**

Our linter doesn't just check syntax; it understands our architectural intent and guides developers toward compliance with surgical precision. It's not a safety net; it's an extension of the architecture itself.

---

**Status**: PHASE 2 COMPLETE  
**Next Mission**: PHASE 3 - Dependency Graph Intelligence
