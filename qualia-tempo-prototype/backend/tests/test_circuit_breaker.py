"""
QUALIA.CODE v1.1 - Circuit Breaker Decorator Tests
Tests the circuit breaker pattern implementation
"""

import pytest
import time
from backend.utils.decorators import circuit_breaker, CircuitBreakerOpenError


class TestCircuitBreaker:
    """Test suite for @circuit_breaker decorator"""
    
    def test_normal_operation_closed_state(self):
        """Test that circuit breaker allows calls in CLOSED state"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=3, recovery_timeout=1.0)
        def successful_operation():
            nonlocal call_count
            call_count += 1
            return "success"
        
        # Multiple successful calls should work
        assert successful_operation() == "success"
        assert successful_operation() == "success"
        assert successful_operation() == "success"
        assert call_count == 3
    
    def test_circuit_opens_after_threshold(self):
        """Test that circuit opens after reaching failure threshold"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=3, recovery_timeout=1.0)
        def failing_operation():
            nonlocal call_count
            call_count += 1
            raise ValueError("Service unavailable")
        
        # First 3 calls should attempt and fail
        for i in range(3):
            with pytest.raises(ValueError):
                failing_operation()
        
        assert call_count == 3
        
        # 4th call should be rejected immediately (circuit OPEN)
        with pytest.raises(CircuitBreakerOpenError):
            failing_operation()
        
        # Should not increment call_count (circuit blocked the call)
        assert call_count == 3
    
    def test_circuit_half_open_after_timeout(self):
        """Test that circuit enters HALF_OPEN state after recovery timeout"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=2, recovery_timeout=0.1)
        def intermittent_operation():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise ValueError("Temporarily failing")
            return "recovered"
        
        # Trigger circuit to OPEN
        with pytest.raises(ValueError):
            intermittent_operation()
        with pytest.raises(ValueError):
            intermittent_operation()
        
        # Circuit should be OPEN
        with pytest.raises(CircuitBreakerOpenError):
            intermittent_operation()
        
        assert call_count == 2
        
        # Wait for recovery timeout
        time.sleep(0.15)
        
        # Circuit should be HALF_OPEN, allow test call
        result = intermittent_operation()
        assert result == "recovered"
        assert call_count == 3
    
    def test_circuit_reopens_if_half_open_fails(self):
        """Test that circuit reopens if HALF_OPEN test fails"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=2, recovery_timeout=0.1)
        def still_failing_operation():
            nonlocal call_count
            call_count += 1
            raise ValueError("Still unavailable")
        
        # Open the circuit
        with pytest.raises(ValueError):
            still_failing_operation()
        with pytest.raises(ValueError):
            still_failing_operation()
        
        # Wait for recovery timeout to enter HALF_OPEN
        time.sleep(0.15)
        
        # HALF_OPEN test fails
        with pytest.raises(ValueError):
            still_failing_operation()
        
        # Circuit should reopen immediately
        with pytest.raises(CircuitBreakerOpenError):
            still_failing_operation()
        
        # Should not increment call_count (circuit blocked)
        assert call_count == 3
    
    def test_circuit_closes_after_successful_recovery(self):
        """Test that circuit fully closes after successful recovery"""
        call_count = 0
        failure_mode = True
        
        @circuit_breaker(failure_threshold=2, recovery_timeout=0.1)
        def recoverable_operation():
            nonlocal call_count
            call_count += 1
            if failure_mode:
                raise ValueError("Failing")
            return "success"
        
        # Open circuit
        with pytest.raises(ValueError):
            recoverable_operation()
        with pytest.raises(ValueError):
            recoverable_operation()
        
        # Wait and simulate recovery
        time.sleep(0.15)
        failure_mode = False
        
        # Successful HALF_OPEN test should close circuit
        assert recoverable_operation() == "success"
        
        # Circuit should be CLOSED, allow many successful calls
        for _ in range(5):
            assert recoverable_operation() == "success"
        
        assert call_count == 8  # 2 failures + 1 recovery + 5 normal
    
    def test_specific_exception_catching(self):
        """Test that circuit only catches specified exception types"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=3, recovery_timeout=0.1, expected_exception=ValueError)
        def specific_exception_operation(exception_type):
            nonlocal call_count
            call_count += 1
            if exception_type == "value":
                raise ValueError("Caught by circuit breaker")
            elif exception_type == "type":
                raise TypeError("NOT caught by circuit breaker")
            else:
                return "success"
        
        # ValueError should be caught and counted
        with pytest.raises(ValueError):
            specific_exception_operation("value")
        assert call_count == 1
        
        # TypeError should propagate WITHOUT being caught (bypasses circuit logic)
        with pytest.raises(TypeError):
            specific_exception_operation("type")
        assert call_count == 2  # Function WAS called (exception not handled by circuit)
        
        # More ValueErrors to reach threshold
        with pytest.raises(ValueError):
            specific_exception_operation("value")
        with pytest.raises(ValueError):
            specific_exception_operation("value")
        
        # Circuit should be OPEN now (3 ValueErrors)
        with pytest.raises(CircuitBreakerOpenError):
            specific_exception_operation("value")
        
        # call_count should still be 4 (circuit blocked last call)
        assert call_count == 4
    
    def test_independent_circuit_breakers(self):
        """Test that different functions have independent circuit breakers"""
        
        @circuit_breaker(failure_threshold=2, recovery_timeout=1.0)
        def function_a():
            raise ValueError("A failing")
        
        @circuit_breaker(failure_threshold=2, recovery_timeout=1.0)
        def function_b():
            return "B success"
        
        # Open circuit for function_a
        with pytest.raises(ValueError):
            function_a()
        with pytest.raises(ValueError):
            function_a()
        
        # function_a circuit should be OPEN
        with pytest.raises(CircuitBreakerOpenError):
            function_a()
        
        # function_b should still work (independent circuit)
        assert function_b() == "B success"
    
    def test_custom_threshold_and_timeout(self):
        """Test that custom threshold and timeout parameters work"""
        call_count = 0
        
        @circuit_breaker(failure_threshold=5, recovery_timeout=0.2)
        def custom_config_operation():
            nonlocal call_count
            call_count += 1
            raise ValueError("Failing")
        
        # Should allow 5 failures before opening
        for i in range(5):
            with pytest.raises(ValueError):
                custom_config_operation()
        
        assert call_count == 5
        
        # 6th call should be rejected
        with pytest.raises(CircuitBreakerOpenError):
            custom_config_operation()
        
        assert call_count == 5
    
    def test_reset_on_success(self):
        """Test that failure count resets on successful call"""
        call_count = 0
        fail_next_call = False
        
        @circuit_breaker(failure_threshold=3, recovery_timeout=0.1)
        def intermittent_failures():
            nonlocal call_count
            call_count += 1
            if fail_next_call:
                raise ValueError("Intermittent failure")
            return "success"
        
        # Fail, then succeed (should reset count)
        fail_next_call = True
        with pytest.raises(ValueError):
            intermittent_failures()
        
        fail_next_call = False
        assert intermittent_failures() == "success"
        
        # Failure count should be reset, so need 3 more failures to open
        fail_next_call = True
        for i in range(3):
            with pytest.raises(ValueError):
                intermittent_failures()
        
        # Circuit should now be OPEN
        with pytest.raises(CircuitBreakerOpenError):
            intermittent_failures()
        
        assert call_count == 5  # 1 fail + 1 success + 3 fails
