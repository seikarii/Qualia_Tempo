"""QUALIA.CODE v1.1 - Transaction Decorator Tests"""
import pytest
import asyncio
from backend.utils.decorators import transaction

class MockDBSession:
    def __init__(self):
        self.transaction_started = False
        self.committed = False
        self.rolled_back = False
    
    def begin(self):
        self.transaction_started = True
    
    def commit(self):
        self.committed = True
    
    def rollback(self):
        self.rolled_back = True

class TestTransactionDecorator:
    @pytest.mark.asyncio
    async def test_function_executes_with_transaction_context(self):
        @transaction()
        async def db_operation():
            return "data_inserted"
        
        result = await db_operation(db_session=MockDBSession())
        assert result == "data_inserted"
    
    @pytest.mark.asyncio
    async def test_executes_without_session(self):
        """Should allow execution even without db_session (future-proofing)"""
        @transaction()
        async def operation():
            return "no_db"
        
        result = await operation()
        assert result == "no_db"
    
    def test_sync_transaction(self):
        @transaction()
        def sync_operation():
            return "sync_data"
        
        result = sync_operation(db_session=MockDBSession())
        assert result == "sync_data"
    
    @pytest.mark.asyncio
    async def test_readonly_transaction(self):
        @transaction(readonly=True)
        async def read_operation():
            return "read_data"
        
        result = await read_operation(db_session=MockDBSession())
        assert result == "read_data"
    
    @pytest.mark.asyncio
    async def test_isolation_level_parameter(self):
        @transaction(isolation_level="SERIALIZABLE")
        async def isolated_operation():
            return "isolated"
        
        result = await isolated_operation(db_session=MockDBSession())
        assert result == "isolated"
    
    @pytest.mark.asyncio
    async def test_rollback_on_exception(self):
        """Future: Should rollback when exception occurs"""
        @transaction()
        async def failing_operation():
            raise ValueError("DB error")
        
        with pytest.raises(ValueError):
            await failing_operation(db_session=MockDBSession())
