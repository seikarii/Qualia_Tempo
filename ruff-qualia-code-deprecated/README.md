# Ruff-Qualia-Code: QUALIA.CODE Architectural Enforcement

Custom Python linter for enforcing QUALIA.CODE architectural principles in backend Python code.

## Rules Implemented

### QLA001: Prohibit Direct Service Instantiation
- **Code**: `QLA001`
- **Message**: Direct service instantiation forbidden outside CompositionRoot
- **Fix**: Use dependency injection via CompositionRoot

### QLA002: Enforce Service Method Decorators  
- **Code**: `QLA002`
- **Message**: Public service methods must use architectural decorators
- **Fix**: Add @log_execution, @handle_errors, or @validate_schema decorators

### QLA003: Forbid Concrete Route Dependencies
- **Code**: `QLA003`
- **Message**: FastAPI routes should use abstract dependencies
- **Fix**: Use interfaces instead of concrete classes in Depends()

## Installation

```bash
cd ruff-qualia-code
pip install -e .
```

## Usage

```bash
# Lint entire backend
python -m qualia_code_linter /path/to/backend

# Lint specific file
python -m qualia_code_linter /path/to/file.py

# Check only specific rules
python -m qualia_code_linter --rules QLA001,QLA002 /path/to/backend
```

## Integration

Add to your CI/CD pipeline:
```bash
python -m qualia_code_linter qualia-tempo-prototype/backend --strict
```

## Configuration

Create `.qualia-code-linter.toml` in your project root:

```toml
[tool.qualia-code-linter]
strict = true
rules = ["QLA001", "QLA002", "QLA003"]
exclude = ["tests/", "migrations/", "__pycache__/"]
service_directories = ["services/"]
composition_root_files = ["CompositionRoot.py"]
```