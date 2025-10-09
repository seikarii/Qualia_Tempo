# QUALIA.CODE v1.1 - Service Container
# Custom Dependency Injection Container for Backend Services

from typing import Dict, Any, Type, TypeVar, Callable, Optional, Protocol
from dataclasses import dataclass
from enum import Enum
import inspect
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ServiceScope(Enum):
    """Service scope definitions."""
    SINGLETON = "singleton"
    TRANSIENT = "transient"


@dataclass
class ServiceRegistration:
    """Service registration metadata."""
    interface: Type
    implementation: Type
    factory: Optional[Callable] = None
    scope: ServiceScope = ServiceScope.SINGLETON
    instance: Optional[Any] = None


class ServiceContainer:
    """
    Central IoC container for backend services.
    
    Provides dependency injection with:
    - Interface-based registration
    - Singleton and transient scopes
    - Automatic dependency resolution
    - Type-safe service retrieval
    
    QUALIA.CODE MANDATE: This is the automated replacement for manual CompositionRoot.
    """
    
    def __init__(self) -> None:
        self._services: Dict[Type, ServiceRegistration] = {}
        self._config_objects: Dict[Type, Any] = {}
        self._logger = logging.getLogger(__name__)
        
    def register_singleton(
        self,
        interface: Type[T],
        implementation: Type[T],
        factory: Optional[Callable[..., T]] = None
    ) -> None:
        """
        Register a singleton service.
        
        Args:
            interface: Service interface type
            implementation: Service implementation type
            factory: Optional factory function
        """
        registration = ServiceRegistration(
            interface=interface,
            implementation=implementation,
            factory=factory,
            scope=ServiceScope.SINGLETON
        )
        self._services[interface] = registration
        self._logger.debug(f"📦 Registered singleton: {interface.__name__} -> {implementation.__name__}")
        
    def register_transient(
        self,
        interface: Type[T],
        implementation: Type[T],
        factory: Optional[Callable[..., T]] = None
    ) -> None:
        """
        Register a transient service (new instance per request).
        
        Args:
            interface: Service interface type
            implementation: Service implementation type
            factory: Optional factory function
        """
        registration = ServiceRegistration(
            interface=interface,
            implementation=implementation,
            factory=factory,
            scope=ServiceScope.TRANSIENT
        )
        self._services[interface] = registration
        self._logger.debug(f"📦 Registered transient: {interface.__name__} -> {implementation.__name__}")
        
    def register_config(self, config_type: Type[T], config_object: T) -> None:
        """
        Register a configuration object.
        
        Args:
            config_type: Configuration type
            config_object: Configuration instance
        """
        self._config_objects[config_type] = config_object
        self._logger.debug(f"⚙️  Registered config: {config_type.__name__}")
        
    def resolve(self, interface: Type[T]) -> T:
        """
        Resolve a service by its interface.
        
        Args:
            interface: Service interface type
            
        Returns:
            Service instance
            
        Raises:
            ValueError: If service is not registered
        """
        # Check if it's a config object
        if interface in self._config_objects:
            return self._config_objects[interface]  # type: ignore[no-any-return]
            
        # Check if service is registered
        if interface not in self._services:
            raise ValueError(f"Service not registered: {interface.__name__}")
            
        registration = self._services[interface]
        
        # Return existing singleton instance
        if registration.scope == ServiceScope.SINGLETON and registration.instance is not None:
            return registration.instance  # type: ignore[no-any-return]
            
        # Create new instance
        instance = self._create_instance(registration)
        
        # Store singleton instance
        if registration.scope == ServiceScope.SINGLETON:
            registration.instance = instance
            
        return instance  # type: ignore[no-any-return]
        
    def _create_instance(self, registration: ServiceRegistration) -> Any:
        """
        Create a service instance with dependency resolution.
        
        Args:
            registration: Service registration metadata
            
        Returns:
            Service instance
        """
        # Use factory if provided
        if registration.factory:
            return registration.factory(self)
            
        # Get constructor signature
        sig = inspect.signature(registration.implementation.__init__)
        
        # Resolve dependencies
        dependencies = {}
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
                
            # Get parameter type hint
            param_type = param.annotation
            if param_type == inspect.Parameter.empty:
                raise ValueError(
                    f"Missing type hint for parameter '{param_name}' "
                    f"in {registration.implementation.__name__}.__init__"
                )
                
            # Resolve dependency
            try:
                dependencies[param_name] = self.resolve(param_type)
            except ValueError as e:
                self._logger.error(
                    f"Failed to resolve dependency '{param_name}' "
                    f"for {registration.implementation.__name__}: {e}"
                )
                raise
                
        # Create instance with resolved dependencies
        instance = registration.implementation(**dependencies)
        self._logger.debug(f"✅ Created instance: {registration.implementation.__name__}")
        return instance
        
    def clear(self) -> None:
        """Clear all service registrations and instances."""
        self._services.clear()
        self._config_objects.clear()
        self._logger.debug("🧹 Container cleared")
        
    def get_registered_services(self) -> list[Type]:
        """Get list of all registered service interfaces."""
        return list(self._services.keys()) + list(self._config_objects.keys())


# Global container instance
_container: Optional[ServiceContainer] = None


def get_container() -> ServiceContainer:
    """
    Get the global service container instance.
    
    Returns:
        Global ServiceContainer instance
    """
    global _container
    if _container is None:
        _container = ServiceContainer()
    return _container


def reset_container() -> None:
    """Reset the global container (useful for testing)."""
    global _container
    if _container:
        _container.clear()
    _container = None
