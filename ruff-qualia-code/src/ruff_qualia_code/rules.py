import ast
import os
import yaml
from pathlib import Path
from typing import List, Optional, Any, Dict

# Type alias for AST node
AST = ast.AST

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
        checker = QLA002Checker(source_file.path)
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
        else:
            # Recursively visit children for other node types
            for child in ast.iter_child_nodes(node):
                self.visit(child)

    def _enter_class(self, node: ast.ClassDef) -> None:
        self.current_class = node.name
        # Check if this is an interface (starts with I and has service-like suffix)
        is_interface = node.name.startswith('I') and any(
            suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
        )
        
        self.in_service_class = (
            "services" in str(self.filepath) and
            any(suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]) and
            not is_interface
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
                range=TextRange(0, 0),
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
        checker = QLA003Checker(source_file.path)
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
        if node.module and "fastapi" in node.module.lower():
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
                    self._check_dependency_annotation(arg, arg.annotation, TextRange(0, 0))

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


class QLA004:
   """Configuration Externalization Validation"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA004Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA004Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_service_file = "services" in str(filepath)
       self.config_patterns = {
           "timeout", "url", "port", "host", "rate_limit", "threshold",
           "api_key", "secret", "endpoint", "base_url", "retry_count",
           "max_connections", "buffer_size", "batch_size"
       }
       self.suspicious_values = {
           # Suspicious URLs
           "http://", "https://", "ftp://", "ws://", "wss://",
           # Suspicious ports/numbers
           3000, 8080, 5432, 27017, 6379, 443, 80,
           # Suspicious config-like strings
           "localhost", "127.0.0.1", "0.0.0.0"
       }
       self.diagnostic: Optional[Diagnostic] = None
       self.in_init_method = False
       self.current_class = None

   def visit(self, node: AST) -> None:
       if not self.is_service_file:
           return

       if isinstance(node, ast.ClassDef):
           old_class = self.current_class
           self.current_class = node.name
           for child in ast.iter_child_nodes(node):
               self.visit(child)
           self.current_class = old_class
       elif isinstance(node, ast.FunctionDef):
           old_in_init = self.in_init_method
           self.in_init_method = (node.name == "__init__")
           for child in ast.iter_child_nodes(node):
               self.visit(child)
           self.in_init_method = old_in_init
       elif isinstance(node, ast.Assign):
           self._check_assignment(node)
       elif isinstance(node, ast.Dict):
           self._check_dict_values(node)
       else:
           # Recursively visit children
           for child in ast.iter_child_nodes(node):
               self.visit(child)

   def _check_assignment(self, node: ast.Assign) -> None:
       # Only check assignments in service class __init__ methods or class-level
       if not (self.in_init_method or self.current_class):
           return
           
       if len(node.targets) == 1 and isinstance(node.targets[0], ast.Attribute):
           # Check self.attribute assignments in __init__
           attr_name = node.targets[0].attr.lower()
           if any(pattern in attr_name for pattern in self.config_patterns):
               if self._is_suspicious_value(node.value):
                   self._report_hardcoded_config(node, attr_name, node.value)
       elif len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
           # Check class-level variable assignments
           var_name = node.targets[0].id.lower()
           if any(pattern in var_name for pattern in self.config_patterns):
               if self._is_suspicious_value(node.value):
                   self._report_hardcoded_config(node, var_name, node.value)

   def _check_dict_values(self, node: ast.Dict) -> None:
       # Only check dictionaries that look like configuration
       config_like_keys = 0
       for key in node.keys:
           if isinstance(key, ast.Constant) and isinstance(key.value, str):
               key_lower = key.value.lower()
               if any(pattern in key_lower for pattern in self.config_patterns):
                   config_like_keys += 1
       
       # If more than half the keys look config-like, check the values
       if config_like_keys > len(node.keys) // 2:
           for key, value in zip(node.keys, node.values):
               if isinstance(key, ast.Constant) and isinstance(key.value, str):
                   key_lower = key.value.lower()
                   if any(pattern in key_lower for pattern in self.config_patterns):
                       if self._is_suspicious_value(value):
                           self._report_hardcoded_config(node, key.value, value)
                           break

   def _is_suspicious_value(self, value_node) -> bool:
       """Check if a value looks like configuration that should be externalized"""
       if isinstance(value_node, ast.Constant):
           value = value_node.value
           
           # Suspicious strings
           if isinstance(value, str):
               if any(suspicious in value for suspicious in self.suspicious_values if isinstance(suspicious, str)):
                   return True
               # Long strings that might be config
               if len(value) > 20 and any(char in value for char in [".", "/", ":", "="]):
                   return True
           
           # Suspicious numbers (common ports, large timeouts)
           elif isinstance(value, int):
               if value in self.suspicious_values or value > 5000:
                   return True
           
           # Suspicious floats (timeouts, rates)
           elif isinstance(value, float):
               if value > 30.0:  # Likely timeout/rate configuration
                   return True
       
       return False

   def _report_hardcoded_config(self, node, identifier: str, value_node) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           self.diagnostic = Diagnostic(
               code="QLA004",
               message=f"Hardcoded configuration value detected: '{identifier}'. All configuration must be externalized to YAML files and loaded via ConfigurationService.",
               range=getattr(node, 'range', TextRange(0, 0)),
           )


class QLA005:
   """Platform Abstraction Enforcement"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA005Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA005Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_service_file = "services" in str(filepath)
       # QUALIA.CODE: Whitelist platform abstraction services themselves
       # These services ARE the abstraction layer and are allowed to use platform APIs
       self.platform_abstraction_services = {
           "FileSystemService", "SystemEnvironmentService", 
           "HttpService", "TimerService", "DatabaseService"
       }
       # Focus on the most critical platform APIs that should be abstracted
       self.critical_platform_apis = {
           # HTTP/Network APIs - high priority for abstraction
           "requests", "urllib", "httpx", "aiohttp",
           # External service APIs - should always be abstracted
           "boto3", "openai", "redis", "kafka", "elasticsearch"
       }
       # Platform APIs that are suspicious but context-dependent
       self.suspicious_apis = {
           "time", "os", "shutil", "pickle", "sqlite3", "psycopg2", "pymongo"
       }
       # Functions that should never be used directly in services
       self.forbidden_functions = ["eval", "exec", "input"]
       self.diagnostic: Optional[Diagnostic] = None
       self.current_class = None
       self.in_service_class = False

   def visit(self, node: AST) -> None:
       if not self.is_service_file:
           return

       if isinstance(node, ast.ClassDef):
           old_class = self.current_class
           old_in_service = self.in_service_class
           
           self.current_class = node.name
           # Skip platform abstraction services - they are ALLOWED to use platform APIs
           if node.name in self.platform_abstraction_services:
               self.in_service_class = False
           else:
               self.in_service_class = any(
                   suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
               )
           
           for child in ast.iter_child_nodes(node):
               self.visit(child)
               
           self.current_class = old_class
           self.in_service_class = old_in_service
       elif isinstance(node, ast.Import):
           self._check_import(node)
       elif isinstance(node, ast.ImportFrom):
           self._check_import_from(node)
       elif isinstance(node, ast.Call):
           self._check_function_call(node)
       else:
           # Recursively visit children
           for child in ast.iter_child_nodes(node):
               self.visit(child)

   def _check_import(self, node: ast.Import) -> None:
       # Only flag imports in service classes
       if not self.in_service_class:
           return
           
       for alias in node.names:
           module_name = alias.name.split('.')[0]
           if module_name in self.critical_platform_apis:
               self._report_platform_api_usage(node, module_name, "critical")
           elif module_name in self.suspicious_apis:
               # Only flag suspicious APIs if used in service methods
               self._report_platform_api_usage(node, module_name, "suspicious")

   def _check_import_from(self, node: ast.ImportFrom) -> None:
       # Only flag imports in service classes
       if not self.in_service_class:
           return
           
       if node.module:
           module_name = node.module.split('.')[0]
           if module_name in self.critical_platform_apis:
               self._report_platform_api_usage(node, module_name, "critical")
           elif module_name in self.suspicious_apis:
               self._report_platform_api_usage(node, module_name, "suspicious")

   def _check_function_call(self, node: ast.Call) -> None:
       # Check for forbidden function calls
       if isinstance(node.func, ast.Name):
           func_name = node.func.id
           if func_name in self.forbidden_functions:
               self._report_platform_api_usage(node, func_name, "forbidden")
           elif func_name == "open" and self.in_service_class:
               # 'open' is only problematic in service classes
               self._report_platform_api_usage(node, func_name, "suspicious")
       elif isinstance(node.func, ast.Attribute):
           if isinstance(node.func.value, ast.Name):
               module_name = node.func.value.id
               if module_name in self.critical_platform_apis and self.in_service_class:
                   self._report_platform_api_usage(node, f"{module_name}.{node.func.attr}", "critical")

   def _report_platform_api_usage(self, node, api_name: str, severity: str) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           if severity == "critical":
               message = f"Critical platform API usage: '{api_name}' should be abstracted through dedicated services (HttpService, DatabaseService, etc.)."
           elif severity == "forbidden":
               message = f"Forbidden function usage: '{api_name}' should never be used directly in service classes."
           else:
               message = f"Suspicious platform API usage: '{api_name}'. Consider abstracting through dedicated services if used extensively."
           
           self.diagnostic = Diagnostic(
               code="QLA005",
               message=message,
               range=getattr(node, 'range', TextRange(0, 0)),
           )


