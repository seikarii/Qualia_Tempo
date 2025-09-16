"""
Enhanced Physics Engine Factory and Configuration Manager for EDEN
===================================================================
Configuration-driven factory for physics engines with deep integration to
CosmicLattice, EVA memory system, and HEAVEN monitoring infrastructure.
Follows Crisalida Configuration-First Mandate and Search & Integrate principles.
"""

import logging
import os
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional, Union

import yaml

# Import from existing Crisalida systems (Search & Integrate Mandate)
from crisalida_lib.ADAM.config import AdamConfig

if TYPE_CHECKING:
    from crisalida_lib.EDEN.cosmic_lattice import CosmicLattice
    from crisalida_lib.EDEN.engines.gpu_physics_engine import GPUPhysicsEngine, EVAGPUPhysicsEngine
    from crisalida_lib.EDEN.engines.jax_physics_engine import JaxPhysicsEngine, EVAJaxPhysicsEngine
    from crisalida_lib.EDEN.qualia_manifold import QualiaField
    from crisalida_lib.EVA.core_types import LivingSymbolRuntime
    from crisalida_lib.HEAVEN.monitoring.monitoring_orchestrator import MonitoringOrchestrator
else:
    # Runtime fallbacks to avoid import-time side effects
    CosmicLattice = Any
    GPUPhysicsEngine = Any
    EVAGPUPhysicsEngine = Any
    JaxPhysicsEngine = Any
    EVAJaxPhysicsEngine = Any
    QualiaField = Any
    LivingSymbolRuntime = Any
    MonitoringOrchestrator = Any

# Safe imports with fallbacks
try:
    from crisalida_lib.HEAVEN.performance_decorators import eva_benchmark, time_execution
except ImportError:
    # Fallback decorators
    def eva_benchmark(func):
        return func
    
    def time_execution(func):
        return func

logger = logging.getLogger(__name__)


