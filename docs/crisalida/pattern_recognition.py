"""
LOGOS Pattern Recognition System - Reconocimiento Avanzado de Patrones
=====================================================================

Sistema especializado en identificación de patrones complejos y estructuras emergentes.
Inspirado en la lógica avanzada del HodNode y extendido para el ecosistema LOGOS.

Capacidades:
- Reconocimiento de secuencias temporales y numéricas
- Análisis de consistencia estadística
- Detección de patrones recursivos y auto-organizativos
- Análisis de entropía y complejidad informacional
- Integración con dinámicas caóticas para patrones emergentes
"""

import logging
import math
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

# Defensive imports
try:
    import numpy as np
    from scipy import stats
    from scipy.fft import fft, fftfreq
    HAS_ADVANCED_LIBS = True
except ImportError:
    np = None
    stats = None
    HAS_ADVANCED_LIBS = False

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Tipos de patrones identificables por el sistema"""
    SEQUENTIAL = "sequential"
    RECURSIVE = "recursive"
    SELF_ORGANIZING = "self_organizing"
    FRACTAL = "fractal"
    PERIODIC = "periodic"
    CHAOTIC = "chaotic"
    STATISTICAL = "statistical"
    EMERGENT = "emergent"
    STRUCTURAL = "structural"
    SEMANTIC = "semantic"


@dataclass
class IdentifiedPattern:
    """Representa un patrón identificado en los datos"""
    pattern_id: str
    pattern_type: PatternType
    confidence: float
    strength: float
    description: str
    metadata: dict[str, Any] = field(default_factory=dict)
    discovery_time: float = field(default_factory=time.time)
    validation_score: float = 0.0
    complexity_measure: float = 0.0


@dataclass
class PatternRecognitionConfig:
    """Configuración del sistema de reconocimiento de patrones"""
    # Umbrales de detección
    min_confidence: float = 0.3
    min_strength: float = 0.1
    min_complexity: float = 0.05
    
    # Parámetros de análisis
    sequence_min_length: int = 3
    correlation_threshold: float = 0.7
    entropy_bins: int = 50
    spectral_resolution: int = 256
    
    # Memoria y historial
    max_pattern_memory: int = 100
    validation_window: int = 10
    
    # Análisis estadístico
    outlier_threshold: float = 2.0
    periodicity_min_cycles: int = 2
    fractal_dimension_threshold: float = 1.1


class PatternRecognitionSystem:
    """
    Sistema avanzado de reconocimiento de patrones basado en múltiples técnicas analíticas.
    
    Combina análisis estadístico, procesamiento de señales, teoría de la información
    y dinámicas no-lineales para identificar patrones complejos.
    """
    
    def __init__(self, config: dict[str, Any]):
        """Inicializa el sistema con configuración externa"""
        self.config = PatternRecognitionConfig(**config) if config else PatternRecognitionConfig()
        
        # Estado interno
        self.identified_patterns: dict[str, IdentifiedPattern] = {}
        self.pattern_history: deque = deque(maxlen=self.config.max_pattern_memory)
        self.validation_cache: dict[str, list[float]] = {}
        
        # Estadísticas y métricas
        self.total_identifications: int = 0
        self.successful_validations: int = 0
        self.processing_time: float = 0.0
        
        # Memoria de patrones para refuerzo histórico (inspirado en HodNode)
        self.pattern_memory: dict[str, int] = {}
        self.confidence_history: deque[float] = deque(maxlen=50)
        
        logger.info(f"PatternRecognitionSystem initialized with {len(config) if config else 0} custom parameters")

    def identify_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """
        Identifica patrones significativos en los datos usando múltiples técnicas analíticas.
        
        Inspirado en los métodos avanzados del HodNode pero extendido para LOGOS.
        """
        start_time = time.time()
        identified = []
        
        # Análisis de secuencias numéricas (inspirado en HodNode._analyze_patterns)
        sequential_patterns = self._identify_sequential_patterns(data)
        identified.extend(sequential_patterns)
        
        # Análisis de estructura lógica y semántica
        structural_patterns = self._identify_structural_patterns(data)
        identified.extend(structural_patterns)
        
        # Análisis de periodicidad y frecuencias
        if HAS_ADVANCED_LIBS:
            spectral_patterns = self._identify_spectral_patterns(data)
            identified.extend(spectral_patterns)
        
        # Análisis de auto-organización y recursión
        recursive_patterns = self._identify_recursive_patterns(data)
        identified.extend(recursive_patterns)
        
        # Análisis de complejidad y entropía informacional
        complexity_patterns = self._identify_complexity_patterns(data)
        identified.extend(complexity_patterns)
        
        # Detección de patrones emergentes y caóticos
        emergent_patterns = self._identify_emergent_patterns(data)
        identified.extend(emergent_patterns)
        
        # Filtrar y validar patrones
        validated_patterns = self._validate_patterns(identified)
        
        # Actualizar estado interno
        for pattern in validated_patterns:
            self.identified_patterns[pattern.pattern_id] = pattern
            self.pattern_history.append(pattern)
            
            # Refuerzo histórico de patrones
            pattern_signature = f"{pattern.pattern_type.value}_{pattern.description[:20]}"
            self.pattern_memory[pattern_signature] = self.pattern_memory.get(pattern_signature, 0) + 1
        
        # Actualizar métricas
        self.total_identifications += len(validated_patterns)
        self.successful_validations += len([p for p in validated_patterns if p.validation_score > 0.5])
        processing_time = time.time() - start_time
        self.processing_time += processing_time
        
        # Actualizar historial de confianza
        if validated_patterns:
            avg_confidence = sum(p.confidence for p in validated_patterns) / len(validated_patterns)
            self.confidence_history.append(avg_confidence)
        
        logger.debug(f"Identified {len(validated_patterns)} patterns in {processing_time:.3f}s")
        return validated_patterns

    def _identify_sequential_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones en secuencias numéricas y temporales"""
        patterns = []
        
        # Extraer secuencias numéricas
        sequences = self._extract_numerical_sequences(data)
        
        for seq_name, sequence in sequences.items():
            if len(sequence) < self.config.sequence_min_length:
                continue
            
            # Detectar tendencias ascendentes/descendentes
            if sequence == sorted(sequence):
                patterns.append(IdentifiedPattern(
                    pattern_id=f"ascending_{seq_name}_{int(time.time())}",
                    pattern_type=PatternType.SEQUENTIAL,
                    confidence=0.9,
                    strength=0.8,
                    description=f"Ascending sequence in {seq_name}",
                    metadata={"sequence": sequence, "trend": "ascending"}
                ))
            elif sequence == sorted(sequence, reverse=True):
                patterns.append(IdentifiedPattern(
                    pattern_id=f"descending_{seq_name}_{int(time.time())}",
                    pattern_type=PatternType.SEQUENTIAL,
                    confidence=0.9,
                    strength=0.8,
                    description=f"Descending sequence in {seq_name}",
                    metadata={"sequence": sequence, "trend": "descending"}
                ))
            
            # Detectar consistencia estadística
            if len(sequence) > 3:
                if HAS_ADVANCED_LIBS:
                    variance = float(np.var(sequence))
                    mean_val = float(np.mean(sequence))
                else:
                    mean_val = sum(sequence) / len(sequence)
                    variance = sum((x - mean_val) ** 2 for x in sequence) / len(sequence)
                
                if variance < 0.1:
                    patterns.append(IdentifiedPattern(
                        pattern_id=f"consistent_{seq_name}_{int(time.time())}",
                        pattern_type=PatternType.STATISTICAL,
                        confidence=0.8,
                        strength=max(0.1, 1.0 - variance),
                        description=f"Statistical consistency in {seq_name}",
                        metadata={"variance": variance, "mean": mean_val}
                    ))
            
            # Detectar periodicidad
            periodic_pattern = self._detect_periodicity(sequence, seq_name)
            if periodic_pattern:
                patterns.append(periodic_pattern)
        
        return patterns

    def _identify_structural_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones estructurales y lógicos en los datos"""
        patterns = []
        
        # Análisis de profundidad jerárquica
        max_depth = self._calculate_hierarchical_depth(data)
        if max_depth > 1:
            patterns.append(IdentifiedPattern(
                pattern_id=f"hierarchical_{int(time.time())}",
                pattern_type=PatternType.STRUCTURAL,
                confidence=min(1.0, max_depth / 5.0),
                strength=min(0.8, max_depth * 0.2),
                description=f"Hierarchical structure with depth {max_depth}",
                metadata={"depth": max_depth}
            ))
        
        # Análisis de repetición de elementos
        string_values = [str(v) for v in self._flatten_dict(data)]
        if len(string_values) > 1:
            unique_count = len(set(string_values))
            repetition_ratio = 1 - (unique_count / len(string_values))
            
            if repetition_ratio > 0.3:
                patterns.append(IdentifiedPattern(
                    pattern_id=f"repetitive_{int(time.time())}",
                    pattern_type=PatternType.STRUCTURAL,
                    confidence=repetition_ratio,
                    strength=repetition_ratio,
                    description=f"Repetitive elements (ratio: {repetition_ratio:.2f})",
                    metadata={"repetition_ratio": repetition_ratio, "unique_count": unique_count}
                ))
        
        # Consistencia de tipos
        value_types = [type(v).__name__ for v in self._flatten_dict(data)]
        if value_types:
            type_consistency = len(set(value_types)) / len(value_types)
            if type_consistency < 0.5:
                patterns.append(IdentifiedPattern(
                    pattern_id=f"type_consistent_{int(time.time())}",
                    pattern_type=PatternType.STRUCTURAL,
                    confidence=1.0 - type_consistency,
                    strength=1.0 - type_consistency,
                    description=f"Type consistency detected",
                    metadata={"type_diversity": type_consistency, "types": list(set(value_types))}
                ))
        
        # Análisis de referencias cruzadas
        cross_refs = self._detect_cross_references(data)
        if cross_refs > 0:
            patterns.append(IdentifiedPattern(
                pattern_id=f"cross_refs_{int(time.time())}",
                pattern_type=PatternType.STRUCTURAL,
                confidence=min(1.0, cross_refs / 5.0),
                strength=min(0.9, cross_refs * 0.1),
                description=f"Cross-references detected ({cross_refs})",
                metadata={"cross_references": cross_refs}
            ))
        
        return patterns

    def _identify_spectral_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones espectrales y de frecuencia usando FFT"""
        patterns = []
        
        if not HAS_ADVANCED_LIBS:
            return patterns
        
        sequences = self._extract_numerical_sequences(data)
        
        for seq_name, sequence in sequences.items():
            if len(sequence) < 8:  # Mínimo para análisis espectral
                continue
            
            try:
                # Transformada de Fourier
                fft_result = fft(sequence)
                freqs = fftfreq(len(sequence))
                
                # Encontrar frecuencias dominantes
                magnitudes = np.abs(fft_result)
                dominant_freq_idx = np.argmax(magnitudes[1:]) + 1  # Evitar DC component
                dominant_freq = abs(freqs[dominant_freq_idx])
                
                if dominant_freq > 0.05:  # Frecuencia significativa
                    patterns.append(IdentifiedPattern(
                        pattern_id=f"spectral_{seq_name}_{int(time.time())}",
                        pattern_type=PatternType.PERIODIC,
                        confidence=min(1.0, magnitudes[dominant_freq_idx] / np.sum(magnitudes)),
                        strength=float(magnitudes[dominant_freq_idx] / np.max(magnitudes)),
                        description=f"Dominant frequency {dominant_freq:.3f} in {seq_name}",
                        metadata={
                            "dominant_frequency": float(dominant_freq),
                            "magnitude": float(magnitudes[dominant_freq_idx]),
                            "spectral_density": magnitudes.tolist()
                        }
                    ))
                
            except Exception as e:
                logger.debug(f"Spectral analysis failed for {seq_name}: {e}")
        
        return patterns

    def _identify_recursive_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones recursivos y auto-organizativos"""
        patterns = []
        
        # Detectar estructuras recursivas en datos anidados
        recursion_depth = self._detect_recursion(data)
        if recursion_depth > 1:
            patterns.append(IdentifiedPattern(
                pattern_id=f"recursive_{int(time.time())}",
                pattern_type=PatternType.RECURSIVE,
                confidence=min(1.0, recursion_depth / 3.0),
                strength=min(0.9, recursion_depth * 0.3),
                description=f"Recursive structure with depth {recursion_depth}",
                metadata={"recursion_depth": recursion_depth}
            ))
        
        # Detectar auto-similitud (patrones fractales)
        fractal_dimension = self._estimate_fractal_dimension(data)
        if fractal_dimension > self.config.fractal_dimension_threshold:
            patterns.append(IdentifiedPattern(
                pattern_id=f"fractal_{int(time.time())}",
                pattern_type=PatternType.FRACTAL,
                confidence=min(1.0, (fractal_dimension - 1.0) / 1.0),
                strength=min(0.9, fractal_dimension / 2.0),
                description=f"Fractal-like structure (D≈{fractal_dimension:.2f})",
                metadata={"fractal_dimension": fractal_dimension}
            ))
        
        # Detectar patrones de auto-organización
        organization_score = self._measure_self_organization(data)
        if organization_score > 0.3:
            patterns.append(IdentifiedPattern(
                pattern_id=f"self_org_{int(time.time())}",
                pattern_type=PatternType.SELF_ORGANIZING,
                confidence=organization_score,
                strength=organization_score,
                description=f"Self-organizing pattern detected",
                metadata={"organization_score": organization_score}
            ))
        
        return patterns

    def _identify_complexity_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones basados en complejidad informacional y entropía"""
        patterns = []
        
        # Análisis de entropía informacional
        entropy = self._calculate_information_entropy(data)
        if entropy > 0:
            # Alta entropía = alta complejidad
            if entropy > 0.7:
                patterns.append(IdentifiedPattern(
                    pattern_id=f"high_entropy_{int(time.time())}",
                    pattern_type=PatternType.CHAOTIC,
                    confidence=entropy,
                    strength=entropy,
                    description=f"High information entropy ({entropy:.3f})",
                    metadata={"entropy": entropy, "complexity_type": "high"}
                ))
            # Baja entropía = alta organización
            elif entropy < 0.3:
                patterns.append(IdentifiedPattern(
                    pattern_id=f"low_entropy_{int(time.time())}",
                    pattern_type=PatternType.STRUCTURAL,
                    confidence=1.0 - entropy,
                    strength=1.0 - entropy,
                    description=f"Low information entropy ({entropy:.3f})",
                    metadata={"entropy": entropy, "complexity_type": "organized"}
                ))
        
        # Complejidad de Kolmogorov aproximada
        kolmogorov_complexity = self._approximate_kolmogorov_complexity(data)
        if kolmogorov_complexity > 0.1:
            patterns.append(IdentifiedPattern(
                pattern_id=f"complexity_{int(time.time())}",
                pattern_type=PatternType.STATISTICAL,
                confidence=min(1.0, kolmogorov_complexity),
                strength=min(0.9, kolmogorov_complexity),
                description=f"High algorithmic complexity",
                metadata={"kolmogorov_complexity": kolmogorov_complexity}
            ))
        
        return patterns

    def _identify_emergent_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Identifica patrones emergentes que no se ajustan a categorías convencionales"""
        patterns = []
        
        # Detectar anomalías estadísticas que podrían indicar emergencia
        outliers = self._detect_statistical_outliers(data)
        if len(outliers) > 0:
            outlier_ratio = len(outliers) / max(1, len(self._flatten_dict(data)))
            if outlier_ratio > 0.1:  # Suficientes outliers para considerar emergencia
                patterns.append(IdentifiedPattern(
                    pattern_id=f"emergent_outliers_{int(time.time())}",
                    pattern_type=PatternType.EMERGENT,
                    confidence=min(1.0, outlier_ratio * 2),
                    strength=outlier_ratio,
                    description=f"Emergent anomalous patterns ({len(outliers)} outliers)",
                    metadata={"outliers": outliers, "outlier_ratio": outlier_ratio}
                ))
        
        # Detectar patrones semánticos en contenido textual
        semantic_patterns = self._detect_semantic_patterns(data)
        patterns.extend(semantic_patterns)
        
        # Detectar meta-patrones (patrones de patrones)
        if len(self.pattern_history) > 5:
            meta_patterns = self._detect_meta_patterns()
            patterns.extend(meta_patterns)
        
        return patterns

    def _validate_patterns(self, patterns: list[IdentifiedPattern]) -> list[IdentifiedPattern]:
        """Valida y filtra patrones basado en criterios de calidad"""
        validated = []
        
        for pattern in patterns:
            # Filtros básicos de calidad
            if pattern.confidence < self.config.min_confidence:
                continue
            if pattern.strength < self.config.min_strength:
                continue
            
            # Calcular puntuación de validación
            validation_score = self._calculate_validation_score(pattern)
            pattern.validation_score = validation_score
            
            # Calcular complejidad
            pattern.complexity_measure = self._calculate_pattern_complexity_measure(pattern)
            
            if validation_score > 0.3:
                validated.append(pattern)
        
        return validated

    # Métodos de utilidad para análisis de patrones
    
    def _extract_numerical_sequences(self, data: dict[str, Any]) -> dict[str, list[float]]:
        """Extrae secuencias numéricas de los datos"""
        sequences = {}
        
        def extract_recursive(obj, path="root"):
            if isinstance(obj, (int, float)):
                if path not in sequences:
                    sequences[path] = []
                sequences[path].append(float(obj))
            elif isinstance(obj, dict):
                for key, value in obj.items():
                    extract_recursive(value, f"{path}.{key}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    extract_recursive(item, f"{path}[{i}]")
        
        extract_recursive(data)
        
        # Filtrar secuencias muy cortas
        return {k: v for k, v in sequences.items() if len(v) >= self.config.sequence_min_length}

    def _flatten_dict(self, data: dict[str, Any], parent_key: str = "") -> list[Any]:
        """Aplana diccionario anidado en lista de valores"""
        items = []
        for key, value in data.items():
            new_key = f"{parent_key}.{key}" if parent_key else key
            if isinstance(value, dict):
                items.extend(self._flatten_dict(value, new_key))
            elif isinstance(value, list):
                items.extend(value)
            else:
                items.append(value)
        return items

    def _calculate_hierarchical_depth(self, obj: Any, current_depth: int = 0) -> int:
        """Calcula la profundidad jerárquica máxima"""
        if isinstance(obj, dict):
            return max([self._calculate_hierarchical_depth(v, current_depth + 1) for v in obj.values()] + [current_depth])
        elif isinstance(obj, list):
            return max([self._calculate_hierarchical_depth(item, current_depth + 1) for item in obj] + [current_depth])
        else:
            return current_depth

    def _detect_cross_references(self, data: dict[str, Any]) -> int:
        """Detecta referencias cruzadas entre valores"""
        string_values = [str(v) for v in self._flatten_dict(data)]
        cross_refs = 0
        
        for i, val1 in enumerate(string_values):
            for j, val2 in enumerate(string_values[i + 1:], i + 1):
                if len(val1) > 3 and len(val2) > 3:
                    if val1.lower() in val2.lower() or val2.lower() in val1.lower():
                        cross_refs += 1
        
        return cross_refs

    def _detect_periodicity(self, sequence: list[float], seq_name: str) -> Optional[IdentifiedPattern]:
        """Detecta periodicidad en una secuencia"""
        if len(sequence) < 6:
            return None
        
        # Buscar patrones repetitivos
        for period in range(2, len(sequence) // self.config.periodicity_min_cycles):
            segments = [sequence[i:i+period] for i in range(0, len(sequence) - period + 1, period)]
            if len(segments) >= self.config.periodicity_min_cycles:
                # Verificar similitud entre segmentos
                similarities = []
                for i in range(len(segments) - 1):
                    seg1, seg2 = segments[i], segments[i + 1]
                    if len(seg1) == len(seg2):
                        correlation = self._calculate_correlation(seg1, seg2)
                        similarities.append(correlation)
                
                if similarities and sum(similarities) / len(similarities) > self.config.correlation_threshold:
                    avg_similarity = sum(similarities) / len(similarities)
                    return IdentifiedPattern(
                        pattern_id=f"periodic_{seq_name}_{period}_{int(time.time())}",
                        pattern_type=PatternType.PERIODIC,
                        confidence=avg_similarity,
                        strength=avg_similarity,
                        description=f"Periodic pattern with period {period} in {seq_name}",
                        metadata={"period": period, "correlation": avg_similarity}
                    )
        
        return None

    def _calculate_correlation(self, seq1: list[float], seq2: list[float]) -> float:
        """Calcula correlación entre dos secuencias"""
        if not seq1 or not seq2 or len(seq1) != len(seq2):
            return 0.0
        
        if HAS_ADVANCED_LIBS:
            try:
                correlation, _ = stats.pearsonr(seq1, seq2)
                return abs(correlation) if not math.isnan(correlation) else 0.0
            except:
                pass
        
        # Correlación simple sin scipy
        n = len(seq1)
        mean1 = sum(seq1) / n
        mean2 = sum(seq2) / n
        
        numerator = sum((a - mean1) * (b - mean2) for a, b in zip(seq1, seq2))
        denom1 = sum((a - mean1) ** 2 for a in seq1) ** 0.5
        denom2 = sum((b - mean2) ** 2 for b in seq2) ** 0.5
        
        if denom1 == 0 or denom2 == 0:
            return 0.0
        
        return abs(numerator / (denom1 * denom2))

    def _detect_recursion(self, data: dict[str, Any], visited: Optional[set] = None) -> int:
        """Detecta estructuras recursivas en los datos"""
        if visited is None:
            visited = set()
        
        data_id = id(data)
        if data_id in visited:
            return 1
        
        visited.add(data_id)
        max_depth = 0
        
        for value in data.values():
            if isinstance(value, dict):
                depth = self._detect_recursion(value, visited.copy())
                max_depth = max(max_depth, depth)
        
        return max_depth

    def _estimate_fractal_dimension(self, data: dict[str, Any]) -> float:
        """Estima la dimensión fractal aproximada de los datos"""
        # Simplificación: usar la distribución de tamaños como proxy
        sizes = []
        
        def collect_sizes(obj):
            if isinstance(obj, dict):
                sizes.append(len(obj))
                for value in obj.values():
                    collect_sizes(value)
            elif isinstance(obj, list):
                sizes.append(len(obj))
                for item in obj:
                    collect_sizes(item)
            elif isinstance(obj, str):
                sizes.append(len(obj))
        
        collect_sizes(data)
        
        if len(sizes) < 3:
            return 1.0
        
        # Aproximación usando distribución de tamaños
        if HAS_ADVANCED_LIBS:
            try:
                log_sizes = np.log(np.array(sizes) + 1)
                log_counts = np.log(np.arange(1, len(sizes) + 1))
                
                # Regresión lineal para estimar dimensión
                slope = np.polyfit(log_sizes, log_counts, 1)[0]
                return abs(slope) + 1.0
            except:
                pass
        
        # Fallback simple
        return 1.0 + (max(sizes) - min(sizes)) / (sum(sizes) / len(sizes))

    def _measure_self_organization(self, data: dict[str, Any]) -> float:
        """Mide el grado de auto-organización en los datos"""
        # Métricas de organización: consistencia de estructura, patrones emergentes
        organization_score = 0.0
        
        # Consistencia estructural
        if isinstance(data, dict):
            key_lengths = [len(str(k)) for k in data.keys()]
            if key_lengths:
                key_consistency = 1.0 - (max(key_lengths) - min(key_lengths)) / (sum(key_lengths) / len(key_lengths) + 1)
                organization_score += key_consistency * 0.3
        
        # Distribución de tipos
        all_values = self._flatten_dict(data)
        if all_values:
            type_distribution = {}
            for value in all_values:
                type_name = type(value).__name__
                type_distribution[type_name] = type_distribution.get(type_name, 0) + 1
            
            # Entropía de tipos (menor entropía = más organización)
            total = len(all_values)
            type_entropy = 0.0
            for count in type_distribution.values():
                p = count / total
                type_entropy -= p * math.log2(p) if p > 0 else 0
            
            # Normalizar y invertir (más organización = menor entropía)
            max_entropy = math.log2(len(type_distribution)) if len(type_distribution) > 1 else 1
            organization_score += (1.0 - type_entropy / max_entropy) * 0.4
        
        # Profundidad vs anchura (estructuras organizadas tienden a ser balanceadas)
        depth = self._calculate_hierarchical_depth(data)
        width = len(data) if isinstance(data, dict) else 1
        if depth > 0 and width > 0:
            balance = min(depth, width) / max(depth, width)
            organization_score += balance * 0.3
        
        return min(1.0, organization_score)

    def _calculate_information_entropy(self, data: dict[str, Any]) -> float:
        """Calcula la entropía informacional de los datos"""
        # Convertir datos a string para análisis de caracteres
        data_string = str(data)
        
        if not data_string:
            return 0.0
        
        # Calcular frecuencias de caracteres
        char_freq = {}
        for char in data_string:
            char_freq[char] = char_freq.get(char, 0) + 1
        
        # Calcular entropía
        total_chars = len(data_string)
        entropy = 0.0
        
        for freq in char_freq.values():
            p = freq / total_chars
            entropy -= p * math.log2(p) if p > 0 else 0
        
        # Normalizar por entropía máxima posible
        max_entropy = math.log2(len(char_freq)) if len(char_freq) > 1 else 1
        return entropy / max_entropy if max_entropy > 0 else 0.0

    def _approximate_kolmogorov_complexity(self, data: dict[str, Any]) -> float:
        """Aproxima la complejidad de Kolmogorov usando compresión"""
        import zlib
        
        data_string = str(data).encode('utf-8')
        original_size = len(data_string)
        
        if original_size == 0:
            return 0.0
        
        try:
            compressed_size = len(zlib.compress(data_string))
            complexity = compressed_size / original_size
            return complexity
        except:
            return 0.5  # Fallback

    def _detect_statistical_outliers(self, data: dict[str, Any]) -> list[Any]:
        """Detecta valores estadísticamente anómalos"""
        numerical_values = [v for v in self._flatten_dict(data) if isinstance(v, (int, float))]
        
        if len(numerical_values) < 3:
            return []
        
        if HAS_ADVANCED_LIBS:
            try:
                z_scores = np.abs(stats.zscore(numerical_values))
                outlier_indices = np.where(z_scores > self.config.outlier_threshold)[0]
                return [numerical_values[i] for i in outlier_indices]
            except:
                pass
        
        # Método simple sin scipy
        mean_val = sum(numerical_values) / len(numerical_values)
        variance = sum((x - mean_val) ** 2 for x in numerical_values) / len(numerical_values)
        std_dev = variance ** 0.5
        
        outliers = []
        for value in numerical_values:
            if abs(value - mean_val) > self.config.outlier_threshold * std_dev:
                outliers.append(value)
        
        return outliers

    def _detect_semantic_patterns(self, data: dict[str, Any]) -> list[IdentifiedPattern]:
        """Detecta patrones semánticos en contenido textual"""
        patterns = []
        
        # Extraer contenido textual
        text_content = " ".join(str(v) for v in self._flatten_dict(data) if isinstance(v, str)).lower()
        
        if len(text_content) < 10:
            return patterns
        
        # Indicadores causales
        causal_indicators = ["because", "therefore", "thus", "consequently", "as a result", "due to"]
        causal_count = sum(1 for indicator in causal_indicators if indicator in text_content)
        
        if causal_count > 0:
            patterns.append(IdentifiedPattern(
                pattern_id=f"causal_{int(time.time())}",
                pattern_type=PatternType.SEMANTIC,
                confidence=min(1.0, causal_count / 3.0),
                strength=min(0.9, causal_count * 0.2),
                description=f"Causal reasoning patterns detected ({causal_count})",
                metadata={"causal_indicators": causal_count}
            ))
        
        # Indicadores condicionales
        conditional_indicators = ["if", "then", "unless", "provided that", "assuming", "when"]
        conditional_count = sum(1 for indicator in conditional_indicators if indicator in text_content)
        
        if conditional_count > 0:
            patterns.append(IdentifiedPattern(
                pattern_id=f"conditional_{int(time.time())}",
                pattern_type=PatternType.SEMANTIC,
                confidence=min(1.0, conditional_count / 3.0),
                strength=min(0.9, conditional_count * 0.15),
                description=f"Conditional logic patterns detected ({conditional_count})",
                metadata={"conditional_indicators": conditional_count}
            ))
        
        return patterns

    def _detect_meta_patterns(self) -> list[IdentifiedPattern]:
        """Detecta meta-patrones en el historial de patrones identificados"""
        patterns = []
        
        if len(self.pattern_history) < 5:
            return patterns
        
        # Analizar tendencias en tipos de patrones
        recent_patterns = list(self.pattern_history)[-10:]
        type_frequency = {}
        
        for pattern in recent_patterns:
            pattern_type = pattern.pattern_type.value
            type_frequency[pattern_type] = type_frequency.get(pattern_type, 0) + 1
        
        # Detectar tipos dominantes
        if type_frequency:
            dominant_type = max(type_frequency, key=type_frequency.get)
            dominance_ratio = type_frequency[dominant_type] / len(recent_patterns)
            
            if dominance_ratio > 0.6:
                patterns.append(IdentifiedPattern(
                    pattern_id=f"meta_dominant_{int(time.time())}",
                    pattern_type=PatternType.EMERGENT,
                    confidence=dominance_ratio,
                    strength=dominance_ratio,
                    description=f"Dominant pattern type: {dominant_type}",
                    metadata={"dominant_type": dominant_type, "dominance_ratio": dominance_ratio}
                ))
        
        # Analizar tendencias de confianza
        if len(self.confidence_history) >= 5:
            recent_confidences = list(self.confidence_history)[-5:]
            if recent_confidences[-1] > recent_confidences[0]:
                trend_strength = (recent_confidences[-1] - recent_confidences[0]) / recent_confidences[0]
                patterns.append(IdentifiedPattern(
                    pattern_id=f"meta_confidence_trend_{int(time.time())}",
                    pattern_type=PatternType.EMERGENT,
                    confidence=min(1.0, trend_strength * 2),
                    strength=min(0.9, trend_strength),
                    description="Increasing pattern recognition confidence",
                    metadata={"trend": "increasing", "trend_strength": trend_strength}
                ))
        
        return patterns

    def _calculate_validation_score(self, pattern: IdentifiedPattern) -> float:
        """Calcula puntuación de validación para un patrón"""
        score = 0.0
        
        # Factor de confianza base
        score += pattern.confidence * 0.4
        
        # Factor de fuerza
        score += pattern.strength * 0.3
        
        # Refuerzo histórico si el patrón es similar a otros conocidos
        pattern_signature = f"{pattern.pattern_type.value}_{pattern.description[:20]}"
        historical_support = self.pattern_memory.get(pattern_signature, 0)
        score += min(0.2, historical_support * 0.02)
        
        # Novedad (patrones nuevos son más interesantes)
        if historical_support == 0:
            score += 0.1
        
        return min(1.0, score)

    def _calculate_pattern_complexity_measure(self, pattern: IdentifiedPattern) -> float:
        """Calcula medida de complejidad para un patrón"""
        complexity = 0.0
        
        # Complejidad basada en tipo de patrón
        type_complexity = {
            PatternType.SEQUENTIAL: 0.3,
            PatternType.RECURSIVE: 0.8,
            PatternType.SELF_ORGANIZING: 0.9,
            PatternType.FRACTAL: 0.95,
            PatternType.PERIODIC: 0.5,
            PatternType.CHAOTIC: 1.0,
            PatternType.STATISTICAL: 0.4,
            PatternType.EMERGENT: 0.85,
            PatternType.STRUCTURAL: 0.6,
            PatternType.SEMANTIC: 0.7
        }
        
        complexity += type_complexity.get(pattern.pattern_type, 0.5) * 0.5
        
        # Complejidad basada en metadata
        if pattern.metadata:
            metadata_complexity = len(pattern.metadata) * 0.1
            complexity += min(0.3, metadata_complexity)
        
        # Complejidad basada en descripción
        description_complexity = len(pattern.description.split()) * 0.02
        complexity += min(0.2, description_complexity)
        
        return min(1.0, complexity)

    def get_system_state(self) -> dict[str, Any]:
        """Obtiene el estado completo del sistema de reconocimiento de patrones"""
        return {
            "config": {
                "min_confidence": self.config.min_confidence,
                "min_strength": self.config.min_strength,
                "sequence_min_length": self.config.sequence_min_length,
                "correlation_threshold": self.config.correlation_threshold,
                "max_pattern_memory": self.config.max_pattern_memory
            },
            "patterns": {
                "total_identified": len(self.identified_patterns),
                "active_patterns": list(self.identified_patterns.keys()),
                "pattern_types": {ptype.value: sum(1 for p in self.identified_patterns.values() 
                                                 if p.pattern_type == ptype) 
                               for ptype in PatternType},
                "average_confidence": (sum(p.confidence for p in self.identified_patterns.values()) / 
                                     len(self.identified_patterns)) if self.identified_patterns else 0.0
            },
            "performance": {
                "total_identifications": self.total_identifications,
                "successful_validations": self.successful_validations,
                "validation_rate": (self.successful_validations / max(1, self.total_identifications)),
                "processing_time": self.processing_time,
                "avg_processing_time": self.processing_time / max(1, self.total_identifications)
            },
            "memory": {
                "pattern_memory_size": len(self.pattern_memory),
                "pattern_history_size": len(self.pattern_history),
                "confidence_history_size": len(self.confidence_history),
                "most_frequent_patterns": dict(sorted(self.pattern_memory.items(), 
                                                    key=lambda x: x[1], reverse=True)[:5])
            },
            "capabilities": {
                "advanced_libs_available": HAS_ADVANCED_LIBS,
                "spectral_analysis": HAS_ADVANCED_LIBS,
                "statistical_analysis": HAS_ADVANCED_LIBS,
                "supported_pattern_types": [ptype.value for ptype in PatternType]
            }
        }