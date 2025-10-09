# QUALIA.CODE v1.1 - Backend Decorators (Backward Compatibility Layer)
# Phase 3.5: Decorator Modularization
"""
DEPRECATED: This file is maintained for backward compatibility only.

New code should import from backend.utils.decorators package directly:
    from backend.utils.decorators import log_execution, handle_errors, ...

This file re-exports all decorators from the modularized structure:
    backend/utils/decorators/
        ├── __init__.py (main export)
        ├── log_method.py (@log_execution)
        ├── catch_error.py (@handle_errors)
        ├── validate.py (@validate_schema)
        ├── time_measure.py (@time_execution)
        ├── cache.py (@cache_result)
        └── on_event.py (@OnEvent)

Migration Path:
    Phase 3.5 creates modular structure while maintaining backward compatibility.
    Phase 3.6+ will update all imports to use new structure directly.
"""

# Re-export all decorators from modular package
from backend.utils.decorators.log_method import log_execution
from backend.utils.decorators.catch_error import handle_errors
from backend.utils.decorators.validate import validate_schema
from backend.utils.decorators.time_measure import time_execution
from backend.utils.decorators.cache import cache_result
from backend.utils.decorators.on_event import OnEvent

# Maintain backward compatibility
__all__ = [
    "log_execution",
    "handle_errors",
    "validate_schema",
    "time_execution",
    "cache_result",
    "OnEvent",
]

# Migration notice
__deprecated__ = True
__migration_guide__ = (
    "This file is deprecated. Import directly from backend.utils.decorators package: "
    "from backend.utils.decorators import log_execution, handle_errors, ..."
)
__phase__ = "3.5"
__status__ = "Backward Compatibility Layer"
