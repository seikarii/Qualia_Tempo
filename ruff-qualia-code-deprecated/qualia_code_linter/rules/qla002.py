"""
QLA002: Enforce Service Method Decorators

This rule ensures that public methods in service classes use the required
architectural decorators as specified in QUALIA.CODE Section 5.1.
"""

import ast
from pathlib import Path
from typing import List, Dict, Any, Set

from ..utils.reporting import Violation


class QLA002(ast.NodeVisitor):
    """Rule QLA002: Enforce service method decorators."""
    
    def __init__(self, filepath: Path, config: Dict[str, Any]):
        self.filepath = filepath
        self.config = config
        self.violations: List[Violation] = []
        self.service_directories = config.get("service_directories", ["services/"])
        self.required_decorators = config.get("decorator_requirements", {}).get(
            "public_methods", ["log_execution", "handle_errors", "validate_schema"]
        )
        
        # Only check files in service directories
        file_str = str(self.filepath)
        self.is_service_file = any(
            service_dir.rstrip('/') in file_str 
            for service_dir in self.service_directories
        )
        
        # Track current class context
        self.current_class: str = None
        self.in_service_class = False
    
    def check(self, tree: ast.AST) -> List[Violation]:
        """Main entry point for rule checking."""
        if not self.is_service_file:
            return []
        
        self.violations = []
        self.visit(tree)
        return self.violations
    
    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        """Track service class context."""
        old_class = self.current_class
        old_in_service = self.in_service_class
        
        self.current_class = node.name
        
        # Determine if this is a service class
        service_indicators = ['Service', 'Engine', 'Manager', 'Processor', 'Handler']
        self.in_service_class = any(
            indicator in node.name for indicator in service_indicators
        )
        
        self.generic_visit(node)
        
        # Restore previous context
        self.current_class = old_class
        self.in_service_class = old_in_service
    
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Check function definitions for required decorators."""
        if not self.in_service_class:
            self.generic_visit(node)
            return
        
        # Skip private methods (start with _)
        if node.name.startswith('_'):
            self.generic_visit(node)
            return
        
        # Skip special methods (__init__, __str__, etc.)
        if node.name.startswith('__') and node.name.endswith('__'):
            self.generic_visit(node)
            return
        
        # Skip property methods
        if any(isinstance(dec, ast.Name) and dec.id == 'property' 
               for dec in node.decorator_list):
            self.generic_visit(node)
            return
        
        # Check for required decorators
        existing_decorators = self._get_decorator_names(node)
        has_required_decorator = any(
            decorator in existing_decorators 
            for decorator in self.required_decorators
        )
        
        if not has_required_decorator:
            self._report_missing_decorator(node, existing_decorators)
        
        self.generic_visit(node)
    
    def _get_decorator_names(self, node: ast.FunctionDef) -> Set[str]:
        """Extract decorator names from a function definition."""
        decorators = set()
        
        for decorator in node.decorator_list:
            if isinstance(decorator, ast.Name):
                # Simple decorator: @decorator_name
                decorators.add(decorator.id)
            elif isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name):
                # Decorator with arguments: @decorator_name(args)
                decorators.add(decorator.func.id)
            elif isinstance(decorator, ast.Attribute):
                # Attribute decorator: @module.decorator_name
                decorators.add(decorator.attr)
        
        return decorators
    
    def _report_missing_decorator(self, node: ast.FunctionDef, existing_decorators: Set[str]) -> None:
        """Report violation for missing required decorator."""
        decorator_list = ", ".join(self.required_decorators)
        existing_list = ", ".join(sorted(existing_decorators)) if existing_decorators else "none"
        
        message = (
            f"Public method '{node.name}' in service class '{self.current_class}' "
            f"must use at least one architectural decorator. "
            f"Required: {decorator_list}. Found: {existing_list}. "
            f"Add @log_execution() for basic logging or @handle_errors() for error handling."
        )
        
        violation = Violation(
            code="QLA002",
            message=message,
            filepath=self.filepath,
            line=node.lineno,
            column=node.col_offset,
            severity="error"
        )
        
        self.violations.append(violation)