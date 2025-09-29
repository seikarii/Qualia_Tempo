# QUALIA.CODE v1.1 - Engine Event Handlers
# Specialized event handlers for particle engine operations

import logging
from typing import Any
from ..services.EventBus import QualiaEventHandler

logger = logging.getLogger(__name__)


class EngineResetHandler(QualiaEventHandler):
    """Event handler for particle engine reset operations."""

    def __init__(self, particle_engine: Any) -> None:
        super().__init__("EngineResetHandler")
        self.particle_engine = particle_engine

    async def handle_event(self, event_name: str, data: Any, source: str) -> None:
        """Handle EngineReset event by resetting particle engine."""
        if event_name == "EngineReset":
            await self.particle_engine.reset()
            logger.info("🔄 QualiaParticleEngine reset via EngineReset event")