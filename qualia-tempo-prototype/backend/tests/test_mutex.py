"""QUALIA.CODE v1.1 - Mutex Decorator Tests"""
import pytest
import asyncio
import time
from backend.utils.decorators import mutex, MutexTimeoutError

class TestMutexDecorator:
    @pytest.mark.asyncio
    async def test_sequential_async_execution(self):
        execution_order = []
        
        @mutex()
        async def critical_section(task_id):
            execution_order.append(f"{task_id}_start")
            await asyncio.sleep(0.1)
            execution_order.append(f"{task_id}_end")
            return task_id
        
        results = await asyncio.gather(
            critical_section("A"),
            critical_section("B"),
            critical_section("C")
        )
        
        # Verify no interleaving
        assert "A_start" in execution_order
        assert "B_start" in execution_order
        # Start/end pairs should not interleave
        for i, item in enumerate(execution_order):
            if "start" in item:
                task = item.split("_")[0]
                next_should_be = f"{task}_end"
                assert execution_order[i+1] == next_should_be
    
    def test_sequential_sync_execution(self):
        counter = 0
        
        @mutex()
        def increment():
            nonlocal counter
            temp = counter
            time.sleep(0.01)
            counter = temp + 1
        
        # Simulate concurrent calls
        import threading
        threads = [threading.Thread(target=increment) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert counter == 10  # No race condition
    
    @pytest.mark.asyncio
    async def test_timeout_acquisition(self):
        @mutex(timeout=0.1)
        async def locked_operation():
            await asyncio.sleep(0.5)
            return "done"
        
        task1 = asyncio.create_task(locked_operation())
        await asyncio.sleep(0.01)  # Let task1 acquire lock
        
        with pytest.raises(MutexTimeoutError):
            await locked_operation()  # Should timeout
        
        await task1  # Cleanup
    
    @pytest.mark.asyncio
    async def test_lock_released_on_exception(self):
        @mutex()
        async def failing_operation():
            raise ValueError("Error in critical section")
        
        with pytest.raises(ValueError):
            await failing_operation()
        
        # Lock should be released, next call should succeed
        @mutex()
        async def second_operation():
            return "recovered"
        
        result = await second_operation()
        assert result == "recovered"
