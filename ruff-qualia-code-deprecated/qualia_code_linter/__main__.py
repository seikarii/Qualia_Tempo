"""
Entry point for running qualia-code-linter as a module.
Usage: python -m qualia_code_linter [options] <path>
"""

import sys
from .main import main

if __name__ == "__main__":
    sys.exit(main())