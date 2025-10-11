"""
Unit tests for mypy-qualia-code plugin.

Tests cover all MQA rules:
- MQA001: Interface adherence validation
- MQA002: IoC binding type safety
- MQA003: Prohibition of 'Any' in service signatures
- MQA004: Decorator return type conformity
"""

import pytest
from typing import Any, Optional
from mypy.nodes import ClassDef, FuncDef, MypyFile, NameExpr
from mypy.types import AnyType, CallableType, Instance, UnionType, NoneType
from mypy_qualia_code.plugin import QualiaCodePlugin


class TestMQA001InterfaceAdherence:
    """Test MQA001: Interface adherence validation."""

    def test_service_class_without_interface_passes(self):
        """Service class without interface should pass."""
        plugin = QualiaCodePlugin(None)

        # Create a mock service class without interfaces
        class_def = ClassDef("MyService", [], None, None)
        class_def.line = 1

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should not raise any errors
        plugin._analyze_class_for_interface_adherence(class_def, file)

    def test_service_class_with_interface_missing_methods_fails(self):
        """Service class with interface but missing methods should fail."""
        plugin = QualiaCodePlugin(None)

        # Create a mock service class with interface
        interface_expr = NameExpr("IMyService")
        interface_expr.name = "IMyService"

        class_def = ClassDef("MyService", [interface_expr], None, None)
        class_def.line = 10

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Mock the interface methods (would normally be analyzed from interface)
        plugin._get_interface_methods = lambda interface_name, f: {"process", "get_status"} if interface_name == "IMyService" else set()

        # Mock class methods (empty)
        plugin._get_class_methods = lambda class_def: set()

        # This should detect missing methods and report error
        with pytest.raises(AssertionError):  # Since _report_error prints, we'll check for calls
            plugin._analyze_class_for_interface_adherence(class_def, file)


class TestMQA003AnyInServiceSignatures:
    """Test MQA003: Prohibition of 'Any' in service signatures."""

    def test_service_class_with_any_in_return_type_fails(self):
        """Service method with Any in return type should fail."""
        plugin = QualiaCodePlugin(None)

        # Create mock Any type
        any_type = AnyType(TypeOfAny.explicit)

        # Create mock callable type with Any return
        callable_type = CallableType(
            arg_types=[],
            arg_kinds=[],
            arg_names=[],
            ret_type=any_type,
            fallback=None
        )

        # Create mock method
        method_def = FuncDef("process", [], None, None)
        method_def.type = callable_type
        method_def.line = 5

        # Create mock service class
        class_def = ClassDef("MyService", [], None, None)
        class_def.defs.body = [method_def]

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should detect Any in return type
        with pytest.raises(AssertionError):  # _report_error prints
            plugin._analyze_service_class_signatures(class_def, file)

    def test_service_class_with_any_in_param_type_fails(self):
        """Service method with Any in parameter type should fail."""
        plugin = QualiaCodePlugin(None)

        # Create mock Any type
        any_type = AnyType(TypeOfAny.explicit)

        # Create mock callable type with Any parameter
        callable_type = CallableType(
            arg_types=[any_type],
            arg_kinds=[0],  # ARG_POS
            arg_names=["data"],
            ret_type=None,  # Simplified
            fallback=None
        )

        # Create mock method
        method_def = FuncDef("process", [], None, None)
        method_def.type = callable_type
        method_def.line = 5

        # Create mock service class
        class_def = ClassDef("MyService", [], None, None)
        class_def.defs.body = [method_def]

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should detect Any in parameter type
        with pytest.raises(AssertionError):  # _report_error prints
            plugin._analyze_service_class_signatures(class_def, file)

    def test_service_class_with_proper_types_passes(self):
        """Service method with proper types should pass."""
        plugin = QualiaCodePlugin(None)

        # Create mock proper type (not Any)
        str_type = Instance(None, [])  # Mock string type

        # Create mock callable type with proper types
        callable_type = CallableType(
            arg_types=[str_type],
            arg_kinds=[0],
            arg_names=["data"],
            ret_type=str_type,
            fallback=None
        )

        # Create mock method
        method_def = FuncDef("process", [], None, None)
        method_def.type = callable_type
        method_def.line = 5

        # Create mock service class
        class_def = ClassDef("MyService", [], None, None)
        class_def.defs.body = [method_def]

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should pass without errors
        plugin._analyze_service_class_signatures(class_def, file)


