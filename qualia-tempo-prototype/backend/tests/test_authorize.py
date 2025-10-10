"""QUALIA.CODE v1.1 - Authorize Decorator Tests"""
import pytest
from backend.utils.decorators import authorize, UnauthorizedError, AuthorizationError

class TestAuthorizeDecorator:
    def test_allows_with_required_role(self):
        @authorize(required_roles="admin")
        def admin_operation():
            return "admin_success"
        
        result = admin_operation(user_id=1, user_roles=["admin"])
        assert result == "admin_success"
    
    def test_rejects_without_required_role(self):
        @authorize(required_roles="admin")
        def admin_operation():
            return "should_not_execute"
        
        with pytest.raises(UnauthorizedError):
            admin_operation(user_id=1, user_roles=["user"])
    
    def test_multiple_roles_or_logic(self):
        @authorize(required_roles=["admin", "moderator"])
        def protected_operation():
            return "success"
        
        # Either role should work
        assert protected_operation(user_id=1, user_roles=["admin"]) == "success"
        assert protected_operation(user_id=2, user_roles=["moderator"]) == "success"
        
        with pytest.raises(UnauthorizedError):
            protected_operation(user_id=3, user_roles=["user"])
    
    def test_permissions_and_logic(self):
        @authorize(required_permissions=["users:read", "users:write"])
        def modify_user():
            return "modified"
        
        # Must have ALL permissions
        assert modify_user(
            user_id=1,
            user_permissions=["users:read", "users:write", "users:delete"]
        ) == "modified"
        
        with pytest.raises(UnauthorizedError):
            modify_user(user_id=2, user_permissions=["users:read"])  # Missing write
    
    def test_anonymous_access_denied_by_default(self):
        @authorize(required_roles="user")
        def protected():
            return "data"
        
        with pytest.raises(UnauthorizedError):
            protected(user_id=None, user_roles=[])
    
    def test_anonymous_access_allowed(self):
        @authorize(allow_anonymous=True)
        def public_endpoint():
            return "public"
        
        assert public_endpoint(user_id=None) == "public"
    
    def test_metadata_attached(self):
        @authorize(required_roles=["admin"], required_permissions=["system:write"])
        def protected():
            pass
        
        assert protected.__protected__ is True
        assert protected.__required_roles__ == ["admin"]
        assert protected.__required_permissions__ == ["system:write"]
