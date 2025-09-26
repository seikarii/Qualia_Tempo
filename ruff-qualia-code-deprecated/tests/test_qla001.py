"""
Test cases for QLA001: Prohibit Direct Service Instantiation
"""

import ast
import tempfile
from pathlib import Path

from qualia_code_linter.rules.qla001 import QLA001


def test_qla001_allows_composition_root():
    """QLA001 should allow service instantiation in CompositionRoot files."""
    code = """
from services.QualiaService import QualiaService

class CompositionRoot:
    def get_qualia_service(self):
        return QualiaService()  # This should be allowed
    """
    
    # Create temporary file with CompositionRoot name
    with tempfile.NamedTemporaryFile(suffix="CompositionRoot.py", mode='w', delete=False) as f:
        f.write(code)
        temp_path = Path(f.name)
    
    try:
        tree = ast.parse(code)
        rule = QLA001(temp_path, {})
        violations = rule.check(tree)
        
        if violations:
            print(f"Violations found: {[v.message for v in violations]}")
        assert len(violations) == 0, f"Expected no violations, got {len(violations)}"
        print("✅ QLA001 correctly allows service instantiation in CompositionRoot")
    finally:
        temp_path.unlink()


def test_qla001_prohibits_service_instantiation():
    """QLA001 should prohibit service instantiation outside CompositionRoot."""
    code = """
from services.QualiaService import QualiaService
from services.BackendSyncService import BackendSyncService

class UserController:
    def process_request(self):
        service = QualiaService()  # This should be flagged
        sync = BackendSyncService()  # This should be flagged
        return service.process()
    """
    
    # Create temporary file with non-CompositionRoot name
    with tempfile.NamedTemporaryFile(suffix="Controller.py", mode='w', delete=False) as f:
        f.write(code)
        temp_path = Path(f.name)
    
    try:
        tree = ast.parse(code)
        rule = QLA001(temp_path, {})
        violations = rule.check(tree)
        
        assert len(violations) == 2, f"Expected 2 violations, got {len(violations)}"
        assert violations[0].code == "QLA001"
        assert violations[1].code == "QLA001"
        assert "QualiaService" in violations[0].message
        assert "BackendSyncService" in violations[1].message
        print("✅ QLA001 correctly prohibits service instantiation outside CompositionRoot")
    finally:
        temp_path.unlink()


def test_qla001_allows_non_service_classes():
    """QLA001 should allow instantiation of non-service classes."""
    code = """
from datetime import datetime
import json

class MyController:
    def process(self):
        now = datetime.now()  # Should be allowed
        data = dict()  # Should be allowed
        result = list()  # Should be allowed
        return result
    """
    
    with tempfile.NamedTemporaryFile(suffix="Controller.py", mode='w', delete=False) as f:
        f.write(code)
        temp_path = Path(f.name)
    
    try:
        tree = ast.parse(code)
        rule = QLA001(temp_path, {})
        violations = rule.check(tree)
        
        assert len(violations) == 0, f"Expected no violations, got {len(violations)}"
        print("✅ QLA001 correctly allows non-service class instantiation")
    finally:
        temp_path.unlink()


if __name__ == "__main__":
    test_qla001_allows_composition_root()
    test_qla001_prohibits_service_instantiation()
    test_qla001_allows_non_service_classes()
    print("🎉 All QLA001 tests passed!")