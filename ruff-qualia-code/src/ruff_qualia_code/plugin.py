from ruff.api import Plugin

from .rules import QLA001, QLA002, QLA003

plugin = Plugin(
    name="qualia-code",
    rules=[QLA001, QLA002, QLA003]
)