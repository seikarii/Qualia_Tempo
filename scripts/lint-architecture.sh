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
    
    # For now, use a simple Python script to check basic QUALIA.CODE rules
    # TODO: Replace with native Ruff plugin once dependency issues are resolved
    python3 -c "
import os
import ast
import sys

def should_skip_directory(dirname):
    \"\"\"Check if directory should be skipped during analysis.\"\"\"
    skip_dirs = {
        '.venv', 'venv', '__pycache__', '.git', '.pytest_cache', 
        'node_modules', '.next', 'dist', 'build', '.tox', '.eggs',
        '*.egg-info', '.mypy_cache', '.coverage', 'htmlcov'
    }
    return dirname in skip_dirs or dirname.startswith('.') or dirname.startswith('__')

def check_qualia_code_compliance(directory):
    violations = []
    
    for root, dirs, files in os.walk(directory):
        # Filter out directories to skip
        dirs[:] = [d for d in dirs if not should_skip_directory(d)]
        
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    tree = ast.parse(content, filepath)
                    
                    # Check for direct service instantiation
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'Service':
                            if hasattr(node, 'args') and node.args:
                                violations.append(f'{filepath}: Direct service instantiation detected')
                        
                        # Check for missing @log_execution decorators
                        if isinstance(node, ast.FunctionDef):
                            # QUALIA.CODE: Intelligent decorator enforcement.
                            # Ignore private methods, simple getters, and single-return functions.
                            is_private = node.name.startswith('_')
                            is_simple_getter = node.name.startswith('get_')
                            is_single_return = len(node.body) == 1 and isinstance(node.body[0], ast.Return)

                            if not is_private and not is_simple_getter and not is_single_return:
                                has_decorator = any(
                                    (isinstance(d, ast.Call) and isinstance(d.func, ast.Name) and d.func.id == 'log_execution') or
                                    (isinstance(d, ast.Name) and d.id == 'log_execution')
                                    for d in node.decorator_list
                                )
                                if not has_decorator:
                                    violations.append(f'{filepath}:{node.lineno}: Method {node.name} missing @log_execution decorator')
                
                except Exception as e:
                    violations.append(f'{filepath}: Error parsing file - {e}')
    
    return violations

violations = check_qualia_code_compliance('$BACKEND_PATH')
if violations:
    print('   ❌ Backend architectural violations detected')
    for v in violations[:10]:  # Show first 10 violations
        print(f'   {v}')
    if len(violations) > 10:
        print(f'   ... and {len(violations) - 10} more violations')
    sys.exit(1)
else:
    print('   ✅ Backend architectural compliance: PASSED')
    sys.exit(0)
"
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