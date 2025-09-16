# Backend Module - QUALIA.CODE v1.0

## Overview
The backend module is responsible for handling the game's server-side logic, including the QualiaState management, GPU-accelerated visual effects processing, and API endpoints for frontend communication. Built following QUALIA.CODE v1.0 architecture with EventBus + IoC patterns.

## Architecture

### Core Components
- **API Server**: FastAPI-based server with dependency injection
- **QualiaState Engine**: Real-time state processing with EventBus integration
- **GPU Particle Engine**: GLSL compute shader-based visual effects with resonance system
- **EventBus**: Decoupled inter-service communication
- **CompositionRoot**: Central IoC container managing all services

### Directory Structure
```
backend/
├── api/           # API endpoints and request handlers
│   ├── models.py  # Pydantic models (GENERATED from JSON Schema)
│   └── routes.py  # FastAPI routes with dependency injection
├── engine/        # GPU-accelerated visual effects engine
│   ├── qualia_particle_engine.py  # Compute shader particle system
│   └── shaders/   # GLSL compute shaders with resonance system
├── services/      # Business logic services with EventBus integration
│   ├── EventBus.py      # Event-driven communication
│   └── QualiaProcessor.py  # QualiaState processing service
├── utils/         # Cross-cutting concerns (decorators, etc.)
├── tests/         # Comprehensive test suite (137+ tests)
└── CompositionRoot.py  # Central IoC container
```

## API Endpoints

### `POST /update_qualia`
Updates the current QualiaState based on player actions.

**Request Body:**
```json
{
  "intensity": 0.0,
  "precision": 0.0,
  "aggression": 0.0,
  "flow": 0.0,
  "chaos": 0.0,
  "recovery": 0.0,
  "transcendence": 0.0
}
```

**Response:**
```json
{
  "status": "success",
  "visual_effects": { ... }
}
```

## Enhanced Visual Effects Engine

### GPU Particle System Features
- **Resonance System**: Performance-driven particle behavior accumulation
- **QualiaState Integration**: Real-time visual effects driven by player mastery
- **Vortex Effects**: Dynamic particle flow visualization for high flow states
- **Space Distortion**: Transcendence state creates visual space warping
- **Enhanced Color System**: Rainbow transcendence effects with resonance glow
- **Intelligent Respawn**: Fibonacci sphere distribution for uniform particle placement

### Architectural Highlights
- **GLSL Compute Shaders**: High-performance GPU-accelerated particle simulation
- **Ping-Pong Buffers**: Double-buffered particle state for optimal GPU utilization  
- **Event-Driven Updates**: Real-time QualiaState changes trigger visual effects
- **QUALIA.CODE Compliance**: Externalized configuration, decorator patterns, IoC

## Development

### Prerequisites
- Python 3.12+ (recommended)
- Modern GPU with OpenGL 4.3+ support (for compute shaders)
- Virtual environment (mandatory)

### Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the development server:
   ```bash
   python main.py
   ```

### Quality Assurance Workflow
```bash
# Complete QA workflow
black . && ruff check . --fix && mypy . --ignore-missing-imports && python -m pytest tests/ -v

# Individual commands
black .                                    # Code formatting
ruff check . --fix                        # Linting with auto-fix
mypy . --ignore-missing-imports           # Type checking
python -m pytest tests/ -v                # Test suite (137+ tests)
```

### Key Features
- **137+ Tests**: Comprehensive test coverage including GPU shader functionality
- **Event-Driven Architecture**: Decoupled services using EventBus pattern
- **QUALIA.CODE v1.0 Compliant**: Follows all architectural standards
- **Production-Ready**: No prototype code, all systems are definitive implementations
Run the test suite with:
```bash
pytest tests/
```

## Contributing
Please follow the project's coding standards and ensure all tests pass before submitting pull requests.
