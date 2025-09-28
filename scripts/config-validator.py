#!/usr/bin/env python3
"""
QUALIA.CODE Configuration Validator
Validates all YAML configuration files against the master schema.
"""

import json
import sys
from pathlib import Path
from typing import List

try:
    import yaml
    import jsonschema
except ImportError as e:
    print(f"❌ Missing required packages: {e}")
    print("   Install with: pip install pyyaml jsonschema")
    sys.exit(1)


class ConfigValidator:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.schema_file = project_root / "scripts" / "config.schema.json"
        self.schema = None

    def load_schema(self) -> bool:
        """Load the configuration schema."""
        if not self.schema_file.exists():
            print(f"❌ Schema file not found: {self.schema_file}")
            return False

        try:
            with open(self.schema_file, "r") as f:
                self.schema = json.load(f)
            return True
        except (json.JSONDecodeError, IOError) as e:
            print(f"❌ Error loading schema: {e}")
            return False

    def find_yaml_files(self) -> List[Path]:
        """Find all YAML files in the project."""
        yaml_files = []
        # Common extensions for YAML
        extensions = ["*.yaml", "*.yml"]

        for ext in extensions:
            yaml_files.extend(self.project_root.rglob(ext))

        # Exclude certain directories if needed
        excluded_dirs = [
            ".venv",
            "node_modules",
            "__pycache__",
            ".git",
            "htmlcov_backend",
            "diagnostics"
        ]

        filtered_files = []
        for yaml_file in yaml_files:
            if not any(excluded in str(yaml_file) for excluded in excluded_dirs):
                filtered_files.append(yaml_file)

        return filtered_files

    def validate_yaml_file(self, yaml_file: Path) -> List[str]:
        """Validate a single YAML file against the schema."""
        errors = []

        try:
            with open(yaml_file, "r") as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            errors.append(f"YAML parsing error: {e}")
            return errors

        if data is None:
            errors.append("YAML file is empty or contains only comments")
            return errors

        try:
            jsonschema.validate(instance=data, schema=self.schema)
        except jsonschema.ValidationError as e:
            error_msg = f"Validation error at {e.absolute_path}: {e.message}"
            if e.instance is not None:
                error_msg += f" (value: {e.instance})"
            errors.append(error_msg)
        except jsonschema.SchemaError as e:
            errors.append(f"Schema error: {e}")

        return errors

    def validate_all_configs(self) -> bool:
        """Validate all YAML configuration files."""
        if not self.load_schema():
            return False

        yaml_files = self.find_yaml_files()
        if not yaml_files:
            print("⚠️  No YAML files found in project")
            return True

        print(f"🔍 Validating {len(yaml_files)} YAML configuration files...")

        all_valid = True
        total_errors = 0

        for yaml_file in sorted(yaml_files):
            relative_path = yaml_file.relative_to(self.project_root)
            errors = self.validate_yaml_file(yaml_file)

            if errors:
                print(f"❌ {relative_path}:")
                for error in errors:
                    print(f"   {error}")
                    total_errors += 1
                all_valid = False
            else:
                print(f"✅ {relative_path}")

        if all_valid:
            print("✅ All configuration files are valid")
        else:
            print(f"❌ Found {total_errors} validation errors across {len(yaml_files)} files")

        return all_valid

    def validate(self) -> bool:
        """Run the validation."""
        return self.validate_all_configs()


def main():
    project_root = Path(__file__).parent.parent
    validator = ConfigValidator(project_root)
    success = validator.validate()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()