#!/usr/bin/env python3
"""
QUALIA.CODE Ruff Plugin Lint Runner
Standalone runner for executing QUALIA.CODE architectural rules
"""

import ast
import sys
import argparse
from pathlib import Path
from typing import List, Optional

from .rules import (
    QLA001, QLA002, QLA003, QLA004, QLA005, QLA006,
    QLA007, QLA008, QLA009, QLA010, QLA011, SourceFile
)


def should_skip_directory(path: Path) -> bool:
    """Check if directory should be skipped during analysis."""
    skip_dirs = {
        '.venv', 'venv', '__pycache__', '.git', '.pytest_cache', 
        'node_modules', '.next', 'dist', 'build', '.tox', '.eggs',
        '.mypy_cache', '.coverage', 'htmlcov'
    }
    return (
        path.name in skip_dirs or 
        path.name.startswith('.') or 
        path.name.startswith('__') or
        path.suffix == '.egg-info'
    )


def find_python_files(directory: Path) -> List[Path]:
    """Find all Python files in directory, respecting skip rules."""
    python_files = []
    
    def scan_directory(path: Path):
        if should_skip_directory(path):
            return
            
        for item in path.iterdir():
            if item.is_file() and item.suffix == '.py':
                python_files.append(item)
            elif item.is_dir() and not should_skip_directory(item):
                scan_directory(item)
    
    scan_directory(directory)
    return python_files


def lint_file(file_path: Path, rules: List, qla011_analyzer=None, verbose: bool = False) -> List[str]:
    """Lint a single Python file with all QUALIA.CODE rules."""
    violations = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content, str(file_path))
        source_file = SourceFile.new(file_path, content)
        
        # Run all rules
        for rule_class in rules:
            if rule_class == QLA011:
                # Use shared QLA011 analyzer for cross-file analysis
                if qla011_analyzer:
                    diagnostic = qla011_analyzer.check(tree, source_file)
                    if diagnostic:
                        violation_msg = f"{file_path}:{diagnostic.code}: {diagnostic.message}"
                        violations.append(violation_msg)
                        if verbose:
                            print(f"   {violation_msg}")
            else:
                # Standard rule processing
                rule = rule_class()
                diagnostic = rule.check(tree, source_file)
                
                if diagnostic:
                    violation_msg = f"{file_path}:{diagnostic.code}: {diagnostic.message}"
                    violations.append(violation_msg)
                    if verbose:
                        print(f"   {violation_msg}")
                        
    except Exception as e:
        error_msg = f"{file_path}: Error parsing file - {e}"
        violations.append(error_msg)
        if verbose:
            print(f"   {error_msg}")
    
    return violations


def main():
    """Main entry point for the lint runner."""
    parser = argparse.ArgumentParser(
        description="QUALIA.CODE Architectural Linting Tool"
    )
    parser.add_argument(
        "directory",
        type=Path,
        help="Directory to lint"
    )
    parser.add_argument(
        "--format",
        choices=["concise", "verbose"],
        default="concise",
        help="Output format"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Verbose output (same as --format=verbose)"
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        args.format = "verbose"
    
    directory = args.directory
    if not directory.exists() or not directory.is_dir():
        print(f"Error: Directory '{directory}' does not exist or is not a directory")
        sys.exit(1)
    
    # All QUALIA.CODE rules including the new QLA008 (circuit breaker)
    rules = [
        QLA001, QLA002, QLA003, QLA004, QLA005, QLA006,
        QLA007, QLA008, QLA009, QLA010, QLA011
    ]
    
    python_files = find_python_files(directory)
    
    if not python_files:
        print(f"No Python files found in {directory}")
        sys.exit(0)
    
    all_violations = []
    
    # Initialize QLA011 analyzer if circular dependency analysis is enabled
    qla011_analyzer = None
    if QLA011 in rules:
        qla011_analyzer = QLA011()
    
    # Process all files
    for file_path in python_files:
        violations = lint_file(file_path, rules, qla011_analyzer, args.format == "verbose")
        all_violations.extend(violations)
    
    # Run cross-file circular dependency analysis
    if qla011_analyzer:
        circular_violations = qla011_analyzer.analyze_all_dependencies()
        for diagnostic in circular_violations:
            violation_msg = f"Global:{diagnostic.code}: {diagnostic.message}"
            all_violations.append(violation_msg)
            if args.format == "verbose":
                print(f"   {violation_msg}")
    
    if all_violations:
        if args.format == "concise":
            print(f"Found {len(all_violations)} QUALIA.CODE violations:")
            for violation in all_violations[:10]:  # Show first 10
                print(f"   {violation}")
            if len(all_violations) > 10:
                print(f"   ... and {len(all_violations) - 10} more violations")
        
        sys.exit(1)
    else:
        print("All files pass QUALIA.CODE architectural compliance")
        sys.exit(0)


if __name__ == "__main__":
    main()