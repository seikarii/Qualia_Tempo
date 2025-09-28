import ast
from pathlib import Path
from typing import List, Optional, Any

# Mock classes for Ruff API compatibility
class Diagnostic:
    def __init__(self, code: str, message: str, range: Any):
        self.code = code
        self.message = message
        self.range = range

class TextRange:
    def __init__(self, start: int, end: int):
        self.start = start
        self.end = end

class SourceFile:
    def __init__(self, path: Path, content: str):
        self.path = path
        self.content = content

    @classmethod
    def new(cls, path: Path, content: str):
        return cls(path, content)


class QLA001:
    """Prohibit Direct Service Instantiation"""

    def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
        checker = QLA001Checker(source_file.path)
        checker.visit(node)
        return checker.diagnostic


class QLA001Checker:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.service_classes: set[str] = set()
        self.is_composition_root = "CompositionRoot.py" in str(filepath)
        self.diagnostic: Optional[Diagnostic] = None

    def visit(self, node: AST) -> None:
        if isinstance(node, ast.ImportFrom):
            self._check_import_from(node)
        elif isinstance(node, ast.ClassDef):
            self._check_class_def(node)
        elif isinstance(node, (ast.Expr, ast.Assign)) and isinstance(node.value, ast.Call):
            self._check_call(node.value, TextRange(0, 0))

        # Recursively visit children
        for child in ast.iter_child_nodes(node):
            self.visit(child)

    def _check_import_from(self, node: ast.ImportFrom) -> None:
        if node.module and "services" in node.module:
            for alias in node.names:
                name = alias.name
                if name and name[0].isupper() and any(
                    suffix in name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
                ):
                    self.service_classes.add(name)

    def _check_class_def(self, node: ast.ClassDef) -> None:
        if "services" in str(self.filepath) and any(
            suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
        ):
            self.service_classes.add(node.name)

    def _check_call(self, node: ast.Call, range_: TextRange) -> None:
        if self.is_composition_root:
            return

        if isinstance(node.func, ast.Name):
            class_name = node.func.id
            if class_name in self.service_classes:
                self.diagnostic = Diagnostic(
                    code="QLA001",
                    message=f"Direct instantiation of '{class_name}' is prohibited. Services must be resolved through dependency injection via CompositionRoot.",
                    range=range_,
                )
        elif isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            class_name = node.func.attr
            if class_name in self.service_classes:
                self.diagnostic = Diagnostic(
                    code="QLA001",
                    message=f"Direct instantiation of '{class_name}' is prohibited. Services must be resolved through dependency injection via CompositionRoot.",
                    range=range_,
                )


class QLA002:
    """Enforce Service Method Decorators"""

    def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
        checker = QLA002Checker(source_file.path())
        checker.visit(node)
        return checker.diagnostic


class QLA002Checker:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.is_service_file = "services" in str(filepath)
        self.current_class: Optional[str] = None
        self.in_service_class = False
        self.diagnostic: Optional[Diagnostic] = None

    def visit(self, node: AST) -> None:
        if not self.is_service_file:
            return

        if isinstance(node, ast.ClassDef):
            self._enter_class(node)
            for child in ast.iter_child_nodes(node):
                self.visit(child)
            self._exit_class()
        elif isinstance(node, ast.FunctionDef):
            self._check_function(node)

    def _enter_class(self, node: ast.ClassDef) -> None:
        self.current_class = node.name
        self.in_service_class = any(
            suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
        )

    def _exit_class(self) -> None:
        self.current_class = None
        self.in_service_class = False

    def _check_function(self, node: ast.FunctionDef) -> None:
        if not self.in_service_class or node.name.startswith("_") or node.name == "__init__":
            return

        has_decorator = any(
            self._is_qualia_decorator(decorator)
            for decorator in node.decorator_list
        )

        if not has_decorator:
            self.diagnostic = Diagnostic(
                code="QLA002",
                message=f"Public method '{node.name}' in service class must use at least one architectural decorator (@log_execution, @handle_errors, @validate_schema, @log_method, @catch_error, @throttle, or @validate).",
                range=node.range,
            )

    def _is_qualia_decorator(self, decorator) -> bool:
        if isinstance(decorator, ast.Name):
            return decorator.id in [
                "log_execution", "handle_errors", "validate_schema",
                "log_method", "catch_error", "throttle", "validate"
            ]
        elif isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name):
            return decorator.func.id in [
                "log_execution", "handle_errors", "validate_schema",
                "log_method", "catch_error", "throttle", "validate"
            ]
        return False


