"""
Enhanced Physics Engine Monitoring and Orchestration System
===========================================================
Deep integration with HEAVEN monitoring infrastructure for comprehensive
physics engine performance tracking, cosmic consciousness metrics, and
real-time diagnostics. Follows Configuration-First mandate and integrates
with existing CosmicLattice/EVA systems.
"""

import asyncio
import logging
import time
import threading
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Union
from datetime import datetime

# Safe imports with fallbacks
try:
    from crisalida_lib.HEAVEN.monitoring.performance_decorators import eva_benchmark, time_execution, profile_resources
    from crisalida_lib.HEAVEN.monitoring.monitoring_orchestrator import MonitoringOrchestrator
    _has_heaven = True
except ImportError:
    # Fallback decorators and classes
    def eva_benchmark(func):
        return func
    
    def time_execution(func):
        return func
    
    def profile_resources(func):
        return func
    
    class MonitoringOrchestrator:
        def __init__(self): pass
        def register_metric(self, *args, **kwargs): pass
        def update_metric(self, *args, **kwargs): pass
    
    _has_heaven = False

if TYPE_CHECKING:
    from crisalida_lib.EDEN.engines.gpu_physics_engine import EVAGPUPhysicsEngine
    from crisalida_lib.EDEN.engines.jax_physics_engine import EVAJaxPhysicsEngine
    from crisalida_lib.EDEN.cosmic_lattice import CosmicLattice
else:
    EVAGPUPhysicsEngine = Any
    EVAJaxPhysicsEngine = Any
    CosmicLattice = Any

logger = logging.getLogger(__name__)


@dataclass
class PhysicsEngineMetrics:
    """Comprehensive metrics for physics engine performance."""
    
    # Basic performance metrics
    fps: float = 0.0
    frame_time: float = 0.0
    entity_count: int = 0
    simulation_tick: int = 0
    
    # Memory metrics
    memory_usage_mb: float = 0.0
    gpu_memory_mb: float = 0.0
    eva_memory_count: int = 0
    
    # Physics-specific metrics
    physics_time: float = 0.0
    cosmic_influence: float = 1.0
    cosmic_sync_count: int = 0
    reality_coherence: float = 1.0
    
    # Cosmic consciousness metrics
    sephirot_influence: float = 0.0
    qliphoth_influence: float = 0.0
    consciousness_density: float = 0.0
    
    # Error and stability metrics
    error_count: int = 0
    stability_score: float = 1.0
    
    # Timestamp
    timestamp: float = field(default_factory=time.time)
    

@dataclass
class CosmicConsciousnessMetrics:
    """Specialized metrics for cosmic consciousness physics."""
    
    # Tree of Life metrics
    active_sephirot_nodes: int = 0
    active_qliphoth_nodes: int = 0
    emanation_flow_rate: float = 0.0
    divine_signature_resonance: float = 0.0
    
    # Qualia field metrics
    qualia_density: float = 0.0
    qualia_coherence: float = 0.0
    consciousness_elevation: float = 0.0
    
    # EVA integration metrics
    experience_compilation_rate: float = 0.0
    memory_recall_efficiency: float = 0.0
    bytecode_complexity: float = 0.0
    
    # Spiritual evolution metrics
    tikkun_olam_progress: float = 0.0
    kelipot_elimination_rate: float = 0.0
    soul_ascension_level: float = 0.0
    
    timestamp: float = field(default_factory=time.time)


