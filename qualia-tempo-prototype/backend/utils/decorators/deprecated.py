# QUALIA.CODE v1.1 - Deprecation Warning Decorator
# Marks functions as deprecated with migration guidance

import functools
import logging
import warnings
from typing import Any, Callable, Optional


def deprecated(
    reason: str = None,
    replacement: str = None,
    removal_version: str = None
) -> Callable[[Callable], Callable]:
    """
    Decorator to mark functions as deprecated with detailed guidance.
    
    Usage:
        @deprecated(
            reason="This method uses outdated algorithm",
            replacement="use calculate_qualia_v2() instead",
            removal_version="2.0.0"
        )
        def calculate_qualia_v1(self, data: dict) -> float:
            # Old implementation
            pass
        
        @deprecated(reason="Security vulnerability", removal_version="1.5.0")
        async def insecure_auth(self, token: str) -> bool:
            # Vulnerable implementation
            pass
    
    Args:
        reason: Explanation of why function is deprecated
        replacement: Suggested alternative function/method
        removal_version: Version when function will be removed
    
    Behavior:
        - Emits DeprecationWarning on first call
        - Logs warning message with full context
        - Does not prevent execution (non-breaking)
    
    Benefits:
        - Clear migration path for developers
        - Prevents breaking changes without notice
        - Automated deprecation tracking
        - Gradual API evolution
    
    QUALIA.CODE Compliance:
        - Implements §10.1 Deprecation Strategy
        - Required before removing any public API
        - Part of semantic versioning contract
    """
    
    logger = logging.getLogger(__name__)
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        # Track if warning has been emitted (emit only once)
        warning_emitted = False
        
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            nonlocal warning_emitted
            
            if not warning_emitted:
                func_name = f"{func.__module__}.{func.__qualname__}"
                
                # Build deprecation message
                message_parts = [f"⚠️ {func_name} is deprecated"]
                
                if reason:
                    message_parts.append(f"Reason: {reason}")
                
                if replacement:
                    message_parts.append(f"Use: {replacement}")
                
                if removal_version:
                    message_parts.append(f"Will be removed in: {removal_version}")
                
                full_message = ". ".join(message_parts)
                
                # Emit Python warning (shows in test output)
                warnings.warn(
                    full_message,
                    category=DeprecationWarning,
                    stacklevel=2
                )
                
                # Log warning (shows in application logs)
                logger.warning(full_message)
                
                warning_emitted = True
            
            # Execute function normally
            return func(*args, **kwargs)
        
        # Mark as deprecated in metadata
        wrapper.__deprecated__ = True
        wrapper.__deprecation_reason__ = reason
        wrapper.__replacement__ = replacement
        wrapper.__removal_version__ = removal_version
        
        return wrapper
    
    return decorator
