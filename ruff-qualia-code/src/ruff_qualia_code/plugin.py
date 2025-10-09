from ruff.api import Plugin

from .rules import (
    QLA001, QLA002, QLA003, QLA004, QLA005, QLA006,
    QLA007, QLA009, QLA010, QLA011, QLA012, QLA014,
    QLA016, QLA020
)

plugin = Plugin(
    name="qualia-code",
    rules=[
        QLA001, QLA002, QLA003, QLA004, QLA005, QLA006,
        QLA007, QLA009, QLA010, QLA011, QLA012, QLA014,
        QLA016, QLA020
    ]
)