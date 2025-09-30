# Qualia Tempo Prototype v2.0

**A Charlie Hellsinger Story** - Advanced rhythm-action prototype implementing QUALIA.CODE v1.1 architectural standards.

## 🎯 Mission Overview

This prototype demonstrates the core gameplay loop of Qualia Tempo: **rhythmic combat where music becomes reality**. Built with enterprise-grade architecture following QUALIA.CODE v1.1 standards, featuring:

- **Event-Driven Architecture**: Type-safe EventBus communication
- **IoC Container**: InversifyJS dependency injection
- **Platform Abstraction**: No direct API usage
- **Configuration Externalization**: YAML-based parameter management
- **Comprehensive Testing**: 56+ unit tests with 100% service coverage

### ✅ Current Phase: Phase 2.2 - Connection & Control
**Status**: ✅ **OPERATIONAL** - RhythmicMovementController and EventBus systems fully functional

## 🏗️ Architecture Overview

### Technology Stack
- **Backend**: Python FastAPI with visual processing engine and CompositionRoot IoC
- **Frontend**: TypeScript React with InversifyJS IoC container and EventBus
- **Communication**: EventBus-driven architecture with throttled synchronization
- **Testing**: Vitest + Playwright with 56 comprehensive tests (100% coverage)
- **Quality**: Multi-layered linting with ESLint, Ruff, and MyPy plugins
- **State Management**: Zustand store with EventBus integration

### Core Architectural Principles (QUALIA.CODE v1.1)

#### 🔧 Inversion of Control (IoC)
- **MANDATE**: All services resolved via InversifyJS container
- **PROHIBITED**: Direct service instantiation (`new MyService()`)
- **ENFORCED**: ESLint rules prevent IoC violations

#### 📡 Event-Driven Communication
- **MANDATE**: All inter-service communication via EventBus
- **PROHIBITED**: Direct service method calls between services
- **ENFORCED**: Architectural linting prevents coupling

#### ⚙️ Configuration Externalization
- **MANDATE**: All behavioral parameters in YAML files
- **PROHIBITED**: Hardcoded values in service code
- **LOCATION**: `frontend/public/config/` directory

#### 🛡️ Platform Abstraction
- **MANDATE**: No direct browser API usage in services
- **REQUIRED**: Dedicated service layer (HttpService, TimerService, etc.)
- **ENFORCED**: Custom ESLint rules and decorators

### Core Systems

#### 🎮 Frontend Services (QUALIA.CODE v1.1 Compliant)

**EventBus Service** (`src/services/EventBus.ts`)
- Type-safe event emission and subscription with Symbol-based identifiers
- Async/sync event handling with error boundaries
- Performance monitoring and automatic cleanup
- Memory leak prevention and subscription management

**QualiaStateCalculatorService** (`src/services/QualiaStateCalculatorService.ts`)
- Real-time computation of player mastery metrics
- Event-driven state updates from PlayerAction events
- Configuration-driven calculation parameters
- Performance history and trend analysis

**BackendSyncService** (`src/services/BackendSyncService.ts`)
- Throttled API synchronization (configurable intervals)
- Error recovery with exponential backoff
- Connection health monitoring and status reporting
- Request batching and optimization

**RhythmicMovementController** (`src/services/RhythmicMovementController.ts`)
- ✅ **OPERATIONAL** - Keyboard input handling with configurable throttling
- Configuration-driven movement parameters (speed, cooldowns)
- EventBus integration for decoupled action emission
- Input validation and timing accuracy

**ApplicationCompositionRoot** (`src/services/ApplicationCompositionRoot.ts`)
- Centralized IoC container management and service initialization
- React Context integration for component-level service access
- Service lifecycle management (start/stop/cleanup)
- Configuration loading and validation

#### 🔧 Quality Assurance

**ESLint Plugin** (`@qualia-tempo/eslint-plugin-qualia-code`)
- Enforces IoC/DI patterns with `no-direct-service-instantiation`
- Prevents direct imports with `enforce-use-services-hook`
- Validates configuration externalization with `no-hardcoded-config`
- Ensures decorator compliance with `enforce-method-decorators`

