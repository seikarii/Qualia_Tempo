# enforce-validation-on-boundaries

**Category:** QUALIA.CODE Data Integrity  
**Severity:** Error  
**Introduced:** v1.2.0

## Overview

Ensures data integrity at critical system boundaries by enforcing validation decorators. This rule implements the "Trust but Verify" principle for data entry points, preventing runtime errors caused by malformed data.

## Rationale

Blind trust in data shape at system boundaries is a common source of production failures. This rule codifies defensive programming as an architectural mandate, catching data integrity issues at compile-time rather than runtime.

## Rules

### Rule 1: Event Handler Validation

**Mandate:** Any method decorated with `@OnEvent` that accesses event properties MUST use the `@validateEventProperty` decorator.

**Detection Pattern:**
- Method has `@OnEvent('EventName')` decorator
- Method body accesses event properties via:
  - `event.property`
  - `event['property']`
  - Destructuring: `const { property } = event`

**Example Violation:**

```typescript
class GameControllerService {
  @OnEvent('PlayerAction')
  private handlePlayerAction(event: PlayerActionEvent): void {
    const action = event.action; // ❌ Accessing event property without validation
    this.processAction(action);
  }
}
```

**Correct Implementation:**

```typescript
class GameControllerService {
  @OnEvent('PlayerAction')
  @validateEventProperty() // ✅ Event properties validated
  private handlePlayerAction(event: PlayerActionEvent): void {
    const action = event.action;
    this.processAction(action);
  }
}
```

### Rule 2: DTO Parameter Validation

**Mandate:** Any public service method that accepts a parameter typed from `shared_contracts` MUST use the `@validate(SchemaName)` decorator.

**Detection Pattern:**
- Method is public
- Method is in a class ending with `Service`
- Parameter type matches patterns:
  - `*State` (QualiaState, BossState, etc.)
  - `*Data` (CombatData, PlayerData, etc.)
  - `*Info`, `*Config`, `*Event`, `*Payload`, `*Request`, `*Response`
- Type is imported from `shared_contracts` or `types/contracts`

**Example Violation:**

```typescript
import { QualiaState } from '../types/contracts';

class QualiaCalculatorService {
  @logMethod()
  public calculateMetrics(state: QualiaState): void { // ❌ DTO without validation
    return state.value * 2;
  }
}
```

**Correct Implementation:**

```typescript
import { QualiaState } from '../types/contracts';

class QualiaCalculatorService {
  @logMethod()
  @validate('QualiaState') // ✅ DTO validated against schema
  public calculateMetrics(state: QualiaState): void {
    return state.value * 2;
  }
}
```

## Exemptions

### Private Methods (DTO Validation Only)

Private methods are exempt from DTO validation requirements, as they are internal implementation details. However, event handlers are checked regardless of visibility.

```typescript
class QualiaCalculatorService {
  // ✅ Private method - exempt from DTO validation
  private _processState(state: QualiaState): void {
    // internal logic
  }
}
```

### Non-Service Files

Only files in `/services/` directories are checked. Components, utilities, and other files are exempt.

## Configuration

This rule is enabled by default in the `@qualia-tempo/qualia-code/recommended` configuration.

```javascript
{
  "rules": {
    "@qualia-tempo/qualia-code/enforce-validation-on-boundaries": "error"
  }
}
```

## When Not to Use

This rule should **always** be enabled in production codebases. It is a critical architectural safeguard.

## Related Rules

- `enforce-method-decorators` - Enforces logging and error handling decorators
- `no-manual-event-subscription` - Enforces @OnEvent usage over manual subscriptions

## Further Reading

- QUALIA.CODE.md - Section 5.2 (Decorators)
- QUALIA.MANUAL.md - Section 2.1 (Event Contracts)
