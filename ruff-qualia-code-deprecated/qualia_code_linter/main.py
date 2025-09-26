"""
Main Qualia-Code Linter implementation.
"""

import argparse
import ast
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional

from .rules import QLA001, QLA002, QLA003
from .utils.config import load_config
from .utils.reporting import LintReporter, Violation


class QualiaCodeLinter:
    """Main linter class that coordinates rule execution."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.rules = {
            "QLA001": QLA001,
            "QLA002": QLA002,
            "QLA003": QLA003,
        }
        self.enabled_rules = self.config.get("rules", list(self.rules.keys()))
        self.reporter = LintReporter()
    
    def lint_file(self, filepath: Path) -> List[Violation]:
        """Lint a single Python file."""
        violations = []
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content, filename=str(filepath))
            
            # Apply each enabled rule
            for rule_name in self.enabled_rules:
                if rule_name in self.rules:
                    rule_class = self.rules[rule_name]
                    rule_instance = rule_class(filepath, self.config)
                    rule_violations = rule_instance.check(tree)
                    violations.extend(rule_violations)
            
        except SyntaxError as e:
            violation = Violation(
                code="SYNTAX_ERROR",
                message=f"Syntax error: {e.msg}",
                filepath=filepath,
                line=e.lineno or 0,
                column=e.offset or 0
            )
            violations.append(violation)
        except Exception as e:
            violation = Violation(
                code="INTERNAL_ERROR", 
                message=f"Internal linter error: {str(e)}",
                filepath=filepath,
                line=0,
                column=0
            )
            violations.append(violation)
        
    def lint_stdin(self, filename: str) -> List[Violation]:
        """Lint code from stdin with given filename."""
        violations = []
        
        try:
            content = sys.stdin.read()
            tree = ast.parse(content, filename=filename)
            
            # Apply each enabled rule
            for rule_name in self.enabled_rules:
                if rule_name in self.rules:
                    rule_class = self.rules[rule_name]
                    rule_instance = rule_class(Path(filename), self.config)
                    rule_violations = rule_instance.check(tree)
                    violations.extend(rule_violations)
            
        except SyntaxError as e:
            violation = Violation(
                code="SYNTAX_ERROR",
                message=f"Syntax error: {e.msg}",
                filepath=Path(filename),
                line=e.lineno or 0,
                column=e.offset or 0
            )
            violations.append(violation)
        except Exception as e:
            violation = Violation(
                code="INTERNAL_ERROR", 
                message=f"Internal linter error: {str(e)}",
                filepath=Path(filename),
                line=0,
                column=0
            )
            violations.append(violation)
        
        return violations
        """Lint all Python files in a directory recursively."""
        violations = []
        exclude_patterns = self.config.get("exclude", [])
        
        for py_file in directory.rglob("*.py"):
            # Check if file should be excluded
            relative_path = py_file.relative_to(directory)
            should_exclude = any(
                str(relative_path).startswith(pattern.rstrip('/'))
                for pattern in exclude_patterns
            )
            
            if should_exclude:
                continue
                
            file_violations = self.lint_file(py_file)
            violations.extend(file_violations)
        
        return violations
    
    def lint(self, target_path: Path) -> List[Violation]:
        """Lint a file or directory."""
        if target_path.is_file():
            return self.lint_file(target_path)
        elif target_path.is_dir():
            return self.lint_directory(target_path)
        else:
            raise ValueError(f"Target path {target_path} does not exist")


def main() -> int:
    """Main entry point for the linter CLI."""
    parser = argparse.ArgumentParser(
        description="Qualia-Code Linter: Architectural Enforcement for Python"
    )
    parser.add_argument(
        "target",
        nargs="?",
        help="Path to file or directory to lint"
    )
    parser.add_argument(
        "--config",
        help="Path to configuration file",
        default=".qualia-code-linter.toml"
    )
    parser.add_argument(
        "--rules",
        help="Comma-separated list of rules to enable",
        default=None
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero code if any violations found"
    )
    parser.add_argument(
        "--format",
        choices=["text", "json", "ruff"],
        default="text",
        help="Output format"
    )
    parser.add_argument(
        "--stdin-filename",
        help="Filename when reading from stdin (for Ruff integration)"
    )
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Override rules if specified via CLI
    if args.rules:
        config["rules"] = [rule.strip() for rule in args.rules.split(",")]
    
    # Initialize linter
    linter = QualiaCodeLinter(config)
    
    # Lint target
    if args.stdin_filename:
        # Read from stdin for Ruff integration
        violations = linter.lint_stdin(args.stdin_filename)
    else:
        if not args.target:
            parser.error("target is required when not using --stdin-filename")
        target_path = Path(args.target)
        violations = linter.lint(target_path)
    
    # Report results
    linter.reporter.report(violations, format=args.format)
    
    # Exit with appropriate code
    if args.strict and violations:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())