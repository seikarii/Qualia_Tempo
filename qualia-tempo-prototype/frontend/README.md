# Frontend Module - Qualia Tempo v2.0

## Overview

The frontend module is a React/TypeScript application that provides the user interface and game visualization for Qualia Tempo. Built with **QUALIA.CODE v1.1** architectural standards, it features advanced 3D rendering, real-time audio processing, and event-driven service architecture.

**🚀 Package Manager**: PNPM for optimized dependency management and faster builds.

## 🎯 Core Features

### 🎮 Game Engine
- **React Three Fiber**: 3D rendering with Three.js integration
- **WebGL Shaders**: Custom GLSL shaders for advanced visual effects
- **Rhythmic Movement**: Real-time player movement with audio synchronization
- **Particle Systems**: 220+ GPU-accelerated particles with audio reactivity

### 🎵 Audio System
- **Tone.js Integration**: Advanced audio processing and synthesis
- **FFT Analysis**: Real-time frequency analysis for visual effects
- **8D Audio**: Spatial audio positioning and effects
- **Musical Combos**: 7-note musical input system (Q, E, R, T, F, G, C)

### 🏗️ Architecture
- **InversifyJS IoC**: Dependency injection container for service management
- **EventBus**: Type-safe event-driven communication
- **Zustand**: Reactive state management with slices
- **Configuration System**: YAML-based externalized parameters

### 🎨 Visual Effects
- **God Rays**: Volumetric lighting from center point
- **Bloom**: HDR post-processing effects
- **Lightning**: Dynamic energy discharges on audio peaks
- **Particle Fields**: Audio-reactive particle systems
- **Post-Processing**: Chromatic aberration, film grain, color grading

## 🛠️ Technology Stack

### Core Dependencies
- **React 18**: Modern React with concurrent features
- **TypeScript 5**: Strict type checking and advanced features
- **Three.js**: 3D graphics and WebGL rendering
- **React Three Fiber**: React renderer for Three.js
- **InversifyJS**: IoC container for dependency injection
- **Zustand**: Lightweight state management
- **Tone.js**: Web audio framework for music applications

### Development Tools
- **Vite**: Fast build tool and development server
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework
- **ESLint**: Code linting with custom QUALIA.CODE rules
- **Prettier**: Code formatting
- **Tailwind CSS**: Utility-first CSS framework

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets and HTML
├── src/
│   ├── components/           # React UI components
│   │   ├── game/            # Game-specific components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # Reusable UI components
│   ├── services/            # Business logic services
│   │   ├── interfaces/      # Service interfaces
│   │   ├── inversify.config.ts # IoC container config
│   │   ├── inversify.types.ts  # Service identifiers
│   │   └── hooks.ts         # React hooks for services
│   ├── state/               # Zustand store slices
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions and decorators
│   ├── config/              # YAML configuration files
│   ├── audio/               # Audio processing services
│   └── __tests__/           # Unit tests
├── tests/                   # E2E and integration tests
└── electron/                # Electron desktop app config
```

## 🚀 Development Setup

### Prerequisites
- **Node.js 18+**
- **PNPM** (install globally: `npm install -g pnpm`)

### Installation
```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev
# Frontend available at: http://localhost:5173
```

### Development Commands
```bash
# Development
pnpm run dev              # Start development server
pnpm run dev:electron     # Start Electron app

# Building
pnpm run build            # Production build
pnpm run build:electron   # Build Electron app
pnpm run preview          # Preview production build

# Testing
pnpm test                 # Run unit tests
pnpm run test:ui          # Run tests with UI
pnpm run test:coverage    # Run tests with coverage
pnpm run test:e2e         # Run E2E tests

# Code Quality
pnpm run lint             # Lint code
pnpm run lint:fix         # Fix linting issues
pnpm run format           # Format code
pnpm run typecheck        # TypeScript type checking

# Utilities
pnpm run test:connection  # Test backend connection
```

## 🎮 Game Development

### Service Architecture
The frontend follows **QUALIA.CODE v1.1** standards with:

- **EventBus Service**: Central communication hub
- **QualiaStateCalculatorService**: Player performance computation
- **BackendSyncService**: Throttled API synchronization
- **RhythmicMovementController**: Player input handling
- **AudioService**: Sound processing and synthesis

### Configuration System
All parameters are externalized in YAML files:

```yaml
# Movement settings
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

