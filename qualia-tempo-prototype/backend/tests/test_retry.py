"""
QUALIA.CODE v1.1 - Retry Decorator Tests
Tests the retry pattern with exponential backoff
"""

import pytest
import time
import asyncio
from backend.utils.decorators import retry, RetryExhaustedError


class TestRetryDecorator:
    """Test suite for @retry decorator"""
    
    def test_successful_first_attempt(self):
        """Test that successful operations don't retry"""
        call_count = 0
        
        @retry(max_attempts=3)
        def successful_operation():
            nonlocal call_count
            call_count += 1
            return "success"
        
        result = successful_operation()
        assert result == "success"
        assert call_count == 1  # No retries
    
    def test_retry_on_failure_then_success(self):
        """Test retry logic with eventual success"""
        call_count = 0
        
        @retry(max_attempts=3, initial_delay=0.1, backoff_factor=2.0)
        def intermittent_failure():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Transient error")
            return "recovered"
        
        result = intermittent_failure()
        assert result == "recovered"
        assert call_count == 3
    
    def test_retry_exhausted(self):
        """Test that RetryExhaustedError is raised after max attempts"""
        call_count = 0
        
        @retry(max_attempts=3, initial_delay=0.1)
        def always_failing():
            nonlocal call_count
            call_count += 1
            raise ConnectionError("Service unavailable")
        
        with pytest.raises(RetryExhaustedError) as exc_info:
            always_failing()
        
        assert call_count == 3
        assert "Failed after 3 attempts" in str(exc_info.value)
    
    def test_exponential_backoff_timing(self):
        """Test that backoff delays increase exponentially"""
        call_times = []
        
        @retry(max_attempts=4, initial_delay=0.1, backoff_factor=2.0)
        def failing_operation():
            call_times.append(time.time())
            raise ValueError("Error")
        
        try:
            failing_operation()
        except RetryExhaustedError:
            pass
        
        # Verify exponential delays
        assert len(call_times) == 4
        
        # Delays should be approximately: 0, 0.1, 0.2, 0.4
        if len(call_times) >= 2:
            delay1 = call_times[1] - call_times[0]
            assert 0.08 < delay1 < 0.15  # ~0.1s
        
        if len(call_times) >= 3:
            delay2 = call_times[2] - call_times[1]
            assert 0.15 < delay2 < 0.25  # ~0.2s
    
    def test_max_delay_cap(self):
        """Test that delays are capped at max_delay"""
        call_times = []
        
        @retry(max_attempts=5, initial_delay=1.0, backoff_factor=10.0, max_delay=1.5)
        def failing_operation():
            call_times.append(time.time())
            raise ValueError("Error")
        
        try:
            failing_operation()
        except RetryExhaustedError:
            pass
        
        # Verify delays don't exceed max_delay
        for i in range(1, len(call_times)):
            delay = call_times[i] - call_times[i-1]
            assert delay <= 1.6  # max_delay + tolerance
    
    def test_selective_exception_catching(self):
        """Test that only specified exceptions are retried"""
        call_count = 0
        
        @retry(max_attempts=3, exceptions=(ConnectionError, TimeoutError), initial_delay=0.1)
        def selective_failure():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ConnectionError("Network error")  # Will retry
            elif call_count == 2:
                raise ValueError("Value error")  # Will not retry
            return "success"
        
        # ValueError should not be retried
        with pytest.raises(ValueError):
            selective_failure()
        
        assert call_count == 2  # 1st attempt + 1 retry, then ValueError
    
    @pytest.mark.asyncio
    async def test_async_function_retry(self):
        """Test retry works with async functions"""
        call_count = 0
        
        @retry(max_attempts=3, initial_delay=0.1)
        async def async_failing():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)
            if call_count < 3:
                raise ValueError("Async error")
            return "async_success"
        
        result = await async_failing()
        assert result == "async_success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_async_retry_exhausted(self):
        """Test async retry exhaustion"""
        call_count = 0
        
        @retry(max_attempts=2, initial_delay=0.1)
        async def async_always_failing():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)
            raise ConnectionError("Async service unavailable")
        
        with pytest.raises(RetryExhaustedError):
            await async_always_failing()
        
        assert call_count == 2
    
    def test_on_retry_callback(self):
        """Test that on_retry callback is invoked"""
        callback_calls = []
        
        def my_callback(attempt: int, exception: Exception):
            callback_calls.append((attempt, type(exception).__name__))
        
        @retry(max_attempts=3, initial_delay=0.1, on_retry=my_callback)
        def failing_operation():
            raise ValueError("Error")
        
        try:
            failing_operation()
        except RetryExhaustedError:
            pass
        
        # Callback should be called on each retry (not first attempt)
        assert len(callback_calls) == 2  # Attempts 1 and 2 (not 3, as that's final)
        assert callback_calls[0] == (1, "ValueError")
        assert callback_calls[1] == (2, "ValueError")
    
    def test_callback_exception_handling(self):
        """Test that callback exceptions don't break retry logic"""
        call_count = 0
        
        def broken_callback(attempt: int, exception: Exception):
            raise RuntimeError("Callback error")
        
        @retry(max_attempts=3, initial_delay=0.1, on_retry=broken_callback)
        def failing_then_success():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("Error")
            return "success"
        
        # Should still succeed despite callback errors
        result = failing_then_success()
        assert result == "success"
        assert call_count == 3
