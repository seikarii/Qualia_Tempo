"""
QLA003: Forbid Concrete Route Dependencies

This rule ensures FastAPI routes use abstract dependencies (interfaces) rather than
concrete implementations, promoting loose coupling as required by QUALIA.CODE.
"""

import ast
from pathlib import Path
from typing import List, Dict, Any, Set

from ..utils.reporting import Violation


class QLA003(ast.NodeVisitor):
    """Rule QLA003: Forbid concrete route dependencies."""
    
    def __init__(self, filepath: Path, config: Dict[str, Any]):
        self.filepath = filepath
        self.config = config
        self.violations: List[Violation] = []
        
        # Look for API route files
        file_str = str(self.filepath)
        self.is_api_file = ('api' in file_str or 'route' in file_str or 'endpoint' in file_str)
        
        # Track FastAPI-related imports
        self.has_fastapi = False
        self.depends_imported = False
        
        # Track concrete service classes
        self.concrete_classes: Set[str] = set()
        self.interface_classes: Set[str] = set()
    
    def check(self, tree: ast.AST) -> List[Violation]:
        """Main entry point for rule checking."""
        if not self.is_api_file:
            return []
        
        self.violations = []
        
        # First pass: identify imports and class types
        self._identify_imports_and_classes(tree)
        
        # Only proceed if this appears to be a FastAPI file
        if not (self.has_fastapi or self.depends_imported):
            return []
        
        # Second pass: check for violations
        self.visit(tree)
        
        return self.violations
    
    def _identify_imports_and_classes(self, tree: ast.AST) -> None:
        """Identify FastAPI imports and class types."""
        class ImportClassFinder(ast.NodeVisitor):
            def __init__(self, parent_rule):
                self.parent = parent_rule
            
            def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
                """Track relevant imports."""
                if node.module:
                    # Check for FastAPI imports
                    if 'fastapi' in node.module.lower():
                        self.parent.has_fastapi = True
                        
                        # Check for Depends import
                        for alias in node.names:
                            if alias.name == 'Depends':
                                self.parent.depends_imported = True
                    
                    # Check for service imports
                    if 'services' in node.module:
                        for alias in node.names:
                            class_name = alias.name
                            if class_name.startswith('I') and class_name[1].isupper():
                                # Likely an interface (I + CapitalLetter)
                                self.parent.interface_classes.add(class_name)
                            elif any(indicator in class_name 
                                   for indicator in ['Service', 'Engine', 'Manager']):
                                # Likely a concrete service class
                                self.parent.concrete_classes.add(class_name)
        
        finder = ImportClassFinder(self)
        finder.visit(tree)
    
    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """Check function definitions for route handler patterns."""
        # Look for route decorator patterns
        is_route_handler = any(
            self._is_route_decorator(decorator) 
            for decorator in node.decorator_list
        )
        
        if is_route_handler:
            self._check_function_dependencies(node)
        
        self.generic_visit(node)
    
    def _is_route_decorator(self, decorator: ast.AST) -> bool:
        """Check if a decorator indicates a route handler."""
        if isinstance(decorator, ast.Name):
            return decorator.id in ['get', 'post', 'put', 'delete', 'patch']
        
        elif isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name):
            return decorator.func.id in ['get', 'post', 'put', 'delete', 'patch']
        
        elif isinstance(decorator, ast.Attribute):
            # app.get, router.post, etc.
            return decorator.attr in ['get', 'post', 'put', 'delete', 'patch']
        
        elif isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Attribute):
            # app.get(), router.post(), etc.
            return decorator.func.attr in ['get', 'post', 'put', 'delete', 'patch']
        
        return False
    
    def _check_function_dependencies(self, node: ast.FunctionDef) -> None:
        """Check function parameters for concrete dependencies."""
        for arg in node.args.args:
            if arg.annotation:
                self._check_dependency_annotation(arg, arg.annotation)
    
    def _check_dependency_annotation(self, arg: ast.arg, annotation: ast.AST) -> None:
        """Check if a parameter annotation uses concrete dependencies."""
        # Look for Depends() calls with concrete classes
        if isinstance(annotation, ast.Call) and isinstance(annotation.func, ast.Name):
            if annotation.func.id == 'Depends':
                if annotation.args:
                    dependency_arg = annotation.args[0]
                    self._check_depends_argument(arg, dependency_arg)
        
        # Look for direct type annotations of concrete classes
        elif isinstance(annotation, ast.Name):
            class_name = annotation.id
            if class_name in self.concrete_classes:
                self._report_concrete_dependency(arg, class_name, is_direct=True)
    
    def _check_depends_argument(self, param: ast.arg, dependency_arg: ast.AST) -> None:
        """Check the argument to Depends() for concrete classes."""
        if isinstance(dependency_arg, ast.Name):
            class_name = dependency_arg.id
            if class_name in self.concrete_classes:
                self._report_concrete_dependency(param, class_name, is_direct=False)
        
        elif isinstance(dependency_arg, ast.Attribute):
            # Handle cases like SomeClass.create or module.SomeClass
            attr_name = dependency_arg.attr
            if attr_name in self.concrete_classes:
                self._report_concrete_dependency(param, attr_name, is_direct=False)
    
    def _report_concrete_dependency(self, param: ast.arg, class_name: str, is_direct: bool) -> None:
        """Report violation for using concrete dependency."""
        # Suggest interface alternative
        interface_suggestion = f"I{class_name}" if not class_name.startswith('I') else class_name
        
        if is_direct:
            message = (
                f"Route parameter '{param.arg}' uses concrete type '{class_name}'. "
                f"Use abstract interface '{interface_suggestion}' instead to maintain loose coupling. "
                f"Change type annotation to '{interface_suggestion}'."
            )
        else:
            message = (
                f"Route parameter '{param.arg}' uses Depends() with concrete class '{class_name}'. "
                f"Use abstract interface '{interface_suggestion}' instead to maintain loose coupling. "
                f"Change to 'Depends({interface_suggestion})'."
            )
        
        violation = Violation(
            code="QLA003",
            message=message,
            filepath=self.filepath,
            line=param.lineno if hasattr(param, 'lineno') else 1,
            column=param.col_offset if hasattr(param, 'col_offset') else 0,
            severity="warning"  # This might be warning since it's about architecture, not bugs
        )
        
        self.violations.append(violation)