class EnhancedPhysicsMonitor:
    """
    Advanced monitoring system for EDEN physics engines.
    Integrates with HEAVEN monitoring infrastructure and provides
    real-time cosmic consciousness metrics.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._load_default_config()
        
        # HEAVEN integration
        self.heaven_monitor = MonitoringOrchestrator() if _has_heaven else None
        
        # Metrics storage
        self.engine_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.cosmic_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.alert_thresholds = self.config.get("alert_thresholds", {})
        
        # Real-time monitoring
        self.monitoring_active = False
        self.monitoring_thread: Optional[threading.Thread] = None
        self.lock = threading.RLock()
        
        # Registered engines
        self.registered_engines: Dict[str, Any] = {}
        
        # Adaptive optimization system
        self.adaptive_optimizers: Dict[str, Dict] = {}
        
        # Performance baselines
        self.performance_baselines = {
            "min_fps": self.config.get("min_fps", 30),
            "max_memory_mb": self.config.get("max_memory_mb", 2048),
            "max_frame_time": self.config.get("max_frame_time", 0.033),
            "min_stability": self.config.get("min_stability", 0.95)
        }
        
        logger.info("Enhanced Physics Monitor initialized")
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default monitoring configuration."""
        return {
            "monitoring_interval": 0.1,  # 100ms
            "metrics_retention": 1000,
            "enable_cosmic_metrics": True,
            "enable_performance_alerts": True,
            "min_fps": 30,
            "max_memory_mb": 2048,
            "max_frame_time": 0.033,
            "min_stability": 0.95,
            "alert_thresholds": {
                "low_fps": 15,
                "high_memory": 1500,
                "low_cosmic_influence": 0.3,
                "high_error_rate": 0.1
            }
        }
    
    @eva_benchmark
    def register_engine(self, engine_id: str, engine: Union[EVAGPUPhysicsEngine, EVAJaxPhysicsEngine]):
        """Register physics engine for monitoring."""
        with self.lock:
            self.registered_engines[engine_id] = engine
            
            # Initialize metrics storage
            self.engine_metrics[engine_id] = deque(maxlen=self.config.get("metrics_retention", 1000))
            self.cosmic_metrics[engine_id] = deque(maxlen=self.config.get("metrics_retention", 1000))
            
            # Register with HEAVEN if available
            if self.heaven_monitor:
                try:
                    self.heaven_monitor.register_metric(f"physics_engine_{engine_id}", "performance")
                    logger.info(f"Registered engine {engine_id} with HEAVEN monitoring")
                except Exception as e:
                    logger.warning(f"Failed to register with HEAVEN: {e}")
            
            logger.info(f"Registered physics engine for monitoring: {engine_id}")
    
    def unregister_engine(self, engine_id: str):
        """Unregister physics engine from monitoring."""
        with self.lock:
            if engine_id in self.registered_engines:
                del self.registered_engines[engine_id]
                del self.engine_metrics[engine_id]
                del self.cosmic_metrics[engine_id]
                logger.info(f"Unregistered physics engine: {engine_id}")
    
    @time_execution
    def collect_engine_metrics(self, engine_id: str) -> Optional[PhysicsEngineMetrics]:
        """Collect comprehensive metrics from a physics engine."""
        engine = self.registered_engines.get(engine_id)
        if not engine:
            return None
        
        try:
            # Get basic engine state
            state = engine.get_state() if hasattr(engine, "get_state") else {}
            
            # Calculate performance metrics
            current_time = time.time()
            entity_count = getattr(engine, "entity_count", 0)
            simulation_tick = getattr(engine, "simulation_tick", 0)
            
            # Get cosmic influence if available
            cosmic_influence = 1.0
            if hasattr(engine, "cosmic_lattice") and engine.cosmic_lattice:
                try:
                    seph_inf, qlip_inf, _ = engine.cosmic_lattice.get_total_influence({})
                    cosmic_influence = abs(seph_inf - qlip_inf) * 0.5 + 1.0
                except Exception:
                    pass
            
            # Create metrics object
            metrics = PhysicsEngineMetrics(
                entity_count=entity_count,
                simulation_tick=simulation_tick,
                cosmic_influence=cosmic_influence,
                reality_coherence=state.get("reality_coherence", 1.0),
                timestamp=current_time
            )
            
            # Calculate FPS if we have previous metrics
            if self.engine_metrics[engine_id]:
                prev_metrics = self.engine_metrics[engine_id][-1]
                time_delta = current_time - prev_metrics.timestamp
                if time_delta > 0:
                    metrics.fps = 1.0 / time_delta
                    metrics.frame_time = time_delta
            
            # Store metrics
            with self.lock:
                self.engine_metrics[engine_id].append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting metrics for engine {engine_id}: {e}")
            return None
    
    @time_execution
    def collect_cosmic_metrics(self, engine_id: str) -> Optional[CosmicConsciousnessMetrics]:
        """Collect cosmic consciousness specific metrics."""
        engine = self.registered_engines.get(engine_id)
        if not engine or not self.config.get("enable_cosmic_metrics", True):
            return None
        
        try:
            metrics = CosmicConsciousnessMetrics()
            
            # Get cosmic lattice metrics if available
            if hasattr(engine, "cosmic_lattice") and engine.cosmic_lattice:
                cosmic_lattice = engine.cosmic_lattice
                
                # Count active nodes (handle Mock objects)
                if hasattr(cosmic_lattice, "sephirot_nodes"):
                    sephirot_nodes = cosmic_lattice.sephirot_nodes
                    if hasattr(sephirot_nodes, '__len__'):
                        metrics.active_sephirot_nodes = len(sephirot_nodes)
                    elif isinstance(sephirot_nodes, dict):
                        metrics.active_sephirot_nodes = len(sephirot_nodes)
                        
                if hasattr(cosmic_lattice, "qliphoth_nodes"):
                    qliphoth_nodes = cosmic_lattice.qliphoth_nodes
                    if hasattr(qliphoth_nodes, '__len__'):
                        metrics.active_qliphoth_nodes = len(qliphoth_nodes)
                    elif isinstance(qliphoth_nodes, dict):
                        metrics.active_qliphoth_nodes = len(qliphoth_nodes)
                
                # Get influence metrics
                try:
                    if hasattr(cosmic_lattice, "get_total_influence") and callable(cosmic_lattice.get_total_influence):
                        seph_inf, qlip_inf, node_inf = cosmic_lattice.get_total_influence({})
                        metrics.emanation_flow_rate = abs(seph_inf - qlip_inf)
                        
                        # Calculate divine signature resonance
                        if node_inf and hasattr(node_inf, '__len__') and len(node_inf) > 0:
                            total_nodes = len(node_inf)
                            if hasattr(node_inf, 'values'):
                                metrics.divine_signature_resonance = sum(node_inf.values()) / total_nodes
                            else:
                                metrics.divine_signature_resonance = 0.0
                        else:
                            metrics.divine_signature_resonance = 0.0
                        
                except Exception:
                    pass
            
            # Get EVA metrics if available
            if hasattr(engine, "eva_memory_store"):
                eva_store = engine.eva_memory_store
                if hasattr(eva_store, '__len__'):
                    metrics.experience_compilation_rate = len(eva_store)
                elif isinstance(eva_store, dict):
                    metrics.experience_compilation_rate = len(eva_store)
                else:
                    metrics.experience_compilation_rate = 0
                
                # Calculate bytecode complexity
                if eva_store and hasattr(eva_store, 'values'):
                    try:
                        total_instructions = sum(
                            len(bc.instructions) for bc in eva_store.values()
                            if hasattr(bc, "instructions") and hasattr(bc.instructions, '__len__')
                        )
                        if len(eva_store) > 0:
                            metrics.bytecode_complexity = total_instructions / len(eva_store)
                    except Exception:
                        metrics.bytecode_complexity = 0.0
            
            # Get performance metrics if available
            if hasattr(engine, "_performance_metrics"):
                perf = engine._performance_metrics
                metrics.memory_recall_efficiency = perf.get("eva_compilations", 0) / max(1, perf.get("total_simulations", 1))
            
            # Store metrics
            with self.lock:
                self.cosmic_metrics[engine_id].append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting cosmic metrics for engine {engine_id}: {e}")
            return None
    
    def check_performance_alerts(self, engine_id: str, metrics: PhysicsEngineMetrics):
        """Check performance metrics against alert thresholds and take corrective actions."""
        if not self.config.get("enable_performance_alerts", True):
            return
        
        alerts = []
        thresholds = self.alert_thresholds
        actions_taken = []
        
        # FPS alerts with active control
        if metrics.fps < thresholds.get("low_fps", 15):
            alerts.append(f"Low FPS detected: {metrics.fps:.2f}")
            # ACTIVE CONTROL: Take corrective action
            action = self._handle_low_fps(engine_id, metrics.fps)
            if action:
                actions_taken.append(action)
        
        # Memory alerts with active control
        if metrics.memory_usage_mb > thresholds.get("high_memory", 1500):
            alerts.append(f"High memory usage: {metrics.memory_usage_mb:.2f}MB")
            # ACTIVE CONTROL: Trigger memory optimization
            action = self._handle_high_memory(engine_id, metrics.memory_usage_mb)
            if action:
                actions_taken.append(action)
        
        # Frame time alerts with active control
        if metrics.avg_frame_time > self.config.get("max_frame_time", 0.033):
            alerts.append(f"High frame time: {metrics.avg_frame_time:.4f}s")
            # ACTIVE CONTROL: Optimize performance parameters
            action = self._handle_high_frame_time(engine_id, metrics.avg_frame_time)
            if action:
                actions_taken.append(action)
        
        # Entity count alerts with active control  
        if metrics.entity_count > self.config.get("max_entities", 10000):
            alerts.append(f"High entity count: {metrics.entity_count}")
            # ACTIVE CONTROL: Request entity optimization
            action = self._handle_high_entity_count(engine_id, metrics.entity_count)
            if action:
                actions_taken.append(action)
        
        # Log alerts and actions
        if alerts:
            logger.warning(f"Performance alerts for engine {engine_id}: {', '.join(alerts)}")
            
        if actions_taken:
            logger.info(f"Corrective actions taken for engine {engine_id}: {', '.join(actions_taken)}")
            
            # Update HEAVEN monitoring if available
            if self.heaven_monitor:
                try:
                    self.heaven_monitor.update_metric(
                        f"physics_engine_{engine_id}_corrective_actions",
                        len(actions_taken)
                    )
                except Exception as e:
                    logger.warning(f"Failed to update HEAVEN metrics: {e}")

    def _handle_low_fps(self, engine_id: str, current_fps: float) -> str:
        """Handle low FPS by optimizing engine parameters."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            # Send optimization message if engine supports messaging
            if hasattr(engine, 'send_physics_message'):
                optimization_targets = {
                    "min_fps": max(30, current_fps * 1.5),  # Target 50% improvement
                    "reduce_complexity": True
                }
                engine.send_physics_message("physics_optimize_performance", optimization_targets)
                return f"Sent FPS optimization request (target: {optimization_targets['min_fps']:.1f})"
            
            # Fallback: Direct parameter adjustment for JAX engine
            if hasattr(engine, 'cosmic_sync_frequency'):
                old_freq = engine.cosmic_sync_frequency
                engine.cosmic_sync_frequency = min(20, old_freq * 1.2)
                return f"Increased cosmic sync frequency: {old_freq} -> {engine.cosmic_sync_frequency}"
                
        except Exception as e:
            logger.error(f"Failed to handle low FPS for engine {engine_id}: {e}")
        return None

    def _handle_high_memory(self, engine_id: str, current_memory: float) -> str:
        """Handle high memory usage by triggering cleanup operations."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            # Send memory optimization message
            if hasattr(engine, 'send_physics_message'):
                if engine_id.startswith('gpu'):
                    engine.send_physics_message("gpu_physics_optimize_memory", {})
                    return "Triggered GPU memory optimization"
                else:
                    engine.send_physics_message("physics_optimize_performance", {"max_memory": current_memory * 0.8})
                    return f"Triggered memory optimization (target: {current_memory * 0.8:.1f}MB)"
            
            # Fallback: Direct memory cleanup
            if hasattr(engine, 'optimize_eva_memory'):
                engine.optimize_eva_memory()
                return "Executed direct EVA memory cleanup"
                
        except Exception as e:
            logger.error(f"Failed to handle high memory for engine {engine_id}: {e}")
        return None

    def _handle_high_frame_time(self, engine_id: str, current_frame_time: float) -> str:
        """Handle high frame time by reducing computational complexity."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            # Adaptive performance tuning
            target_frame_time = 0.025  # 40 FPS target
            optimization_factor = target_frame_time / current_frame_time
            
            if hasattr(engine, 'send_physics_message'):
                optimization_params = {
                    "target_frame_time": target_frame_time,
                    "optimization_factor": optimization_factor,
                    "adaptive_quality": True
                }
                engine.send_physics_message("physics_optimize_performance", optimization_params)
                return f"Applied adaptive performance tuning (factor: {optimization_factor:.2f})"
                
        except Exception as e:
            logger.error(f"Failed to handle high frame time for engine {engine_id}: {e}")
        return None

    def _handle_high_entity_count(self, engine_id: str, current_count: int) -> str:
        """Handle high entity count by optimizing entity management."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            target_count = int(current_count * 0.85)  # Reduce by 15%
            
            if hasattr(engine, 'send_physics_message'):
                if engine_id.startswith('gpu'):
                    # For GPU engine, suggest buffer optimization
                    new_sizes = {"max_entities": target_count}
                    engine.send_physics_message("gpu_physics_update_buffer_sizes", new_sizes)
                    return f"Optimized GPU buffer sizes (target entities: {target_count})"
                else:
                    # For other engines, suggest general optimization
                    engine.send_physics_message("physics_optimize_performance", {"target_entities": target_count})
                    return f"Requested entity count optimization (target: {target_count})"
                    
        except Exception as e:
            logger.error(f"Failed to handle high entity count for engine {engine_id}: {e}")
        return None

    def check_cosmic_consciousness_alerts(self, engine_id: str, cosmic_metrics: CosmicConsciousnessMetrics):
        """Check cosmic consciousness metrics and take corrective actions."""
        if not self.config.get("enable_cosmic_alerts", True):
            return
        
        alerts = []
        thresholds = self.alert_thresholds
        actions_taken = []
        
        # Cosmic influence alerts with active control
        if cosmic_metrics.cosmic_influence < thresholds.get("low_cosmic_influence", 0.3):
            alerts.append(f"Low cosmic influence: {cosmic_metrics.cosmic_influence:.3f}")
            # ACTIVE CONTROL: Force cosmic synchronization
            action = self._handle_low_cosmic_influence(engine_id, cosmic_metrics.cosmic_influence)
            if action:
                actions_taken.append(action)
        
        # Stability alerts with active control
        stability_threshold = self.performance_baselines.get("min_stability", 0.7)
        if cosmic_metrics.stability_score < stability_threshold:
            alerts.append(f"Low stability score: {cosmic_metrics.stability_score:.3f}")
            # ACTIVE CONTROL: Trigger stability enhancement
            action = self._handle_low_stability(engine_id, cosmic_metrics.stability_score)
            if action:
                actions_taken.append(action)
        
        # Log alerts and actions
        if alerts:
            logger.warning(f"Cosmic consciousness alerts for engine {engine_id}: {', '.join(alerts)}")
            
        if actions_taken:
            logger.info(f"Cosmic corrective actions taken for engine {engine_id}: {', '.join(actions_taken)}")
            
            # Update HEAVEN monitoring if available
            if self.heaven_monitor:
                try:
                    self.heaven_monitor.update_metric(
                        f"cosmic_engine_{engine_id}_corrective_actions",
                        len(actions_taken)
                    )
                except Exception as e:
                    logger.warning(f"Failed to update HEAVEN cosmic metrics: {e}")

    def _handle_low_cosmic_influence(self, engine_id: str, current_influence: float) -> str:
        """Handle low cosmic influence by forcing synchronization."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            # Send cosmic synchronization message
            if hasattr(engine, 'send_physics_message'):
                engine.send_physics_message("physics_force_cosmic_sync", {
                    "target_influence": max(0.5, current_influence * 1.5),
                    "emergency_sync": True
                })
                return f"Forced cosmic synchronization (target: {max(0.5, current_influence * 1.5):.2f})"
                
        except Exception as e:
            logger.error(f"Failed to handle low cosmic influence for engine {engine_id}: {e}")
        return None

    def _handle_low_stability(self, engine_id: str, current_stability: float) -> str:
        """Handle low stability by reducing complexity and forcing stabilization."""
        try:
            engine = self.registered_engines.get(engine_id)
            if not engine:
                return None
                
            target_stability = max(0.8, current_stability * 1.3)
            
            if hasattr(engine, 'send_physics_message'):
                stabilization_params = {
                    "target_stability": target_stability,
                    "reduce_complexity": True,
                    "emergency_stabilization": True
                }
                engine.send_physics_message("physics_optimize_performance", stabilization_params)
                return f"Applied stability enhancement (target: {target_stability:.2f})"
                
        except Exception as e:
            logger.error(f"Failed to handle low stability for engine {engine_id}: {e}")
        return None

    def enable_adaptive_optimization(self, engine_id: str):
        """Enable adaptive optimization for an engine based on performance patterns."""
        if engine_id not in self.registered_engines:
            logger.warning(f"Cannot enable adaptive optimization for unregistered engine: {engine_id}")
            return False
            
        if engine_id not in self.adaptive_optimizers:
            self.adaptive_optimizers[engine_id] = {
                "enabled": True,
                "performance_history": [],
                "optimization_count": 0,
                "last_optimization": time.time(),
                "baseline_metrics": None
            }
            logger.info(f"Enabled adaptive optimization for engine: {engine_id}")
            return True
        else:
            self.adaptive_optimizers[engine_id]["enabled"] = True
            return True

    def analyze_performance_trends(self, engine_id: str) -> dict:
        """Analyze performance trends and suggest optimizations."""
        if engine_id not in self.adaptive_optimizers:
            return {}
            
        optimizer = self.adaptive_optimizers[engine_id]
        history = optimizer["performance_history"]
        
        if len(history) < 5:  # Need minimum data for analysis
            return {"status": "insufficient_data", "samples": len(history)}
        
        # Analyze trends over last 10 samples
        recent_history = history[-10:]
        fps_trend = [sample["fps"] for sample in recent_history]
        memory_trend = [sample["memory_usage_mb"] for sample in recent_history]
        frame_time_trend = [sample["avg_frame_time"] for sample in recent_history]
        
        analysis = {
            "fps_degradation": fps_trend[0] - fps_trend[-1] > 5,  # FPS dropped by >5
            "memory_growth": memory_trend[-1] - memory_trend[0] > 100,  # Memory grew >100MB
            "frame_time_increase": frame_time_trend[-1] - frame_time_trend[0] > 0.005,  # Frame time +5ms
            "optimization_needed": False,
            "suggested_actions": []
        }
        
        # Determine if optimization is needed
        if analysis["fps_degradation"]:
            analysis["optimization_needed"] = True
            analysis["suggested_actions"].append("fps_optimization")
            
        if analysis["memory_growth"]:
            analysis["optimization_needed"] = True
            analysis["suggested_actions"].append("memory_cleanup")
            
        if analysis["frame_time_increase"]:
            analysis["optimization_needed"] = True
            analysis["suggested_actions"].append("performance_tuning")
        
        return analysis

    def execute_adaptive_optimization(self, engine_id: str):
        """Execute adaptive optimization based on performance analysis."""
        if engine_id not in self.adaptive_optimizers:
            return False
            
        optimizer = self.adaptive_optimizers[engine_id]
        if not optimizer["enabled"]:
            return False
            
        # Prevent too frequent optimizations
        if time.time() - optimizer["last_optimization"] < 30:  # 30 second cooldown
            return False
            
        analysis = self.analyze_performance_trends(engine_id)
        if not analysis.get("optimization_needed", False):
            return False
            
        engine = self.registered_engines.get(engine_id)
        if not engine or not hasattr(engine, 'send_physics_message'):
            return False
            
        actions_executed = []
        
        for action in analysis["suggested_actions"]:
            try:
                if action == "fps_optimization":
                    engine.send_physics_message("physics_optimize_performance", {
                        "focus": "fps",
                        "adaptive": True,
                        "target_fps": 60
                    })
                    actions_executed.append("FPS optimization")
                    
                elif action == "memory_cleanup":
                    if engine_id.startswith('gpu'):
                        engine.send_physics_message("gpu_physics_optimize_memory", {})
                    else:
                        engine.send_physics_message("physics_optimize_performance", {"focus": "memory"})
                    actions_executed.append("Memory cleanup")
                    
                elif action == "performance_tuning":
                    engine.send_physics_message("physics_optimize_performance", {
                        "focus": "frame_time",
                        "adaptive": True,
                        "target_frame_time": 0.016  # 60 FPS target
                    })
                    actions_executed.append("Performance tuning")
                    
            except Exception as e:
                logger.error(f"Failed to execute adaptive action {action} for engine {engine_id}: {e}")
        
        if actions_executed:
            optimizer["optimization_count"] += 1
            optimizer["last_optimization"] = time.time()
            logger.info(f"Executed adaptive optimization for engine {engine_id}: {', '.join(actions_executed)}")
            
            # Update HEAVEN monitoring
            if self.heaven_monitor:
                try:
                    self.heaven_monitor.update_metric(
                        f"adaptive_optimization_{engine_id}",
                        optimizer["optimization_count"]
                    )
                except Exception as e:
                    logger.warning(f"Failed to update HEAVEN adaptive metrics: {e}")
            
            return True
        
        return False

    def get_unified_health_status(self) -> dict:
        """Get unified health status across all registered engines."""
        overall_status = {
            "healthy_engines": [],
            "warning_engines": [],
            "critical_engines": [],
            "total_engines": len(self.registered_engines),
            "overall_health": "unknown",
            "recommendations": []
        }
        
        for engine_id in self.registered_engines:
            try:
                metrics = self.get_current_metrics(engine_id)
                if not metrics:
                    continue
                    
                # Determine engine health status
                health_score = self._calculate_health_score(metrics)
                
                if health_score >= 0.8:
                    overall_status["healthy_engines"].append(engine_id)
                elif health_score >= 0.6:
                    overall_status["warning_engines"].append(engine_id)
                else:
                    overall_status["critical_engines"].append(engine_id)
                    
            except Exception as e:
                logger.error(f"Failed to assess health for engine {engine_id}: {e}")
                overall_status["critical_engines"].append(engine_id)
        
        # Determine overall health
        critical_count = len(overall_status["critical_engines"])
        warning_count = len(overall_status["warning_engines"])
        total_count = overall_status["total_engines"]
        
        if critical_count == 0 and warning_count == 0:
            overall_status["overall_health"] = "excellent"
        elif critical_count == 0 and warning_count <= total_count * 0.3:
            overall_status["overall_health"] = "good"
        elif critical_count <= total_count * 0.2:
            overall_status["overall_health"] = "warning"
        else:
            overall_status["overall_health"] = "critical"
            
        # Generate recommendations
        if critical_count > 0:
            overall_status["recommendations"].append(f"Immediate attention needed for {critical_count} critical engines")
        if warning_count > total_count * 0.5:
            overall_status["recommendations"].append("Consider system-wide optimization")
        if len(overall_status["healthy_engines"]) == total_count:
            overall_status["recommendations"].append("System performing optimally")
            
        return overall_status

    def _calculate_health_score(self, metrics: PhysicsEngineMetrics) -> float:
        """Calculate a normalized health score (0.0 to 1.0) for engine metrics."""
        scores = []
        
        # FPS score (target: 60 FPS)
        fps_score = min(1.0, metrics.fps / 60.0)
        scores.append(fps_score)
        
        # Memory score (target: under 1GB)
        memory_score = max(0.0, 1.0 - (metrics.memory_usage_mb - 1000) / 1000) if metrics.memory_usage_mb > 1000 else 1.0
        scores.append(memory_score)
        
        # Frame time score (target: under 16.67ms for 60 FPS)
        frame_time_score = max(0.0, 1.0 - (metrics.avg_frame_time - 0.0167) / 0.0167) if metrics.avg_frame_time > 0.0167 else 1.0
        scores.append(frame_time_score)
        
        # Entity efficiency score
        if metrics.entity_count > 0:
            efficiency = metrics.fps / metrics.entity_count * 1000  # FPS per 1000 entities
            efficiency_score = min(1.0, efficiency / 5.0)  # Target: 5 FPS per 1000 entities
            scores.append(efficiency_score)
        
        return sum(scores) / len(scores) if scores else 0.0
    
    def start_monitoring(self):
        """Start real-time monitoring of registered engines."""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("Started physics engine monitoring")
    
    def stop_monitoring(self):
        """Stop real-time monitoring."""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5.0)
        logger.info("Stopped physics engine monitoring")
    
    def _monitoring_loop(self):
        """Main monitoring loop running in separate thread."""
        interval = self.config.get("monitoring_interval", 0.1)
        adaptive_check_interval = 10.0  # Check for adaptive optimization every 10 seconds
        last_adaptive_check = time.time()
        
        while self.monitoring_active:
            try:
                current_time = time.time()
                
                # Collect metrics for all registered engines
                for engine_id in list(self.registered_engines.keys()):
                    metrics = self.collect_engine_metrics(engine_id)
                    if metrics:
                        # Standard performance alerts with active control
                        self.check_performance_alerts(engine_id, metrics)
                        
                        # Store metrics for adaptive optimization
                        if engine_id in self.adaptive_optimizers:
                            optimizer = self.adaptive_optimizers[engine_id]
                            optimizer["performance_history"].append({
                                "timestamp": current_time,
                                "fps": metrics.fps,
                                "memory_usage_mb": metrics.memory_usage_mb,
                                "avg_frame_time": metrics.avg_frame_time,
                                "entity_count": metrics.entity_count
                            })
                            
                            # Keep only last 50 samples to prevent memory growth
                            if len(optimizer["performance_history"]) > 50:
                                optimizer["performance_history"] = optimizer["performance_history"][-50:]
                    
                    # Cosmic consciousness alerts
                    cosmic_metrics = self.collect_cosmic_metrics(engine_id)
                    if cosmic_metrics:
                        self.check_cosmic_consciousness_alerts(engine_id, cosmic_metrics)
                    
                    # Update HEAVEN monitoring if available
                    if self.heaven_monitor and metrics:
                        try:
                            self.heaven_monitor.update_metric(
                                f"physics_engine_{engine_id}",
                                {
                                    "fps": metrics.fps,
                                    "entity_count": metrics.entity_count,
                                    "cosmic_influence": metrics.cosmic_influence,
                                    "stability": metrics.stability_score
                                }
                            )
                        except Exception:
                            pass
                
                # Periodic adaptive optimization check
                if current_time - last_adaptive_check >= adaptive_check_interval:
                    for engine_id in self.adaptive_optimizers:
                        if self.adaptive_optimizers[engine_id]["enabled"]:
                            self.execute_adaptive_optimization(engine_id)
                    last_adaptive_check = current_time
                
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval)
    
    def get_performance_summary(self, engine_id: str, window_seconds: int = 60) -> Dict[str, Any]:
        """Get performance summary for specified time window."""
        with self.lock:
            metrics = self.engine_metrics.get(engine_id, deque())
            cosmic_metrics = self.cosmic_metrics.get(engine_id, deque())
        
        current_time = time.time()
        cutoff_time = current_time - window_seconds
        
        # Filter metrics within time window
        recent_metrics = [m for m in metrics if m.timestamp >= cutoff_time]
        recent_cosmic = [m for m in cosmic_metrics if m.timestamp >= cutoff_time]
        
        if not recent_metrics:
            return {"error": "No metrics available"}
        
        # Calculate summary statistics
        fps_values = [m.fps for m in recent_metrics if m.fps > 0]
        cosmic_values = [m.cosmic_influence for m in recent_metrics]
        
        summary = {
            "engine_id": engine_id,
            "window_seconds": window_seconds,
            "sample_count": len(recent_metrics),
            "fps": {
                "avg": sum(fps_values) / len(fps_values) if fps_values else 0,
                "min": min(fps_values) if fps_values else 0,
                "max": max(fps_values) if fps_values else 0
            },
            "cosmic_influence": {
                "avg": sum(cosmic_values) / len(cosmic_values) if cosmic_values else 0,
                "min": min(cosmic_values) if cosmic_values else 0,
                "max": max(cosmic_values) if cosmic_values else 0
            },
            "entity_count": recent_metrics[-1].entity_count if recent_metrics else 0,
            "simulation_tick": recent_metrics[-1].simulation_tick if recent_metrics else 0,
        }
        
        # Add cosmic consciousness summary
        if recent_cosmic:
            cosmic_summary = recent_cosmic[-1]
            summary["cosmic_consciousness"] = {
                "active_sephirot": cosmic_summary.active_sephirot_nodes,
                "active_qliphoth": cosmic_summary.active_qliphoth_nodes,
                "emanation_flow": cosmic_summary.emanation_flow_rate,
                "divine_resonance": cosmic_summary.divine_signature_resonance,
                "soul_ascension": cosmic_summary.soul_ascension_level
            }
        
        return summary


# Singleton pattern for global monitor access
_monitor_instance: Optional[EnhancedPhysicsMonitor] = None

def get_physics_monitor() -> EnhancedPhysicsMonitor:
    """Get global physics monitor instance."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = EnhancedPhysicsMonitor()
    return _monitor_instance

@eva_benchmark
def monitor_physics_engine(engine_id: str, engine: Union[EVAGPUPhysicsEngine, EVAJaxPhysicsEngine]):
    """Convenience function to register and start monitoring an engine."""
    monitor = get_physics_monitor()
    monitor.register_engine(engine_id, engine)
    if not monitor.monitoring_active:
        monitor.start_monitoring()
    return monitor
