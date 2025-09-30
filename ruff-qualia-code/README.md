# Ruff Qualia Code Plugin

A robust Python implementation of QUALIA.CODE architectural linting rules, providing comprehensive backend Python code analysis to enforce architectural compliance across service-oriented applications.

## Installation

```bash
pip install -e .
```

## Rules Overview

This plugin provides **10 production-ready rules** covering all major QUALIA.CODE architectural principles:

### Core IoC & Dependency Injection
- **QLA001**: Prohibit Direct Service Instantiation
- **QLA003**: Forbid Concrete Route Dependencies
- **QLA009**: Testing Pattern Enforcement

### Code Quality & Architecture
- **QLA002**: Enforce Service Method Decorators
- **QLA010**: Decorator Parameter Validation
- **QLA011**: Cross-File Circular Dependency Analysis

### Configuration & Externalization
- **QLA004**: Configuration Externalization Validation
- **QLA007**: Shared Contract Compliance Validation

### Platform Abstraction
- **QLA005**: Platform Abstraction Enforcement
- **QLA006**: EventBus Contract Validation

## Detailed Rule Documentation

### QLA001: Prohibit Direct Service Instantiation
**Purpose**: Enforce IoC patterns by preventing direct service instantiation outside CompositionRoot.

**Triggers on**:
```python
# ❌ Bad - Direct instantiation
service = MyService()
user_service = UserService(db_connection)
```

**Allows**:
```python
# ✅ Good - In CompositionRoot.py only
class CompositionRoot:
    def get_service(self):
        return MyService()
```

### QLA002: Enforce Service Method Decorators
**Purpose**: Ensure all public service methods use appropriate architectural decorators.

**Triggers on**:
```python
class MyService:
    # ❌ Bad - Missing decorators
    def public_method(self):
        pass
```

**Requires**:
```python
class MyService:
    # ✅ Good - With decorators
    @log_execution
    @handle_errors
    def public_method(self):
        pass
```

### QLA003: Forbid Concrete Route Dependencies
**Purpose**: Maintain loose coupling in FastAPI routes by requiring interface dependencies.

**Triggers on**:
```python
# ❌ Bad - Concrete dependency
@app.get("/")
def handler(service: MyService = Depends(MyService)):
    pass
```

**Requires**:
```python
# ✅ Good - Interface dependency
@app.get("/")
def handler(service: IMyService = Depends(get_my_service)):
    pass
```

### QLA004: Configuration Externalization Validation
**Purpose**: Detect hardcoded configuration values that should be externalized to YAML.

**Triggers on**:
```python
class MyService:
    def __init__(self):
        # ❌ Bad - Hardcoded values
        self.timeout = 5000
        self.api_url = "https://api.example.com"
        self.rate_limit = 100
```

**Requires**:
```python
class MyService:
    def __init__(self, config: ConfigurationService):
        # ✅ Good - Externalized configuration
        self.timeout = config.get_timeout()
        self.api_url = config.get_api_url()
```

### QLA005: Platform Abstraction Enforcement
**Purpose**: Prevent direct usage of platform APIs that should be abstracted through services.

**Triggers on**:
```python
import requests
import time
import os

class MyService:
    # ❌ Bad - Direct platform API usage
    def fetch_data(self):
        response = requests.get("https://api.example.com")
        time.sleep(1)
        with open("file.txt", "w") as f:
            f.write("data")
```

**Requires**:
```python
class MyService:
    def __init__(self, http_service: HttpService, timer_service: TimerService):
        # ✅ Good - Abstracted through services
        self.http = http_service
        self.timer = timer_service
```

### QLA006: EventBus Contract Validation
**Purpose**: Ensure EventBus events follow proper contract structures with required fields.

**Triggers on**:
```python
# ❌ Bad - Missing required fields
event = {
    "type": "PlayerAction",
    "action": "Dash"
    # Missing: timestamp, source
}
```

**Requires**:
```python
# ✅ Good - Complete event structure
event = {
    "type": "PlayerAction",
    "timestamp": datetime.now(),
    "source": "PlayerController",
    "action": "Dash"
}
```

### QLA007: Shared Contract Compliance Validation
**Purpose**: Ensure generated files include required header comments and are not manually edited.

**Triggers on**:
```python
# ❌ Bad - Missing generated comment
"""Pydantic models for API contracts."""

class UserModel:
    pass
```

**Requires**:
```python
# ✅ Good - With generated comment
"""@generated DO NOT EDIT - Generated from shared_contracts schemas."""

class UserModel:
    pass
```

### QLA009: Testing Pattern Enforcement
**Purpose**: Ensure tests follow proper IoC mocking patterns using test factories.

**Triggers on**:
```python
# ❌ Bad - Direct instantiation in tests
class TestMyService:
    def test_something(self):
        service = MyService()  # Direct instantiation
        assert service is not None
```

