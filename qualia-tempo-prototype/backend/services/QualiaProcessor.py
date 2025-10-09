# QUALIA.CODE v1.1 - QualiaProcessor Service
# Processes QualiaState updates and coordinates visual effects

from typing import Dict, Any, Optional
from .interfaces.IEventBus import IEventBus
from .interfaces.ILogger import ILogger
from .interfaces.IBaseService import IBaseService
from .contracts.IQualiaProcessor_contracts import QualiaProcessorConfig
from ..utils.decorators import (
    log_execution,
    handle_errors,
    validate_schema,
    time_execution,
    OnEvent,
)


class QualiaProcessor(IBaseService):
    """
    Main processor for QualiaState data.
    Receives QualiaState from frontend and triggers visual effects.
    
    QUALIA.CODE v1.1: Now uses injected IEventBus, ILogger, and QualiaProcessorConfig.
    """

    def __init__(
        self, 
        config: QualiaProcessorConfig,
        event_bus: IEventBus,
        logger: ILogger
    ):
        """
        Initialize QualiaProcessor with dependency injection.
        
        Args:
            config: Processor configuration
            event_bus: Injected event bus service
            logger: Injected logger service
        """
        self._config = config
        self._event_bus = event_bus
        self._logger = logger
        self._current_state: Optional[Dict[str, Any]] = None
        self._processing_enabled = config.processing_enabled
        
        self._logger.info(
            f"QualiaProcessor initialized",
            context={
                "intensity_threshold": config.intensity_spike_threshold,
                "transcendence_threshold": config.transcendence_threshold,
                "chaos_threshold": config.chaos_threshold
            }
        )

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
        await self._event_bus.publish_async(
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

        # Detect significant changes in key metrics (using config threshold)
        intensity_change = abs(
            new_state.get("intensity", 0) - self._current_state.get("intensity", 0)
        )
        if intensity_change > self._config.intensity_spike_threshold:
            await self._event_bus.publish_async(
                event_name="IntensitySpike",
                data={
                    "old_intensity": self._current_state.get("intensity", 0),
                    "new_intensity": new_state.get("intensity", 0),
                },
                source="QualiaProcessor",
            )

        # Detect transcendence mode activation (using config threshold)
        if (
            new_state.get("transcendence", 0) > self._config.transcendence_threshold
            and self._current_state.get("transcendence", 0) <= self._config.transcendence_threshold
        ):
            await self._event_bus.publish_async(
                event_name="TranscendenceActivated",
                data=new_state,
                source="QualiaProcessor",
            )

        # Detect chaos threshold breach (using config threshold)
        if new_state.get("chaos", 0) > self._config.chaos_threshold:
            await self._event_bus.publish_async(
                event_name="ChaosThresholdBreached",
                data=new_state,
                source="QualiaProcessor",
            )

    @log_execution(level="DEBUG")
    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get the current QualiaState."""
        return self._current_state.copy() if self._current_state else None

    @log_execution(level="INFO")
    def enable(self) -> None:
        """Enable QualiaState processing."""
        self._processing_enabled = True
        self._logger.info("✅ QualiaProcessor enabled")

    @log_execution(level="INFO")
    def disable(self) -> None:
        """Disable QualiaState processing."""
        self._processing_enabled = False
        self._logger.info("⏸️  QualiaProcessor disabled")
    
    @log_execution(level="DEBUG")
    def is_enabled(self) -> bool:
        """Check if processing is enabled."""
        return self._processing_enabled

    # ==================== @OnEvent Handlers (PHASE 3.2 Proof of Concept) ====================
    
    @handle_errors(fallback_return_value=None)
    @OnEvent("PlayerAction")
    async def _on_player_action(self, event_data: Dict[str, Any]) -> None:
        """
        Handle PlayerAction events.
        
        PHASE 3.2: Proof of Concept - @OnEvent decorator usage.
        This method is automatically registered with EventBus by ApplicationInitializerService.
        
        Args:
            event_data: Player action event data
        """
        action_type = event_data.get("action", "unknown")
        self._logger.debug(
            f"QualiaProcessor received PlayerAction: {action_type}",
            context={"event_data": event_data}
        )
        
        # Example: Track player actions for potential qualia adjustments
        if action_type in ["dash", "ability"]:
            self._logger.info(f"Player performed high-intensity action: {action_type}")
    
    @handle_errors(fallback_return_value=None)
    @OnEvent("GameStateChanged")
    async def _on_game_state_changed(self, event_data: Dict[str, Any]) -> None:
        """
        Handle GameStateChanged events.
        
        PHASE 3.2: Proof of Concept - @OnEvent decorator usage.
        This method is automatically registered with EventBus by ApplicationInitializerService.
        
        Args:
            event_data: Game state change event data
        """
        new_state = event_data.get("new_state", "unknown")
        self._logger.info(
            f"QualiaProcessor detected game state change: {new_state}",
            context={"event_data": event_data}
        )
        
        # Example: Reset state when game pauses/stops
        if new_state in ["paused", "stopped"]:
            self._current_state = None
            self._logger.debug("QualiaProcessor state cleared due to game state change")

    # ==================== IBaseService Lifecycle Methods ====================
    
    async def initialize(self) -> None:
        """
        Initialize QualiaProcessor lifecycle.
        
        PHASE 3.2: IBaseService implementation.
        ApplicationInitializerService will automatically scan for @OnEvent
        decorated methods and register them with EventBus.
        
        This method is called by ApplicationInitializerService during startup.
        """
        self._logger.info("QualiaProcessor lifecycle initialized (IBaseService)")
    
    async def cleanup(self) -> None:
        """
        Cleanup QualiaProcessor resources.
        
        PHASE 3.2: IBaseService implementation.
        ApplicationInitializerService will automatically unregister all
        @OnEvent handlers during cleanup.
        
        This method MUST NOT raise exceptions (per IBaseService contract).
        """
        try:
            self._logger.info("QualiaProcessor lifecycle cleanup (IBaseService)")
            self._current_state = None
        except Exception as e:
            # Log but don't raise (IBaseService contract requirement)
            self._logger.error(f"Error during QualiaProcessor cleanup: {e}")
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        Get QualiaProcessor health status.
        
        PHASE 3.2: IBaseService implementation.
        
        Returns:
            Dict with service health information
        """
        return {
            "service": "QualiaProcessor",
            "status": "healthy" if self._processing_enabled else "disabled",
            "processing_enabled": self._processing_enabled,
            "has_current_state": self._current_state is not None,
            "intensity_threshold": self._config.intensity_spike_threshold,
            "transcendence_threshold": self._config.transcendence_threshold,
            "chaos_threshold": self._config.chaos_threshold,
        }

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

    def __init__(
        self,
        config: QualiaProcessorConfig,
        event_bus: IEventBus,
        logger: ILogger
    ):
        self._config = config
        self._event_bus = event_bus
        self._logger = logger
        self._logger.warning("⚠️  Using MinimalQualiaProcessor fallback")

    async def process_qualia_state(self, qualia_state: Dict[str, Any]) -> None:
        """Basic QualiaState processing."""
        self._logger.debug("🔄 Minimal processing of QualiaState")

        # Just publish the basic event
        await self._event_bus.publish_async(
            event_name="QualiaStateUpdated",
            data=qualia_state,
            source="MinimalQualiaProcessor",
        )

    @log_execution(level="DEBUG")
    def get_current_state(self) -> Optional[Dict[str, Any]]:
        """Get current state (always None in minimal processor)."""
        return None

    @log_execution(level="DEBUG")
    def enable(self) -> None:
        """Enable processing (no-op in minimal processor)."""
        pass

    @log_execution(level="DEBUG")
    def disable(self) -> None:
        """Disable processing (no-op in minimal processor)."""
        pass
    
    def is_enabled(self) -> bool:
        """Check if processing is enabled."""
        return False

    async def shutdown(self) -> None:
        """Shutdown (no-op in minimal processor)."""
        self._logger.debug("🛑 MinimalQualiaProcessor shutdown")