class QLA003:
    """Forbid Concrete Route Dependencies"""

    def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
        checker = QLA003Checker(source_file.path())
        checker.visit(node)
        return checker.diagnostic


class QLA003Checker:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.is_api_file = any(keyword in str(filepath) for keyword in ["api", "route", "endpoint"])
        self.has_fastapi = False
        self.depends_imported = False
        self.concrete_classes: set[str] = set()
        self.interface_classes: set[str] = set()
        self.diagnostic: Optional[Diagnostic] = None

    def visit(self, node: AST) -> None:
        if not self.is_api_file:
            return

        if isinstance(node, ast.ImportFrom):
            self._check_import_from(node)
        elif isinstance(node, ast.FunctionDef):
            self._check_function_def(node)

        for child in ast.iter_child_nodes(node):
            self.visit(child)

    def _check_import_from(self, node: ast.ImportFrom) -> None:
        if node.module and node.module.lower().contains("fastapi"):
            self.has_fastapi = True
            for alias in node.names:
                if alias.name == "Depends":
                    self.depends_imported = True

        if node.module and "services" in node.module:
            for alias in node.names:
                class_name = alias.name
                if class_name and class_name[0].isupper():
                    if class_name.startswith("I") and class_name[1].isupper():
                        self.interface_classes.add(class_name)
                    elif any(suffix in class_name for suffix in ["Service", "Engine", "Manager"]):
                        self.concrete_classes.add(class_name)

    def _check_function_def(self, node: ast.FunctionDef) -> None:
        if not self.has_fastapi and not self.depends_imported:
            return

        is_route_handler = any(
            self._is_route_decorator(decorator)
            for decorator in node.decorator_list
        )

        if is_route_handler:
            for arg in node.args.args:
                if arg.annotation:
                    self._check_dependency_annotation(arg, arg.annotation, node.range)

    def _is_route_decorator(self, decorator) -> bool:
        if isinstance(decorator, ast.Name):
            return decorator.id in ["get", "post", "put", "delete", "patch"]
        elif isinstance(decorator, ast.Attribute):
            return decorator.attr in ["get", "post", "put", "delete", "patch"]
        elif isinstance(decorator, ast.Call):
            if isinstance(decorator.func, ast.Name):
                return decorator.func.id in ["get", "post", "put", "delete", "patch"]
            elif isinstance(decorator.func, ast.Attribute):
                return decorator.func.attr in ["get", "post", "put", "delete", "patch"]
        return False

    def _check_dependency_annotation(self, arg: ast.arg, annotation, range_: TextRange) -> None:
        if isinstance(annotation, ast.Call) and isinstance(annotation.func, ast.Name) and annotation.func.id == "Depends":
            if annotation.args:
                dependency = annotation.args[0]
                self._check_depends_argument(arg, dependency, range_)
        elif isinstance(annotation, ast.Name):
            class_name = annotation.id
            if class_name in self.concrete_classes:
                self.diagnostic = Diagnostic(
                    code="QLA003",
                    message=f"Route parameter '{arg.arg}' uses concrete type '{class_name}'. Use abstract interface instead to maintain loose coupling.",
                    range=range_,
                )

    def _check_depends_argument(self, arg: ast.arg, dependency, range_: TextRange) -> None:
        if isinstance(dependency, ast.Name):
            dep_class = dependency.id
            if dep_class in self.concrete_classes:
                self.diagnostic = Diagnostic(
                    code="QLA003",
                    message=f"Route parameter '{arg.arg}' uses Depends() with concrete class '{dep_class}'. Use abstract interface instead to maintain loose coupling.",
                    range=range_,
                )
        elif isinstance(dependency, ast.Attribute):
            dep_class = dependency.attr
            if dep_class in self.concrete_classes:
                self.diagnostic = Diagnostic(
                    code="QLA003",
                    message=f"Route parameter '{arg.arg}' uses Depends() with concrete class '{dep_class}'. Use abstract interface instead to maintain loose coupling.",
                    range=range_,
                )