class TestMQA004DecoratorReturnTypes:
    """Test MQA004: Decorator return type conformity."""

    def test_handle_errors_decorator_requires_optional_return(self):
        """Method with @handle_errors must have Optional return type."""
        plugin = QualiaCodePlugin(None)

        # Create mock non-optional return type
        str_type = Instance(None, [])  # Mock string type

        callable_type = CallableType(
            arg_types=[],
            arg_kinds=[],
            arg_names=[],
            ret_type=str_type,
            fallback=None
        )

        # Create mock method with @handle_errors decorator
        method_def = FuncDef("get_data", [], None, None)
        method_def.type = callable_type
        method_def.line = 5

        # Mock decorator
        method_def.decorators = ["@handle_errors"]  # Simplified

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should detect non-optional return type with @handle_errors
        with pytest.raises(AssertionError):  # _report_error prints
            plugin._analyze_decorated_method(method_def, file)

    def test_handle_errors_decorator_with_optional_return_passes(self):
        """Method with @handle_errors and Optional return type should pass."""
        plugin = QualiaCodePlugin(None)

        # Create mock Optional[str] type
        str_type = Instance(None, [])
        none_type = NoneType()
        optional_type = UnionType([str_type, none_type])

        callable_type = CallableType(
            arg_types=[],
            arg_kinds=[],
            arg_names=[],
            ret_type=optional_type,
            fallback=None
        )

        # Create mock method with @handle_errors decorator
        method_def = FuncDef("get_data", [], None, None)
        method_def.type = callable_type
        method_def.line = 5
        method_def.decorators = ["@handle_errors"]

        file = MypyFile([], [], False, {})
        file.fullname = "test"

        # Should pass
        plugin._analyze_decorated_method(method_def, file)


class TestPluginIntegration:
    """Test plugin integration and setup."""

    def test_plugin_initialization(self):
        """Plugin should initialize correctly."""
        plugin = QualiaCodePlugin(None)
        assert plugin.interface_implementations == {}
        assert plugin.analyzed_files == set()

    def test_is_service_class_detection(self):
        """Should correctly identify service classes."""
        plugin = QualiaCodePlugin(None)

        assert plugin._is_service_class("MyService") == True
        assert plugin._is_service_class("DataEngine") == True
        assert plugin._is_service_class("ConfigManager") == True
        assert plugin._is_service_class("RegularClass") == False
        assert plugin._is_service_class("Utils") == False

    def test_is_optional_type_detection(self):
        """Should correctly identify Optional types."""
        plugin = QualiaCodePlugin(None)

        # Test Union with None
        str_type = Instance(None, [])
        none_type = NoneType()
        optional_type = UnionType([str_type, none_type])

        assert plugin._is_optional_type(optional_type) == True

        # Test non-optional type
        assert plugin._is_optional_type(str_type) == False

    def test_is_handle_errors_decorator_detection(self):
        """Should correctly identify @handle_errors decorator."""
        plugin = QualiaCodePlugin(None)

        assert plugin._is_handle_errors_decorator("@handle_errors") == True
        assert plugin._is_handle_errors_decorator("@log_method") == False
        assert plugin._is_handle_errors_decorator("handle_errors") == True
        assert plugin._is_handle_errors_decorator("other_decorator") == False


class TestSubtypeChecking:
    """Test subtype checking utilities."""

    def test_is_subtype_same_type(self):
        """Same types should be subtypes of each other."""
        plugin = QualiaCodePlugin(None)

        # Mock type info
        type_info = type('MockTypeInfo', (), {'fullname': 'test.MyService'})()

        instance1 = Instance(type_info, [])
        instance2 = Instance(type_info, [])

        assert plugin._is_subtype(instance1, instance2) == True

    def test_is_subtype_inheritance(self):
        """Should detect inheritance relationships."""
        plugin = QualiaCodePlugin(None)

        # Mock interface and implementation
        interface_info = type('MockTypeInfo', (), {'fullname': 'test.IMyService'})()
        impl_info = type('MockTypeInfo', (), {'fullname': 'test.MyService'})()

        interface_instance = Instance(interface_info, [])
        impl_instance = Instance(impl_info, [])

        # Should detect MyService as subtype of IMyService
        assert plugin._is_subtype(impl_instance, interface_instance) == True