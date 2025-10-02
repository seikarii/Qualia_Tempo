#!/bin/bash

# QUALIA.CODE Architectural Enforcement Script
# This script runs all architectural linting tools to ensure compliance

set -e

echo "🏗️  QUALIA.CODE Architectural Enforcement"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_PATH="$PROJECT_ROOT/qualia-tempo-prototype/frontend"
BACKEND_PATH="$PROJECT_ROOT/qualia-tempo-prototype/backend"

# Error tracking
CONTRACT_ERRORS=0
CONFIG_ERRORS=0
FRONTEND_TYPE_ERRORS=0
FRONTEND_COMPLIANCE_ERRORS=0
BACKEND_ERRORS=0
TYPE_ERRORS=0

echo -e "${BLUE}📋 Phase 0: Contract & Configuration Integrity${NC}"
if python3 "$PROJECT_ROOT/scripts/contract-validator.py"; then
    echo -e "   ${GREEN}✅ Contract integrity: PASSED${NC}"
else
    echo -e "   ${RED}❌ Contract integrity violations detected${NC}"
    CONTRACT_ERRORS=1
fi

if python3 "$PROJECT_ROOT/scripts/config-validator.py"; then
    echo -e "   ${GREEN}✅ Configuration integrity: PASSED${NC}"
else
    echo -e "   ${RED}❌ Configuration integrity violations detected${NC}"
    CONFIG_ERRORS=1
fi

# If integrity checks fail, exit immediately
if [ $CONTRACT_ERRORS -eq 1 ] || [ $CONFIG_ERRORS -eq 1 ]; then
    echo
    echo -e "${RED}🚫 INTEGRITY CHECK FAILED: Fix integrity issues before proceeding${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Phase 1A: Frontend TypeScript Type Checking${NC}"
if [ -d "$FRONTEND_PATH" ]; then
    cd "$FRONTEND_PATH"
    echo "   Running TypeScript compiler for type validation..."

    if npx tsc --noEmit; then
        echo -e "   ${GREEN}✅ Frontend type checking: PASSED${NC}"
    else
        echo -e "   ${RED}❌ Frontend type errors detected (build-breaking)${NC}"
        FRONTEND_TYPE_ERRORS=1
    fi
else
    echo -e "   ${YELLOW}⚠️  Frontend path not found, skipping TypeScript${NC}"
fi

echo -e "${BLUE}📋 Phase 1B: Frontend QUALIA.CODE Compliance${NC}"
if [ -d "$FRONTEND_PATH" ]; then
    cd "$FRONTEND_PATH"
    echo "   Running ESLint with QUALIA.CODE rules..."

    if npm run lint; then
        echo -e "   ${GREEN}✅ Frontend architectural compliance: PASSED${NC}"
    else
        echo -e "   ${RED}❌ Frontend architectural violations detected${NC}"
        FRONTEND_COMPLIANCE_ERRORS=1
    fi
else
    echo -e "   ${YELLOW}⚠️  Frontend path not found, skipping ESLint${NC}"
fi

echo -e "${BLUE}📋 Phase 2: Backend Python Rules${NC}"
if [ -d "$BACKEND_PATH" ]; then
    cd "$PROJECT_ROOT"
    echo "   Running QUALIA.CODE Python linter..."

    # Activate virtual environment if it exists
    if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
        source "$PROJECT_ROOT/.venv/bin/activate"
    fi

    # QUALIA.CODE Native Ruff Plugin Integration
    echo "   Running Ruff with QUALIA.CODE plugin..."

    # Install the plugin in development mode if not already installed
    if ! python -c "import ruff_qualia_code" 2>/dev/null; then
        echo "   Installing ruff-qualia-code plugin..."
        pip install -e "$PROJECT_ROOT/ruff-qualia-code" > /dev/null 2>&1
    fi

    # Run Ruff with QUALIA.CODE rules on backend Python files
    if python -m ruff_qualia_code "$BACKEND_PATH" --format=concise; then
        echo "   ✅ Backend architectural compliance: PASSED"
    else
        echo "   ❌ Backend architectural violations detected"
        echo "   Run 'python -m ruff_qualia_code $BACKEND_PATH --verbose' for details"
        BACKEND_ERRORS=1
    fi

    # CRITICAL FIX: Capture the exit code from the Python linter
    if [ $? -ne 0 ]; then
        BACKEND_ERRORS=1
    fi
