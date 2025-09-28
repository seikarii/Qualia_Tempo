import ast
import pytest
from pathlib import Path

from ruff_source_file import SourceFile

from ruff_qualia_code.rules import QLA001, QLA002, QLA003


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
    assert "concrete class" in diagnostic.message