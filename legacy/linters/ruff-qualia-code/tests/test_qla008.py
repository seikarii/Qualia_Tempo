"""
QUALIA.CODE v1.1 - QLA008 Circuit Breaker Rule Tests
Tests enforcement of circuit breaker pattern on external service calls
"""

import ast
import pytest
from pathlib import Path

from ruff_qualia_code.rules import QLA008, SourceFile


class TestQLA008CircuitBreakerEnforcement:
    """Test suite for QLA008: Enforce Circuit Breaker Pattern"""

    def test_allows_method_without_external_calls(self):
        """Test that methods without external calls don't need @circuit_breaker"""
        code = """
from backend.utils.decorators import log_execution

class MyService:
    @log_execution
    def calculate_something(self, value: int) -> int:
        return value * 2
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is None, "Should not flag methods without external calls"

    def test_flags_http_call_without_circuit_breaker(self):
        """Test that HTTP calls without @circuit_breaker are flagged"""
        code = """
class MyService:
    def fetch_data(self, endpoint: str):
        response = self.http_client.get(endpoint)
        return response.json()
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None, "Should flag HTTP call without circuit breaker"
        assert "HTTP" in diagnostic.message
        assert "@circuit_breaker" in diagnostic.message
        assert diagnostic.code == "QLA008"

    def test_allows_http_call_with_circuit_breaker(self):
        """Test that HTTP calls WITH @circuit_breaker are allowed"""
        code = """
from backend.utils.decorators import circuit_breaker

class MyService:
    @circuit_breaker(failure_threshold=3)
    def fetch_data(self, endpoint: str):
        response = self.http_client.get(endpoint)
        return response.json()
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is None, "Should allow HTTP call with circuit breaker"

    def test_flags_websocket_without_circuit_breaker(self):
        """Test that WebSocket calls without @circuit_breaker are flagged"""
        code = """
class MyService:
    async def connect_to_service(self, url: str):
        await self.websocket.connect(url)
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None, "Should flag WebSocket call without circuit breaker"
        assert "WebSocket" in diagnostic.message

    def test_flags_database_call_without_circuit_breaker(self):
        """Test that database calls without @circuit_breaker are flagged"""
        code = """
class MyService:
    def query_users(self):
        return self.db_session.execute("SELECT * FROM users")
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None, "Should flag database call without circuit breaker"
        assert "database" in diagnostic.message

    def test_ignores_private_methods(self):
        """Test that private methods are not checked (internal calls)"""
        code = """
class MyService:
    def _internal_http_call(self):
        # Private methods may wrap external calls
        return self.http_client.get("/internal")
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is None, "Should ignore private methods"

    def test_ignores_non_service_files(self):
        """Test that non-service files are not checked"""
        code = """
def standalone_function():
    response = http_client.get("/api/data")
    return response
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/utils/helper.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is None, "Should ignore non-service files"

    def test_ignores_test_files(self):
        """Test that test files are not checked"""
        code = """
class TestMyService:
    def test_fetch_data(self):
        # Tests can make HTTP calls without circuit breaker
        response = self.http_client.get("/test-endpoint")
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/tests/test_my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is None, "Should ignore test files"

    def test_detects_httpx_library_calls(self):
        """Test detection of httpx library direct calls"""
        code = """
import httpx

class MyService:
    def fetch_external(self):
        return httpx.get("https://api.example.com/data")
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None, "Should flag httpx direct call"

    def test_detects_requests_library_calls(self):
        """Test detection of requests library direct calls"""
        code = """
import requests

class MyService:
    def fetch_external(self):
        return requests.post("https://api.example.com/submit")
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/services/my_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None, "Should flag requests direct call"

    def test_multiple_call_types_in_message(self):
        """Test that diagnostic message includes all detected call types"""
        code = """
class MyService:
    def complex_operation(self):
        # HTTP call
        http_response = self.http_service.get("/api/data")
        # Database call
        db_result = self.db_connection.execute("SELECT * FROM cache")
        # WebSocket call
        await self.ws_client.send("message")
        return http_response, db_result
"""
        tree = ast.parse(code)
        rule = QLA008()
        source_file = SourceFile.new(Path("backend/engine/complex_service.py"), code)
        diagnostic = rule.check(tree, source_file)
        
        assert diagnostic is not None
        # Should mention multiple types
        assert any(keyword in diagnostic.message for keyword in ["HTTP", "database", "WebSocket"])
