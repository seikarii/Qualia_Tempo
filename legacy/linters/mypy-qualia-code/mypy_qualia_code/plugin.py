"""
MyPy Plugin for QUALIA.CODE Architectural Type Analysis

This plugin enforces architectural rules that require deep semantic analysis:
- MQA001: Interface adherence validation
- MQA002: IoC binding type safety
- MQA003: Prohibition of 'Any' in service signatures
- MQA004: Decorator return type conformity
"""

from typing import Callable, Dict, List, Optional, Set, Tuple, Type as TypingType, Union
from mypy.plugin import Plugin, MethodContext, FunctionContext, ClassDefContext
from mypy.nodes import (
    ARG_POS, ARG_STAR, MDEF, Argument, Decorator, OverloadedFuncDef,
    ClassDef, FuncDef, TypeInfo, SymbolTableNode, GDEF, MypyFile,
    CallExpr, NameExpr, MemberExpr, StrExpr, RefExpr
)
from mypy.types import (
    Type, AnyType, CallableType, Instance, UnionType, NoneType,
    TypeOfAny, get_proper_type
)
from mypy.messages import MessageBuilder
from mypy.checker import TypeChecker


class QualiaCodePlugin(Plugin):
    """Main plugin class for QUALIA.CODE architectural type analysis."""

    def __init__(self, options):
        super().__init__(options)
        self.interface_implementations: Dict[str, str] = {}  # interface -> implementation
        self.analyzed_files: Set[str] = set()

    def get_class_decorator_hook(self, fullname: str) -> Optional[Callable[[ClassDefContext], None]]:
        """Hook for class decorator analysis."""
        return None

    def get_method_context_hook(self, fullname: str) -> Optional[Callable[[MethodContext], Type]]:
        """Hook for method analysis."""
        if fullname.endswith('.bind'):
            return self._analyze_bind_method
        return None

    def get_function_context_hook(self, fullname: str) -> Optional[Callable[[FunctionContext], Type]]:
        """Hook for function analysis."""
        return None

    def analyze_file(self, file: MypyFile, type_map: Dict[str, Type]) -> None:
        """Analyze a file for architectural violations."""
        if file.fullname in self.analyzed_files:
            return
        self.analyzed_files.add(file.fullname)

        # MQA001: Check interface adherence
        self._check_interface_adherence(file)

        # MQA003: Check for Any in service signatures
        self._check_any_in_service_signatures(file)

        # MQA004: Check decorator return type conformity
        self._check_decorator_return_types(file)

    def _check_interface_adherence(self, file: MypyFile) -> None:
        """MQA001: Validate that service classes implement their interfaces completely."""
        for defn in file.defs:
            if isinstance(defn, ClassDef):
                self._analyze_class_for_interface_adherence(defn, file)

    def _analyze_class_for_interface_adherence(self, class_def: ClassDef, file: MypyFile) -> None:
        """Analyze a class for interface implementation compliance."""
        if not class_def.name.endswith('Service'):
            return

        # Find interfaces this class implements
        implemented_interfaces = []
        for base in class_def.base_type_exprs:
            if isinstance(base, NameExpr):
                interface_name = base.name
                if interface_name.startswith('I') and interface_name.endswith('Service'):
                    implemented_interfaces.append(interface_name)

        if not implemented_interfaces:
            return

        # Check each implemented interface
        for interface_name in implemented_interfaces:
            self._check_interface_implementation(class_def, interface_name, file)

    def _check_interface_implementation(self, class_def: ClassDef, interface_name: str, file: MypyFile) -> None:
        """Check if class properly implements the given interface."""
        # This is a simplified check - in a full implementation we'd need to
        # resolve the interface and compare method signatures
        interface_methods = self._get_interface_methods(interface_name, file)
        class_methods = self._get_class_methods(class_def)

        missing_methods = interface_methods - class_methods
        if missing_methods:
            self._report_error(
                file,
                class_def.line,
                f'MQA001: Class {class_def.name} does not implement interface {interface_name}. '
                f'Missing methods: {", ".join(missing_methods)}'
            )

    def _get_interface_methods(self, interface_name: str, file: MypyFile) -> Set[str]:
        """Get method names from an interface (simplified)."""
        # In a real implementation, this would analyze the interface definition
        # For now, return empty set as placeholder
        return set()

    def _get_class_methods(self, class_def: ClassDef) -> Set[str]:
        """Get public method names from a class."""
        methods = set()
        for defn in class_def.defs.body:
            if isinstance(defn, FuncDef) and not defn.name.startswith('_'):
                methods.add(defn.name)
        return methods

    def _analyze_bind_method(self, context: MethodContext) -> Type:
        """MQA002: Analyze IoC bind() calls for type safety."""
        # Check if this is a bind(IMyService).to(MyService) call
        if (len(context.args) >= 1 and context.args[0] and
            hasattr(context.args[0][0], 'callee') and
            isinstance(context.args[0][0].callee, MemberExpr) and
            context.args[0][0].callee.name == 'bind'):

            # Extract interface and implementation types
            bind_call = context.args[0][0]
            if len(bind_call.args) >= 1:
                interface_arg = bind_call.args[0]
                if hasattr(context, 'context') and hasattr(context.context, 'args'):
                    to_call = context.context
                    if len(to_call.args) >= 1:
                        impl_arg = to_call.args[0]
                        self._check_ioc_binding_type_safety(interface_arg, impl_arg, context)

        return context.default_return_type

    def _check_ioc_binding_type_safety(self, interface_arg: Type, impl_arg: Type, context: MethodContext) -> None:
        """Check that implementation is a subtype of interface in IoC binding."""
        # Simplified type checking - in full implementation would use MyPy's type checker
        interface_type = get_proper_type(interface_arg)
        impl_type = get_proper_type(impl_arg)

        if isinstance(interface_type, Instance) and isinstance(impl_type, Instance):
            if not self._is_subtype(impl_type, interface_type):
                self._report_error(
                    context.context,
                    context.context.line,
                    f'MQA002: IoC binding type violation. {impl_type.type.name} is not a subtype of {interface_type.type.name}'
                )

    def _is_subtype(self, subtype: Instance, supertype: Instance) -> bool:
        """Check if one type is a subtype of another (simplified)."""
        # In a real implementation, this would use MyPy's subtype checking
        return subtype.type.fullname == supertype.type.fullname or subtype.type.fullname.endswith(supertype.type.fullname.split('.')[-1])

    def _check_any_in_service_signatures(self, file: MypyFile) -> None:
        """MQA003: Check for Any types in service method signatures."""
        for defn in file.defs:
            if isinstance(defn, ClassDef) and self._is_service_class(defn.name):
                self._analyze_service_class_signatures(defn, file)

    def _is_service_class(self, class_name: str) -> bool:
        """Check if class name indicates it's a service class."""
        return any(class_name.endswith(suffix) for suffix in ['Service', 'Engine', 'Manager'])

    def _analyze_service_class_signatures(self, class_def: ClassDef, file: MypyFile) -> None:
        """Analyze method signatures in a service class for Any types."""
        for defn in class_def.defs.body:
            if isinstance(defn, FuncDef) and not defn.name.startswith('_'):
                self._check_method_for_any_types(defn, class_def.name, file)

    def _check_method_for_any_types(self, method_def: FuncDef, class_name: str, file: MypyFile) -> None:
        """Check a method for Any types in signature."""
        # Check return type
        if isinstance(method_def.type, CallableType):
            ret_type = get_proper_type(method_def.type.ret_type)
            if isinstance(ret_type, AnyType):
                self._report_error(
                    file,
                    method_def.line,
                    f'MQA003: Method {class_name}.{method_def.name} uses Any in return type. '
                    'Use explicit types in service method signatures.'
                )

            # Check parameter types
            for arg_type in method_def.type.arg_types:
                arg_type = get_proper_type(arg_type)
                if isinstance(arg_type, AnyType):
                    self._report_error(
                        file,
                        method_def.line,
                        f'MQA003: Method {class_name}.{method_def.name} uses Any in parameter type. '
                        'Use explicit types in service method signatures.'
                    )

    def _check_decorator_return_types(self, file: MypyFile) -> None:
        """MQA004: Check decorator return type conformity."""
        for defn in file.defs:
            if isinstance(defn, FuncDef):
                self._analyze_decorated_method(defn, file)

    def _analyze_decorated_method(self, method_def: FuncDef, file: MypyFile) -> None:
        """Analyze a decorated method for return type conformity."""
        if not method_def.decorators:
            return

        # Check for @handle_errors decorator
        has_handle_errors = any(
            self._is_handle_errors_decorator(decorator)
            for decorator in method_def.decorators
        )

        if has_handle_errors and isinstance(method_def.type, CallableType):
            ret_type = get_proper_type(method_def.type.ret_type)
            # If decorated with @handle_errors, return type should be Optional
            if not self._is_optional_type(ret_type):
                self._report_error(
                    file,
                    method_def.line,
                    f'MQA004: Method {method_def.name} decorated with @handle_errors must have Optional return type. '
                    f'Found: {ret_type}, expected: Optional[{ret_type}]'
                )

    def _is_handle_errors_decorator(self, decorator) -> bool:
        """Check if decorator is @handle_errors."""
        # Simplified check - would need more sophisticated analysis
        return str(decorator).find('handle_errors') != -1

    def _is_optional_type(self, type_obj: Type) -> bool:
        """Check if type is Optional (Union with None)."""
        proper_type = get_proper_type(type_obj)
        if isinstance(proper_type, UnionType):
            return any(isinstance(get_proper_type(t), NoneType) for t in proper_type.items)
        return False

    def _report_error(self, file: MypyFile, line: int, message: str) -> None:
        """Report an architectural violation."""
        # In a real implementation, this would use MyPy's error reporting system
        print(f"QUALIA.CODE VIOLATION at {file.fullname}:{line}: {message}")


def plugin(version: str) -> TypingType[Plugin]:
    """Entry point for MyPy plugin system."""
    return QualiaCodePlugin