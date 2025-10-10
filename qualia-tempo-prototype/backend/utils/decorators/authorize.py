# QUALIA.CODE v1.1 - Authorization Pattern Decorator
# Implements role-based access control

import functools
import logging
from typing import Any, Callable, List, Optional, Union


class AuthorizationError(Exception):
    """Raised when authorization check fails"""
    pass


class UnauthorizedError(AuthorizationError):
    """Raised when user lacks required role/permission"""
    pass


def authorize(
    required_roles: Union[str, List[str]] = None,
    required_permissions: Union[str, List[str]] = None,
    allow_anonymous: bool = False
) -> Callable[[Callable], Callable]:
    """
    Decorator to enforce role-based authorization on functions.
    
    Usage:
        @authorize(required_roles="admin")
        async def delete_user(self, user_id: int):
            # Only admin role can execute
            pass
        
        @authorize(required_roles=["moderator", "admin"])
        def ban_user(self, user_id: int):
            # Moderator OR admin can execute
            pass
        
        @authorize(
            required_permissions=["users:write", "users:delete"],
            allow_anonymous=False
        )
        async def modify_user(self, user_id: int, data: dict):
            # Must have BOTH permissions
            pass
    
    Args:
        required_roles: Single role or list of roles (OR logic)
        required_permissions: Single permission or list (AND logic)
        allow_anonymous: If True, allow unauthenticated access
    
    Context Resolution:
        The decorator expects authorization context to be passed in kwargs:
        - user_roles: List[str] - Current user's roles
        - user_permissions: List[str] - Current user's permissions
        - user_id: Optional[int] - Current user ID (None if anonymous)
    
    Raises:
        UnauthorizedError: If user lacks required roles/permissions
        AuthorizationError: If authorization context is missing
    
    Benefits:
        - Centralized authorization logic
        - Declarative security model
        - Audit trail via logging
        - Prevents privilege escalation
    
    QUALIA.CODE Compliance:
        - Implements §11.1 Authorization Pattern
        - Integrates with SecurityService
        - Required for sensitive operations
    
    Note:
        This is a preparation decorator for future SecurityService integration.
        Currently, it validates the authorization context structure.
    """
    
    logger = logging.getLogger(__name__)
    
    # Normalize to lists
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    if isinstance(required_permissions, str):
        required_permissions = [required_permissions]
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            func_name = f"{func.__module__}.{func.__qualname__}"
            
            # Extract authorization context from kwargs (and remove from kwargs)
            user_id = kwargs.pop("user_id", None)
            user_roles = kwargs.pop("user_roles", [])
            user_permissions = kwargs.pop("user_permissions", [])
            
            # Check if anonymous access allowed
            if user_id is None and not allow_anonymous:
                error_msg = f"🚫 {func_name} requires authentication"
                logger.warning(error_msg)
                raise UnauthorizedError(error_msg)
            
            # Check required roles (OR logic - any role matches)
            if required_roles:
                if not any(role in user_roles for role in required_roles):
                    error_msg = (
                        f"🚫 {func_name} requires role(s): {required_roles}. "
                        f"User has: {user_roles}"
                    )
                    logger.warning(error_msg)
                    raise UnauthorizedError(error_msg)
                
                logger.debug(
                    f"✅ Authorization passed for {func_name} "
                    f"(user_id={user_id}, roles={user_roles})"
                )
            
            # Check required permissions (AND logic - all permissions required)
            if required_permissions:
                missing_permissions = [
                    perm for perm in required_permissions
                    if perm not in user_permissions
                ]
                
                if missing_permissions:
                    error_msg = (
                        f"🚫 {func_name} requires permissions: {required_permissions}. "
                        f"Missing: {missing_permissions}"
                    )
                    logger.warning(error_msg)
                    raise UnauthorizedError(error_msg)
                
                logger.debug(
                    f"✅ Authorization passed for {func_name} "
                    f"(user_id={user_id}, permissions={user_permissions})"
                )
            
            # Execute function (auth context removed from kwargs)
            return func(*args, **kwargs)
        
        # Mark as protected in metadata
        wrapper.__protected__ = True
        wrapper.__required_roles__ = required_roles
        wrapper.__required_permissions__ = required_permissions
        
        return wrapper
    
    return decorator