class QLA006:
   """EventBus Contract Validation"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA006Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA006Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_service_file = "services" in str(filepath)
       self.required_event_fields = {"type", "timestamp", "source"}
       # Common event bus method names
       self.event_bus_methods = {"emit", "publish", "send", "dispatch"}
       # Common event bus variable names
       self.event_bus_names = {"eventBus", "event_bus", "bus", "publisher"}
       self.diagnostic: Optional[Diagnostic] = None
       # Cache for class definitions found in the file (for inheritance resolution)
       self.class_definitions: Dict[str, ast.ClassDef] = {}
       # Track if we need to build the class cache
       self.cache_built = False

   def visit(self, node: AST) -> None:
       if not self.is_service_file:
           return

       # First pass: build cache of all class definitions in the file
       if not self.cache_built and isinstance(node, ast.Module):
           self._build_class_cache(node)
           self.cache_built = True

       if isinstance(node, ast.ClassDef):
           self._check_event_class(node)
       elif isinstance(node, ast.Call):
           self._check_event_emission_call(node)
       elif isinstance(node, ast.Dict):
           self._check_standalone_event_dict(node)

       # Recursively visit children
       for child in ast.iter_child_nodes(node):
           self.visit(child)
   
   def _build_class_cache(self, module_node: ast.Module) -> None:
       """Build a cache of all class definitions in the module for inheritance resolution."""
       for node in ast.walk(module_node):
           if isinstance(node, ast.ClassDef):
               self.class_definitions[node.name] = node

   def _check_event_class(self, node: ast.ClassDef) -> None:
       # Check if this is an event class (more comprehensive detection)
       is_event_class = (
           # Inherits from BaseEvent
           any(getattr(base, 'id', '') == "BaseEvent" for base in node.bases if isinstance(base, ast.Name)) or
           # Has event-like structure (type field + others) AND has "Event" in name but is not base classes
           (self._has_event_structure(node) and "Event" in node.name and node.name not in ["EventHandler", "EventBus", "CallableEventHandler", "QualiaEventHandler"])
       )
       if is_event_class:
           self._validate_event_class(node)

   def _has_event_structure(self, node: ast.ClassDef) -> bool:
       """Check if class has event-like structure"""
       fields = set()
       for item in node.body:
           if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
               fields.add(item.target.id.lower())
       
       # Has type field and at least 2 other fields
       return "type" in fields and len(fields) >= 3
   
   def _is_dataclass(self, node: ast.ClassDef) -> bool:
       """Check if a class has the @dataclass decorator."""
       for decorator in node.decorator_list:
           # Handle simple decorator: @dataclass
           if isinstance(decorator, ast.Name) and decorator.id == "dataclass":
               return True
           # Handle decorator with arguments: @dataclass(...)
           if isinstance(decorator, ast.Call):
               if isinstance(decorator.func, ast.Name) and decorator.func.id == "dataclass":
                   return True
       return False
   
   def _get_parent_class_names(self, node: ast.ClassDef) -> list:
       """Extract parent class names from a class definition."""
       parent_names = []
       for base in node.bases:
           if isinstance(base, ast.Name):
               parent_names.append(base.id)
       return parent_names
   
   def _collect_inherited_fields(self, node: ast.ClassDef) -> set:
       """Recursively collect all fields from parent classes (for @dataclass inheritance)."""
       inherited_fields = set()
       
       # Get parent class names
       parent_names = self._get_parent_class_names(node)
       
       for parent_name in parent_names:
           # Check if parent class is defined in the same file
           if parent_name in self.class_definitions:
               parent_node = self.class_definitions[parent_name]
               
               # Only collect fields if parent is also a @dataclass
               if self._is_dataclass(parent_node):
                   # Collect fields from parent
                   parent_fields = self._get_class_fields(parent_node)
                   inherited_fields.update(parent_fields)
                   
                   # Recursively collect from parent's parents
                   inherited_fields.update(self._collect_inherited_fields(parent_node))
       
       return inherited_fields
   
   def _get_class_fields(self, node: ast.ClassDef) -> set:
       """Extract field names from a class definition."""
       fields = set()
       for item in node.body:
           if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
               fields.add(item.target.id)
           elif isinstance(item, ast.Assign):
               for target in item.targets:
                   if isinstance(target, ast.Name):
                       fields.add(target.id)
       return fields

   def _check_event_emission_call(self, node: ast.Call) -> None:
       """Check function calls that might be creating events"""
       # Only validate Event constructor calls
       if isinstance(node.func, ast.Name) and node.func.id == "Event":
           self._validate_constructor_call(node)

   def _check_standalone_event_dict(self, node: ast.Dict) -> None:
       """Check for standalone event dictionaries (not in method calls)"""
       # Only validate if this dict is being passed to an event bus method
       # Don't validate arbitrary dicts that happen to have "type"
       pass  # Disabled - too many false positives

   def _validate_event_class(self, node: ast.ClassDef) -> None:
       """Check if event class has required fields, considering @dataclass inheritance."""
       # Get fields directly defined in this class
       class_fields = self._get_class_fields(node)
       
       # If this is a @dataclass, also collect inherited fields from parent @dataclass classes
       if self._is_dataclass(node):
           inherited_fields = self._collect_inherited_fields(node)
           class_fields.update(inherited_fields)
       
       # Check for missing required fields
       missing_fields = self.required_event_fields - class_fields
       if missing_fields:
           self._report_event_contract_violation(node, missing_fields)

   def _validate_event_emission(self, node: ast.Call) -> None:
       if node.args:
           event_arg = node.args[0]
           self._validate_event_structure(event_arg)
       elif node.keywords:
           # Check if this is a constructor call with keyword arguments (Event(type=..., timestamp=..., source=...))
           self._validate_constructor_call(node)

   def _validate_constructor_call(self, node: ast.Call) -> None:
       """Validate Event constructor calls with keyword arguments"""
       if isinstance(node.func, ast.Name) and node.func.id == "Event":
           # Extract keyword argument names
           kwarg_names = set()
           for kwarg in node.keywords:
               if isinstance(kwarg, ast.keyword) and isinstance(kwarg.arg, str):
                   kwarg_names.add(kwarg.arg)
           
           missing_fields = self.required_event_fields - kwarg_names
           if not missing_fields:
               # All required fields are present in constructor call
               return
           
           self._report_event_contract_violation(node, missing_fields)

   def _validate_event_structure(self, event_node) -> None:
       if isinstance(event_node, ast.Dict):
           keys = set()
           for key in event_node.keys:
               if isinstance(key, ast.Constant) and isinstance(key.value, str):
                   keys.add(key.value)

           missing_fields = self.required_event_fields - keys
           if missing_fields:
               self._report_event_contract_violation(event_node, missing_fields)

   def _report_event_contract_violation(self, node, missing_fields) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           fields_str = ", ".join(f'"{field}"' for field in missing_fields)
           self.diagnostic = Diagnostic(
               code="QLA006",
               message=f"Event contract violation: missing required fields {fields_str}. All events must include type, timestamp, and source fields.",
               range=getattr(node, 'range', TextRange(0, 0)),
           )


class QLA007:
   """Shared Contract Compliance Validation"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA007Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA007Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_generated_file = self._is_generated_file()
       self.diagnostic: Optional[Diagnostic] = None

   def visit(self, node: AST) -> None:
       if not self.is_generated_file:
           return

       # For generated files, check the first few lines of the file directly
       # since # comments don't appear in the AST
       try:
           with open(self.filepath, 'r', encoding='utf-8') as f:
               lines = f.readlines()[:10]  # Check first 10 lines
               for line in lines:
                   line = line.strip()
                   if line.startswith('#') and ('@generated' in line.lower() or 'do not edit' in line.lower()):
                       return  # Valid generated file comment found
       except Exception:
           pass  # If we can't read the file, continue with AST checking

       # Fallback: check AST for docstrings
       if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant):
           self._check_generated_comment(node)

       # Recursively visit children
       for child in ast.iter_child_nodes(node):
           self.visit(child)

   def _is_generated_file(self) -> bool:
       """Check if this is a generated file that should not be manually edited"""
       file_str = str(self.filepath)
       return any(pattern in file_str for pattern in [
           "models.py",  # Generated Pydantic models
           "contracts.ts",  # Generated TypeScript interfaces
           "generated"
       ])

   def _check_generated_comment(self, node: ast.Expr) -> None:
       if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
           comment = node.value.value.strip()
           if "@generated" in comment.lower() or "do not edit" in comment.lower():
               return  # Valid generated file comment found

       # Check if this is the first line (module docstring)
       if not self.diagnostic:  # Only report once
           self.diagnostic = Diagnostic(
               code="QLA007",
               message="Generated file missing required header comment. All generated files must include '@generated DO NOT EDIT' comment.",
               range=getattr(node, 'range', TextRange(0, 0)),
           )


