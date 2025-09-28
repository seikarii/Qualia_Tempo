#!/usr/bin/env python3
"""
Simple linter using the Qualia Code rules.
Usage: python lint_qualia.py <file_or_directory>
"""

import ast
import sys
from pathlib import Path
from ruff_qualia_code.rules import QLA001, QLA002, QLA003, SourceFile


def lint_file(filepath: Path) -> list:
    """Lint a single Python file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content, str(filepath))
        source_file = SourceFile.new(filepath, content)
        
        diagnostics = []
        
        # Check all rules
        rules = [QLA001(), QLA002(), QLA003()]
        for rule in rules:
            diagnostic = rule.check(tree, source_file)
            if diagnostic:
                diagnostics.append(diagnostic)
        
        return diagnostics
    
    except SyntaxError as e:
        return [f"Syntax error in {filepath}: {e}"]
    except Exception as e:
        return [f"Error linting {filepath}: {e}"]


def main():
    if len(sys.argv) < 2:
        print("Usage: python lint_qualia.py <file_or_directory>")
        sys.exit(1)
    
    target = Path(sys.argv[1])
    
    if target.is_file():
        files = [target]
    elif target.is_dir():
        files = list(target.rglob("*.py"))
    else:
        print(f"Path {target} does not exist")
        sys.exit(1)
    
    total_violations = 0
    
    for file in files:
        diagnostics = lint_file(file)
        if diagnostics:
            print(f"\n{file}:")
            for diag in diagnostics:
                if isinstance(diag, str):
                    print(f"  ERROR: {diag}")
                else:
                    print(f"  {diag.code}: {diag.message}")
                total_violations += 1
    
    if total_violations == 0:
        print("No violations found!")
    else:
        print(f"\nTotal violations: {total_violations}")
        sys.exit(1)


if __name__ == "__main__":
    main()