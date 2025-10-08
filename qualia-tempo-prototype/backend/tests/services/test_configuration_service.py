# QUALIA.CODE v1.1 - ConfigurationService Tests
import pytest
from backend.tests.test_composition_root import TestCompositionRootFactory


class TestConfigurationService:
    """Test suite for ConfigurationService."""

    @pytest.fixture
    def mocked_composition_root(self):
        """Get mocked composition root with all services."""
        return TestCompositionRootFactory.create_mocked_composition_root()

    @pytest.mark.asyncio
    async def test_load_config_success(self, mocked_composition_root):
        """Test successful YAML config loading."""
        config_service = mocked_composition_root.get_service("configuration_service")
        assert config_service is not None

        # Load logger config
        logger_config = await config_service.load_config("logger")
        assert isinstance(logger_config, dict)
        assert "log_level" in logger_config
        assert logger_config["log_level"] == "INFO"

    @pytest.mark.asyncio
    async def test_configuration_service_registered(self, mocked_composition_root):
        """Test that ConfigurationService is properly registered in container."""
        config_service = mocked_composition_root.get_service("configuration_service")
        assert config_service is not None
        assert hasattr(config_service, 'load_config')
        assert hasattr(config_service, 'get_raw')
        assert hasattr(config_service, 'reload')