# QLA008 REMOVED: Architecturally inappropriate rule.
# React useState patterns should be validated by ESLint plugin, not Python AST parser.
# This rule violated separation of concerns between frontend/backend tooling.

class QLA009:
   """Testing Pattern Enforcement"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA009Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA009Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_test_file = "test" in str(filepath).lower()
       self.service_classes = set()
       self.has_test_factory = False
       self.in_test_method = False
       self.diagnostic: Optional[Diagnostic] = None

   def visit(self, node: AST) -> None:
       if not self.is_test_file:
           return

       if isinstance(node, ast.ImportFrom):
           self._check_imports(node)
       elif isinstance(node, ast.FunctionDef):
           self._check_test_method(node)
       elif isinstance(node, ast.Call):
           self._check_service_instantiation(node)
       else:
           # Recursively visit children
           for child in ast.iter_child_nodes(node):
               self.visit(child)

   def _check_imports(self, node: ast.ImportFrom) -> None:
       if node.module:
           # Track service imports
           if "services" in node.module:
               for alias in node.names:
                   class_name = alias.name
                   if (class_name and class_name[0].isupper() and
                       any(suffix in class_name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"])):
                       self.service_classes.add(class_name)
           
           # Check for test factory imports
           if any(alias.name in ["TestCompositionRootFactory", "createTestContainer", "test_container_factory"]
                  for alias in node.names):
               self.has_test_factory = True

   def _check_test_method(self, node: ast.FunctionDef) -> None:
       # Check if this is a test method
       old_in_test = self.in_test_method
       self.in_test_method = (
           node.name.startswith("test_") or
           any(decorator.id == "pytest.mark" if isinstance(decorator, ast.Attribute) else False
               for decorator in node.decorator_list if hasattr(decorator, 'id'))
       )
       
       # Visit method body
       for child in ast.iter_child_nodes(node):
           self.visit(child)
           
       self.in_test_method = old_in_test

   def _check_service_instantiation(self, node: ast.Call) -> None:
       if not self.in_test_method:
           return
           
       if isinstance(node.func, ast.Name):
           class_name = node.func.id
           # Check for direct service instantiation in test methods
           if class_name in self.service_classes:
               if not self.has_test_factory:
                   self._report_missing_factory_import(node, class_name)
               else:
                   self._report_direct_instantiation(node, class_name)

   def _report_direct_instantiation(self, node, class_name: str) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           self.diagnostic = Diagnostic(
               code="QLA009",
               message=f"Direct service instantiation in test: '{class_name}'. Use test factory methods for proper IoC container mocking.",
               range=getattr(node, 'range', TextRange(0, 0)),
           )

   def _report_missing_factory_import(self, node, class_name: str = None) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           if class_name:
               message = f"Test instantiates '{class_name}' without test factory. Import and use TestCompositionRootFactory or createTestContainer for proper dependency injection."
           else:
               message = "Test file imports services without test factory. Import TestCompositionRootFactory or createTestContainer for proper dependency injection."
           
           self.diagnostic = Diagnostic(
               code="QLA009",
               message=message,
               range=getattr(node, 'range', TextRange(0, 0)),
           )


class QLA010:
   """Decorator Parameter Validation"""

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       checker = QLA010Checker(source_file.path)
       checker.visit(node)
       return checker.diagnostic


class QLA010Checker:
   def __init__(self, filepath: Path):
       self.filepath = filepath
       self.is_service_file = "services" in str(filepath)
       self.diagnostic: Optional[Diagnostic] = None

   def visit(self, node: AST) -> None:
       if not self.is_service_file:
           return

       if isinstance(node, ast.FunctionDef):
           self._check_decorator_parameters(node)

       # Recursively visit children
       for child in ast.iter_child_nodes(node):
           self.visit(child)

   def _check_decorator_parameters(self, node: ast.FunctionDef) -> None:
       for decorator in node.decorator_list:
           self._validate_decorator(decorator, node)

   def _validate_decorator(self, decorator, node: ast.FunctionDef) -> None:
       if isinstance(decorator, ast.Call) and isinstance(decorator.func, ast.Name):
           decorator_name = decorator.func.id

           if decorator_name == "validate":
               self._validate_validate_decorator(decorator, node)
           elif decorator_name == "throttle":
               self._validate_throttle_decorator(decorator, node)
           elif decorator_name == "log_execution":
               self._validate_log_execution_decorator(decorator, node)

   def _validate_validate_decorator(self, decorator, node: ast.FunctionDef) -> None:
       if not decorator.args:
           self._report_decorator_error(node, "validate", "missing schema name parameter")

   def _validate_throttle_decorator(self, decorator, node: ast.FunctionDef) -> None:
       if not decorator.args:
           self._report_decorator_error(node, "throttle", "missing milliseconds parameter")

   def _validate_log_execution_decorator(self, decorator, node: ast.FunctionDef) -> None:
       if decorator.args:
           first_arg = decorator.args[0]
           if isinstance(first_arg, ast.Constant) and isinstance(first_arg.value, str):
               level = first_arg.value.upper()
               if level not in ["DEBUG", "INFO", "WARNING", "ERROR"]:
                   self._report_decorator_error(node, "log_execution", f"invalid log level '{level}'")

   def _report_decorator_error(self, node, decorator_name: str, error: str) -> None:
       if self.diagnostic is None:  # Only report the first occurrence
           self.diagnostic = Diagnostic(
               code="QLA010",
               message=f"Decorator '{decorator_name}' error: {error}. Check decorator parameters and usage.",
               range=getattr(node, 'range', TextRange(0, 0)),
           )


class QLA011:
   """Cross-File Dependency Analysis"""

   def __init__(self):
       self.service_dependencies: Dict[str, set] = {}
       self.file_services: Dict[str, set] = {}

   def check(self, node: AST, source_file: SourceFile) -> Optional[Diagnostic]:
       """Check individual file and collect dependency information"""
       checker = QLA011Checker(source_file.path, self)
       checker.visit(node)
       # Return None for individual files - circular analysis happens later
       return None

   def analyze_all_dependencies(self) -> List[Diagnostic]:
       """Analyze complete dependency graph for circular dependencies"""
       diagnostics = []
       
       # Simple cycle detection using DFS
       visited = set()
       rec_stack = set()
       path_stack = []

       def find_cycle(service: str) -> Optional[str]:
           if service in rec_stack:
               # Found cycle - construct cycle path
               cycle_start = path_stack.index(service)
               cycle_path = path_stack[cycle_start:] + [service]
               return " -> ".join(cycle_path)
           
           if service in visited:
               return None
               
           visited.add(service)
           rec_stack.add(service)
           path_stack.append(service)

           if service in self.service_dependencies:
               for dependency in self.service_dependencies[service]:
                   cycle = find_cycle(dependency)
                   if cycle:
                       return cycle

           rec_stack.remove(service)
           path_stack.pop()
           return None

       for service in self.service_dependencies:
           if service not in visited:
               cycle = find_cycle(service)
               if cycle:
                   diagnostics.append(Diagnostic(
                       code="QLA011",
                       message=f"Circular dependency detected: {cycle}. Refactor to eliminate circular dependencies.",
                       range=TextRange(0, 0),
                   ))

       return diagnostics


class QLA011Checker:
   """Collects dependency information from individual files"""
   
   def __init__(self, filepath: Path, analyzer: QLA011):
       self.filepath = filepath
       self.analyzer = analyzer
       self.is_service_file = "services" in str(filepath)
       self.current_class: Optional[str] = None
       self.file_imports: List[str] = []  # Store imports to process later

   def visit(self, node: AST) -> None:
       # First pass: collect all imports and class definitions
       if isinstance(node, ast.ImportFrom):
           self._collect_import(node)
       elif isinstance(node, ast.ClassDef):
           self._analyze_class(node)
       else:
           # Recursively visit children
           for child in ast.iter_child_nodes(node):
               self.visit(child)

   def _collect_import(self, node: ast.ImportFrom) -> None:
       """Collect service imports for later processing"""
       if node.module and "services" in node.module:
           for alias in node.names:
               service_name = alias.name
               if service_name and service_name[0].isupper():
                   self.file_imports.append(service_name)

   def _analyze_class(self, node: ast.ClassDef) -> None:
       """Track service class definitions and process its dependencies"""
       if self.is_service_file and any(
           suffix in node.name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"]
       ):
           old_class = self.current_class
           self.current_class = node.name
           self._record_service(node.name)
           
           # Now process all collected imports as dependencies of this class
           for import_name in self.file_imports:
               if import_name != node.name:  # Don't record self-dependency
                   self._record_dependency(import_name)
           
           # Process class body for additional dependencies
           for item in node.body:
               if isinstance(item, ast.FunctionDef):
                   # Check method parameters for additional dependencies
                   for arg in item.args.args:
                       if arg.annotation and isinstance(arg.annotation, ast.Name):
                           dep_name = arg.annotation.id
                           if (dep_name[0].isupper() and
                               any(suffix in dep_name for suffix in ["Service", "Engine", "Manager", "Processor", "Handler"])):
                               self._record_dependency(dep_name)
               
           self.current_class = old_class

   def _record_dependency(self, service_name: str) -> None:
       """Record that current class depends on service_name"""
       if self.current_class and service_name != self.current_class:
           if self.current_class not in self.analyzer.service_dependencies:
               self.analyzer.service_dependencies[self.current_class] = set()
           self.analyzer.service_dependencies[self.current_class].add(service_name)

   def _record_service(self, service_name: str) -> None:
       """Record service defined in current file"""
       file_path = str(self.filepath)
       if file_path not in self.analyzer.file_services:
           self.analyzer.file_services[file_path] = set()
       self.analyzer.file_services[file_path].add(service_name)