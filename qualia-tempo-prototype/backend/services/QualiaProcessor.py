# QUALIA.CODE v1.0 - QualiaProcessor Service
# Processes QualiaState updates and coordinates visual effects

import logging
from typing import Dict, Any, Optional
from .EventBus import EventBus
from ..utils.decorators import (
    log_execution,
    handle_errors,
    validate_schema,
    time_execution,
)


class QualiaProcessor:
    """
    Main processor for QualiaState data.
    Receives QualiaState from frontend and triggers visual effects.
    """

    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._logger = logging.getLogger(__name__)
        self._current_state: Optional[Dict[str, Any]] = None
        self._processing_enabled = True

    @log_execution(level="INFO")
    @handle_errors(fallback_return_value=None)
    @validate_schema("QualiaState")
    @time_execution()
    async def process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """
        Process incoming QualiaState and trigger visual updates.

        Args:
            qualia_state: QualiaState data from frontend
        """
        if not self._processing_enabled:
            self._logger.debug("⏸️  QualiaProcessor is disabled, skipping processing")
            return

        self._current_state = qualia_state
        self._logger.info(
            f"🧠 Processing QualiaState: intensity={qualia_state.get('intensity', 0):.2f}"
        )

        # Publish event for other services to react
        await self._event_bus.publish(
            event_name="QualiaStateUpdated", data=qualia_state, source="QualiaProcessor"
        )

        # Perform any additional processing
        await self._analyze_state_changes(qualia_state)

    async def _analyze_state_changes(self, new_state: Dict[str, Any]) -> None:
        """
        Analyze state changes and trigger specific events.

        Args:
            new_state: New QualiaState data
        """
        if self._current_state is None:
            return

        # Detect significant changes in key metrics
        intensity_change = abs(
            new_state.get("intensity", 0) - self._current_state.get("intensity", 0)
        )
        if intensity_change > 0.3:
            await self._event_bus.publish(
                event_name="IntensitySpike",
                data={
                    "old_intensity": self._current_state.get("intensity", 0),
                    "new_intensity": new_state.get("intensity", 0),
                },
                source="QualiaProcessor",
            )

        # Detect transcendence mode activation
        if (
            new_state.get("transcendence", 0) > 0.8
            and self._current_state.get("transcendence", 0) <= 0.8
        ):
            await self._event_bus.publish(
                event_name="TranscendenceActivated",
                data=new_state,
                source="QualiaProcessor",
            )

        # Detect chaos threshold breach
        if new_state.get("chaos", 0) > 0.7:
            await self._event_bus.publish(
                event_name="ChaosThresholdBreached",
                data=new_state,
                source="QualiaProcessor",
            )

    @log_execution(level="DEBUG")
    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get the current QualiaState."""
        return self._current_state.copy() if self._current_state else None

    @log_execution(level="INFO")
    def enable_processing(self) -> None:
        """Enable QualiaState processing."""
        self._processing_enabled = True
        self._logger.info("✅ QualiaProcessor enabled")

    @log_execution(level="INFO")
    def disable_processing(self) -> None:
        """Disable QualiaState processing."""
        self._processing_enabled = False
        self._logger.info("⏸️  QualiaProcessor disabled")

    async def shutdown(self) -> None:
        """Gracefully shutdown the processor."""
        self._logger.info("🛑 Shutting down QualiaProcessor...")
        self._processing_enabled = False
        self._current_state = None


class MinimalQualiaProcessor:
    """
    Minimal fallback QualiaProcessor for when main processor fails to initialize.
    Provides basic functionality without advanced features.
    """

    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._logger = logging.getLogger(__name__)
        self._logger.warning("⚠️  Using MinimalQualiaProcessor fallback")

    async def process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """Basic QualiaState processing."""
        self._logger.debug("🔄 Minimal processing of QualiaState")

        # Just publish the basic event
        await self._event_bus.publish(
            event_name="QualiaStateUpdated",
            data=qualia_state,
            source="MinimalQualiaProcessor",
        )

    @log_execution(level="DEBUG")
    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get current state (always None in minimal processor)."""
        return None

    @log_execution(level="DEBUG")
    def enable_processing(self) -> None:
        """Enable processing (no-op in minimal processor)."""
        pass

    @log_execution(level="DEBUG")
    def disable_processing(self) -> None:
        """Disable processing (no-op in minimal processor)."""
        pass

    async def shutdown(self) -> None:
        """Shutdown (no-op in minimal processor)."""
        self._logger.debug("🛑 MinimalQualiaProcessor shutdown")
