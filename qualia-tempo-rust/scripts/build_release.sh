#!/bin/bash
# scripts/build_release.sh - Release Build with Optimizations
# COMPLIANCE: QUALIA.CODE.RUST v1.1 - Performance optimization protocol

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "========================================="
echo "QUALIA TEMPO - OPTIMIZED RELEASE BUILD"
echo "========================================="

# Step 1: Clean previous builds
echo ""
echo "[1/5] Cleaning previous builds..."
cargo clean --release

# Step 2: Build backend with optimizations
echo ""
echo "[2/5] Building backend (release profile)..."
cd backend
cargo build --release --bin qualia-tempo-backend
cd ..

# Step 3: Build frontend with optimizations  
echo ""
echo "[3/5] Building frontend (release + WASM optimization)..."
cd frontend
if command -v trunk &> /dev/null; then
    trunk build --release
else
    echo "WARNING: trunk not found, skipping frontend WASM build"
    echo "Install with: cargo install trunk"
fi
cd ..

# Step 4: Optimize WASM with wasm-opt (if available)
echo ""
echo "[4/5] Optimizing WASM binary..."
if command -v wasm-opt &> /dev/null && [ -f "frontend/dist/frontend_bg.wasm" ]; then
    wasm-opt -O4 --enable-mutable-globals \
        -o frontend/dist/frontend_bg.wasm \
        frontend/dist/frontend_bg.wasm
    echo "WASM optimization complete."
else
    echo "WARNING: wasm-opt not found or WASM file missing"
    echo "Install with: cargo install wasm-opt"
fi

# Step 5: Display build artifacts
echo ""
echo "[5/5] Build complete! Artifacts:"
echo ""

if [ -f "target/release/qualia-tempo-backend" ]; then
    BACKEND_SIZE=$(du -h target/release/qualia-tempo-backend | cut -f1)
    echo "  Backend: target/release/qualia-tempo-backend ($BACKEND_SIZE)"
fi

if [ -f "frontend/dist/frontend_bg.wasm" ]; then
    WASM_SIZE=$(du -h frontend/dist/frontend_bg.wasm | cut -f1)
    echo "  Frontend WASM: frontend/dist/frontend_bg.wasm ($WASM_SIZE)"
fi

echo ""
echo "========================================="
echo "BUILD SUCCESSFUL"
echo "========================================="
