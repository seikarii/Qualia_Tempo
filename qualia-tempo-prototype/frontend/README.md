# Frontend Module

## Overview

The frontend module is a React/TypeScript application that provides the user interface and game visualization for Qualia Tempo. It handles player input, renders the game world, and communicates with the backend for state management.

**🚀 Package Manager**: This project uses **PNPM** for dependency management, providing faster installs and optimized disk space usage.

## Features

- **Game Canvas**: WebGL-based rendering engine
- **QualiaState Visualization**: Dynamic visual effects based on player performance
- **UI Components**: Heads-up display, menus, and debug information
- **Audio System**: Manages game music and sound effects
- **Input Handling**: Processes player input and translates it to game actions

## Project Structure

```
frontend/
├── public/          # Static assets
├── src/
│   ├── components/  # React components
│   ├── config/      # Game configuration
│   ├── core/        # Core game logic
│   ├── hooks/       # Custom React hooks
│   ├── scenes/      # Game scenes
│   ├── services/    # API and service layers
│   ├── shaders/     # GLSL shaders
│   ├── styles/      # Global styles
│   ├── types/       # TypeScript type definitions
│   └── utils/       # Utility functions
└── tests/          # Test files
```

## Development

### Prerequisites

- Node.js 16+
- **PNPM** (install globally: `npm install -g pnpm`)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
pnpm run build
```

### Electron Application

Build the Electron desktop application:

```bash
pnpm run build:electron
```

### Testing

Run the test suite:

```bash
pnpm test
```

Run E2E tests:

```bash
pnpm run test:e2e
```

### Code Quality

Lint the codebase:

```bash
pnpm run lint
```

Check TypeScript types:

```bash
pnpm run typecheck
```

Format code:

```bash
pnpm run format
```

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
VITE_API_URL=http://localhost:8000
VITE_DEBUG=true
```

## Migration to PNPM ✅ COMPLETED

This project has been successfully migrated from NPM to PNPM. Key benefits:

- **Performance**: Faster dependency installation and resolution
- **Disk Space**: Efficient storage with symlinks and content-addressed storage
- **Monorepo Support**: Better handling of local dependencies like `@qualia-tempo/eslint-plugin-qualia-code`
- **Security**: Enhanced dependency isolation
- **Electron Compatibility**: Optimized packaging with electron-builder

### Migration Details ✅

- ✅ All `npm` commands replaced with `pnpm` equivalents
- ✅ Local eslint plugin dependency preserved and functional
- ✅ Electron-builder configuration optimized for pnpm
- ✅ All existing scripts and workflows maintained
- ✅ Build artifacts successfully generated (AppImage + Snap)
- ✅ Legacy package-lock.json removed

### Electron Build Configuration

The electron-builder configuration has been optimized for pnpm:

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "main.js"
    ]
  }
}
```

This configuration allows electron-builder to:
- Automatically analyze pnpm-lock.yaml
- Copy only production dependencies
- Generate optimized application packages

## Contributing

1. Create a new branch for your feature
2. Follow the existing code style and QUALIA.CODE standards
3. Use PNPM for all dependency management
4. Write tests for new features
5. Submit a pull request with a clear description of changes
