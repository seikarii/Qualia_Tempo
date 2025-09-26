"""
QLA001: Prohibit Direct Service Instantiation

This rule enforces that services are only instantiated within the CompositionRoot,
maintaining the IoC/DI architecture as required by QUALIA.CODE.
"""

import ast
from pathlib import Path
from typing import List, Dict, Any, Set

from ..utils.reporting import Violation


class QLA001(ast.NodeVisitor):
    """Rule QLA001: Prohibit direct service instantiation outside CompositionRoot."""
    
    def __init__(self, filepath: Path, config: Dict[str, Any]):
        self.filepath = filepath
        self.config = config
        self.violations: List[Violation] = []
        self.service_directories = config.get("service_directories", ["services/"])
        self.composition_root_files = config.get("composition_root_files", ["CompositionRoot.py"])
        
        # Track known service classes (will be populated during visit)
        self.service_classes: Set[str] = set()
        
        # Check if current file is a CompositionRoot file
        self.is_composition_root = any(
            comp_root_file in str(self.filepath)
            for comp_root_file in self.composition_root_files
        )
    
    def check(self, tree: ast.AST) -> List[Violation]:
        """Main entry point for rule checking."""
        self.violations = []
        
        # First pass: identify service classes
        self._identify_service_classes(tree)
        
        # Second pass: check for violations
        self.visit(tree)
        
        return self.violations
    
    def _identify_service_classes(self, tree: ast.AST) -> None:
        """Identify service classes by looking at imports and class definitions."""
        class ServiceClassFinder(ast.NodeVisitor):
            def __init__(self, parent_rule):
                self.parent = parent_rule
            
            def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
                """Track imports from service directories."""
                if node.module:
                    for service_dir in self.parent.service_directories:
                        if service_dir.rstrip('/') in node.module:
                            # Add imported names as potential service classes
                            for alias in node.names:
                                name = alias.name
                                # Look for class-like names (CamelCase ending in 'Service')
                                if (name[0].isupper() and 
                                    ('Service' in name or 'Engine' in name or 'Manager' in name)):
                                    self.parent.service_classes.add(name)
            
            def visit_ClassDef(self, node: ast.ClassDef) -> None:
                """Track local class definitions that look like services."""
                class_name = node.name
                # Check if this file is in a service directory
                file_str = str(self.parent.filepath)
                in_service_dir = any(
                    service_dir.rstrip('/') in file_str 
                    for service_dir in self.parent.service_directories
                )
                
                if in_service_dir and ('Service' in class_name or 'Engine' in class_name):
                    self.parent.service_classes.add(class_name)
                
                self.generic_visit(node)
        
        finder = ServiceClassFinder(self)
        finder.visit(tree)
    
    def visit_Call(self, node: ast.Call) -> None:
        """Check function calls for direct service instantiation."""
        if isinstance(node.func, ast.Name):
            # Direct call: ServiceClass()
            class_name = node.func.id
            if self._is_service_instantiation(class_name, node):
                self._report_violation(node, class_name)
        
        elif isinstance(node.func, ast.Attribute):
            # Attribute call: module.ServiceClass()
            if isinstance(node.func.value, ast.Name):
                class_name = node.func.attr
                if self._is_service_instantiation(class_name, node):
                    self._report_violation(node, class_name)
        
        self.generic_visit(node)
    
    def _is_service_instantiation(self, class_name: str, node: ast.Call) -> bool:
        """Check if a call represents service instantiation."""
        # Skip if we're in CompositionRoot
        if self.is_composition_root:
            return False
        
        # Check if it's a known service class
        if class_name in self.service_classes:
            return True
        
        # Check patterns that suggest service instantiation
        service_patterns = ['Service', 'Engine', 'Manager', 'Processor', 'Handler']
        if any(pattern in class_name for pattern in service_patterns):
            # Additional heuristics to avoid false positives
            # Skip built-in or common non-service classes
            builtin_exceptions = ['Exception', 'Error', 'Thread', 'Process', 'Timer']
            if any(exception in class_name for exception in builtin_exceptions):
                return False
            
            return True
        
        return False
    
    def _report_violation(self, node: ast.Call, class_name: str) -> None:
        """Report a violation for direct service instantiation."""
        message = (
            f"Direct instantiation of '{class_name}' is prohibited. "
            f"Services must be resolved through dependency injection via CompositionRoot. "
            f"Consider injecting this service as a dependency instead."
        )
        
        violation = Violation(
            code="QLA001",
            message=message,
            filepath=self.filepath,
            line=node.lineno,
            column=node.col_offset,
            severity="error"
        )
        
        self.violations.append(violation)