**Requires**:
```python
# ✅ Good - Use test factory
class TestMyService:
    def test_something(self, test_composition_root):
        service = test_composition_root.get_service("my_service")
        assert service is not None
```

### QLA010: Decorator Parameter Validation
**Purpose**: Validate decorator usage and ensure correct parameter passing.

**Triggers on**:
```python
class MyService:
    # ❌ Bad - Missing parameters
    @validate()
    @throttle()
    def my_method(self):
        pass
```

**Requires**:
```python
class MyService:
    # ✅ Good - Proper parameters
    @validate("UserSchema")
    @throttle(250)
    def my_method(self):
        pass
```

### QLA011: Cross-File Circular Dependency Analysis
**Purpose**: Comprehensive analysis of service dependencies across files to detect and report circular dependencies with detailed cycle paths.

**Detects**:
- Circular dependencies between services with complete cycle paths
- Service import relationships across the codebase
- Complex dependency chains that create architectural violations

**Example Detection**:
```
QLA011: Circular dependency detected: ServiceA -> ServiceB -> ServiceC -> ServiceA. Refactor to eliminate circular dependencies.
```

**Usage**: This rule requires two-phase analysis - first collecting dependencies from all files, then performing global circular dependency detection.

## Integration & Usage

This plugin integrates seamlessly with the QUALIA.CODE architectural enforcement pipeline via the standalone lint runner.

### Command Line Usage

```bash
# Install the plugin in development mode
pip install -e .

# Run linting on a directory
python -m ruff_qualia_code /path/to/backend --format=concise

# Verbose output with detailed violations
python -m ruff_qualia_code /path/to/backend --verbose
```

### Integration with Scripts

The plugin is integrated into the project's architectural enforcement via `scripts/lint-architecture.sh`:

```bash
# The script automatically installs and runs the plugin
./scripts/lint-architecture.sh
```

### Programmatic Usage

```python
from ruff_qualia_code.rules import QLA001, QLA002, QLA011
from ruff_qualia_code.lint_runner import lint_file

# Lint individual files
violations = lint_file(Path("service.py"), [QLA001, QLA002])

# For QLA011 circular dependency analysis
analyzer = QLA011()
# Process all files first...
circular_violations = analyzer.analyze_all_dependencies()
```

### CI/CD Integration

The plugin is designed for CI/CD integration through the existing `scripts/lint-architecture.sh`:

```bash
# In your CI pipeline
./scripts/lint-architecture.sh
# Exit code 0: All rules pass
# Exit code 1: Architectural violations detected
```

## Development

### Running Tests
```bash
pytest tests/
```

### Adding New Rules
1. Create a new rule class (e.g., `QLA012`)
2. Implement the `check()` method
3. Add comprehensive tests
4. Update the plugin registration
5. Update this documentation

### Rule Development Pattern
```python
class QLA0XX:
    """Rule description"""

    def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
        checker = QLA0XXChecker(source_file.path)
        checker.visit(node)
        return checker.diagnostic

class QLA0XXChecker:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.diagnostic: Optional[Diagnostic] = None

    def visit(self, node: AST) -> None:
        # Analyze AST nodes
        for child in ast.iter_child_nodes(node):
            self.visit(child)
```

## Architecture Compliance

This plugin enforces the following QUALIA.CODE principles for Python backend code:

- ✅ **No Prototypes**: Production-grade code from inception
- ✅ **Decoupling is Law**: Services must not have direct knowledge of each other
- ✅ **IoC Container**: All service dependencies resolved via dependency injection
- ✅ **Platform Abstraction**: Critical platform APIs must be abstracted through services
- ✅ **Configuration Sovereignty**: All configuration must be externalized to YAML
- ✅ **Event-Driven Architecture**: Communication via EventBus contracts with required fields
- ✅ **Transversal Logic**: Mandatory decorator usage for cross-cutting concerns
- ✅ **Testing Patterns**: Proper IoC mocking in test environments
- ✅ **Contract Compliance**: Generated files must include proper headers
- ✅ **Circular Dependency Prevention**: Comprehensive dependency analysis

## Performance & Implementation Notes

- **Incremental Analysis**: Rules analyze files individually for memory efficiency
- **Two-Phase QLA011**: Circular dependency detection requires collecting all dependencies first, then analyzing the complete graph
- **Context-Aware Rules**: QLA004, QLA005, and QLA009 use contextual analysis to reduce false positives
- **Production Ready**: All rules are designed for production use with comprehensive error handling
- **Integration Ready**: Seamlessly integrates with existing QUALIA.CODE toolchain

## Contributing

When adding new rules:

1. Follow the established naming convention (QLA0XX)
2. Include comprehensive test coverage
3. Add documentation and examples
4. Ensure performance impact is acceptable
5. Update the plugin registration

The plugin uses standard Python AST parsing and can be extended with additional rules following the same pattern.