"""QUALIA.CODE v1.1 - Timeout Decorator Tests"""
import pytest
import asyncio
from backend.utils.decorators import timeout, TimeoutError

class TestTimeoutDecorator:
    @pytest.mark.asyncio
    async def test_completes_within_timeout(self):
        @timeout(1.0)
        async def quick_operation():
            await asyncio.sleep(0.1)
            return "success"
        assert await quick_operation() == "success"
    
    @pytest.mark.asyncio
    async def test_exceeds_timeout(self):
        @timeout(0.1)
        async def slow_operation():
            await asyncio.sleep(1.0)
            return "never"
        with pytest.raises(TimeoutError):
            await slow_operation()
    
    def test_raises_on_sync_function(self):
        with pytest.raises(TypeError):
            @timeout(1.0)
            def sync_func():
                return "sync"
    
    @pytest.mark.asyncio
    async def test_zero_timeout(self):
        @timeout(0.0)
        async def instant_required():
            return "instant"
        # May or may not timeout based on timing
        try:
            result = await instant_required()
            assert result == "instant"
        except TimeoutError:
            pass  # Acceptable
    
    @pytest.mark.asyncio
    async def test_large_timeout(self):
        @timeout(100.0)
        async def normal_operation():
            await asyncio.sleep(0.01)
            return "done"
        assert await normal_operation() == "done"