class PhysicsEngineConfigManager:
    """
    Configuration-First manager for EDEN physics engines.
    Loads and validates YAML configurations, manages profiles, and provides
    centralized access to all physics engine parameters.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or self._get_default_config_path()
        self.config: Dict[str, Any] = {}
        self.active_profile = "physics_engines"
        self._load_configuration()
    
    def _get_default_config_path(self) -> str:
        """Get default configuration file path following Crisalida conventions."""
        return os.path.join(
            os.path.dirname(__file__), 
            "..", 
            "config", 
            "physics_engines_config.yaml"
        )
    
    @time_execution
    def _load_configuration(self):
        """Load and validate configuration from YAML file."""
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = yaml.safe_load(f)
            logger.info(f"Loaded physics engine configuration from {self.config_path}")
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {self.config_path}")
            self._create_default_config()
        except yaml.YAMLError as e:
            logger.error(f"Invalid YAML configuration: {e}")
            raise
    
    def _create_default_config(self):
        """Create minimal default configuration if file is missing."""
        self.config = {
            "physics_engines": {
                "global_settings": {
                    "default_delta_time": 0.016,
                    "max_entities": 10000,
                    "max_lattices": 1000,
                    "default_reality_coherence": 1.0,
                    "unified_field_center": [0.0, 0.0, 0.0],
                    "base_chaos_entropy": 0.0,
                    "time_dilation_factor": 1.0
                }
            }
        }
        logger.warning("Using minimal default configuration")
    
    def get_config(self, path: str = "", profile: Optional[str] = None) -> Any:
        """
        Get configuration value by dot-separated path.
        Supports profile inheritance and overrides.
        """
        profile_name = profile or self.active_profile
        
        # Handle profile inheritance
        config_data = self._resolve_profile_config(profile_name)
        
        if not path:
            return config_data
        
        # Navigate through nested configuration
        keys = path.split(".")
        current = config_data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                logger.warning(f"Configuration path '{path}' not found in profile '{profile_name}'")
                return None
        
        return current
    
    def _resolve_profile_config(self, profile_name: str) -> Dict[str, Any]:
        """Resolve configuration with profile inheritance."""
        if profile_name in self.config.get("profiles", {}):
            profile = self.config["profiles"][profile_name]
            
            # Handle inheritance
            if "inherits" in profile:
                base_config = self.get_config("", profile["inherits"])
                if "overrides" in profile:
                    return self._deep_merge(base_config, profile["overrides"])
                return base_config
            
            return profile
        
        # Fallback to main configuration
        return self.config.get(profile_name, {})
    
    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge configuration dictionaries."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def set_profile(self, profile_name: str):
        """Switch active configuration profile."""
        self.active_profile = profile_name
        logger.info(f"Switched to configuration profile: {profile_name}")
    
    def reload_configuration(self):
        """Hot-reload configuration from file."""
        self._load_configuration()
        logger.info("Configuration reloaded")


class EnhancedPhysicsEngineFactory:
    """
    Factory for creating and managing physics engines with deep EDEN integration.
    Implements Search & Integrate principle by connecting to existing CosmicLattice,
    EVA memory system, and HEAVEN monitoring infrastructure.
    """
    
    def __init__(self, config_manager: Optional[PhysicsEngineConfigManager] = None):
        self.config_manager = config_manager or PhysicsEngineConfigManager()
        self.engines: Dict[str, Any] = {}
        self.monitoring: Optional[MonitoringOrchestrator] = None
        self._setup_monitoring()
    
    def _setup_monitoring(self):
        """Initialize HEAVEN monitoring if available."""
        try:
            from crisalida_lib.HEAVEN.monitoring.monitoring_orchestrator import MonitoringOrchestrator
            self.monitoring = MonitoringOrchestrator()
            logger.info("HEAVEN monitoring initialized for physics engines")
        except ImportError:
            logger.warning("HEAVEN monitoring not available")
    
    @eva_benchmark
    @time_execution
    def create_gpu_engine(
        self,
        ctx: Optional[Any] = None,
        cosmic_lattice: Optional[CosmicLattice] = None,
        eva_runtime: Optional[LivingSymbolRuntime] = None,
        profile: str = "physics_engines"
    ) -> "EVAGPUPhysicsEngine":
        """
        Create enhanced GPU physics engine with full EDEN integration.
        """
        # Get configuration for GPU engine
        gpu_config = self.config_manager.get_config("gpu_engine", profile)
        global_config = self.config_manager.get_config("global_settings", profile)
        eva_config = self.config_manager.get_config("eva_integration", profile)
        cosmic_config = self.config_manager.get_config("cosmic_integration", profile)
        
        if not gpu_config:
            raise ValueError(f"GPU engine configuration not found for profile: {profile}")
        
        # Import engine classes
        from crisalida_lib.EDEN.engines.gpu_physics_engine import EVAGPUPhysicsEngine
        
        # Create enhanced engine with configuration
        engine = EVAGPUPhysicsEngine(
            ctx=ctx,
            max_entities=global_config.get("max_entities", 10000),
            max_lattices=global_config.get("max_lattices", 1000),
            phase=eva_config.get("memory_management", {}).get("retention_policy", "default"),
            max_experiences=eva_config.get("memory_management", {}).get("max_experiences", 100000),
            retention_policy=eva_config.get("memory_management", {}).get("retention_policy", "dynamic")
        )
        
        # Configure engine with YAML parameters
        self._configure_gpu_engine(engine, gpu_config, eva_config, cosmic_config)
        
        # Integrate with CosmicLattice if provided
        if cosmic_lattice:
            self._integrate_cosmic_lattice(engine, cosmic_lattice, cosmic_config)
        
        # Setup EVA runtime if provided
        if eva_runtime:
            engine.eva_runtime = eva_runtime
        
        # Register monitoring
        if self.monitoring:
            self._register_engine_monitoring(engine, "GPU")
        
        engine_id = f"gpu_engine_{len(self.engines)}"
        self.engines[engine_id] = engine
        
        logger.info(f"Created enhanced GPU physics engine: {engine_id}")
        return engine
    
    @eva_benchmark
    @time_execution
    def create_jax_engine(
        self,
        cosmic_lattice: Optional[CosmicLattice] = None,
        eva_runtime: Optional[LivingSymbolRuntime] = None,
        profile: str = "physics_engines"
    ) -> "EVAJaxPhysicsEngine":
        """
        Create enhanced JAX physics engine with full EDEN integration.
        """
        # Get configuration for JAX engine
        jax_config = self.config_manager.get_config("jax_engine", profile)
        global_config = self.config_manager.get_config("global_settings", profile)
        eva_config = self.config_manager.get_config("eva_integration", profile)
        cosmic_config = self.config_manager.get_config("cosmic_integration", profile)
        
        if not jax_config:
            raise ValueError(f"JAX engine configuration not found for profile: {profile}")
        
        # Import engine classes
        from crisalida_lib.EDEN.engines.jax_physics_engine import EVAJaxPhysicsEngine
        
        # Use centralized messaging system
        try:
            from crisalida_lib.core.messaging_composition_root import create_component_with_messaging
            engine = create_component_with_messaging(
                EVAJaxPhysicsEngine,
                entity_id=f"jax_engine_{len(self.engines)}",
                phase=eva_config.get("memory_management", {}).get("retention_policy", "default"),
                max_experiences=eva_config.get("memory_management", {}).get("max_experiences", 100000),
                retention_policy=eva_config.get("memory_management", {}).get("retention_policy", "dynamic")
            )
        except ImportError:
            # Fallback to direct instantiation if messaging system not available
            logger.warning("Centralized messaging not available, using direct instantiation")
            engine = EVAJaxPhysicsEngine(
                phase=eva_config.get("memory_management", {}).get("retention_policy", "default"),
                max_experiences=eva_config.get("memory_management", {}).get("max_experiences", 100000),
                retention_policy=eva_config.get("memory_management", {}).get("retention_policy", "dynamic")
            )
        
        # Configure engine with YAML parameters
        self._configure_jax_engine(engine, jax_config, eva_config, cosmic_config)
        
        # Integrate with CosmicLattice if provided
        if cosmic_lattice:
            self._integrate_cosmic_lattice(engine, cosmic_lattice, cosmic_config)
        
        # Setup EVA runtime if provided
        if eva_runtime:
            engine.eva_runtime = eva_runtime
        
        # Register monitoring
        if self.monitoring:
            self._register_engine_monitoring(engine, "JAX")
        
        engine_id = f"jax_engine_{len(self.engines)}"
        self.engines[engine_id] = engine
        
        logger.info(f"Created enhanced JAX physics engine: {engine_id}")
        return engine
    
    def _configure_gpu_engine(self, engine: Any, gpu_config: Dict, eva_config: Dict, cosmic_config: Dict):
        """Configure GPU engine with YAML parameters."""
        # Configure buffer management
        buffer_config = gpu_config.get("buffer_management", {})
        if hasattr(engine, "_dynamic_buffer_resize"):
            engine._dynamic_buffer_resize = buffer_config.get("dynamic_buffer_resize", True)
        
        # Configure compute shader
        shader_config = gpu_config.get("compute_shader", {})
        if hasattr(engine, "_work_group_size"):
            engine._work_group_size = shader_config.get("work_group_size", 64)
        
        # Configure EVA integration
        if hasattr(engine, "max_experiences"):
            engine.max_experiences = eva_config.get("memory_management", {}).get("max_experiences", 100000)
    
    def _configure_jax_engine(self, engine: Any, jax_config: Dict, eva_config: Dict, cosmic_config: Dict):
        """Configure JAX engine with YAML parameters."""
        # Configure JAX settings
        jax_settings = jax_config.get("jax_settings", {})
        if hasattr(engine, "_jit_enabled"):
            engine._jit_enabled = jax_settings.get("jit_compilation", True)
        
        # Configure force fields
        force_fields = jax_config.get("force_fields", {})
        if hasattr(engine, "_unified_field_strength"):
            engine._unified_field_strength = force_fields.get("unified_field_attraction", {}).get("strength", 0.1)
    
    def _integrate_cosmic_lattice(self, engine: Any, cosmic_lattice: CosmicLattice, cosmic_config: Dict):
        """Integrate physics engine with CosmicLattice."""
        # Store reference to cosmic lattice
        engine.cosmic_lattice = cosmic_lattice
        
        # Configure cosmic integration parameters
        lattice_config = cosmic_config.get("cosmic_lattice", {})
        
        # Setup automatic synchronization
        if lattice_config.get("auto_sync_nodes", True):
            sync_freq = lattice_config.get("sync_frequency", 5)
            engine._cosmic_sync_frequency = sync_freq
            
            # Add hook for cosmic node updates
            def cosmic_sync_hook(experience):
                if hasattr(cosmic_lattice, "get_total_influence"):
                    influence = cosmic_lattice.get_total_influence({})
                    # Store cosmic influence in experience metadata
                    if hasattr(experience, "__dict__"):
                        experience.cosmic_influence = influence
            
            engine.add_environment_hook(cosmic_sync_hook)
        
        # Configure physics coupling
        coupling = cosmic_config.get("tree_physics", {}).get("node_physics_coupling", 0.7)
        if hasattr(engine, "_cosmic_coupling_strength"):
            engine._cosmic_coupling_strength = coupling
        
        logger.info("Integrated physics engine with CosmicLattice")
    
    def _register_engine_monitoring(self, engine: Any, engine_type: str):
        """Register engine with HEAVEN monitoring system."""
        if not self.monitoring:
            return
        
        try:
            # Register performance metrics
            metrics = {
                "engine_type": engine_type,
                "status": getattr(engine, "status", "unknown"),
                "entity_count": getattr(engine, "entity_count", 0),
                "simulation_tick": getattr(engine, "simulation_tick", 0)
            }
            
            # This would integrate with actual HEAVEN monitoring API
            logger.debug(f"Registered {engine_type} engine monitoring: {metrics}")
            
        except Exception as e:
            logger.warning(f"Failed to register engine monitoring: {e}")
    
    def get_engine(self, engine_id: str) -> Optional[Any]:
        """Get physics engine by ID."""
        return self.engines.get(engine_id)
    
    def list_engines(self) -> Dict[str, str]:
        """List all created engines with their types."""
        return {
            engine_id: type(engine).__name__ 
            for engine_id, engine in self.engines.items()
        }
    
    def shutdown_all_engines(self):
        """Shutdown all created engines and release resources."""
        for engine_id, engine in self.engines.items():
            try:
                if hasattr(engine, "shutdown"):
                    engine.shutdown()
                elif hasattr(engine, "release"):
                    engine.release()
                logger.info(f"Shutdown engine: {engine_id}")
            except Exception as e:
                logger.error(f"Error shutting down engine {engine_id}: {e}")
        
        self.engines.clear()
        logger.info("All physics engines shutdown")


# Singleton pattern for global factory access
_factory_instance: Optional[EnhancedPhysicsEngineFactory] = None

def get_physics_engine_factory() -> EnhancedPhysicsEngineFactory:
    """Get global physics engine factory instance."""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = EnhancedPhysicsEngineFactory()
    return _factory_instance

def create_configured_gpu_engine(**kwargs) -> "EVAGPUPhysicsEngine":
    """Convenience function to create configured GPU engine."""
    factory = get_physics_engine_factory()
    return factory.create_gpu_engine(**kwargs)

def create_configured_jax_engine(**kwargs) -> "EVAJaxPhysicsEngine":
    """Convenience function to create configured JAX engine."""
    factory = get_physics_engine_factory()
    return factory.create_jax_engine(**kwargs)
