"""
Qualia-Code Linter: Architectural Enforcement for Python

This package provides linting rules to enforce QUALIA.CODE architectural 
principles in Python backend code.
"""

__version__ = "1.0.0"
__author__ = "Crisalida Systems"

from .main import QualiaCodeLinter
from .rules import QLA001, QLA002, QLA003

__all__ = ["QualiaCodeLinter", "QLA001", "QLA002", "QLA003"]