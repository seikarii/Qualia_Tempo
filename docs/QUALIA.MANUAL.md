# Qualia.MANUAL - Implementation Guide
# TARGET: Qualia Tempo Prototype
# COMPLIANCE: QUALIA.CODE v1.1

---

## Introduction

This manual provides practical implementation examples and step-by-step guides for applying QUALIA.CODE architectural principles. While QUALIA.CODE.md defines the architectural mandates and prohibitions, this manual shows HOW to implement them correctly.

**WARNING:** This manual contains implementation examples only. For architectural rules and principles, refer to QUALIA.CODE.md.

---

## 1. IoC Container Setup and Service Implementation

### 1.1. Type Definitions (inversify.types.ts)

```typescript
export const TYPES = {
  // --- Core Services ---
  Logger: Symbol.for("Logger"),
  EventBus: Symbol.for("EventBus"),
  ConfigurationService: Symbol.for("ConfigurationService"),
  IHttpService: Symbol.for("IHttpService"),
  ITimerService: Symbol.for("ITimerService"),

  // --- Feature Services ---
  IQualiaService: Symbol.for("IQualiaService"),
  IBackendSyncService: Symbol.for("IBackendSyncService"),
  IGameControllerService: Symbol.for("IGameControllerService"),
};
```

### 1.2. Container Configuration (inversify.config.ts)

```typescript
import { container } from './inversify.container';
import { TYPES } from './inversify.types';
import { QualiaService } from './QualiaService';
import { IQualiaService } from './interfaces/IQualiaService';

container.bind<IQualiaService>(TYPES.IQualiaService).to(QualiaService).inSingletonScope();
```

### 1.3. Service Implementation with Direct Configuration Injection

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from './inversify.types';
import { IQualiaService } from './interfaces/IQualiaService';
import { MyNewServiceConfig } from './contracts/IMyNewService.contracts';
import { ILogger } from './interfaces/ILogger';

@injectable()
export class MyNewService implements IMyNewService {
  private readonly config: MyNewServiceConfig;
  private readonly logger: ILogger;

  constructor(
    // CRITICAL CHANGE: Inject the specific config object, NOT IConfigurationService
    @inject(TYPES.MyNewServiceConfig) config: MyNewServiceConfig,
    @inject(TYPES.ILogger) logger: ILogger
  ) {
    this.config = config;
    this.logger = logger;
    this.logger.info('MyNewService Initialized with timeout:', this.config.timeout);
  }

  @logMethod()
  public async execute(params: any): Promise<void> {
    if (!this.config.featureFlags.newFeature) {
        this.logger.warn('New feature is disabled by configuration.');
        return;
    }
    // ... logic using this.config.apiUrl
  }
}
```

### 1.4. ApplicationCompositionRoot Usage

```typescript
// index.tsx - Application Entry Point
import { ApplicationCompositionRoot } from './services/ApplicationCompositionRoot';

async function main() {
  const compositionRoot = new ApplicationCompositionRoot();
  await compositionRoot.initializeApplication();
  
  // React app initialization...
}
```

---

## 2. Event-Driven Architecture Implementation

### 2.1. Event Contracts Definition

```typescript
export interface BaseEvent {
  type: string;
  timestamp: Date;
  source?: string;
  metadata?: Record<string, any>;
}

export interface PlayerActionEvent extends BaseEvent {
  type: "PlayerAction";
  action: "Dash" | "HitNote" | "MissNote" | "FastForward" | "Rewind" | "StartGame" | "PauseGame" | "ResetGame" | "scoreIncrease";
  context?: Record<string, any>;
  value?: number;
}
```

### 2.2. @AdaptAndEmit Decorator Usage

```typescript
@injectable()
export class WebSocketMessageHandler {
  constructor(
    @inject(TYPES.IEventBus) private eventBus: IEventBus,
    @inject(TYPES.IRawToParticleEventAdapter) private messageAdapter: IMessageAdapter
  ) {}

  @AdaptAndEmit('messageAdapter')
  private onRawMessage(rawData: ArrayBuffer): void {
    // The body of this method can be empty or contain logic
    // that executes AFTER the event has been emitted,
    // such as tracking statistics.
    this.messagesReceived++;
  }
}
```

---

## 3. Architectural Linting Setup

### 3.1. ESLint Plugin Configuration

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@qualia-tempo/qualia-code'],
  rules: {
    '@qualia-tempo/qualia-code/no-direct-service-instantiation': 'error',
    '@qualia-tempo/qualia-code/enforce-use-services-hook': 'error',
    // Customize rule severity as needed
    '@qualia-tempo/qualia-code/no-hardcoded-config': 'warn'
  }
};
```

