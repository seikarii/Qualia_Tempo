# QUALIA.CODE v1.1 - IRenderingService Interface
# Interface for rendering services that produce video frames

from abc import ABC, abstractmethod
from typing import Optional


class IRenderingService(ABC):
    """
    Interface for rendering services that produce video frames for streaming.
    """

    @abstractmethod
    def render_frame(self) -> Optional[bytes]:
        """
        Render a single frame and return the pixel data as bytes.

        Returns:
            bytes: The rendered frame as raw pixel data, or None if rendering failed
        """
        pass

    @abstractmethod
    def is_healthy(self) -> bool:
        """
        Check if the rendering service is healthy and ready to render.

        Returns:
            bool: True if healthy, False otherwise
        """
        pass

    @abstractmethod
    def shutdown(self) -> None:
        """
        Shutdown the rendering service and clean up resources.
        """
        pass