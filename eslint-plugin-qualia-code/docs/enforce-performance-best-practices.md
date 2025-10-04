# enforce-performance-best-practices

**Category:** QUALIA.CODE Performance  
**Severity:** Error (throttling), Warning (measureTime)  
**Introduced:** v1.2.0

## Overview

Codifies performance best practices to prevent bottlenecks and optimize system response. This rule acts as a performance guardrail, catching issues at compile-time rather than discovering them during production profiling.

## Rationale

Performance degradation is often introduced gradually through small oversights. Without automated enforcement, high-frequency event handlers and hot-path methods can cause significant performance issues that are difficult to trace back to their source.

This rule implements QUALIA.CODE Section 11: Performance Optimization Protocol.

## Rules

### Rule 1: High-Frequency Event Throttling (Error)

**Mandate:** Event listeners for high-frequency browser events MUST be throttled using the `@throttle` decorator or wrapped in a `throttle()` function.

**High-Frequency Events:**
- `resize`
- `scroll`
- `mousemove` / `pointermove`
- `touchmove`
- `wheel` / `mousewheel`
- `drag` / `dragover`

**Example Violation:**

```typescript
class BrowserService {
  public initialize(): void {
    // ❌ High-frequency event without throttling
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
}
```

**Correct Implementations:**

**Option 1: Inline Throttle Wrapper**
```typescript
class BrowserService {
  public initialize(): void {
    // ✅ Handler wrapped in throttle function
    window.addEventListener('resize', throttle(() => {
      this.handleResize();
    }, 250));
  }
}
```

**Option 2: Decorated Method Reference**
```typescript
class BrowserService {
  @throttle(100)
  private handleScroll(event: Event): void {
    this.updatePosition();
  }
  
  public initialize(): void {
    // ✅ Method has @throttle decorator
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }
}
```

### Rule 2: Render Loop Instrumentation (Warning)

**Suggestion:** Methods that operate in render loops (detected via `useFrame`, `requestAnimationFrame`, etc.) should use the `@measureTime` decorator for performance diagnostics.

This rule emits **warnings**, not errors, as it's a best practice suggestion for aiding performance debugging.

**Detection Heuristics:**
- Method contains `useFrame` calls
- Method uses `requestAnimationFrame`
- Parent class uses render loop patterns
- Method body is computationally intensive (>200 chars or contains loops/array operations)

**Example Warning:**

```typescript
class ViewLogicService {
  @logMethod()
  public calculateParticles(state: GameState): ParticleData[] {
    const particles = [];
    for (let i = 0; i < 1000; i++) { // ⚠️ Computational method in render context
      particles.push(this.createParticle(i));
    }
    
    useFrame(() => {
      this.updateParticles(particles);
    });
    
    return particles.filter(p => p.active);
  }
}
```

**Recommended Implementation:**

```typescript
class ViewLogicService {
  @logMethod()
  @measureTime() // ✅ Performance instrumentation for diagnostics
  public calculateParticles(state: GameState): ParticleData[] {
    const particles = [];
    for (let i = 0; i < 1000; i++) {
      particles.push(this.createParticle(i));
    }
    
    useFrame(() => {
      this.updateParticles(particles);
    });
    
    return particles.filter(p => p.active);
  }
}
```

## Exemptions

### Performance Exemption Comment

Methods can be exempted from the render loop instrumentation suggestion using a comment:

```typescript
class RenderService {
  /**
   * @performance-exempt
   * This method is already optimized and profiled
   */
  @logMethod()
  public renderFrame(): void {
    requestAnimationFrame(() => {
      this.complexCalculation();
    });
  }
}
```

**Supported Comment Patterns:**
- `@performance-exempt`
- `performance: exempt`
- `no throttle needed`

### Lifecycle Methods

Lifecycle methods are automatically exempt from render loop instrumentation:
- `constructor`
- `start`
- `stop`
- `initialize`
- `cleanup`

### Private Methods

Private methods are exempt from both rules, as they are internal implementation details.

## Configuration

This rule is enabled by default in the `@qualia-tempo/qualia-code/recommended` configuration.

```javascript
{
  "rules": {
    "@qualia-tempo/qualia-code/enforce-performance-best-practices": "error"
  }
}
```

## Performance Impact

According to QUALIA.CODE Section 11, decorators have measurable overhead:
- `@throttle()`: ~3-5% overhead (necessary for high-frequency events)
- `@measureTime()`: ~2-3% overhead (acceptable for diagnostics)

The throttling requirement prevents potential 100%+ performance degradation from unthrottled high-frequency events, making the decorator overhead negligible by comparison.

## JSX/TSX Support

The rule also detects inline event handlers in JSX:

```typescript
// ⚠️ Warning: High-frequency event in JSX
const MyComponent = () => {
  return <div onScroll={() => updatePosition()} />;
};

// ✅ Better: Use throttled callback
const MyComponent = () => {
  const handleScroll = throttle(() => updatePosition(), 250);
  return <div onScroll={handleScroll} />;
};
```

## Related Rules

- `enforce-method-decorators` - Enforces @logMethod and @catchError
- `no-global-api-calls` - Prevents direct use of setTimeout/setInterval

## Further Reading

- QUALIA.CODE.md - Section 11 (Performance Optimization Protocol)
- QUALIA.MANUAL.md - Section 4.1 (@catchError Performance Guidelines)
