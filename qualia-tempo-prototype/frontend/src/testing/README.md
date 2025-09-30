# Frontend Testing Infrastructure - GOLD.CODE Architecture

## 🎯 **MANDATE: SUPREME TESTING ARCHITECTURE**

This directory implements the **GOLD.CODE STANDARD** for frontend testing infrastructure, ensuring supreme performance, isolation, and maintainability as per QUALIA.CODE architectural mandates.

## 📁 **DIRECTORY STRUCTURE**

```
src/testing/
├── README.md                    # This documentation
├── setup.ts                     # Global test environment setup
├── test-container-factory.ts    # Isolated container factory (GOLD.CODE)
└── mocks/                       # Centralized service mocks bundle
    ├── logger.mock.ts
    ├── event-bus.mock.ts
    ├── game-state-store.mock.ts
    ├── game-state-store-service.mock.ts
    ├── http-service.mock.ts
    ├── timer-service.mock.ts
    ├── performance-service.mock.ts
    ├── ontological-audio-engine.mock.ts
    ├── web-socket-service.mock.ts
    └── browser-events-service.mock.ts
```

## 🏗️ **ARCHITECTURAL PRINCIPLES**

### **1. ISOLATED CONTAINER PATTERN (GOLD.CODE STANDARD)**
- **MANDATE:** Each test receives a completely new `Container()` instance
- **PURPOSE:** Guarantees total isolation and prevents cross-contamination between tests
- **PROHIBITION:** Parent/Child container patterns are FORBIDDEN for service testing
- **IMPLEMENTATION:** `test-container-factory.ts` creates `new Container()` per test

### **2. CENTRALIZED MOCK MANAGEMENT**
- **MANDATE:** All service mocks reside in `mocks/` directory with `<service-name>.mock.ts` naming
- **PURPOSE:** Single source of truth for mock implementations, enabling independent evolution
- **RULE:** Each interface (ILogger, IEventBus, etc.) has exactly one mock file
- **MAINTAINABILITY:** Mock definitions separated from factory logic

### **3. GLOBAL VS SERVICE MOCKS DISTINCTION**
- **Global Mocks (`setup.ts`):** Environment-wide mocking (decorators, browser APIs, external libraries)
- **Service Mocks (`mocks/`):** Controlled implementations of our interfaces for interaction testing

## 📋 **COMPONENT DESCRIPTIONS**

### **setup.ts - Global Test Environment**
**PURPOSE:** Establishes global mocks for the entire test environment.

**RESPONSIBILITIES:**
- Mock decorators (`@logMethod`, `@catchError`, `@validate`)
- Browser APIs (`window`, `document`, `navigator`)
- External libraries (`Tone.js`, Web Audio API)
- Timer functions (`setTimeout`, `setInterval`)

**USAGE:** Automatically loaded by Vitest/Jest configuration.

### **test-container-factory.ts - Isolated Container Factory**
**PURPOSE:** The single authoritative factory for creating test containers.

**ARCHITECTURE:**
- Implements **Isolated Container Pattern** (GOLD.CODE STANDARD)
- Creates `new Container()` for each test ensuring total isolation
- Imports centralized mocks from `mocks/` directory
- Provides override mechanism for test-specific customizations

**EXPORTED FUNCTIONS:**
```typescript
createTestContainer(overrides?: MockOverride[]): Container
resetAllMocks(): void
```

### **mocks/ - Centralized Service Mocks Bundle**
**PURPOSE:** Single source of truth for all service interface mocks.

**NAMING CONVENTION:** `<service-name>.mock.ts`
**EXPORT PATTERN:** `export const mock<ServiceName>: IServiceName = { ... }`

**AVAILABLE MOCKS:**
- `mockLogger`: ILogger implementation
- `mockEventBus`: IEventBus implementation
- `mockGameStateStore`: Game state store mock
- `mockGameStateStoreService`: Game state store service mock
- `mockHttpService`: IHttpService implementation
- `mockTimerService`: ITimerService implementation
- `mockPerformanceService`: IPerformanceService implementation
- `mockOntologicalAudioEngine`: IOntologicalAudioEngine implementation
- `mockWebSocketService`: IWebSocketService implementation
- `mockBrowserEventsService`: IBrowserEventsService implementation

