import time
from typing import Any

try:
    from crisalida_lib.EVA.types import (
        EVAExperience,
        QualiaState,
        RealityBytecode,
    )
except ImportError:
    RealityBytecode = None
    QualiaState = None
    EVAExperience = None


def calculate_trend(
    values: list[float],
    threshold: float = 0.05,
    is_percentage: bool = False,
    labels: dict[str, str] | None = None,
    min_points: int = 4,
    weighted: bool = False,
) -> str:
    """
    Analiza la tendencia de una serie de valores numéricos.

    Args:
        values: Lista de valores float.
        threshold: Umbral para considerar la tendencia como estable.
        is_percentage: Si el umbral es porcentaje del promedio.
        labels: Diccionario con etiquetas para "stable", "increasing", "decreasing".
        min_points: Mínimo de puntos requeridos para análisis robusto.
        weighted: Si True, usa promedio ponderado (más peso a valores recientes).

    Returns:
        Etiqueta de tendencia: "stable", "increasing", "decreasing", o "insufficient_data".
    """
    DEFAULT_LABELS = {
        "stable": "estable",
        "increasing": "en aumento",
        "decreasing": "en descenso",
        "insufficient_data": "datos_insuficientes",
    }
    if labels is None:
        labels = DEFAULT_LABELS

    n = len(values)
    if n < min_points:
        return labels["insufficient_data"]

    # Weighted average (más peso a valores recientes)
    if weighted:
        weights = [i + 1 for i in range(n)]
        first_half = sum(
            v * w for v, w in zip(values[: n // 2], weights[: n // 2], strict=False)
        ) / sum(weights[: n // 2])
        second_half = sum(
            v * w for v, w in zip(values[n // 2 :], weights[n // 2 :], strict=False)
        ) / sum(weights[n // 2 :])
    else:
        first_half = sum(values[: n // 2]) / (n // 2)
        second_half = sum(values[n // 2 :]) / (n - n // 2)

    diff = second_half - first_half

    # Umbral relativo al promedio si is_percentage
    if is_percentage:
        avg = sum(values) / n if n > 0 else 0
        threshold = avg * threshold

    # Robustez ante valores nulos o extremos
    if not all(isinstance(v, int | float) for v in values) or n == 0:
        return labels["insufficient_data"]

    if abs(diff) < threshold:
        return labels["stable"]
    elif diff > threshold:
        return labels["increasing"]
    else:
        return labels["decreasing"]


class EVATrendAnalyzer:
    """
    EVA-ready Trend Analyzer: registra cada análisis de tendencia como experiencia viviente,
    soporta hooks de entorno, benchmarking, faseo y visualización híbrida.
    """

    def __init__(
        self,
        eva_runtime: Any = None,
        phase: str = "default",
        enable_benchmarking: bool = True,
        visualization_mode: str = "hybrid",
    ):
        self.eva_runtime = eva_runtime
        self.eva_phase = phase
        self.enable_benchmarking = enable_benchmarking
        self.visualization_mode = visualization_mode
        self.eva_memory_store: dict = {}
        self.eva_experience_store: dict = {}
        self.eva_phases: dict = {}
        self._environment_hooks: list = []

    def benchmark_operation(self, func, *args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        benchmark = {"start": start, "end": end, "duration": end - start}
        return result, benchmark

    def ingest_trend_experience(
        self,
        values,
        result,
        qualia_state: Any = None,
        phase: str = None,
        benchmark: dict = None,
    ) -> str:
        phase = phase or self.eva_phase
        experience_id = f"eva_trend_{hash(str(values))}_{int(time.time())}"
        intention = {
            "intention_type": "ARCHIVE_TREND_ANALYSIS_EXPERIENCE",
            "values": values,
            "result": result,
            "qualia": qualia_state,
            "phase": phase,
            "benchmark": benchmark,
            "visualization_mode": self.visualization_mode,
        }
        bytecode = getattr(self.eva_runtime, "divine_compiler", None)
        if bytecode and hasattr(bytecode, "compile_intention"):
            instructions = bytecode.compile_intention(intention)
        else:
            instructions = []
        if RealityBytecode:
            reality_bytecode = RealityBytecode(
                bytecode_id=experience_id,
                instructions=instructions,
                qualia_state=qualia_state,
                phase=phase,
                timestamp=time.time(),
            )
            self.eva_memory_store[experience_id] = reality_bytecode
            if phase not in self.eva_phases:
                self.eva_phases[phase] = {}
            self.eva_phases[phase][experience_id] = reality_bytecode
            self.eva_experience_store[experience_id] = reality_bytecode
            for hook in self._environment_hooks:
                try:
                    hook(reality_bytecode)
                except Exception as e:
                    print(f"[EVA-TREND] Environment hook failed: {e}")
        return experience_id

    def analyze_trend(
        self,
        values: list[float],
        threshold: float = 0.05,
        is_percentage: bool = False,
        labels: dict[str, str] = None,
        min_points: int = 4,
        weighted: bool = False,
        qualia_state: Any = None,
        phase: str = None,
    ):
        if self.enable_benchmarking:
            result, benchmark = self.benchmark_operation(
                calculate_trend,
                values,
                threshold,
                is_percentage,
                labels,
                min_points,
                weighted,
            )
        else:
            result, benchmark = (
                calculate_trend(
                    values, threshold, is_percentage, labels, min_points, weighted
                ),
                None,
            )
        exp_id = self.ingest_trend_experience(
            values, result, qualia_state, phase, benchmark
        )
        return result, exp_id

    def add_environment_hook(self, hook: callable):
        self._environment_hooks.append(hook)

    def set_memory_phase(self, phase: str):
        self.eva_phase = phase
        for hook in self._environment_hooks:
            try:
                hook({"phase_changed": phase})
            except Exception as e:
                print(f"[EVA-TREND] Phase hook failed: {e}")

    def get_memory_phase(self) -> str:
        return self.eva_phase

    def get_experience_phases(self, experience_id: str) -> list:
        return [
            phase for phase, exps in self.eva_phases.items() if experience_id in exps
        ]

    def get_eva_api(self) -> dict:
        return {
            "analyze_trend": self.analyze_trend,
            "add_environment_hook": self.add_environment_hook,
            "set_memory_phase": self.set_memory_phase,
            "get_memory_phase": self.get_memory_phase,
            "get_experience_phases": self.get_experience_phases,
        }
