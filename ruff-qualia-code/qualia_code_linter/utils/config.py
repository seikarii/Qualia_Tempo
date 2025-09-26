"""
Configuration loading utilities for Qualia-Code Linter.
"""

import os
from pathlib import Path
from typing import Dict, Any, List

try:
    import toml
    HAS_TOML = True
except ImportError:
    HAS_TOML = False


DEFAULT_CONFIG = {
    "strict": False,
    "rules": ["QLA001", "QLA002", "QLA003"],
    "exclude": [
        "tests/",
        "__pycache__/",
        ".pytest_cache/",
        ".mypy_cache/",
        ".venv/",
        "venv/",
        "htmlcov/"
    ],
    "service_directories": ["services/"],
    "composition_root_files": ["CompositionRoot.py"],
    "decorator_requirements": {
        "public_methods": ["log_execution", "handle_errors", "validate_schema"],
        "api_methods": ["log_execution", "handle_errors"]
    }
}


def load_config(config_path: str = ".qualia-code-linter.toml") -> Dict[str, Any]:
    """Load configuration from TOML file or return defaults."""
    config = DEFAULT_CONFIG.copy()
    
    config_file = Path(config_path)
    
    if config_file.exists() and HAS_TOML:
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                user_config = toml.load(f)
            
            # Merge user config with defaults
            tool_config = user_config.get("tool", {}).get("qualia-code-linter", {})
            config.update(tool_config)
            
        except Exception as e:
            print(f"⚠️  Warning: Could not load config file {config_file}: {e}")
    
    elif config_file.exists() and not HAS_TOML:
        print(f"⚠️  Warning: TOML library not available, using default config")
    
    return config


def find_project_root(start_path: Path) -> Path:
    """Find project root by looking for common project files."""
    current = start_path.resolve()
    
    # Look for common project root indicators
    root_indicators = [
        "pyproject.toml",
        "setup.py",
        "requirements.txt",
        ".git",
        "CompositionRoot.py"
    ]
    
    while current != current.parent:
        if any((current / indicator).exists() for indicator in root_indicators):
            return current
        current = current.parent
    
    return start_path