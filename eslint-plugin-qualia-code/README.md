# @qualia-tempo/eslint-plugin-qualia-code

ESLint plugin to enforce QUALIA.CODE v1.0 architectural principles in the Qualia Tempo project.

## Overview

This plugin automatically validates compliance with the architectural patterns defined in QUALIA.CODE.md, ensuring:

- IoC/DI patterns with CompositionRoot
- Event-driven architecture via EventBus  
- Configuration externalization
- Proper service usage patterns
- Contract generation enforcement

## Installation

```bash
npm install @qualia-tempo/eslint-plugin-qualia-code --save-dev
```

## Configuration

Add to your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['@qualia-tempo/qualia-code'],
  extends: ['plugin:@qualia-tempo/qualia-code/recommended']
};
```

Or configure individual rules:

```javascript
module.exports = {
  plugins: ['@qualia-tempo/qualia-code'],
  rules: {
    '@qualia-tempo/qualia-code/no-direct-service-instantiation': 'error',
    '@qualia-tempo/qualia-code/enforce-use-services-hook': 'error',
    '@qualia-tempo/qualia-code/no-complex-use-state': 'error',
    '@qualia-tempo/qualia-code/no-hardcoded-config': 'error',
    '@qualia-tempo/qualia-code/no-manual-contract-edit': 'error',
    '@qualia-tempo/qualia-code/deprecate-api-client': 'error',
    '@qualia-tempo/qualia-code/enforce-method-decorators': 'error'
  }
};
```

## Rules

### `no-direct-service-instantiation`

**What it does:** Prohibits direct service instantiation in React components.

**Why:** Enforces IoC/DI patterns. Services should be accessed via `useServices()` hook.

**❌ Incorrect:**
```typescript
// In a React component
const service = new QualiaService(); // ERROR
```

**✅ Correct:**
```typescript
// In CompositionRoot.ts (allowed)
const service = new QualiaService(); 

// In React components
const { qualiaService } = useServices();
```

### `enforce-use-services-hook`

**What it does:** Enforces use of `useServices()` hook instead of direct service imports in React components.

**Why:** Maintains IoC principles and prevents tight coupling.

**❌ Incorrect:**
```typescript
// In MyComponent.tsx
import { QualiaService } from '../services/QualiaService'; // ERROR
```

**✅ Correct:**
```typescript
// In MyComponent.tsx
import { useServices } from '../services/hooks';
const { qualiaService } = useServices();
```

### `no-complex-use-state`

**What it does:** Prevents complex state (objects/arrays) in `useState`.

**Why:** Complex state should be managed in Zustand store for consistency.

**❌ Incorrect:**
```typescript
const [user, setUser] = useState({name: 'John', age: 30}); // ERROR
const [items, setItems] = useState([1, 2, 3]); // ERROR
```

**✅ Correct:**
```typescript
const [isVisible, setIsVisible] = useState(false); // Simple primitives OK
// Use Zustand store for complex state
```

### `no-hardcoded-config`

**What it does:** Prevents hardcoded configuration values in service files.

**Why:** All configuration should be externalized to YAML files.

**❌ Incorrect:**
```typescript
// In QualiaService.ts
const timeout = 5000; // ERROR
const apiUrl = "https://api.example.com"; // ERROR
```

**✅ Correct:**
```typescript
// In QualiaService.ts
const config = this.configService.getConfig();
const timeout = config.timeout;
```

### `no-manual-contract-edit`

**What it does:** Prevents manual editing of auto-generated contract files.

**Why:** Contract files are generated from JSON schemas and should not be manually edited.

**Files checked:**
- `backend/api/models.py`
- `frontend/src/types/contracts.ts`

**Required:** Files must contain `@generated DO NOT EDIT` comment.

### `deprecate-api-client`

**What it does:** Deprecates direct `ApiClient` usage.

**Why:** Communication should use event-driven architecture via EventBus.

**❌ Incorrect:**
```typescript
import { ApiClient } from '../services/ApiClient'; // ERROR
const client = new ApiClient(); // ERROR
apiClient.get('/data'); // ERROR
```

**✅ Correct:**
```typescript
// Use EventBus for communication
eventBus.emit(new QualiaStateUpdated(state));
```

### `enforce-method-decorators`

**What it does:** Enforces method decorators in service classes.

**Why:** Ensures consistent logging, error handling, and performance monitoring.

**❌ Incorrect:**
```typescript
class QualiaService {
  calculateState() { // ERROR - missing decorator
    // method implementation
  }
}
```

**✅ Correct:**
```typescript
class QualiaService {
  @logMethod()
  @catchError()
  calculateState() {
    // method implementation
  }
}
```

**Required decorators:** `@logMethod()`, `@catchError()`, `@throttle(ms)`

**Exempt methods:** `constructor`, `start`, `stop`, `initialize`, `shutdown`, `destroy`, private methods

## Scripts

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint the plugin code
npm run lint
```

## Development

### Project Structure

```
lib/
├── index.js              # Main plugin entry point
└── rules/                # Individual rule implementations
    ├── no-direct-service-instantiation.js
    ├── enforce-use-services-hook.js
    ├── no-complex-use-state.js
    ├── no-hardcoded-config.js
    ├── no-manual-contract-edit.js
    ├── deprecate-api-client.js
    └── enforce-method-decorators.js
tests/                    # Test files for each rule
docs/                     # Additional documentation
```

### Running Tests

```bash
cd eslint-plugin-qualia-code
npm test
```

### Adding New Rules

1. Create rule implementation in `lib/rules/your-rule.js`
2. Add rule to `lib/index.js` exports
3. Create test file in `tests/your-rule.test.js`
4. Add rule to recommended configuration
5. Update this README

## License

MIT License - see LICENSE file for details.
