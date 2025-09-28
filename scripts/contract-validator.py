#!/usr/bin/env python3
"""
QUALIA.CODE Contract Validator
Validates that generated contracts are synchronized with JSON schemas.
"""

import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Dict, List


class ContractValidator:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.contracts_dir = project_root / "shared_contracts"
        self.scripts_dir = project_root / "scripts"
        self.manifest_file = self.scripts_dir / "contracts.manifest.json"
        self.backend_models = project_root / "qualia-tempo-prototype" / "backend" / "api" / "models.py"
        self.frontend_contracts = project_root / "qualia-tempo-prototype" / "frontend" / "src" / "types" / "contracts.ts"

    def calculate_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    def get_contract_files(self) -> List[Path]:
        """Get all JSON contract files."""
        return list(self.contracts_dir.glob("*.json"))

    def load_manifest(self) -> Dict[str, str]:
        """Load the contracts manifest."""
        if not self.manifest_file.exists():
            return {}
        try:
            with open(self.manifest_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    def save_manifest(self, manifest: Dict[str, str]) -> None:
        """Save the contracts manifest."""
        self.scripts_dir.mkdir(parents=True, exist_ok=True)
        with open(self.manifest_file, "w") as f:
            json.dump(manifest, f, indent=2, sort_keys=True)

    def check_contracts_sync(self) -> bool:
        """Check if contracts are synchronized."""
        contract_files = self.get_contract_files()
        if not contract_files:
            print("❌ No contract files found in shared_contracts/")
            return False

        current_hashes = {}
        for contract_file in contract_files:
            current_hashes[contract_file.name] = self.calculate_hash(contract_file)

        stored_hashes = self.load_manifest()

        # Check if any hashes have changed
        changed_files = []
        for filename, current_hash in current_hashes.items():
            stored_hash = stored_hashes.get(filename)
            if stored_hash != current_hash:
                changed_files.append(filename)

        if not changed_files:
            print("✅ All contracts are synchronized")
            return True

        print(f"⚠️  Contract changes detected in: {', '.join(changed_files)}")

        # Check if generate_contracts.sh was run after schema changes
        if not self.backend_models.exists() or not self.frontend_contracts.exists():
            print("❌ Generated contract files do not exist")
            print("   Run scripts/generate_contracts.sh to generate contracts")
            return False

        # Check modification times
        schema_mtimes = [os.path.getmtime(contract_file) for contract_file in contract_files]
        max_schema_mtime = max(schema_mtimes)

        backend_mtime = os.path.getmtime(self.backend_models)
        frontend_mtime = os.path.getmtime(self.frontend_contracts)

        if backend_mtime < max_schema_mtime or frontend_mtime < max_schema_mtime:
            print("❌ Contracts are out of sync")
            print("   Schema files have been modified more recently than generated contracts")
            print("   Run scripts/generate_contracts.sh to regenerate contracts")
            return False

        # Contracts are up to date, update manifest
        self.save_manifest(current_hashes)
        print("✅ Contracts synchronized and manifest updated")
        return True

    def validate(self) -> bool:
        """Run the validation."""
        print("🔍 Validating contract synchronization...")

        if not self.contracts_dir.exists():
            print(f"❌ Contracts directory not found: {self.contracts_dir}")
            return False

        return self.check_contracts_sync()


def main():
    project_root = Path(__file__).parent.parent
    validator = ContractValidator(project_root)
    success = validator.validate()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()