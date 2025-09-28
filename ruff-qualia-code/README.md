# Ruff Qualia Code Plugin

A Python implementation of QUALIA.CODE architectural linting rules for Ruff.

## Installation

```bash
pip install -e .
```

## Usage

This plugin provides three rules:

- **QLA001**: Prohibit Direct Service Instantiation
- **QLA002**: Enforce Service Method Decorators  
- **QLA003**: Forbid Concrete Route Dependencies

## Integration with Ruff

Currently, this is a standalone Python package. To integrate with Ruff's external plugin system, you may need to configure it as an external tool or use it programmatically.

## Examples

### QLA001: Direct Instantiation
```python
# Bad
service = MyService()  # Triggers QLA001

# Good (in CompositionRoot.py)
service = MyService()  # Allowed
```

### QLA002: Missing Decorators
```python
class MyService:
    # Bad
    def public_method(self):  # Triggers QLA002
        pass
    
    # Good
    @log_method
    def public_method(self):  # OK
        pass
```

### QLA003: Concrete Dependencies
```python
# Bad
@app.get("/")
def handler(service: MyService = Depends(MyService)):  # Triggers QLA003
    pass

# Good  
@app.get("/")
def handler(service: IMyService = Depends(get_service)):  # OK
    pass
```

## Development

Run tests:
```bash
pytest tests/
```

The plugin uses standard Python AST parsing and can be extended with additional rules following the same pattern.