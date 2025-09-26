"""
Setup configuration for qualia-code-linter
"""

from setuptools import setup, find_packages

setup(
    name="qualia-code-linter", 
    version="1.0.0",
    description="Architectural enforcement linter for QUALIA.CODE Python projects",
    author="Crisalida Systems",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # No external dependencies - uses only stdlib
    ],
    extras_require={
        "toml": ["toml>=0.10.0"],
        "dev": ["pytest>=6.0", "black", "mypy"]
    },
    entry_points={
        "console_scripts": [
            "qualia-code-linter=qualia_code_linter.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License", 
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Quality Assurance",
    ],
)