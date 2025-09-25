"""
LOGOS Emergence Engine - Sistema de Detección y Evolución de Emergencia Auténtica
=================================================================================

Módulo especializado en detectar patrones emergentes y evolucionar sistemas complejos
basado en dinámicas caóticas reales. Refactorizado desde la lógica avanzada de caos.py.

Integración con ecosistema Crisalida:
- EDEN: Nodos del Árbol de la Vida con capacidad de emergencia auténtica
- EVA: Memoria viviente para patrones emergentes
- ADAM: Integración con sistemas cognitivos
- LOGOS: VM simbólica para interpretación emergente
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

# Defensive imports following project pattern
try:
    import numpy as np
    from scipy.ndimage import maximum_filter
    HAS_ADVANCED_LIBS = True
except ImportError:
    np = None
    HAS_ADVANCED_LIBS = False

logger = logging.getLogger(__name__)


@dataclass 
class EmergentPattern:
    """Representa un patrón emergente detectado en el sistema"""
    pattern_id: str
    center_position: list[float]
    strength: float
    stability: float
    emergence_time: float
    evolution_count: int = 0
    complexity_measure: float = 0.0
    pattern_type: str = "general"


@dataclass
class EmergenceConfig:
    """Configuración del motor de emergencia"""
    # Parámetros de detección
    density_threshold: float = 2.0
    stability_threshold: float = 0.1
    complexity_threshold: float = 0.05
    max_patterns: int = 10
    
    # Parámetros de evolución
    evolution_steps: int = 100
    evolution_dt: float = 0.01
    noise_level: float = 0.01
    
    # Parámetros del sistema caótico (híbrido Lorenz-Rössler)
    sigma: float = 10.0  # Disipación
    rho: float = 28.0    # Fuerza no-lineal
    beta: float = 8.0/3.0 # Geometría del atractor
    coupling_strength: float = 0.1


class EmergenceEngine:
    """
    Motor de emergencia auténtica basado en dinámicas caóticas.
    
    Detecta patrones emergentes mediante análisis de densidad en espacio de fase
    y evoluciona patrones usando sistemas dinámicos híbridos Lorenz-Rössler.
    """
    
    def __init__(self, config: dict[str, Any]):
        """Inicializa el motor con configuración externa"""
        # Cargar configuración con fallbacks
        self.config = EmergenceConfig(**config) if config else EmergenceConfig()
        
        # Estado interno del sistema
        self.detected_patterns: dict[str, EmergentPattern] = {}
        self.evolution_history: list[dict[str, Any]] = []
        self.emergence_events: list[dict[str, Any]] = []
        
        # Métricas de performance
        self.total_detections: int = 0
        self.total_evolutions: int = 0
        self.processing_time: float = 0.0
        
        logger.info(f"EmergenceEngine initialized with {len(config) if config else 0} custom parameters")

    def detect_emergence(self, data: dict[str, Any]) -> list[EmergentPattern]:
        """
        Detecta patrones emergentes en datos mediante análisis de densidad en espacio de fase.
        
        Basado en _detect_emergent_attractors de caos.py con mejoras arquitectónicas.
        """
        start_time = time.time()
        
        if not HAS_ADVANCED_LIBS:
            return self._simple_emergence_detection(data)
        
        try:
            # Convertir datos a representación numérica para análisis
            numerical_data = self._extract_numerical_features(data)
            
            if not numerical_data or len(numerical_data) < 10:
                logger.debug("Insufficient numerical data for emergence detection")
                return []
            
            # Análisis de densidad en espacio de fase
            patterns = self._analyze_phase_space_density(numerical_data)
            
            # Filtrar por criterios de emergencia
            emergent_patterns = self._filter_emergent_patterns(patterns, data)
            
            # Actualizar estado interno
            for pattern in emergent_patterns:
                self.detected_patterns[pattern.pattern_id] = pattern
            
            self.total_detections += len(emergent_patterns)
            self.processing_time += time.time() - start_time
            
            if emergent_patterns:
                self.emergence_events.append({
                    "timestamp": time.time(),
                    "pattern_count": len(emergent_patterns),
                    "data_signature": hash(str(data)),
                    "detection_method": "phase_space_density"
                })
            
            logger.debug(f"Detected {len(emergent_patterns)} emergent patterns")
            return emergent_patterns
            
        except Exception as e:
            logger.warning(f"Advanced emergence detection failed: {e}, using fallback")
            return self._simple_emergence_detection(data)

    def evolve_pattern(self, pattern_data: dict[str, Any], steps: int = 1) -> dict[str, Any]:
        """
        Evoluciona un patrón emergente usando dinámicas caóticas híbridas.
        
        Basado en la lógica de _evolve_system y lorenz_rossler_hybrid_system de caos.py.
        """
        start_time = time.time()
        
        # Extraer estado inicial del patrón
        initial_state = self._pattern_to_state(pattern_data)
        
        # Evolucionar usando sistema dinámico híbrido
        evolved_states = self._evolve_chaotic_system(initial_state, steps)
        
        # Convertir estado evolucionado de vuelta a representación de patrón
        evolved_pattern = self._state_to_pattern(evolved_states[-1] if evolved_states else initial_state)
        
        # Calcular métricas de evolución
        evolution_metrics = self._calculate_evolution_metrics(initial_state, evolved_states)
        
        self.total_evolutions += 1
        self.evolution_history.append({
            "timestamp": time.time(),
            "initial_state": initial_state,
            "evolved_state": evolved_states[-1] if evolved_states else initial_state,
            "steps": steps,
            "metrics": evolution_metrics
        })
        
        evolution_time = time.time() - start_time
        self.processing_time += evolution_time
        
        return {
            "evolved_pattern": evolved_pattern,
            "evolution_trajectory": evolved_states,
            "metrics": evolution_metrics,
            "processing_time": evolution_time,
            "convergence": evolution_metrics.get("convergence", 0.0)
        }

    def _extract_numerical_features(self, data: dict[str, Any]) -> list[list[float]]:
        """Extrae características numéricas de los datos para análisis"""
        features = []
        
        def extract_recursive(obj, current_path=""):
            if isinstance(obj, (int, float)):
                return [float(obj)]
            elif isinstance(obj, str):
                # Convertir strings a características numéricas
                return [len(obj), hash(obj) % 1000 / 1000.0]
            elif isinstance(obj, dict):
                values = []
                for key, value in obj.items():
                    values.extend(extract_recursive(value, f"{current_path}.{key}"))
                return values
            elif isinstance(obj, list):
                values = []
                for i, item in enumerate(obj):
                    values.extend(extract_recursive(item, f"{current_path}[{i}]"))
                return values
            else:
                # Para otros tipos, usar hash como característica
                return [hash(str(obj)) % 1000 / 1000.0]
        
        # Extraer todas las características
        all_features = extract_recursive(data)
        
        # Agrupar en vectores de dimensión fija para análisis de densidad
        vector_size = min(10, len(all_features)) if all_features else 3
        
        for i in range(0, len(all_features), vector_size):
            vector = all_features[i:i + vector_size]
            # Pad con ceros si es necesario
            while len(vector) < vector_size:
                vector.append(0.0)
            features.append(vector)
        
        return features

    def _analyze_phase_space_density(self, data: list[list[float]]) -> list[EmergentPattern]:
        """Análisis de densidad en espacio de fase para detectar atractores emergentes"""
        if not data or not HAS_ADVANCED_LIBS:
            return []
        
        try:
            # Convertir a array numpy para análisis
            data_array = np.array(data)
            
            # Usar solo las primeras 3 dimensiones para visualización/análisis
            if data_array.shape[1] >= 3:
                analysis_data = data_array[:, :3]
            else:
                # Pad con ceros si hay menos de 3 dimensiones
                padded = np.zeros((data_array.shape[0], 3))
                padded[:, :data_array.shape[1]] = data_array
                analysis_data = padded
            
            # Crear histograma de densidad 3D
            density_map, edges = np.histogramdd(analysis_data, bins=20)
            
            # Detectar picos de densidad usando filtros
            peaks = maximum_filter(density_map, size=3) == density_map
            
            # Encontrar coordenadas de picos significativos
            mean_density = np.mean(density_map)
            significant_peaks = peaks & (density_map > mean_density * self.config.density_threshold)
            peak_coordinates = np.argwhere(significant_peaks)
            
            patterns = []
            for i, coord in enumerate(peak_coordinates):
                if len(patterns) >= self.config.max_patterns:
                    break
                
                # Convertir coordenadas de bins a posición real
                real_position = []
                for dim, c in enumerate(coord):
                    if dim < len(edges):
                        edge = edges[dim]
                        if c < len(edge) - 1:
                            pos = edge[c] + (edge[c+1] - edge[c]) / 2
                            real_position.append(float(pos))
                
                # Calcular métricas del patrón
                pattern_strength = float(density_map[tuple(coord)]) / np.max(density_map)
                pattern_stability = self._calculate_pattern_stability(analysis_data, real_position)
                
                pattern = EmergentPattern(
                    pattern_id=f"emergence_{int(time.time())}_{i}",
                    center_position=real_position,
                    strength=pattern_strength,
                    stability=pattern_stability,
                    emergence_time=time.time(),
                    complexity_measure=self._calculate_pattern_complexity(analysis_data, real_position),
                    pattern_type="phase_space_attractor"
                )
                
                patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.debug(f"Phase space density analysis failed: {e}")
            return []

    def _filter_emergent_patterns(self, patterns: list[EmergentPattern], original_data: dict[str, Any]) -> list[EmergentPattern]:
        """Filtra patrones basado en criterios de emergencia auténtica"""
        filtered = []
        
        for pattern in patterns:
            # Filtros de calidad
            if pattern.strength < self.config.stability_threshold:
                continue
            
            if pattern.complexity_measure < self.config.complexity_threshold:
                continue
            
            # Verificar novedad (no debe ser similar a patrones existentes)
            is_novel = True
            for existing_id, existing_pattern in self.detected_patterns.items():
                similarity = self._calculate_pattern_similarity(pattern, existing_pattern)
                if similarity > 0.8:  # Muy similar a patrón existente
                    is_novel = False
                    break
            
            if is_novel:
                filtered.append(pattern)
        
        return filtered

    def _evolve_chaotic_system(self, initial_state: list[float], steps: int) -> list[list[float]]:
        """Evoluciona el sistema usando dinámicas caóticas híbridas Lorenz-Rössler"""
        if not HAS_ADVANCED_LIBS:
            return self._simple_evolution(initial_state, steps)
        
        try:
            from scipy.integrate import odeint
            
            # Asegurar que el estado tenga al menos 6 dimensiones para híbrido Lorenz-Rössler
            if len(initial_state) < 6:
                initial_state.extend([0.0] * (6 - len(initial_state)))
            
            # Tiempo de integración
            t_span = np.arange(0, steps * self.config.evolution_dt, self.config.evolution_dt)
            
            # Resolver ecuación diferencial
            solution = odeint(self._hybrid_dynamics, initial_state, t_span)
            
            return [list(state) for state in solution]
            
        except Exception as e:
            logger.debug(f"Advanced evolution failed: {e}, using simple evolution")
            return self._simple_evolution(initial_state, steps)

    def _hybrid_dynamics(self, state: list[float], t: float) -> list[float]:
        """
        Sistema dinámico híbrido Lorenz-Rössler para evolución de patrones.
        
        Adaptado de lorenz_rossler_hybrid_system en caos.py.
        """
        n = len(state)
        derivatives = [0.0] * n
        
        # Núcleo Lorenz (primeras 3 dimensiones)
        if n >= 3:
            x, y, z = state[0], state[1], state[2]
            derivatives[0] = self.config.sigma * (y - x)
            derivatives[1] = x * (self.config.rho - z) - y
            derivatives[2] = x * y - self.config.beta * z
        
        # Núcleo Rössler (dimensiones 3-6)
        if n >= 6:
            a, b, c = 0.2, 0.2, 5.7  # Parámetros Rössler estándar
            x2, y2, z2 = state[3], state[4], state[5]
            derivatives[3] = -y2 - z2
            derivatives[4] = x2 + a * y2
            derivatives[5] = b + z2 * (x2 - c)
        
        # Acoplamiento entre subsistemas
        for i in range(6, n):
            coupling_term = 0.0
            if i >= 2:
                coupling_term = self.config.coupling_strength * (state[i-1] - state[i])
            
            # Ruido estocástico controlado
            noise_term = self.config.noise_level * (np.random.normal(0, 1) if HAS_ADVANCED_LIBS else 0.0)
            
            derivatives[i] = coupling_term + noise_term
        
        return derivatives

    def _simple_emergence_detection(self, data: dict[str, Any]) -> list[EmergentPattern]:
        """Detección simple de emergencia sin dependencias avanzadas"""
        patterns = []
        
        # Análisis estadístico básico
        numerical_features = self._extract_numerical_features(data)
        
        if not numerical_features:
            return patterns
        
        # Calcular estadísticas básicas
        all_values = [val for feature_vec in numerical_features for val in feature_vec]
        
        if len(all_values) < 5:
            return patterns
        
        mean_val = sum(all_values) / len(all_values)
        variance = sum((x - mean_val) ** 2 for x in all_values) / len(all_values)
        std_dev = variance ** 0.5
        
        # Detectar valores que se desvían significativamente (potenciales atractores)
        outliers = [x for x in all_values if abs(x - mean_val) > 2 * std_dev]
        
        if len(outliers) >= 3:  # Suficientes puntos anómalos para considerar emergencia
            # Crear patrón emergente simple
            pattern = EmergentPattern(
                pattern_id=f"simple_emergence_{int(time.time())}",
                center_position=[mean_val, std_dev, len(outliers)],
                strength=min(1.0, len(outliers) / len(all_values) * 2),
                stability=max(0.1, 1.0 - variance),
                emergence_time=time.time(),
                complexity_measure=variance,
                pattern_type="statistical_anomaly"
            )
            patterns.append(pattern)
        
        return patterns

    def _simple_evolution(self, initial_state: list[float], steps: int) -> list[list[float]]:
        """Evolución simple sin scipy"""
        current_state = list(initial_state)
        trajectory = [list(current_state)]
        
        for _ in range(steps):
            # Aplicar transformación simple
            derivatives = self._simple_dynamics(current_state)
            
            # Integración de Euler
            for i in range(len(current_state)):
                current_state[i] += derivatives[i] * self.config.evolution_dt
            
            trajectory.append(list(current_state))
        
        return trajectory

    def _simple_dynamics(self, state: list[float]) -> list[float]:
        """Dinámicas simplificadas sin numpy"""
        n = len(state)
        derivatives = []
        
        for i in range(n):
            if i < 3 and n >= 3:
                # Sistema Lorenz simplificado
                if i == 0:
                    deriv = self.config.sigma * (state[1] - state[0])
                elif i == 1:
                    deriv = state[0] * (self.config.rho - state[2]) - state[1]
                else:  # i == 2
                    deriv = state[0] * state[1] - self.config.beta * state[2]
            else:
                # Acoplamiento simple
                prev_val = state[i-1] if i > 0 else 0
                deriv = self.config.coupling_strength * (prev_val - state[i])
            
            derivatives.append(deriv)
        
        return derivatives

    def _pattern_to_state(self, pattern_data: dict[str, Any]) -> list[float]:
        """Convierte datos de patrón a estado numérico para evolución"""
        # Extraer características numéricas del patrón
        features = self._extract_numerical_features(pattern_data)
        
        if not features:
            return [0.1, 0.1, 0.1]  # Estado mínimo
        
        # Aplanar y normalizar
        flat_features = [val for feature_vec in features for val in feature_vec]
        
        # Tomar primeras 10 características o pad con ceros
        state = flat_features[:10] if len(flat_features) >= 10 else flat_features
        while len(state) < 6:  # Mínimo para sistema híbrido
            state.append(0.0)
        
        return state

    def _state_to_pattern(self, state: list[float]) -> dict[str, Any]:
        """Convierte estado numérico evolucionado de vuelta a representación de patrón"""
        return {
            "evolved_coordinates": state,
            "pattern_magnitude": sum(x**2 for x in state)**0.5,
            "complexity_indicator": len([x for x in state if abs(x) > 0.1]),
            "dominant_frequency": state[0] if state else 0.0,
            "phase_coherence": max(state) - min(state) if state else 0.0,
            "evolution_signature": hash(tuple(round(x, 3) for x in state))
        }

    def _calculate_evolution_metrics(self, initial_state: list[float], evolved_states: list[list[float]]) -> dict[str, float]:
        """Calcula métricas de la evolución del patrón"""
        if not evolved_states:
            return {"convergence": 0.0, "stability": 0.0, "complexity": 0.0}
        
        final_state = evolved_states[-1]
        
        # Convergencia: qué tanto cambió el estado
        state_change = sum((f - i)**2 for f, i in zip(final_state, initial_state))**0.5
        convergence = max(0.0, 1.0 - state_change / 10.0)  # Normalizar
        
        # Estabilidad: varianza en la segunda mitad de la evolución
        if len(evolved_states) > 10:
            second_half = evolved_states[len(evolved_states)//2:]
            variances = []
            for dim in range(len(final_state)):
                values = [state[dim] for state in second_half]
                mean_val = sum(values) / len(values)
                variance = sum((x - mean_val)**2 for x in values) / len(values)
                variances.append(variance)
            
            stability = max(0.0, 1.0 - sum(variances) / len(variances))
        else:
            stability = 0.5
        
        # Complejidad: entropía aproximada de la trayectoria
        complexity = min(1.0, len(evolved_states) * sum(variances if 'variances' in locals() else [0.1]) / 100.0)
        
        return {
            "convergence": convergence,
            "stability": stability, 
            "complexity": complexity,
            "total_evolution": state_change,
            "trajectory_length": len(evolved_states)
        }

    def _calculate_pattern_stability(self, data: Any, position: list[float]) -> float:
        """Calcula estabilidad de un patrón basado en su vecindario"""
        if not HAS_ADVANCED_LIBS or not data.size:
            return 0.5
        
        # Calcular distancias a la posición del patrón
        distances = []
        for point in data:
            if len(point) >= len(position):
                dist = sum((p - pos)**2 for p, pos in zip(point[:len(position)], position))**0.5
                distances.append(dist)
        
        if not distances:
            return 0.5
        
        # Estabilidad basada en densidad local
        local_radius = np.std(distances) if distances else 1.0
        local_points = [d for d in distances if d < local_radius]
        local_density = len(local_points) / len(distances)
        
        return min(1.0, local_density * 2)

    def _calculate_pattern_complexity(self, data: Any, position: list[float]) -> float:
        """Calcula complejidad de un patrón"""
        if not HAS_ADVANCED_LIBS:
            return 0.5
        
        # Complejidad basada en variabilidad local
        try:
            local_variance = np.var(data, axis=0)
            complexity = float(np.mean(local_variance))
            return min(1.0, complexity)
        except:
            return 0.5

    def _calculate_pattern_similarity(self, pattern1: EmergentPattern, pattern2: EmergentPattern) -> float:
        """Calcula similaridad entre dos patrones"""
        if len(pattern1.center_position) != len(pattern2.center_position):
            return 0.0
        
        # Distancia euclidiana normalizada
        distance = sum((p1 - p2)**2 for p1, p2 in zip(pattern1.center_position, pattern2.center_position))**0.5
        max_distance = max(1.0, max(max(pattern1.center_position), max(pattern2.center_position)))
        
        similarity = max(0.0, 1.0 - distance / max_distance)
        return similarity

    def get_system_state(self) -> dict[str, Any]:
        """Obtiene estado completo del motor de emergencia"""
        return {
            "config": {
                "density_threshold": self.config.density_threshold,
                "stability_threshold": self.config.stability_threshold,
                "max_patterns": self.config.max_patterns,
                "evolution_steps": self.config.evolution_steps,
                "sigma": self.config.sigma,
                "rho": self.config.rho,
                "beta": self.config.beta
            },
            "patterns": {
                "total_detected": len(self.detected_patterns),
                "active_patterns": list(self.detected_patterns.keys()),
                "emergence_events": len(self.emergence_events)
            },
            "performance": {
                "total_detections": self.total_detections,
                "total_evolutions": self.total_evolutions,
                "processing_time": self.processing_time,
                "avg_detection_time": self.processing_time / max(1, self.total_detections)
            },
            "capabilities": {
                "advanced_libs_available": HAS_ADVANCED_LIBS,
                "phase_space_analysis": HAS_ADVANCED_LIBS,
                "hybrid_dynamics": True
            }
        }