## 🚀 **USAGE PATTERNS**

### **Basic Service Testing Pattern**
```typescript
import { createTestContainer } from '../testing/test-container-factory';
import { mockLogger } from '../testing/mocks/logger.mock';
import { INotificationService } from '../services/interfaces/INotificationService';
import { TYPES } from '../services/inversify.types';

describe('NotificationService', () => {
  let container: Container;
  let notificationService: INotificationService;

  beforeEach(() => {
    container = createTestContainer();
    notificationService = container.get<INotificationService>(TYPES.INotificationService);
  });

  it('should log notification correctly', () => {
    // Act
    notificationService.show('Test message');

    // Assert
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Test message'));
  });
});
```

### **Test-Specific Mock Overrides**
```typescript
import { createTestContainer } from '../testing/test-container-factory';
import { mockLogger } from '../testing/mocks/logger.mock';

describe('Service with Custom Mock', () => {
  beforeEach(() => {
    const customLogger = { ...mockLogger, info: vi.fn() };
    container = createTestContainer([
      { type: TYPES.ILogger, value: customLogger }
    ]);
  });
});
```

## ⚠️ **FORBIDDEN PATTERNS (CRITICAL VIOLATIONS)**

### **ANTI-PATTERN 1: Direct Service Instantiation**
```typescript
// FORBIDDEN - CRITICAL VIOLATION
import { NotificationService } from '../services/NotificationService';
const service = new NotificationService(mockDep); // NEVER DO THIS
```

### **ANTI-PATTERN 2: Direct Container Access**
```typescript
// FORBIDDEN - CRITICAL VIOLATION
import { container } from '../services/inversify.config';
const service = container.get<IMyService>(TYPES.IMyService); // NEVER DO THIS IN TESTS
```

### **ANTI-PATTERN 3: Parent/Child Container Pattern**
```typescript
// FORBIDDEN - CRITICAL VIOLATION
const childContainer = mainContainer.createChild(); // NEVER DO THIS FOR TESTING
```

### **ANTI-PATTERN 4: Inline Mock Definitions**
```typescript
// FORBIDDEN - CRITICAL VIOLATION
const mockLogger = { info: vi.fn() }; // Define in mocks/ directory only
```

## 🔧 **MAINTENANCE GUIDELINES**

### **Adding New Service Mocks**
1. Create `<service-name>.mock.ts` in `mocks/` directory
2. Export as `export const mock<ServiceName>: IServiceName = { ... }`
3. Import in `test-container-factory.ts`
4. Bind in `createTestContainer()` function
5. Update this README

### **Modifying Existing Mocks**
1. Edit the corresponding `.mock.ts` file
2. Ensure all tests still pass
3. Update mock behavior documentation if needed

### **Adding Global Mocks**
1. Modify `setup.ts` for environment-wide mocking
2. Document the addition in this README
3. Ensure no conflicts with existing mocks

## 📚 **RELATED DOCUMENTATION**

- **QUALIA.CODE.md Section 10.3:** Frontend Mocking & Test Container Architecture
- **QUALIA.MANUAL.md Section 10.2:** Frontend Testing with test-container-factory.ts
- **Testing Strategy:** See QUALIA.CODE.md Section 10.6

## 🎖️ **ARCHITECTURAL COMMITMENT**

This testing infrastructure embodies the **GOLD.CODE STANDARD** of architectural excellence:

- **Isolation:** Each test is a pristine environment
- **Maintainability:** Centralized mock management
- **Scalability:** Architecture prepared for system growth
- **Consistency:** Unified patterns across all tests

**VIOLATION OF THESE STANDARDS IS A CRITICAL MISSION FAILURE.**

*"Testing infrastructure is not an afterthought. It is the foundation upon which quality is built."*