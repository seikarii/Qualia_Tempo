import ast
import pytest
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from ruff_qualia_code.rules import SourceFile

from ruff_qualia_code.rules import (
    QLA001, QLA002, QLA003, QLA004, QLA005, QLA006,
    QLA007, QLA009, QLA010, QLA011
)


def create_source_file(content: str, path: str) -> SourceFile:
    return SourceFile.new(Path(path), content)


def test_qla001_direct_instantiation():
    code = """
from services import MyService

# This should trigger QLA001
service = MyService()
"""
    source_file = create_source_file(code, "test.py")
    rule = QLA001()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA001"
    assert "Direct instantiation" in diagnostic.message


def test_qla001_composition_root_allowed():
    code = """
from services import MyService

# This should NOT trigger QLA001 in CompositionRoot
service = MyService()
"""
    source_file = create_source_file(code, "CompositionRoot.py")
    rule = QLA001()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is None


def test_qla002_missing_decorator():
    code = """
class MyService:
    def public_method(self):
        pass
"""
    source_file = create_source_file(code, "services/MyService.py")
    rule = QLA002()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA002"
    assert "architectural decorator" in diagnostic.message


def test_qla002_with_decorator():
    code = """
class MyService:
    @log_method
    def public_method(self):
        pass
"""
    source_file = create_source_file(code, "services/MyService.py")
    rule = QLA002()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is None


def test_qla003_concrete_dependency():
    code = """
from fastapi import Depends
from services import MyService

@app.get("/")
def route_handler(service: MyService = Depends(MyService)):
    pass
"""
    source_file = create_source_file(code, "api/routes.py")
    rule = QLA003()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA003"
    assert "concrete type" in diagnostic.message


def test_qla004_hardcoded_config():
    code = """
class MyService:
    def __init__(self):
        self.timeout = 5000  # This should trigger QLA004
        self.api_url = "https://api.example.com"
"""
    source_file = create_source_file(code, "services/MyService.py")
    rule = QLA004()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA004"
    assert "Hardcoded configuration" in diagnostic.message


def test_qla005_platform_api_usage():
    code = """
import requests

class MyService:
    def fetch_data(self):
        response = requests.get("https://api.example.com")  # This should trigger QLA005
        return response.json()
"""
    source_file = create_source_file(code, "services/MyService.py")
    rule = QLA005()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA005"
    assert "Critical platform API usage" in diagnostic.message


def test_qla006_event_contract_violation():
    code = """
class PlayerActionEvent:
    def __init__(self):
        self.type = "PlayerAction"  # Missing timestamp and source
        self.action = "Dash"
"""
    source_file = create_source_file(code, "services/events.py")
    rule = QLA006()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA006"
    assert "Event contract violation" in diagnostic.message


def test_qla007_missing_generated_comment():
    code = """
\"""Module docstring without generated comment.\"""

class GeneratedModel:
    pass
"""
    source_file = create_source_file(code, "models.py")
    rule = QLA007()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA007"
    assert "Generated file missing" in diagnostic.message


# QLA008 test removed - rule was architecturally inappropriate for Python linter
# React useState patterns should be validated by ESLint, not Python AST parser

def test_qla009_direct_service_instantiation_in_test():
    code = """
from services import MyService

class TestMyService:
    def test_something(self):
        service = MyService()  # This should trigger QLA009
        assert service is not None
"""
    source_file = create_source_file(code, "tests/test_my_service.py")
    rule = QLA009()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA009"
    assert "Test instantiates 'MyService' without test factory" in diagnostic.message


def test_qla010_decorator_parameter_error():
    code = """
class MyService:
    @validate()  # Missing schema parameter
    def process_data(self, data):
        pass
"""
    source_file = create_source_file(code, "services/MyService.py")
    rule = QLA010()

    tree = ast.parse(code)
    diagnostic = rule.check(tree, source_file)

    assert diagnostic is not None
    assert diagnostic.code == "QLA010"
    assert "Decorator 'validate' error" in diagnostic.message


def test_qla011_circular_dependency_detection():
    """Test QLA011 circular dependency detection across multiple files"""
    from ruff_qualia_code.rules import QLA011
    
    # Create ServiceA that depends on ServiceB
    service_a_code = """
from services.service_b import ServiceBService

class ServiceAService:
    def __init__(self, service_b: ServiceBService):
        self.service_b = service_b
"""
    
    # Create ServiceB that depends on ServiceA (circular)
    service_b_code = """
from services.service_a import ServiceAService

class ServiceBService:
    def process(self, service_a: ServiceAService):
        pass
"""
    
    # Initialize QLA011 analyzer
    analyzer = QLA011()
    
    # Process ServiceA file
    source_file_a = create_source_file(service_a_code, "services/service_a.py")
    tree_a = ast.parse(service_a_code)
    analyzer.check(tree_a, source_file_a)
    
    # Process ServiceB file
    source_file_b = create_source_file(service_b_code, "services/service_b.py")
    tree_b = ast.parse(service_b_code)
    analyzer.check(tree_b, source_file_b)
    
    # Run circular dependency analysis
    diagnostics = analyzer.analyze_all_dependencies()
    
    # Should detect circular dependency
    assert len(diagnostics) > 0
    assert diagnostics[0].code == "QLA011"
    assert "Circular dependency detected" in diagnostics[0].message


def test_qla011_no_circular_dependency():
    """Test QLA011 with no circular dependencies"""
    from ruff_qualia_code.rules import QLA011
    
    # ServiceA depends on ServiceB
    service_a_code = """
from services.service_b import ServiceBService

class ServiceAService:
    def __init__(self, service_b: ServiceBService):
        self.service_b = service_b
"""
    
    # ServiceB has no dependencies
    service_b_code = """
class ServiceBService:
    def process(self):
        pass
"""
    
    analyzer = QLA011()
    
    source_file_a = create_source_file(service_a_code, "services/service_a.py")
    tree_a = ast.parse(service_a_code)
    analyzer.check(tree_a, source_file_a)
    
    source_file_b = create_source_file(service_b_code, "services/service_b.py")
    tree_b = ast.parse(service_b_code)
    analyzer.check(tree_b, source_file_b)
    
    diagnostics = analyzer.analyze_all_dependencies()
    
    # Should not detect any circular dependencies
    assert len(diagnostics) == 0