### 3.2. Package.json Scripts

```json
{
  "scripts": {
    "lint:architecture": "./scripts/lint-architecture.sh",
    "precommit": "npm run lint:architecture"
  }
}
```

### 3.3. CI/CD Integration

```yaml
name: QUALIA.CODE Compliance
on: [push, pull_request]

jobs:
  lint-architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          npm install
          python -m venv .venv
          source .venv/bin/activate
          pip install -r requirements.txt
      - name: Run Architectural Linter
        run: ./scripts/lint-architecture.sh
```

---

## 4. Decorator Usage Guidelines

### 4.1. @catchError Performance Guidelines

```typescript
// ❌ INCORRECT - Overuse on simple getter
@logMethod()
@catchError()  // UNNECESSARY - adds overhead to simple property access
public getCurrentState(): GameState {
  return this.gameState;
}

// ✅ CORRECT - Simple getter without error boundary
@logMethod()
public getCurrentState(): GameState {
  return this.gameState;
}

// ✅ CORRECT - Complex operation needs error boundary
@logMethod()
@catchError()  // NECESSARY - async I/O operation can fail
public async loadConfiguration(): Promise<void> {
  const config = await this.httpService.get('/api/config');
  this.parseAndValidateConfig(config);
}
```

### 4.2. Logging Implementation

```typescript
// INCORRECT - DO NOT USE
// console.log('Service started');

// CORRECT - USE THIS
this.logger.info('Service started');
```

### 4.3. Uso de @BrowserOnly para Abstracción de Entorno

El decorador `@BrowserOnly` simplifica radicalmente los servicios que interactúan con APIs del navegador, eliminando la necesidad de comprobaciones repetitivas.

#### **ANTES (Patrón Prohibido): Comprobación Manual**
```typescript
// Lógica de comprobación de entorno mezclada con la lógica de negocio.
// Esto es repetitivo y propenso a errores.

@logMethod
public getWindowDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    this.logger.warn("Window object not available, cannot get dimensions");
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}
```

#### **DESPUÉS (Patrón Correcto): Uso Declarativo del Decorador**
```typescript
// La responsabilidad de la comprobación del entorno se delega al decorador.
// El método es ahora más limpio y se centra únicamente en su tarea.

@logMethod
@BrowserOnly
public getWindowDimensions(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}
```

---

## 5. Testing Implementation

### 5.1. Backend Testing with TestCompositionRootFactory

```python
import pytest
from backend.tests.test_composition_root import TestCompositionRootFactory

class TestMyService:
    @pytest.fixture
    def mocked_composition_root(self):
        return TestCompositionRootFactory.create_mocked_composition_root()
    
    def test_my_service_functionality(self, mocked_composition_root):
        # Arrange: Extract dependency mocks
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        event_bus_mock = mocks["event_bus"]
        
        # Act: Resolve Service Under Test from container
        my_service = mocked_composition_root.get_service("my_service")
        
        # Configure mock behavior
        event_bus_mock.publish.return_value = asyncio.create_task(asyncio.sleep(0))
        
        # Exercise the service
        result = my_service.do_something()
        
        # Assert
        assert result is not None
        event_bus_mock.publish.assert_called_once()
```

### 5.2. Frontend Testing with test-container-factory.ts

```typescript
import { createTestContainer, getMocksFromContainer } from '../testing/test-container-factory';
import { INotificationService } from '../services/interfaces/INotificationService';
import { ILogger } from '../services/interfaces/ILogger';
import { TYPES } from '../services/inversify.types';

describe('NotificationService', () => {
  let container: Container;
  let notificationService: INotificationService;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    container = createTestContainer();
    notificationService = container.get<INotificationService>(TYPES.INotificationService);
    const mocks = getMocksFromContainer(container);
    mockLogger = mocks.mockLogger as jest.Mocked<ILogger>;
  });

  it('should do something correctly', () => {
    // Arrange
    const message = 'Test';

    // Act
    notificationService.show(message);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(message));
  });
});
```

### 5.3. Testing Anti-Patterns (FORBIDDEN)

