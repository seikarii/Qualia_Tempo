"""QUALIA.CODE v1.1 - Deprecated Decorator Tests"""
import pytest
import warnings
from backend.utils.decorators import deprecated

class TestDeprecatedDecorator:
    def test_emits_warning(self):
        @deprecated(reason="Test deprecation")
        def old_function():
            return "old"
        
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            result = old_function()
            assert len(w) == 1
            assert issubclass(w[0].category, DeprecationWarning)
            assert "deprecated" in str(w[0].message).lower()
    
    def test_warning_emitted_once(self):
        @deprecated()
        def old_function():
            return "old"
        
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            old_function()
            old_function()
            old_function()
            assert len(w) == 1  # Only first call
    
    def test_function_still_executes(self):
        @deprecated()
        def old_calculation(x):
            return x * 2
        
        with warnings.catch_warnings(record=True):
            warnings.simplefilter("always")
            assert old_calculation(5) == 10
    
    def test_metadata_attached(self):
        @deprecated(
            reason="Old algorithm",
            replacement="new_function()",
            removal_version="2.0.0"
        )
        def old_function():
            pass
        
        assert old_function.__deprecated__ is True
        assert old_function.__deprecation_reason__ == "Old algorithm"
        assert old_function.__replacement__ == "new_function()"
        assert old_function.__removal_version__ == "2.0.0"
    
    def test_full_message_components(self):
        @deprecated(
            reason="Security issue",
            replacement="secure_function()",
            removal_version="1.5.0"
        )
        def insecure_function():
            pass
        
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            insecure_function()
            message = str(w[0].message)
            assert "deprecated" in message.lower()
            assert "Security issue" in message
            assert "secure_function()" in message
            assert "1.5.0" in message
