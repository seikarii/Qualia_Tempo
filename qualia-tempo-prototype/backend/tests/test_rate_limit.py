"""QUALIA.CODE v1.1 - Rate Limit Decorator Tests"""
import pytest
import time
import asyncio
from backend.utils.decorators import rate_limit, RateLimitExceededError

class TestRateLimitDecorator:
    def test_allows_within_rate_limit(self):
        @rate_limit(calls_per_second=10, block=True)
        def limited_operation():
            return "success"
        results = [limited_operation() for _ in range(5)]
        assert all(r == "success" for r in results)
    
    def test_blocks_until_tokens_available(self):
        start = time.time()
        @rate_limit(calls_per_second=2, burst_size=2, block=True)
        def limited_operation():
            return "done"
        # First 2 calls instant (burst)
        limited_operation()
        limited_operation()
        # 3rd call must wait ~0.5s for token
        limited_operation()
        elapsed = time.time() - start
        assert 0.4 < elapsed < 0.7
    
    def test_raises_when_rate_exceeded_no_block(self):
        @rate_limit(calls_per_second=2, burst_size=2, block=False)
        def limited_operation():
            return "done"
        limited_operation()
        limited_operation()
        with pytest.raises(RateLimitExceededError):
            limited_operation()
    
    @pytest.mark.asyncio
    async def test_async_rate_limiting(self):
        @rate_limit(calls_per_second=5, block=True)
        async def async_limited():
            await asyncio.sleep(0.01)
            return "async_done"
        results = await asyncio.gather(*[async_limited() for _ in range(3)])
        assert all(r == "async_done" for r in results)
    
    def test_burst_capacity(self):
        @rate_limit(calls_per_second=1, burst_size=5)
        def limited_operation():
            return "burst"
        # Should handle 5 calls instantly (burst)
        start = time.time()
        [limited_operation() for _ in range(5)]
        elapsed = time.time() - start
        assert elapsed < 0.2  # All within burst