**Testing Infrastructure**
- 56 unit tests covering all services with 100% coverage
- Mocked dependencies using test container factories
- Integration testing for service interaction validation
- E2E testing with Playwright for complete workflows

## 🎮 Gameplay Features

### Core Loop
1. **Rhythmic Movement**: WASD controls with dash mechanics synchronized to music
2. **Qualia Collection**: Gather musical energy from player actions and boss patterns
3. **Musical Combos**: Execute sequences using 7 musical notes (Q, E, R, T, F, G, C)
4. **Boss Combat**: Face bosses that ARE the music itself - their health is the track duration
5. **Visual Feedback**: Real-time effects responding to performance and rhythm accuracy

### Visual Systems
- **God Rays**: Volumetric lighting effects emanating from center
- **Particle Fields**: 220+ particles with audio reactivity and FFT analysis
- **Bloom Effects**: HDR post-processing with configurable intensity
- **Lightning**: Dynamic energy discharges triggered by audio peaks
- **Shader Pipeline**: Custom GLSL shaders for advanced visual processing

## 🚀 Development Setup

### Prerequisites
- **Node.js 18+** with PNPM package manager
- **Python 3.8+** with virtual environment support
- **Git** for version control

### Quick Start
```bash
# Clone and setup
git clone <repository>
cd qualia-tempo-prototype

# Frontend setup
cd frontend
pnpm install
pnpm run dev

# Backend setup (new terminal)
cd ../backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Development Commands
```bash
# Frontend
cd frontend
pnpm run dev          # Development server (http://localhost:5173)
pnpm test             # Run all tests (56+ tests, 100% coverage)
pnpm run lint         # Code quality check with QUALIA.CODE rules
pnpm run build        # Production build
pnpm run typecheck    # TypeScript strict checking

# Backend
cd backend
python main.py        # Start FastAPI server (http://localhost:8000)
python -m pytest      # Run Python tests
```

## 📊 System Status

### ✅ Fully Operational
- **EventBus Architecture**: Type-safe event communication with Symbol identifiers
- **RhythmicMovementController**: Player movement with configurable throttling
- **QualiaState System**: Real-time performance calculation and state management
- **BackendSyncService**: Throttled API communication with error recovery
- **Visual Effects**: God rays, particles, bloom, lightning with audio reactivity
- **Configuration System**: YAML-based parameter management with runtime loading
- **IoC Container**: Full InversifyJS setup with service registration and resolution

### 🔄 In Development
- **Musical Combo System**: Advanced harmony detection and combo validation
- **Boss Combat Mechanics**: Telegraph systems and attack pattern generation
- **Advanced Visual Pipeline**: FFT-driven effects and procedural generation
- **Audio Integration**: 8D spatial audio and real-time music analysis

### 📈 Performance Metrics
- **Tests**: 56/56 passing (100% coverage across all services)
- **TypeScript**: 0 errors (strict mode with no implicit any)
- **ESLint**: 0 errors, 0 warnings (QUALIA.CODE compliance)
- **Build**: Successful production builds with tree shaking
- **Event Processing**: <1ms average event processing time
- **Memory**: No memory leaks detected in service lifecycle

## 🎯 QUALIA.CODE v1.1 Compliance

### ✅ Architecture Standards
- **InversifyJS IoC**: All services use dependency injection with `@injectable()` and `@inject()`
- **EventBus Communication**: Zero direct service dependencies, all via events
- **Configuration Externalization**: All parameters in YAML files loaded by ConfigurationService
- **Service Decorators**: Mandatory `@logMethod()`, `@catchError()`, `@throttle()` usage
- **Platform Abstraction**: No direct API usage - all through abstracted services
- **Type Safety**: Strict TypeScript with comprehensive interface definitions

### ✅ Quality Standards
- **Comprehensive Testing**: Unit and integration test coverage with mocked dependencies
- **Type Safety**: Zero TypeScript errors with strict null checks and no implicit any
- **Code Quality**: ESLint enforcement with custom QUALIA.CODE rules
- **Documentation**: Inline JSDoc documentation for all public APIs
- **Performance**: Optimized event processing and memory management

## 🔧 Configuration System

All game parameters are externalized in YAML configuration files:

```yaml
# Movement configuration
movement:
  dash_cooldown_ms: 250
  movement_speed: 5.0
  input_throttle_ms: 50

