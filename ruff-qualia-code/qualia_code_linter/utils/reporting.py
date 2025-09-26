"""
Reporting utilities for Qualia-Code Linter.
"""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any


@dataclass
class Violation:
    """Represents a linting violation."""
    code: str
    message: str
    filepath: Path
    line: int
    column: int
    severity: str = "error"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert violation to dictionary for JSON serialization."""
        return {
            "code": self.code,
            "message": self.message,
            "filepath": str(self.filepath),
            "line": self.line,
            "column": self.column,
            "severity": self.severity
        }


class LintReporter:
    """Handles reporting of linting violations."""
    
    def report(self, violations: List[Violation], format: str = "text") -> None:
        """Report violations in the specified format."""
        if format == "json":
            self._report_json(violations)
        else:
            self._report_text(violations)
    
    def _report_text(self, violations: List[Violation]) -> None:
        """Report violations in human-readable text format."""
        if not violations:
            print("✅ No QUALIA.CODE violations found.")
            return
        
        print(f"🚫 Found {len(violations)} QUALIA.CODE violations:\n")
        
        # Group violations by file
        by_file: Dict[Path, List[Violation]] = {}
        for violation in violations:
            if violation.filepath not in by_file:
                by_file[violation.filepath] = []
            by_file[violation.filepath].append(violation)
        
        # Report violations by file
        for filepath, file_violations in by_file.items():
            print(f"📄 {filepath}:")
            for violation in file_violations:
                severity_icon = "❌" if violation.severity == "error" else "⚠️"
                print(f"  {severity_icon} {violation.code}: {violation.message}")
                print(f"     Line {violation.line}, Column {violation.column}")
            print()
        
        # Summary
        error_count = sum(1 for v in violations if v.severity == "error")
        warning_count = sum(1 for v in violations if v.severity == "warning")
        
        print(f"📊 Summary: {error_count} errors, {warning_count} warnings")
    
    def _report_json(self, violations: List[Violation]) -> None:
        """Report violations in JSON format."""
        output = {
            "violations": [v.to_dict() for v in violations],
            "summary": {
                "total": len(violations),
                "errors": sum(1 for v in violations if v.severity == "error"),
                "warnings": sum(1 for v in violations if v.severity == "warning")
            }
        }
        print(json.dumps(output, indent=2))