# Audio settings
audio:
  fft_bands: 32
  reactivity: 0.8
  master_volume: 0.7
```

### Component Development
Components follow React best practices:

- **Functional Components**: With TypeScript interfaces
- **Custom Hooks**: For service integration
- **Context Providers**: For state management
- **Performance Optimization**: Memoization and lazy loading

## 🧪 Testing Strategy

### Unit Testing (Vitest)
- **Service Testing**: Isolated service functionality
- **Component Testing**: React component behavior
- **Hook Testing**: Custom hook logic
- **Utility Testing**: Pure function validation

### E2E Testing (Playwright)
- **User Workflows**: Complete user journey testing
- **Visual Regression**: Screenshot-based testing
- **Performance Testing**: Load and stress testing
- **Cross-browser**: Multi-browser compatibility

### Integration Testing
- **Service Interaction**: Multi-service workflows
- **EventBus Flow**: Event emission and handling
- **State Management**: Zustand store integration
- **API Communication**: Frontend-backend interaction

## 🎨 Visual Development

### Shader Development
Custom GLSL shaders for advanced effects:

```glsl
// Vertex shader for particle system
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### 3D Scene Management
- **Scene Graph**: Hierarchical object management
- **Material System**: Custom materials with uniforms
- **Animation System**: Keyframe and procedural animations
- **Lighting**: Dynamic lighting with shadows

### Performance Optimization
- **LOD System**: Level-of-detail rendering
- **Frustum Culling**: Viewport-based culling
- **Texture Atlasing**: Efficient texture management
- **GPU Instancing**: Hardware-accelerated rendering

## 🔧 Configuration

### Environment Variables
Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:8000
VITE_DEBUG=true
VITE_ENVIRONMENT=development
```

### Build Configuration
Vite configuration optimized for game development:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true
  }
})
```

## 🚀 Deployment

### Production Build
```bash
pnpm run build
# Outputs to dist/ directory
```

### Electron Application
```bash
pnpm run build:electron
# Creates desktop application packages
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
EXPOSE 5173
CMD ["pnpm", "run", "preview"]
```

## 🤝 Contributing

### Development Workflow
1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Follow QUALIA.CODE**: Ensure architectural compliance
3. **Write Tests**: Add comprehensive test coverage
4. **Code Review**: Submit pull request with clear description
5. **CI Validation**: Automated testing and linting

### Code Standards
- **TypeScript**: Strict typing with interfaces
- **ESLint**: All QUALIA.CODE rules must pass
- **Testing**: 100% coverage for new features
- **Documentation**: Update relevant docs
- **Performance**: Optimize for 60fps gameplay

### Architecture Compliance
- **InversifyJS**: Use IoC container for all services
- **EventBus**: Communicate via events, not direct calls
- **Configuration**: Externalize all parameters
- **Decorators**: Apply logging, error handling, throttling
- **Testing**: Comprehensive test coverage

## 📊 Performance Metrics

### Target Specifications
- **Frame Rate**: 60fps minimum
- **Load Time**: <2s for initial load
- **Memory Usage**: <200MB baseline
- **Bundle Size**: <5MB gzipped

### Optimization Features
- **Code Splitting**: Route-based and component-based
- **Tree Shaking**: Unused code elimination
- **Compression**: Gzip and brotli compression
- **Caching**: Aggressive caching strategies
- **Lazy Loading**: On-demand resource loading

## 📚 Resources

- **Game Design Document**: [GDD.md](../../docs/GDD.md)
- **Architecture Standards**: [QUALIA.CODE.md](../../docs/QUALIA.CODE.md)
- **API Documentation**: Backend API docs at `http://localhost:8000/docs`
- **Component Library**: Storybook documentation (planned)

---

**Status**: ✅ **Active Development** - Core systems operational
**Architecture**: QUALIA.CODE v1.1 compliant
**Testing**: Comprehensive test suite with 56/56 passing
**Performance**: Optimized for 60fps gameplay experience
