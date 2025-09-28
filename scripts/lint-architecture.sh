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
FRONTEND_ERRORS=0
BACKEND_ERRORS=0

echo -e "${BLUE}📋 Phase 1: Frontend ESLint Rules${NC}"
if [ -d "$FRONTEND_PATH" ]; then
    cd "$FRONTEND_PATH"
    echo "   Running ESLint with QUALIA.CODE rules..."
    
    if npm run lint 2>/dev/null; then
        echo -e "   ${GREEN}✅ Frontend architectural compliance: PASSED${NC}"
    else
        echo -e "   ${RED}❌ Frontend architectural violations detected${NC}"
        FRONTEND_ERRORS=1
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

echo
echo -e "${BLUE}📋 Phase 3: Summary${NC}"
echo "   Frontend Compliance: $([ $FRONTEND_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo "   Backend Compliance:  $([ $BACKEND_ERRORS -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"

TOTAL_ERRORS=$((FRONTEND_ERRORS + BACKEND_ERRORS))

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
    echo "   • Frontend: Use useService() hooks instead of direct imports"
    echo "   • Backend: Add @log_execution decorators to service methods"
    echo "   • Backend: Inject services via CompositionRoot, never 'new Service()'"
    exit 1
fi