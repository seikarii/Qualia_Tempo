# QUALIA.CODE v1.1 - Engine Event Handlers
# Specialized event handlers for particle engine operations

from typing import Any
from ..services.EventBus import QualiaEventHandler
from ..services.interfaces.ILogger import ILogger


class EngineResetHandler(QualiaEventHandler):
    """Event handler for particle engine reset operations."""

    def __init__(self, particle_engine: Any, logger: ILogger) -> None:
        super().__init__("EngineResetHandler", logger)
        self.particle_engine = particle_engine

    async def handle_event(self, event_name: str, data: Any, source: str) -> None:
        """Handle EngineReset event by resetting particle engine."""
        if event_name == "EngineReset":
            await self.particle_engine.reset()
            self._logger.info("🔄 QualiaParticleEngine reset via EngineReset event")