#### Backend Anti-Patterns:
```python
# FORBIDDEN: Direct service instantiation
from backend.services.MyService import MyService
service = MyService(dependency)  # CRITICAL VIOLATION

# FORBIDDEN: Mock patches that bypass the container
@patch('backend.services.MyService.dependency')
def test_with_patch(mock_dep):
    service = MyService()  # STILL VIOLATES IoC

# CORRECT: Use the factory
def test_with_factory(mocked_composition_root):
    service = mocked_composition_root.get_service("my_service")
```

#### Frontend Anti-Patterns:
```typescript
// FORBIDDEN: Direct service instantiation
import { MyService } from '../services/MyService';
const service = new MyService(mockDep);  // CRITICAL VIOLATION

// FORBIDDEN: Direct container access in tests
import { container } from '../services/inversify.config';
const service = container.get<IMyService>(TYPES.IMyService);  // VIOLATION

// CORRECT: Use the test factory
import { createTestContainer } from '../testing/test-container-factory';
const testContainer = createTestContainer();
const service = testContainer.get<IMyService>(TYPES.IMyService);
```

---

## 6. AI Workflow Example: Adding a new Qualia Parameter

1. **Modify Contract:** Edit the appropriate JSON Schema file in `/shared_contracts`.
2. **Generate Code:** Run `scripts/generate_contracts.sh`. Verify the changes in the generated Python model and TypeScript interface.
3. **Update Configuration:** Add new parameters to the YAML configuration file loaded by `ConfigurationService`.
4. **Implement Service:** Create new service class with `@injectable()` decorator and `@inject()` parameters.
5. **Add Binding:** Registrar la nueva interfaz y su implementación en el contenedor `inversify.config.ts`:
   ```typescript
   container.bind<IMyNewService>(TYPES.IMyNewService).to(MyNewService).inSingletonScope();
   ```
6. **Update Logic:**
   - **Frontend:** Modify the service to compute the new parameter using configuration from `ConfigurationService`.
   - **Backend:** Modify the visual systems (`ParticleEngine`, etc.) to react to the new parameter from the event bus.
7. **Apply Decorators:** Ensure any new methods use the appropriate decorators for logging, error handling, and validation.
8. **Test:** Write unit tests for the new calculation logic and integration tests for the visual output.

---

## 7. Performance Optimization Examples

### 7.1. High-Performance Service Design

```typescript
@injectable()
export class OptimizedService {
  // ✅ Fast path - no decorators on simple getters
  public getState(): State {
    return this.state;
  }
  
  // ✅ System boundary - appropriate decorator usage
  @logMethod()
  @catchError()
  public async processExternalData(data: unknown): Promise<void> {
    // Complex operation that justifies overhead
  }
}
```

### 7.2. Suboptimal Language Detection Example

```typescript
// SUBOPTIMAL: Using JavaScript for high-performance particle physics
// RECOMMENDATION: Migrate particle calculations to Rust/WebAssembly
class ParticleEngine {
  updateParticles(particles: Particle[]): void {
    // Complex physics calculations in JavaScript - poor performance
  }
}

// OPTIMAL: Use Rust compiled to WebAssembly for performance-critical code
// particle_engine.rs (compiled to WebAssembly)
pub fn update_particles(particles: &mut [Particle]) {
    // High-performance Rust implementation
}
```

---

## 8. Configuration Injection Patterns

### 8.1. Anti-Pattern: Service Locator (FORBIDDEN)

```typescript
// FORBIDDEN - DEPRECATED PATTERN
@injectable()
export class MyOldService {
  private configService: IConfigurationService;
  constructor(
    // CRITICAL VIOLATION: Do not inject the entire ConfigurationService
    @inject(TYPES.IConfigurationService) configService: IConfigurationService
  ) {
    this.configService = configService;
  }

  public async execute(): Promise<void> {
    // Accessing config through service locator pattern
    const apiUrl = this.configService.getConfig().apiUrl;
    const timeout = this.configService.getConfig().timeout;
    // ... use apiUrl and timeout
  }
}
```

### 8.2. Correct Pattern: Direct Configuration Injection

```typescript
// CORRECT - DIRECT CONFIGURATION INJECTION
@injectable()
export class MyNewService {
  private config: MyNewServiceConfig;
  constructor(
    // CORRECT: Inject only the configuration object you need
    @inject(TYPES.MyNewServiceConfig) config: MyNewServiceConfig
  ) {
    this.config = config;
  }

  public async execute(): Promise<void> {
    // Direct access to typed configuration
    if (!this.config.featureFlags.newFeature) {
        this.logger.warn('New feature is disabled by configuration.');
        return;
    }
    // ... use this.config.apiUrl and this.config.timeout
  }
}
```

---

