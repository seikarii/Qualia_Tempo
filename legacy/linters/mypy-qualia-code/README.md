# MyPy-Qualia-Code: Architectural Type Analysis

**STATUS: PRODUCTION READY**

MyPy-Qualia-Code is the guardian of QUALIA.CODE's semantic type system. While Ruff handles syntactic patterns, this plugin performs deep architectural analysis that requires understanding the semantic graph of types, interfaces, and dependencies.

## Mission

To enforce architectural purity by validating rules that require deep semantic analysis of the type system - rules that static AST analysis cannot detect.

## Core Rules (MQA Series)

### MQA001: Interface Adherence Validation
**Purpose:** Ensures service classes fully implement their declared interfaces.

**What it checks:**
- Service classes (ending in `Service`) that inherit from interfaces (starting with `I`, ending in `Service`)
- Complete implementation of all interface methods with correct signatures
- Type safety of method parameters and return values

**Example Violation:**
```python
class IMyService(Protocol):
    def process_data(self, data: Dict[str, Any]) -> str: ...

class MyService(IMyService):  # VIOLATION: Missing process_data method
    def get_status(self) -> str:
        return "OK"
```

**Error:** `MQA001: Class MyService does not implement interface IMyService. Missing methods: process_data`

### MQA002: IoC Binding Type Safety
**Purpose:** Validates that Inversion of Control container bindings are type-safe.

**What it checks:**
- In `CompositionRoot.py`, `bind(Interface).to(Implementation)` calls
- Ensures `Implementation` is a valid subtype of `Interface`
- Prevents runtime IoC resolution failures

**Example Violation:**
```python
# In CompositionRoot.py
container.bind(IMyService).to(WrongImplementation)  # WrongImplementation doesn't implement IMyService
```

**Error:** `MQA002: IoC binding type violation. WrongImplementation is not a subtype of IMyService`

### MQA003: Prohibition of 'Any' in Service Signatures
**Purpose:** Forces explicit typing in service boundaries to maintain type safety.

**What it checks:**
- Public methods in service classes (`Service`, `Engine`, `Manager` suffixes)
- Return types and parameter types must not be `Any`
- Promotes explicit, maintainable type contracts

**Example Violation:**
```python
class MyService:
    def process(self, data: Any) -> Any:  # VIOLATION: Any types
        return data
```

**Error:** `MQA003: Method MyService.process uses Any in parameter/return type. Use explicit types in service method signatures.`

### MQA004: Decorator Return Type Conformity
**Purpose:** Ensures decorators that alter behavior also correctly modify type signatures.

**What it checks:**
- Methods decorated with `@handle_errors` must return `Optional[T]` instead of `T`
- Type system correctly understands decorator transformations
- Prevents None-related runtime errors

**Example Violation:**
```python
@handle_errors(fallback_return_value=None)
def get_data(self) -> Data:  # VIOLATION: Should be Optional[Data]
    return self._fetch_data()
```

**Error:** `MQA004: Method get_data decorated with @handle_errors must have Optional return type. Found: Data, expected: Optional[Data]`

## Architecture

The plugin integrates deeply with MyPy's type checking pipeline:

1. **File Analysis Hook:** `analyze_file()` processes each Python file
2. **Method Context Hooks:** Intercept specific method calls (IoC bindings)
3. **Type Graph Traversal:** Analyzes class hierarchies and interface implementations
4. **Semantic Validation:** Uses MyPy's internal type checking for deep analysis

## Installation

```bash
pip install -e mypy-qualia-code
```

## Configuration

Add to your `pyproject.toml`:

```toml
[tool.mypy]
plugins = ["mypy_qualia_code.plugin"]
python_version = "3.12"
qualia_code = true

# Strict type checking
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true
```

Or in `mypy.ini`:
```ini
[mypy]
plugins = mypy_qualia_code.plugin
python_version = 3.12
qualia_code = true
```

## Integration with QUALIA.CODE Toolchain

MyPy-Qualia-Code is Phase 3 in the architectural linting pipeline:

```
Phase 1: ESLint (Frontend) → QUALIA.CODE rules for TypeScript/React
Phase 2: Ruff (Backend) → QUALIA.CODE patterns for Python syntax
Phase 3: MyPy (Backend) → QUALIA.CODE type architecture validation
```

Run all phases with:
```bash
./scripts/lint-architecture.sh
```

## Testing

Run the comprehensive test suite:
```bash
cd mypy-qualia-code
python -m pytest tests/
```

Tests cover:
- All MQA rule validations
- Edge cases and error conditions
- Plugin integration scenarios
- Type system interactions

## Implementation Status

- ✅ **MQA001:** Interface adherence validation
- ✅ **MQA002:** IoC binding type safety
- ✅ **MQA003:** Any type prohibition in services
- ✅ **MQA004:** Decorator return type conformity
- ✅ **Plugin Architecture:** Complete MyPy integration
- ✅ **Testing:** Comprehensive unit test coverage
- ✅ **Documentation:** Complete rule specifications
- ✅ **CI/CD Integration:** Ready for lint-architecture.sh

## Why This Matters

These rules enforce architectural decisions that cannot be validated through syntax alone:

- **Type Safety:** Prevents IoC misconfigurations that fail at runtime
- **Interface Contracts:** Ensures services honor their architectural promises
- **Explicit Typing:** Maintains type safety at system boundaries
- **Decorator Semantics:** Correctly types decorator behavior changes

Together with Ruff-Qualia-Code, this provides complete architectural enforcement from syntax to semantics.

## Development

### Running Tests
```bash
python -m pytest tests/ -v
```

### Adding New Rules
1. Implement rule logic in the plugin
2. Add comprehensive test cases
3. Update documentation
4. Test integration with existing pipeline

### Architecture Notes
- Uses MyPy's plugin system for deep type analysis
- Integrates with existing QUALIA.CODE error reporting
- Maintains compatibility with standard MyPy configurations
- Provides detailed error messages with fix suggestions