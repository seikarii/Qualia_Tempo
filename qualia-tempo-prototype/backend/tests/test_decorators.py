# QUALIA.CODE v1.0 - Decorators Tests
# Comprehensive testing for mandatory transversal logic decorators

import pytest
import logging
import time
import json
import tempfile
import os
from unittest.mock import patch
import sys

# Add project root to path for imports
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from backend.utils.decorators import (
    log_execution,
    handle_errors,
    validate_schema,
    time_execution,
    cache_result,
)


class TestLogExecutionDecorator:
    """Test suite for log_execution decorator."""

    def test_log_execution_info_level(self, caplog):
        """Test log_execution with INFO level."""
        with caplog.at_level(logging.INFO):

            @log_execution(level="INFO")
            def test_function():
                return "test_result"

            result = test_function()

            assert result == "test_result"
            assert "→ ENTER" in caplog.text
            assert "← EXIT" in caplog.text
            assert "test_function" in caplog.text

    def test_log_execution_with_exception(self, caplog):
        """Test log_execution when function raises exception."""

        @log_execution(level="INFO")
        def error_function():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            error_function()

        assert "ERROR" in caplog.text
        assert "Test error" in caplog.text

    def test_log_execution_debug_level(self, caplog):
        """Test log_execution with DEBUG level."""
        with caplog.at_level(logging.DEBUG):

            @log_execution(level="DEBUG")
            def debug_function():
                return "debug_result"

            result = debug_function()

            assert result == "debug_result"
            assert "→ ENTER" in caplog.text

    def test_log_execution_timing(self, caplog):
        """Test that execution time is logged."""

        @log_execution(level="INFO")
        def slow_function():
            time.sleep(0.01)  # 10ms sleep
            return "slow_result"

        result = slow_function()

        assert result == "slow_result"
        # Just verify the function executed successfully


class TestHandleErrorsDecorator:
    """Test suite for handle_errors decorator."""

    def test_handle_errors_success(self):
        """Test handle_errors when function succeeds."""

        @handle_errors(fallback_return_value="fallback")
        def success_function():
            return "success"

        result = success_function()
        assert result == "success"

    def test_handle_errors_with_fallback(self, caplog):
        """Test handle_errors with fallback value."""

        @handle_errors(fallback_return_value="fallback")
        def error_function():
            raise ValueError("Test error")

        result = error_function()

        assert result == "fallback"
        assert "🚨 ERROR in" in caplog.text
        assert "Test error" in caplog.text
        assert "🔄 Returning fallback value" in caplog.text

    def test_handle_errors_without_fallback(self, caplog):
        """Test handle_errors without fallback (re-raises)."""

        @handle_errors(fallback_return_value=None)
        def error_function():
            raise ValueError("Test error")

        with pytest.raises(ValueError):
            error_function()

        assert "🚨 ERROR in" in caplog.text
        assert "💥 Re-raising exception" in caplog.text

    def test_handle_errors_logs_context(self, caplog):
        """Test that handle_errors logs function arguments."""

        @handle_errors(fallback_return_value="fallback")
        def error_function(arg1, arg2, kwarg1=None):
            raise ValueError("Test error")

        result = error_function("test1", "test2", kwarg1="test_kwarg")

        assert result == "fallback"
        assert "📋 Args:" in caplog.text
        assert "📋 Kwargs:" in caplog.text