else
    echo -e "   ${YELLOW}⚠️  Backend path not found, skipping Python linter${NC}"
fi

echo -e "${BLUE}📋 Phase 3: Backend Type Architecture Analysis${NC}"
if [ -d "$BACKEND_PATH" ]; then
    cd "$PROJECT_ROOT"
    echo "   Running MyPy with QUALIA.CODE plugin..."

    # Activate virtual environment if it exists
    if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
        source "$PROJECT_ROOT/.venv/bin/activate"
    fi

    # Install MyPy plugin in development mode if not already installed
    if ! python -c "import mypy_qualia_code" 2>/dev/null; then
        echo "   Installing mypy-qualia-code plugin..."
        pip install -e "$PROJECT_ROOT/mypy-qualia-code" > /dev/null 2>&1
    fi

    # Run MyPy with QUALIA.CODE plugin on backend Python files
    if python -m mypy "$BACKEND_PATH" --config-file "$PROJECT_ROOT/pyproject.toml"; then
        echo -e "   ${GREEN}✅ Backend type architecture: PASSED${NC}"
        TYPE_ERRORS=0
    else
        echo -e "   ${RED}❌ Backend type architecture violations detected${NC}"
        echo "   Run 'python -m mypy $BACKEND_PATH --config-file $PROJECT_ROOT/pyproject.toml' for details"
        TYPE_ERRORS=1
    fi
else
    echo -e "   ${YELLOW}⚠️  Backend path not found, skipping type analysis${NC}"
    TYPE_ERRORS=0
fi

echo
echo -e "${BLUE}📋 Phase 4: Summary${NC}"
echo "   Contract Integrity:        $([ $CONTRACT_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Config Integrity:          $([ $CONFIG_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Frontend TypeScript:       $([ $FRONTEND_TYPE_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Frontend QUALIA.CODE:      $([ $FRONTEND_COMPLIANCE_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Backend Patterns:          $([ $BACKEND_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Backend Types:             $([ $TYPE_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"

TOTAL_ERRORS=$((CONTRACT_ERRORS + CONFIG_ERRORS + FRONTEND_TYPE_ERRORS + FRONTEND_COMPLIANCE_ERRORS + BACKEND_ERRORS + TYPE_ERRORS))

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo
    echo -e "${GREEN}🎉 ARCHITECTURAL ENFORCEMENT: ALL SYSTEMS COMPLIANT${NC}"
    echo -e "${GREEN}   QUALIA.CODE principles successfully enforced${NC}"
    exit 0
else
    echo
    echo -e "${RED}🚫 ARCHITECTURAL ENFORCEMENT: VIOLATIONS DETECTED${NC}"
    echo -e "${RED}   $TOTAL_ERRORS system(s) have architectural violations${NC}"
    echo
    echo -e "${YELLOW}💡 Quick Fixes:${NC}"
    if [ $FRONTEND_TYPE_ERRORS -eq 1 ]; then
        echo "   • Frontend TypeScript: Fix type errors to enable building"
    fi
    if [ $FRONTEND_COMPLIANCE_ERRORS -eq 1 ]; then
        echo "   • Frontend QUALIA.CODE: Use useService() hooks instead of direct imports"
    fi
    echo "   • Backend: Add @log_execution decorators to service methods"
    echo "   • Backend: Inject services via CompositionRoot, never 'new Service()'"
    exit 1
fi