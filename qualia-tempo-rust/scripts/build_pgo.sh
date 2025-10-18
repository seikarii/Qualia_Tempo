#!/bin/bash
# scripts/build_pgo.sh - Profile-Guided Optimization Build
# COMPLIANCE: QUALIA.CODE.RUST v1.1 - Maximum performance via PGO

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PGO_DATA_DIR="$PROJECT_ROOT/target/pgo-profiles"

cd "$PROJECT_ROOT/backend"

echo "========================================="
echo "QUALIA TEMPO - PGO BUILD PROTOCOL"
echo "========================================="

# Step 1: Build instrumented binary
echo ""
echo "[1/4] Building instrumented binary (pgo-generate profile)..."
cargo build --profile pgo-generate --bin qualia-tempo-backend

# Step 2: Run instrumented binary to generate profile data
echo ""
echo "[2/4] Generating profile data..."
echo "Starting backend server to collect runtime profiling data..."
echo "Server will run for 30 seconds. Please interact with the system."
echo ""

# Create profile data directory
mkdir -p "$PGO_DATA_DIR"

# Set environment variable for profile data location
export LLVM_PROFILE_FILE="$PGO_DATA_DIR/qualia-tempo-%p.profraw"

# Run server in background
../target/pgo-generate/qualia-tempo-backend &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
echo "Waiting 30 seconds for profiling data collection..."
sleep 30

# Stop server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

# Step 3: Merge profile data
echo ""
echo "[3/4] Merging profile data..."
if command -v llvm-profdata &> /dev/null; then
    llvm-profdata merge -o "$PGO_DATA_DIR/merged.profdata" "$PGO_DATA_DIR"/*.profraw
    echo "Profile data merged: $PGO_DATA_DIR/merged.profdata"
else
    echo "ERROR: llvm-profdata not found. Install LLVM tools."
    exit 1
fi

# Step 4: Build optimized binary with PGO
echo ""
echo "[4/4] Building PGO-optimized binary..."
export RUSTFLAGS="-Cprofile-use=$PGO_DATA_DIR/merged.profdata"
cargo build --profile pgo-use --bin qualia-tempo-backend

FINAL_SIZE=$(du -h ../target/pgo-use/qualia-tempo-backend | cut -f1)

echo ""
echo "========================================="
echo "PGO BUILD SUCCESSFUL"
echo "========================================="
echo ""
echo "Optimized binary: target/pgo-use/qualia-tempo-backend ($FINAL_SIZE)"
echo "Profile data: $PGO_DATA_DIR"
echo ""
echo "Expected performance gain: 10-20% over standard release build"
echo "========================================="