## 9. Global API Abstraction Examples

### 9.1. HttpService Usage

```typescript
// INCORRECT - VIOLATION
const response = await fetch('/api/data');

// CORRECT - USE THIS
const data = await this.httpService.get('/api/data');
```

### 9.2. TimerService Usage

```typescript
// INCORRECT - VIOLATION
const timerId = setTimeout(() => { /* ... */ }, 1000);
clearTimeout(timerId);

// CORRECT - USE THIS
const timerId = this.timerService.setTimeout(() => { /* ... */ }, 1000);
this.timerService.clearTimeout(timerId);
```

---

## 10. Testing Implementation Examples

### 10.1. Backend Testing with TestCompositionRootFactory

```python
import pytest
from backend.tests.test_composition_root import TestCompositionRootFactory

class TestMyService:
    @pytest.fixture
    def mocked_composition_root(self):
        return TestCompositionRootFactory.create_mocked_composition_root()
    
    def test_my_service_functionality(self, mocked_composition_root):
        # Arrange: Extract dependency mocks
        mocks = TestCompositionRootFactory.get_service_mocks(mocked_composition_root)
        event_bus_mock = mocks["event_bus"]
        
        # Act: Resolve Service Under Test from container
        my_service = mocked_composition_root.get_service("my_service")
        
        # Configure mock behavior
        event_bus_mock.publish.return_value = asyncio.create_task(asyncio.sleep(0))
        
        # Exercise the service
        result = my_service.do_something()
        
        # Assert
        assert result is not None
        event_bus_mock.publish.assert_called_once()
```

### 10.2. Frontend Testing with test-container-factory.ts

```typescript
import { createTestContainer } from '../testing/test-container-factory';
import { mockLogger } from '../testing/mocks/logger.mock';
import { INotificationService } from '../services/interfaces/INotificationService';
import { ILogger } from '../services/interfaces/ILogger';
import { TYPES } from '../services/inversify.types';

describe('NotificationService', () => {
  let container: Container;
  let notificationService: INotificationService;

  beforeEach(() => {
    container = createTestContainer();
    notificationService = container.get<INotificationService>(TYPES.INotificationService);
  });

  it('should do something correctly', () => {
    // Arrange
    const message = 'Test';

    // Act
    notificationService.show(message);

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining(message));
  });
});
```

### 10.3. Testing Anti-Patterns (FORBIDDEN)

#### Backend Anti-Patterns:
```python
# FORBIDDEN: Direct service instantiation
from backend.services.MyService import MyService
service = MyService(dependency)  # CRITICAL VIOLATION

# FORBIDDEN: Mock patches that bypass the container
@patch('backend.services.MyService.dependency')
def test_with_patch(mock_dep):
    service = MyService()  # STILL VIOLATES IoC

# CORRECT: Use the factory
def test_with_factory(mocked_composition_root):
    service = mocked_composition_root.get_service("my_service")
```

#### Frontend Anti-Patterns:
```typescript
// FORBIDDEN: Direct service instantiation
import { MyService } from '../services/MyService';
const service = new MyService(mockDep);  # CRITICAL VIOLATION

// FORBIDDEN: Direct container access in tests
import { container } from '../services/inversify.config';
const service = container.get<IMyService>(TYPES.IMyService);  # VIOLATION

// CORRECT: Use the test factory
import { createTestContainer } from '../testing/test-container-factory';
const testContainer = createTestContainer();
const service = testContainer.get<IMyService>(TYPES.IMyService);
```

---

## 11. AI Protocol Implementation Examples

### 11.1. Language Selection Example

```rust
/// OPTIMAL LANGUAGE SELECTION: Rust
/// REASON: Memory safety, zero-cost abstractions, and WebAssembly compilation
/// PERFORMANCE GAIN: 3-5x faster than JavaScript equivalent
/// MAINTAINABILITY: Compile-time guarantees prevent runtime errors
pub struct ParticleEngine {
    // Implementation...
}
```

### 11.2. Migration Assessment Template

```
LANGUAGE MIGRATION ASSESSMENT
============================
Component: ParticleEngine
Current Language: JavaScript/TypeScript
Proposed Language: Rust
Rationale: Performance-critical particle physics calculations
Expected Performance Improvement: 400%
Risk Level: Medium (WebAssembly integration required)
Migration Complexity: High
Timeline: 2-3 weeks
Dependencies: wasm-pack, Rust toolchain
```

---

*"Implementation without architecture is chaos. Architecture without implementation is theory. Together they are power."*