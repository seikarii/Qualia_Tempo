#!/usr/bin/env bash
# # Responsibility
# Generates code coverage report using cargo-llvm-cov.
#
# ---
#
# COMPLIANCE: PLAN.md §10.3 - Coverage report > 80% requirement

set -e

echo "========================================="
echo " QUALIA TEMPO - Coverage Report"
echo "========================================="

# Check if cargo-llvm-cov is installed
if ! command -v cargo-llvm-cov &> /dev/null; then
    echo "ERROR: cargo-llvm-cov not found"
    echo "Install with: cargo install cargo-llvm-cov"
    exit 1
fi

# Clean previous coverage data
echo "[1/4] Cleaning previous coverage data..."
cargo llvm-cov clean --workspace

# Run tests with coverage
echo "[2/4] Running tests with coverage instrumentation..."
cargo llvm-cov test --workspace --all-targets --no-report

# Generate HTML report
echo "[3/4] Generating HTML coverage report..."
cargo llvm-cov report --html --output-dir target/coverage

# Generate summary
echo "[4/4] Coverage Summary:"
echo "========================================="
cargo llvm-cov report --summary-only

echo ""
echo "✓ HTML report generated at: target/coverage/index.html"
echo ""

# Check coverage threshold (80%)
COVERAGE=$(cargo llvm-cov report --summary-only | grep -oP 'TOTAL\s+\d+\.\d+%' | grep -oP '\d+\.\d+' || echo "0.0")
THRESHOLD=80.0

echo "Coverage: ${COVERAGE}%"
echo "Threshold: ${THRESHOLD}%"

if (( $(echo "$COVERAGE >= $THRESHOLD" | bc -l) )); then
    echo "✓ Coverage threshold met!"
    exit 0
else
    echo "✗ Coverage below threshold"
    exit 1
fi
