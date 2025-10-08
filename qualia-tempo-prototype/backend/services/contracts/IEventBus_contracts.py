# QUALIA.CODE v1.1 - IEventBus Contracts
from dataclasses import dataclass, field
from typing import Dict, Any

@dataclass
class EventBusConfig:
    """Configuration contract for EventBus."""
    max_handlers_per_event: int = 100
    enable_statistics: bool = True
    log_all_events: bool = False
    dead_letter_queue_enabled: bool = True
    event_timeout_seconds: float = 30.0
    
@dataclass
class EventBusStatistics:
    """Statistics for EventBus."""
    events_published: int = 0
    events_handled: int = 0
    errors: int = 0
    handler_count: Dict[str, int] = field(default_factory=dict)
