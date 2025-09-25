"""
LOGOS Chaotic Dynamics Engine - Sistema de Dinámicas Caóticas para Emergencia Cognitiva
=====================================================================================

Motor especializado en dinámicas caóticas basado en sistemas híbridos Lorenz-Rössler.
Refactorizado directamente desde la lógica avanzada de caos.py para proporcionar
dinámicas auténticas de sistemas complejos.

Funcionalidades:
- Creación y gestión de atractores caóticos
- Evolución de estados bajo influencia de múltiples atractores
- Sistema dinámico híbrido Lorenz-Rössler
- Gestión de parámetros físicos configurables
- Análisis de estabilidad y convergencia
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

# Defensive imports following project pattern
try:
    import numpy as np
    from scipy.integrate import odeint
    HAS_ADVANCED_LIBS = True
except ImportError:
    np = None
    odeint = None
    HAS_ADVANCED_LIBS = False

logger = logging.getLogger(__name__)


@dataclass
class ChaoticAttractor:
    """
    Representa un atractor caótico en el espacio de fase.
    
    Basado en el ChaoticAttractor de caos.py con extensiones para LOGOS.
    """
    name: str
    position: list[float]
    radius: float
    stability: float
    emergence_time: float
    visit_count: int = 0
    concept_strength: float = 0.0
    influence_decay: float = 0.95
    attractor_type: str = "lorenz"  # "lorenz", "rossler", "hybrid"


@dataclass
class ChaoticParameters:
    """
    Parámetros del sistema caótico híbrido.
    
    Extendido desde caos.py con parámetros adicionales para LOGOS.
    """
    # Parámetros Lorenz
    sigma: float = 10.0      # Tasa de disipación (memoria/olvido)
    rho: float = 28.0        # Fuerza no-lineal (creatividad)
    beta: float = 8.0/3.0    # Geometría del atractor (coherencia)
    
    # Parámetros Rössler
    rossler_a: float = 0.2
    rossler_b: float = 0.2
    rossler_c: float = 5.7
    
    # Parámetros de acoplamiento
    coupling_strength: float = 0.1
    noise_level: float = 0.01
    temporal_decay: float = 0.95
    
    # Parámetros de integración
    dt: float = 0.01
    max_iterations: int = 1000


@dataclass
class DynamicsConfig:
    """Configuración del motor de dinámicas caóticas"""
    # Parámetros por defecto del sistema
    default_params: ChaoticParameters = field(default_factory=ChaoticParameters)
    
    # Límites de simulación
    max_dimensions: int = 1000
    min_dimensions: int = 3
    max_attractors: int = 50
    
    # Criterios de convergencia
    convergence_threshold: float = 1e-6
    stability_window: int = 100
    
    # Gestión de memoria
    trajectory_memory: int = 1000
    attractor_cleanup_interval: int = 100


class ChaoticDynamicsEngine:
    """
    Motor de dinámicas caóticas para sistemas cognitivos emergentes.
    
    Implementa sistemas dinámicos híbridos Lorenz-Rössler con gestión avanzada
    de atractores y evolución de estados bajo múltiples influencias.
    """
    
    def __init__(self, config: dict[str, Any]):
        """Inicializa el motor con configuración externa (GOLD.CODE Configuration-First)"""
        self.config = DynamicsConfig()
        
        # Aplicar configuración externa
        if config:
            if 'default_params' in config:
                param_dict = config['default_params']
                self.config.default_params = ChaoticParameters(**param_dict)
            
            # Aplicar otros parámetros de configuración
            for key, value in config.items():
                if hasattr(self.config, key) and key != 'default_params':
                    setattr(self.config, key, value)
        
        # Estado interno del motor
        self.attractors: dict[str, ChaoticAttractor] = {}
        self.current_params = ChaoticParameters(
            sigma=self.config.default_params.sigma,
            rho=self.config.default_params.rho,
            beta=self.config.default_params.beta,
            rossler_a=self.config.default_params.rossler_a,
            rossler_b=self.config.default_params.rossler_b,
            rossler_c=self.config.default_params.rossler_c,
            coupling_strength=self.config.default_params.coupling_strength,
            noise_level=self.config.default_params.noise_level,
            temporal_decay=self.config.default_params.temporal_decay,
            dt=self.config.default_params.dt,
            max_iterations=self.config.default_params.max_iterations
        )
        
        # Historial y métricas
        self.evolution_history: list[dict[str, Any]] = []
        self.trajectory_memory: list[list[float]] = []
        self.total_evolutions: int = 0
        self.total_computation_time: float = 0.0
        
        # Estado del sistema
        self.system_dimensionality: int = max(6, min(self.config.max_dimensions, 100))  # Default híbrido
        self.last_cleanup_time: float = time.time()
        
        logger.info(f"ChaoticDynamicsEngine initialized with {self.system_dimensionality} dimensions")

    def create_attractor(self, center: list[float], strength: float, **kwargs) -> str:
        """
        Crea un nuevo atractor caótico en el espacio de fase.
        
        Args:
            center: Posición central del atractor
            strength: Fuerza de atracción (0.0 - 1.0)
            **kwargs: Parámetros adicionales (name, radius, attractor_type, etc.)
        
        Returns:
            str: ID del atractor creado
        """
        # Validar parámetros
        if not center:
            center = [0.0, 0.0, 0.0]
        
        strength = max(0.0, min(1.0, strength))
        
        # Extender posición a dimensionalidad del sistema si es necesario
        if len(center) < self.system_dimensionality:
            extended_center = list(center)
            extended_center.extend([0.0] * (self.system_dimensionality - len(center)))
            center = extended_center
        elif len(center) > self.system_dimensionality:
            center = center[:self.system_dimensionality]
        
        # Generar ID único para el atractor
        attractor_name = kwargs.get('name', f"attractor_{len(self.attractors)}_{int(time.time())}")
        
        # Crear atractor
        attractor = ChaoticAttractor(
            name=attractor_name,
            position=center,
            radius=kwargs.get('radius', strength * 2.0),
            stability=strength,
            emergence_time=time.time(),
            concept_strength=strength,
            attractor_type=kwargs.get('attractor_type', 'hybrid'),
            influence_decay=kwargs.get('influence_decay', 0.95)
        )
        
        # Verificar límite de atractores
        if len(self.attractors) >= self.config.max_attractors:
            self._cleanup_weak_attractors()
        
        self.attractors[attractor_name] = attractor
        
        logger.debug(f"Created attractor '{attractor_name}' at {center[:3]} with strength {strength:.3f}")
        return attractor_name

    def evolve_dynamics(self, state: list[float], attractors: list[str], **kwargs) -> dict[str, Any]:
        """
        Evoluciona un estado bajo la influencia de atractores especificados.
        
        Args:
            state: Estado inicial del sistema
            attractors: Lista de IDs de atractores que influyen en la evolución
            **kwargs: Parámetros adicionales (steps, custom_params, etc.)
        
        Returns:
            dict: Resultado de la evolución con trayectoria y métricas
        """
        start_time = time.time()
        
        # Preparar estado inicial
        if not state:
            state = [0.1] * self.system_dimensionality
        elif len(state) < self.system_dimensionality:
            state = list(state) + [0.0] * (self.system_dimensionality - len(state))
        elif len(state) > self.system_dimensionality:
            state = state[:self.system_dimensionality]
        
        # Parámetros de evolución
        steps = kwargs.get('steps', 100)
        custom_params = kwargs.get('custom_params', self.current_params)
        
        # Filtrar atractores válidos
        active_attractors = {name: self.attractors[name] for name in attractors 
                           if name in self.attractors}
        
        # Evolucionar sistema
        if HAS_ADVANCED_LIBS:
            trajectory = self._evolve_with_scipy(state, active_attractors, steps, custom_params)
        else:
            trajectory = self._evolve_simple(state, active_attractors, steps, custom_params)
        
        # Calcular métricas de evolución
        evolution_metrics = self._calculate_evolution_metrics(state, trajectory, active_attractors)
        
        # Actualizar estado de atractores visitados
        self._update_attractor_visits(trajectory, active_attractors)
        
        # Almacenar en historial
        evolution_record = {
            "timestamp": time.time(),
            "initial_state": state,
            "final_state": trajectory[-1] if trajectory else state,
            "trajectory_length": len(trajectory),
            "active_attractors": list(active_attractors.keys()),
            "metrics": evolution_metrics,
            "parameters": {
                "sigma": custom_params.sigma,
                "rho": custom_params.rho,
                "beta": custom_params.beta,
                "coupling_strength": custom_params.coupling_strength
            }
        }
        
        self.evolution_history.append(evolution_record)
        self.total_evolutions += 1
        
        # Gestionar memoria de trayectoria
        if len(self.trajectory_memory) >= self.config.trajectory_memory:
            self.trajectory_memory.pop(0)
        self.trajectory_memory.extend(trajectory)
        
        computation_time = time.time() - start_time
        self.total_computation_time += computation_time
        
        # Limpieza periódica
        if time.time() - self.last_cleanup_time > self.config.attractor_cleanup_interval:
            self._periodic_cleanup()
        
        logger.debug(f"Evolved system for {steps} steps in {computation_time:.3f}s")
        
        return {
            "trajectory": trajectory,
            "final_state": trajectory[-1] if trajectory else state,
            "metrics": evolution_metrics,
            "active_attractors": list(active_attractors.keys()),
            "computation_time": computation_time,
            "convergence": evolution_metrics.get("convergence", 0.0),
            "stability": evolution_metrics.get("stability", 0.0)
        }

    def _evolve_with_scipy(self, initial_state: list[float], attractors: dict[str, ChaoticAttractor], 
                          steps: int, params: ChaoticParameters) -> list[list[float]]:
        """Evolución usando scipy.integrate.odeint para máxima precisión"""
        if not odeint:
            return self._evolve_simple(initial_state, attractors, steps, params)
        
        try:
            # Tiempo de integración
            t_span = np.linspace(0, steps * params.dt, steps)
            
            # Resolver sistema de ecuaciones diferenciales
            def dynamics_function(state, t):
                return self._hybrid_lorenz_rossler_system(state, t, attractors, params)
            
            solution = odeint(dynamics_function, initial_state, t_span)
            
            # Convertir a lista de listas
            return [list(state) for state in solution]
            
        except Exception as e:
            logger.debug(f"Scipy integration failed: {e}, falling back to simple integration")
            return self._evolve_simple(initial_state, attractors, steps, params)

    def _evolve_simple(self, initial_state: list[float], attractors: dict[str, ChaoticAttractor],
                      steps: int, params: ChaoticParameters) -> list[list[float]]:
        """Evolución simple usando integración de Euler cuando scipy no está disponible"""
        trajectory = []
        current_state = list(initial_state)
        
        for step in range(steps):
            # Calcular derivadas
            derivatives = self._hybrid_lorenz_rossler_system(current_state, step * params.dt, attractors, params)
            
            # Integración de Euler
            for i in range(len(current_state)):
                current_state[i] += derivatives[i] * params.dt
            
            # Almacenar estado
            trajectory.append(list(current_state))
            
            # Verificar convergencia temprana si es necesario
            if step > 50 and step % 10 == 0:
                if self._check_early_convergence(trajectory[-10:]):
                    logger.debug(f"Early convergence detected at step {step}")
                    break
        
        return trajectory

    def _hybrid_lorenz_rossler_system(self, state: list[float], t: float, 
                                     attractors: dict[str, ChaoticAttractor],
                                     params: ChaoticParameters) -> list[float]:
        """
        Sistema dinámico híbrido Lorenz-Rössler con influencia de atractores.
        
        Implementación directa de lorenz_rossler_hybrid_system de caos.py
        con extensiones para múltiples atractores.
        """
        n = len(state)
        derivatives = [0.0] * n
        
        # Núcleo Lorenz (primeras 3 dimensiones)
        if n >= 3:
            x, y, z = state[0], state[1], state[2]
            derivatives[0] = params.sigma * (y - x)
            derivatives[1] = x * (params.rho - z) - y
            derivatives[2] = x * y - params.beta * z
        
        # Núcleo Rössler (dimensiones 3-6)
        if n >= 6:
            x2, y2, z2 = state[3], state[4], state[5]
            derivatives[3] = -y2 - z2
            derivatives[4] = x2 + params.rossler_a * y2
            derivatives[5] = params.rossler_b + z2 * (x2 - params.rossler_c)
        
        # Acoplamiento entre subsistemas y dimensiones adicionales
        for i in range(6, n):
            coupling_term = 0.0
            
            # Acoplamiento con dimensiones anteriores
            if i >= 2:
                coupling_term += params.coupling_strength * (state[i-1] - state[i])
            if i >= 3:
                coupling_term += 0.5 * params.coupling_strength * state[i-2]
            
            # Influencia de atractores
            attractor_influence = self._calculate_attractor_influence(state, i, attractors, params)
            coupling_term += attractor_influence
            
            # Ruido estocástico controlado
            if HAS_ADVANCED_LIBS:
                noise_term = params.noise_level * np.random.normal(0, 1)
            else:
                import random
                noise_term = params.noise_level * random.gauss(0, 1)
            
            derivatives[i] = coupling_term + noise_term
        
        return derivatives

    def _calculate_attractor_influence(self, state: list[float], dimension: int,
                                     attractors: dict[str, ChaoticAttractor],
                                     params: ChaoticParameters) -> float:
        """Calcula la influencia combinada de todos los atractores en una dimensión específica"""
        total_influence = 0.0
        
        for attractor in attractors.values():
            if dimension < len(attractor.position):
                # Distancia al atractor en esta dimensión
                distance = abs(state[dimension] - attractor.position[dimension])
                
                # Fuerza de atracción (ley del inverso del cuadrado modificada)
                if distance > 0:
                    force = attractor.concept_strength / (1.0 + distance**2)
                    
                    # Dirección de la fuerza
                    direction = 1.0 if attractor.position[dimension] > state[dimension] else -1.0
                    
                    # Decaimiento temporal
                    age_factor = params.temporal_decay ** (time.time() - attractor.emergence_time)
                    
                    total_influence += force * direction * age_factor * 0.01  # Factor de escala
        
        return total_influence

    def _calculate_evolution_metrics(self, initial_state: list[float], 
                                   trajectory: list[list[float]],
                                   attractors: dict[str, ChaoticAttractor]) -> dict[str, Any]:
        """Calcula métricas detalladas de la evolución del sistema"""
        if not trajectory:
            return {"convergence": 0.0, "stability": 0.0, "complexity": 0.0}
        
        final_state = trajectory[-1]
        
        # Convergencia: cambio total del estado
        if HAS_ADVANCED_LIBS:
            state_change = float(np.linalg.norm(np.array(final_state) - np.array(initial_state)))
        else:
            state_change = sum((f - i)**2 for f, i in zip(final_state, initial_state))**0.5
        
        convergence = max(0.0, 1.0 - state_change / 100.0)  # Normalizar
        
        # Estabilidad: varianza en la segunda mitad de la trayectoria
        stability = 0.0
        if len(trajectory) > 10:
            second_half = trajectory[len(trajectory)//2:]
            
            if HAS_ADVANCED_LIBS:
                trajectory_array = np.array(second_half)
                variances = np.var(trajectory_array, axis=0)
                stability = max(0.0, 1.0 - np.mean(variances) / 10.0)
            else:
                # Cálculo simple sin numpy
                n_dims = len(final_state)
                total_variance = 0.0
                
                for dim in range(n_dims):
                    values = [state[dim] for state in second_half]
                    mean_val = sum(values) / len(values)
                    variance = sum((x - mean_val)**2 for x in values) / len(values)
                    total_variance += variance
                
                avg_variance = total_variance / n_dims
                stability = max(0.0, 1.0 - avg_variance / 10.0)
        
        # Complejidad: entropía aproximada de la trayectoria
        complexity = self._calculate_trajectory_complexity(trajectory)
        
        # Métricas específicas de atractores
        attractor_metrics = {}
        for name, attractor in attractors.items():
            # Distancia final al atractor
            if len(final_state) >= len(attractor.position):
                final_distance = sum((f - a)**2 for f, a in zip(final_state[:len(attractor.position)], 
                                                               attractor.position))**0.5
                attractor_metrics[name] = {
                    "final_distance": final_distance,
                    "attraction_strength": max(0.0, 1.0 / (1.0 + final_distance))
                }
        
        return {
            "convergence": convergence,
            "stability": stability,
            "complexity": complexity,
            "state_change": state_change,
            "trajectory_length": len(trajectory),
            "attractor_metrics": attractor_metrics,
            "energy": self._calculate_system_energy(final_state),
            "phase_space_volume": self._estimate_phase_space_volume(trajectory)
        }

    def _calculate_trajectory_complexity(self, trajectory: list[list[float]]) -> float:
        """Calcula la complejidad de una trayectoria usando entropía aproximada"""
        if len(trajectory) < 2:
            return 0.0
        
        # Simplificación: usar distancias entre estados consecutivos
        distances = []
        for i in range(1, len(trajectory)):
            if HAS_ADVANCED_LIBS:
                dist = float(np.linalg.norm(np.array(trajectory[i]) - np.array(trajectory[i-1])))
            else:
                dist = sum((a - b)**2 for a, b in zip(trajectory[i], trajectory[i-1]))**0.5
            distances.append(dist)
        
        if not distances:
            return 0.0
        
        # Complejidad basada en variabilidad de distancias
        if HAS_ADVANCED_LIBS:
            complexity = float(np.std(distances) / (np.mean(distances) + 1e-10))
        else:
            mean_dist = sum(distances) / len(distances)
            variance = sum((d - mean_dist)**2 for d in distances) / len(distances)
            complexity = (variance**0.5) / (mean_dist + 1e-10)
        
        return min(1.0, complexity)

    def _update_attractor_visits(self, trajectory: list[list[float]], 
                               attractors: dict[str, ChaoticAttractor]):
        """Actualiza contadores de visitas y fortaleza de atractores basado en la trayectoria"""
        for attractor in attractors.values():
            visits = 0
            total_proximity = 0.0
            
            for state in trajectory[-min(100, len(trajectory)):]:  # Últimos 100 estados
                if len(state) >= len(attractor.position):
                    distance = sum((s - a)**2 for s, a in zip(state[:len(attractor.position)], 
                                                             attractor.position))**0.5
                    
                    if distance < attractor.radius:
                        visits += 1
                        total_proximity += max(0.0, 1.0 - distance / attractor.radius)
            
            attractor.visit_count += visits
            
            # Actualizar fortaleza conceptual basada en proximidad
            if visits > 0:
                avg_proximity = total_proximity / visits
                attractor.concept_strength = min(1.0, attractor.concept_strength + avg_proximity * 0.01)

    def _calculate_system_energy(self, state: list[float]) -> float:
        """Calcula la energía total del sistema (magnitud del vector de estado)"""
        return sum(x**2 for x in state)**0.5

    def _estimate_phase_space_volume(self, trajectory: list[list[float]]) -> float:
        """Estima el volumen ocupado en el espacio de fase"""
        if not trajectory or not HAS_ADVANCED_LIBS:
            return 0.0
        
        try:
            trajectory_array = np.array(trajectory)
            # Usar determinante de matriz de covarianza como proxy del volumen
            if trajectory_array.shape[1] > 1:
                cov_matrix = np.cov(trajectory_array.T)
                volume = np.sqrt(np.linalg.det(cov_matrix))
                return float(volume)
        except:
            pass
        
        return 0.0

    def _check_early_convergence(self, recent_states: list[list[float]]) -> bool:
        """Verifica si el sistema ha convergido prematuramente"""
        if len(recent_states) < 5:
            return False
        
        # Calcular varianza promedio en estados recientes
        total_variance = 0.0
        n_dims = len(recent_states[0])
        
        for dim in range(n_dims):
            values = [state[dim] for state in recent_states]
            mean_val = sum(values) / len(values)
            variance = sum((x - mean_val)**2 for x in values) / len(values)
            total_variance += variance
        
        avg_variance = total_variance / n_dims
        return avg_variance < self.config.convergence_threshold

    def _cleanup_weak_attractors(self):
        """Elimina atractores débiles cuando se alcanza el límite máximo"""
        if len(self.attractors) < self.config.max_attractors:
            return
        
        # Ordenar atractores por fortaleza conceptual y visitas
        attractor_scores = {}
        for name, attractor in self.attractors.items():
            score = attractor.concept_strength * 0.7 + attractor.visit_count * 0.001
            # Penalizar atractores muy antiguos
            age_penalty = (time.time() - attractor.emergence_time) / 3600.0  # horas
            score -= min(0.5, age_penalty * 0.1)
            attractor_scores[name] = score
        
        # Eliminar los más débiles
        sorted_attractors = sorted(attractor_scores.items(), key=lambda x: x[1])
        to_remove = sorted_attractors[:len(self.attractors) - self.config.max_attractors + 5]
        
        for name, _ in to_remove:
            if name in self.attractors:
                del self.attractors[name]
                logger.debug(f"Cleaned up weak attractor: {name}")

    def _periodic_cleanup(self):
        """Limpieza periódica del sistema"""
        self.last_cleanup_time = time.time()
        
        # Limpiar atractores débiles
        self._cleanup_weak_attractors()
        
        # Limpiar historial antiguo
        if len(self.evolution_history) > 1000:
            self.evolution_history = self.evolution_history[-500:]
        
        # Aplicar decaimiento temporal a atractores
        for attractor in self.attractors.values():
            age = time.time() - attractor.emergence_time
            decay_factor = self.current_params.temporal_decay ** (age / 3600.0)  # por hora
            attractor.concept_strength *= decay_factor
        
        logger.debug("Performed periodic cleanup")

    def update_parameters(self, new_params: dict[str, Any]):
        """Actualiza parámetros del sistema dinámicamente"""
        for param, value in new_params.items():
            if hasattr(self.current_params, param):
                setattr(self.current_params, param, value)
                logger.debug(f"Updated parameter {param} = {value}")

    def get_attractor_info(self, attractor_id: str) -> dict[str, Any]:
        """Obtiene información detallada de un atractor específico"""
        if attractor_id not in self.attractors:
            return {"error": f"Attractor {attractor_id} not found"}
        
        attractor = self.attractors[attractor_id]
        return {
            "name": attractor.name,
            "position": attractor.position[:6],  # Solo primeras 6 dimensiones para visualización
            "radius": attractor.radius,
            "stability": attractor.stability,
            "concept_strength": attractor.concept_strength,
            "visit_count": attractor.visit_count,
            "age": time.time() - attractor.emergence_time,
            "attractor_type": attractor.attractor_type,
            "influence_decay": attractor.influence_decay
        }

    def get_system_state(self) -> dict[str, Any]:
        """Obtiene el estado completo del motor de dinámicas caóticas"""
        return {
            "configuration": {
                "system_dimensionality": self.system_dimensionality,
                "max_attractors": self.config.max_attractors,
                "trajectory_memory": self.config.trajectory_memory,
                "convergence_threshold": self.config.convergence_threshold
            },
            "parameters": {
                "sigma": self.current_params.sigma,
                "rho": self.current_params.rho,
                "beta": self.current_params.beta,
                "rossler_a": self.current_params.rossler_a,
                "rossler_b": self.current_params.rossler_b,
                "rossler_c": self.current_params.rossler_c,
                "coupling_strength": self.current_params.coupling_strength,
                "noise_level": self.current_params.noise_level,
                "temporal_decay": self.current_params.temporal_decay
            },
            "attractors": {
                "total_count": len(self.attractors),
                "active_attractors": list(self.attractors.keys()),
                "average_strength": (sum(a.concept_strength for a in self.attractors.values()) / 
                                   len(self.attractors)) if self.attractors else 0.0,
                "most_visited": max(self.attractors.items(), 
                                  key=lambda x: x[1].visit_count)[0] if self.attractors else None
            },
            "performance": {
                "total_evolutions": self.total_evolutions,
                "total_computation_time": self.total_computation_time,
                "avg_computation_time": (self.total_computation_time / max(1, self.total_evolutions)),
                "trajectory_memory_usage": len(self.trajectory_memory),
                "evolution_history_size": len(self.evolution_history)
            },
            "dynamics": {
                "last_evolution": self.evolution_history[-1] if self.evolution_history else None,
                "system_energy": (self._calculate_system_energy(self.evolution_history[-1]["final_state"]) 
                                if self.evolution_history else 0.0),
                "phase_space_volume": (self._estimate_phase_space_volume(
                    [self.trajectory_memory[-100:]]) if len(self.trajectory_memory) >= 100 else 0.0)
            },
            "capabilities": {
                "advanced_integration": HAS_ADVANCED_LIBS,
                "scipy_available": odeint is not None,
                "numpy_available": np is not None,
                "hybrid_dynamics": True,
                "multi_attractor_support": True
            }
        }

    def reset_system(self, preserve_attractors: bool = False):
        """Resetea el sistema a estado inicial"""
        if not preserve_attractors:
            self.attractors.clear()
        
        self.evolution_history.clear()
        self.trajectory_memory.clear()
        self.total_evolutions = 0
        self.total_computation_time = 0.0
        
        # Resetear parámetros a valores por defecto
        self.current_params = ChaoticParameters(
            sigma=self.config.default_params.sigma,
            rho=self.config.default_params.rho,
            beta=self.config.default_params.beta,
            rossler_a=self.config.default_params.rossler_a,
            rossler_b=self.config.default_params.rossler_b,
            rossler_c=self.config.default_params.rossler_c,
            coupling_strength=self.config.default_params.coupling_strength,
            noise_level=self.config.default_params.noise_level,
            temporal_decay=self.config.default_params.temporal_decay
        )
        
        logger.info("System reset completed")

    def export_attractor_network(self) -> dict[str, Any]:
        """Exporta la red de atractores para análisis o visualización"""
        network_data = {
            "nodes": [],
            "edges": [],
            "metadata": {
                "total_attractors": len(self.attractors),
                "system_dimensionality": self.system_dimensionality,
                "export_timestamp": time.time()
            }
        }
        
        # Exportar nodos (atractores)
        for attractor in self.attractors.values():
            network_data["nodes"].append({
                "id": attractor.name,
                "position": attractor.position[:3],  # Solo 3D para visualización
                "strength": attractor.concept_strength,
                "visits": attractor.visit_count,
                "radius": attractor.radius,
                "age": time.time() - attractor.emergence_time,
                "type": attractor.attractor_type
            })
        
        # Calcular conexiones entre atractores (basado en proximidad)
        attractor_list = list(self.attractors.values())
        for i, attr1 in enumerate(attractor_list):
            for j, attr2 in enumerate(attractor_list[i+1:], i+1):
                # Calcular distancia entre atractores
                distance = sum((a - b)**2 for a, b in zip(attr1.position[:3], attr2.position[:3]))**0.5
                
                # Crear arista si están suficientemente cerca
                connection_threshold = (attr1.radius + attr2.radius) * 1.5
                if distance < connection_threshold:
                    network_data["edges"].append({
                        "source": attr1.name,
                        "target": attr2.name,
                        "distance": distance,
                        "strength": max(attr1.concept_strength, attr2.concept_strength),
                        "type": "proximity"
                    })
        
        return network_data

    def analyze_system_dynamics(self) -> dict[str, Any]:
        """Análisis avanzado de las dinámicas del sistema"""
        if not self.evolution_history:
            return {"error": "No evolution history available"}
        
        analysis = {
            "stability_analysis": {},
            "convergence_patterns": {},
            "attractor_influence": {},
            "system_complexity": {},
            "temporal_dynamics": {}
        }
        
        # Análisis de estabilidad
        recent_evolutions = self.evolution_history[-min(50, len(self.evolution_history)):]
        stabilities = [evo["metrics"]["stability"] for evo in recent_evolutions]
        
        analysis["stability_analysis"] = {
            "mean_stability": sum(stabilities) / len(stabilities),
            "stability_trend": "increasing" if stabilities[-1] > stabilities[0] else "decreasing",
            "stability_variance": sum((s - sum(stabilities)/len(stabilities))**2 for s in stabilities) / len(stabilities)
        }
        
        # Análisis de convergencia
        convergences = [evo["metrics"]["convergence"] for evo in recent_evolutions]
        analysis["convergence_patterns"] = {
            "mean_convergence": sum(convergences) / len(convergences),
            "convergence_trend": "improving" if convergences[-1] > convergences[0] else "declining",
            "fast_convergence_rate": sum(1 for c in convergences if c > 0.8) / len(convergences)
        }
        
        # Análisis de influencia de atractores
        attractor_usage = {}
        for evolution in recent_evolutions:
            for attractor_name in evolution["active_attractors"]:
                attractor_usage[attractor_name] = attractor_usage.get(attractor_name, 0) + 1
        
        analysis["attractor_influence"] = {
            "most_influential": max(attractor_usage.items(), key=lambda x: x[1]) if attractor_usage else None,
            "usage_distribution": attractor_usage,
            "active_attractor_ratio": len(attractor_usage) / max(1, len(self.attractors))
        }
        
        # Análisis de complejidad del sistema
        complexities = [evo["metrics"]["complexity"] for evo in recent_evolutions]
        analysis["system_complexity"] = {
            "mean_complexity": sum(complexities) / len(complexities),
            "complexity_evolution": "increasing" if complexities[-1] > complexities[0] else "decreasing",
            "high_complexity_rate": sum(1 for c in complexities if c > 0.7) / len(complexities)
        }
        
        # Dinámicas temporales
        time_spans = [evo["timestamp"] - recent_evolutions[0]["timestamp"] for evo in recent_evolutions[1:]]
        analysis["temporal_dynamics"] = {
            "evolution_frequency": len(time_spans) / (max(time_spans) if time_spans else 1),
            "system_age": time.time() - recent_evolutions[0]["timestamp"],
            "parameter_stability": self._analyze_parameter_stability(recent_evolutions)
        }
        
        return analysis

    def _analyze_parameter_stability(self, evolutions: list[dict[str, Any]]) -> dict[str, float]:
        """Analiza la estabilidad de los parámetros del sistema a lo largo del tiempo"""
        param_variations = {
            "sigma": [],
            "rho": [],
            "beta": [],
            "coupling_strength": []
        }
        
        for evolution in evolutions:
            params = evolution["parameters"]
            for param_name in param_variations.keys():
                if param_name in params:
                    param_variations[param_name].append(params[param_name])
        
        stability_scores = {}
        for param_name, values in param_variations.items():
            if values:
                mean_val = sum(values) / len(values)
                variance = sum((x - mean_val)**2 for x in values) / len(values)
                # Estabilidad alta = varianza baja
                stability_scores[param_name] = max(0.0, 1.0 - variance / (mean_val**2 + 1e-10))
        
        return stability_scores