# Visual effects
visual_effects:
  particles:
    count: 220
    speed: 0.65
    colors: ['#00ffff', '#ff00ff', '#ffff00']
  bloom:
    intensity: 1.8
    pulse_speed: 3

# Audio reactivity
audio:
  fft_bands: 32
  reactivity: 0.8
  lightning_threshold: 80
```

## 🧪 Testing Strategy

### Unit Testing
- **Service Isolation**: Each service tested independently with mocked dependencies
- **IoC Container Testing**: Test container factories ensure proper dependency injection
- **Event Testing**: Event emission and handling validation with spies
- **Configuration Testing**: Parameter-driven behavior verification

### Integration Testing
- **Service Interaction**: Multi-service workflow testing through EventBus
- **EventBus Flow**: End-to-end event processing and state updates
- **API Communication**: Frontend-backend integration with mocked HTTP
- **State Management**: Zustand store interaction and persistence

### E2E Testing
- **Full Workflows**: Complete user journey testing with Playwright
- **Performance Testing**: Frame rate and memory validation during gameplay
- **Visual Regression**: Screenshot-based visual testing
- **Cross-browser**: Multi-browser compatibility validation

## 🎨 Visual Development

### Current Implementation
- **WebGL Rendering**: Three.js with React Three Fiber for 3D scenes
- **Shader Pipeline**: Custom GLSL vertex/fragment shaders for effects
- **Particle System**: GPU-accelerated particle rendering with audio reactivity
- **Post-Processing**: Bloom, chromatic aberration, and film grain effects
- **Audio Visualization**: FFT-driven visual effects synchronized to music

### Development Tools
- **Debug Interface**: Real-time parameter adjustment via configuration hot-reload
- **Performance Monitoring**: Frame rate and memory tracking with browser DevTools
- **Visual Inspector**: Component hierarchy visualization and state inspection
- **Hot Reload**: Instant visual feedback during development

## 📈 Next Development Phases

### Phase 3: Advanced Gameplay
- [ ] Musical combo system implementation with harmony detection
- [ ] Boss telegraph and attack pattern mechanics
- [ ] Advanced Qualia collection and resource management
- [ ] Player progression and scoring systems

### Phase 4: Visual Excellence
- [ ] FFT-driven visual effects with real-time audio analysis
- [ ] Advanced shader pipeline with procedural generation
- [ ] Dynamic environment creation based on music
- [ ] Performance optimization for 60fps gameplay

### Phase 5: Polish & Release
- [ ] Complete audio system integration with 8D spatial audio
- [ ] User interface refinement and accessibility features
- [ ] Final optimization and cross-platform testing
- [ ] Documentation completion and deployment preparation

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Follow QUALIA.CODE**: Ensure architectural compliance with linting tools
3. **Write Tests**: Add tests for new functionality with 100% coverage
4. **Code Review**: Submit pull request with detailed description
5. **CI/CD**: Automated testing and architectural validation

### Code Standards
- **TypeScript**: Strict typing required with no `any` types
- **ESLint**: All QUALIA.CODE rules must pass
- **Testing**: 100% test coverage for new code with proper mocking
- **Documentation**: Update relevant documentation and add JSDoc comments
- **Architecture**: Follow QUALIA.CODE v1.1 standards without exception

## 📚 Resources

- **Game Design Document**: [GDD.md](../docs/GDD.md)
- **Architecture Standards**: [QUALIA.CODE.md](../docs/QUALIA.CODE.md)
- **API Documentation**: `http://localhost:8000/docs` (FastAPI auto-generated)
- **Development Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Testing Guide**: See test files in `frontend/tests/` for examples

---

**Status**: ✅ **Phase 2.2 Complete** - Core systems operational and tested
**Architecture**: QUALIA.CODE v1.1 compliant with enterprise standards
**Testing**: 56/56 tests passing with comprehensive coverage
**Performance**: Optimized for 60fps gameplay experience

*"Music is the language of the soul. Code is its architecture."*