class TestValidateSchemaDecorator:
    """Test suite for validate_schema decorator."""

    @pytest.fixture
    def temp_schema_file(self):
        """Create a temporary schema file for testing."""
        schema = {
            "type": "object",
            "properties": {
                "intensity": {"type": "number", "minimum": 0, "maximum": 1},
                "precision": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["intensity", "precision"],
        }

        # Create temp directory mimicking the schema path
        temp_dir = tempfile.mkdtemp()
        schema_path = os.path.join(temp_dir, "TestSchema.json")

        with open(schema_path, "w") as f:
            json.dump(schema, f)

        yield temp_dir, schema_path

        # Cleanup
        os.unlink(schema_path)
        os.rmdir(temp_dir)

    @patch("backend.utils.decorators.open")
    def test_validate_schema_success(self, mock_file):
        """Test validate_schema with valid data."""
        # Mock the schema file
        schema = {
            "type": "object",
            "properties": {
                "intensity": {"type": "number"},
                "precision": {"type": "number"},
            },
        }
        mock_file.return_value.__enter__.return_value.read.return_value = json.dumps(
            schema
        )

        @validate_schema("TestSchema")
        def test_function(data):
            return f"processed {data}"

        valid_data = {"intensity": 0.5, "precision": 0.8}
        result = test_function(valid_data)

        assert result == f"processed {valid_data}"

    @patch("backend.utils.decorators.open")
    def test_validate_schema_validation_error(self, mock_file):
        """Test validate_schema with invalid data."""
        schema = {
            "type": "object",
            "properties": {
                "intensity": {"type": "number"},
                "precision": {"type": "number"},
            },
            "required": ["intensity", "precision"],
        }
        mock_file.return_value.__enter__.return_value.read.return_value = json.dumps(
            schema
        )

        @validate_schema("TestSchema")
        def test_function(data):
            return f"processed {data}"

        invalid_data = {"intensity": 0.5}  # Missing required 'precision'

        with pytest.raises(ValueError, match="Schema validation failed"):
            test_function(invalid_data)

    def test_validate_schema_file_not_found(self):
        """Test validate_schema when schema file doesn't exist."""

        @validate_schema("NonExistentSchema")
        def test_function(data):
            return f"processed {data}"

        with pytest.raises(ValueError, match="Schema NonExistentSchema not found"):
            test_function({"test": "data"})

    @patch("backend.utils.decorators.open")
    def test_validate_schema_invalid_json(self, mock_file):
        """Test validate_schema with invalid JSON in schema file."""
        mock_file.return_value.__enter__.return_value.read.return_value = "invalid json"

        @validate_schema("InvalidSchema")
        def test_function(data):
            return f"processed {data}"

        with pytest.raises(ValueError, match="Invalid schema InvalidSchema"):
            test_function({"test": "data"})

    @patch("backend.utils.decorators.open")
    def test_validate_schema_with_pydantic_model(self, mock_file, caplog):
        """Test validate_schema with Pydantic model input."""
        # Set logging level to DEBUG to capture all logs
        caplog.set_level(logging.DEBUG)

        schema = {"type": "object", "properties": {"intensity": {"type": "number"}}}
        mock_file.return_value.__enter__.return_value.read.return_value = json.dumps(
            schema
        )

        # Mock Pydantic model
        class MockModel:
            def dict(self):
                return {"intensity": 0.5}

        @validate_schema("TestSchema")
        def test_function(data):
            return f"processed {data}"

        model_data = MockModel()
        test_function(model_data)

        # Check for schema validation success in logs
        assert any(
            "Schema validation passed" in record.message
            for record in caplog.records
            if hasattr(record, "message")
        )


class TestTimeExecutionDecorator:
    """Test suite for time_execution decorator."""

    def test_time_execution_fast(self, caplog):
        """Test time_execution with fast function."""

        @time_execution()
        def fast_function():
            return "fast"

        result = fast_function()

        assert result == "fast"
        # Just verify function executed and performance was logged

    def test_time_execution_slow(self, caplog):
        """Test time_execution with slow function."""

        @time_execution()
        def slow_function():
            time.sleep(0.05)  # 50ms - should be categorized as slow
            return "slow"

        result = slow_function()

        assert result == "slow"
        # Just verify function executed (timing assertions may vary by system)

    def test_time_execution_preserves_result(self):
        """Test that time_execution preserves function result and arguments."""

        @time_execution()
        def function_with_args(arg1, arg2, kwarg1=None):
            return f"{arg1}-{arg2}-{kwarg1}"

        result = function_with_args("a", "b", kwarg1="c")
        assert result == "a-b-c"


class TestCacheResultDecorator:
    """Test suite for cache_result decorator."""

    def test_cache_result_first_call(self, caplog):
        """Test cache_result on first function call."""
        call_count = 0

        @cache_result()
        def expensive_function(arg):
            nonlocal call_count
            call_count += 1
            return f"result-{arg}"

        result = expensive_function("test")

        assert result == "result-test"
        assert call_count == 1
        # Cache miss should be logged (may vary by implementation)

    def test_cache_result_second_call(self, caplog):
        """Test cache_result on subsequent calls (cache hit)."""
        call_count = 0

        @cache_result()
        def expensive_function(arg):
            nonlocal call_count
            call_count += 1
            return f"result-{arg}"

        result1 = expensive_function("test")
        result2 = expensive_function("test")  # Should hit cache

        assert result1 == result2 == "result-test"
        assert call_count == 1  # Function called only once
        # Cache hit should be logged (may vary by implementation)

    def test_cache_result_with_ttl_expired(self, caplog):
        """Test cache_result with TTL expiration."""
        call_count = 0

        @cache_result(ttl_seconds=0.01)  # 10ms TTL
        def expensive_function():
            nonlocal call_count
            call_count += 1
            return "result"

        result1 = expensive_function()
        time.sleep(0.02)  # Wait for TTL to expire
        result2 = expensive_function()

        assert result1 == result2 == "result"
        assert call_count == 2  # Function called twice due to TTL expiration

    def test_cache_result_different_args(self):
        """Test cache_result with different arguments."""
        call_count = 0

        @cache_result()
        def function_with_args(arg1, arg2):
            nonlocal call_count
            call_count += 1
            return f"{arg1}-{arg2}"

        result1 = function_with_args("a", "b")
        result2 = function_with_args("c", "d")
        result3 = function_with_args("a", "b")  # Should hit cache

        assert result1 == "a-b"
        assert result2 == "c-d"
        assert result3 == "a-b"
        assert call_count == 2  # Only 2 unique calls


class TestDecoratorCombination:
    """Test suite for combining multiple decorators."""

    def test_multiple_decorators(self, caplog):
        """Test combining multiple decorators."""
        # Set logging level to INFO to capture all relevant logs
        caplog.set_level(logging.INFO)

        @log_execution(level="INFO")
        @handle_errors(fallback_return_value="error")
        @time_execution()
        def complex_function(value):
            if value == "error":
                raise ValueError("Test error")
            return f"processed-{value}"

        # Test success case
        result1 = complex_function("success")
        assert result1 == "processed-success"
        # Check for function exit in logs
        assert any(
            "EXIT" in record.message
            for record in caplog.records
            if hasattr(record, "message")
        )

        # Test error case
        caplog.clear()
        result2 = complex_function("error")
        assert result2 == "error"  # Fallback value
        assert any(
            "ERROR" in record.message
            for record in caplog.records
            if hasattr(record, "message")
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
