#!/bin/bash
# Phase 6.5 - Test Orchestration Script
# Runs all integration and stability tests systematically
# 
# Usage: ./run-phase65-tests.sh [test-suite]
# 
# Test suites:
#   all        - Run all tests (default)
#   e2e        - E2E integration tests only
#   websocket  - WebSocket stability tests only
#   quick      - Quick smoke tests

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="../../backend"
FRONTEND_DIR=".."
BACKEND_PORT=8000
FRONTEND_PORT=5173
TEST_RESULTS_DIR="../../test-results-phase65"
LOG_DIR="../../logs-phase65"

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$LOG_DIR"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if backend is running
check_backend() {
    print_info "Checking if backend is running on port $BACKEND_PORT..."
    
    if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        print_success "Backend is running"
        return 0
    else
        print_warning "Backend is not running"
        return 1
    fi
}

# Check if frontend is running
check_frontend() {
    print_info "Checking if frontend is running on port $FRONTEND_PORT..."
    
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        print_success "Frontend is running"
        return 0
    else
        print_warning "Frontend is not running"
        return 1
    fi
}

# Start backend
start_backend() {
    print_info "Starting backend..."
    cd "$BACKEND_DIR"
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Start backend in background
    nohup python -m uvicorn main:app --reload --log-level debug > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$LOG_DIR/backend.pid"
    
    # Wait for backend to be ready
    print_info "Waiting for backend to be ready..."
    for i in {1..30}; do
        if check_backend; then
            print_success "Backend started successfully (PID: $BACKEND_PID)"
            cd - > /dev/null
            return 0
        fi
        sleep 1
    done
    
    print_error "Backend failed to start"
    cd - > /dev/null
    return 1
}

# Start frontend
start_frontend() {
    print_info "Starting frontend..."
    cd "$FRONTEND_DIR"
    
    # Start frontend in background
    nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"
    
    # Wait for frontend to be ready
    print_info "Waiting for frontend to be ready..."
    for i in {1..60}; do
        if check_frontend; then
            print_success "Frontend started successfully (PID: $FRONTEND_PID)"
            cd - > /dev/null
            return 0
        fi
        sleep 1
    done
    
    print_error "Frontend failed to start"
    cd - > /dev/null
    return 1
}

# Stop services
stop_services() {
    print_info "Stopping services..."
    
    # Stop backend
    if [ -f "$LOG_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$LOG_DIR/backend.pid")
        kill $BACKEND_PID 2> /dev/null || true
        rm "$LOG_DIR/backend.pid"
        print_success "Backend stopped"
    fi
    
    # Stop frontend
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$LOG_DIR/frontend.pid")
        kill $FRONTEND_PID 2> /dev/null || true
        rm "$LOG_DIR/frontend.pid"
        print_success "Frontend stopped"
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_header "Running E2E Integration Tests"
    
    cd "$FRONTEND_DIR"
    npx playwright test tests/e2e/full-pipeline-integration.spec.ts \
        --reporter=html \
        --output="$TEST_RESULTS_DIR/e2e" \
        | tee "$LOG_DIR/e2e-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    cd - > /dev/null
    
    if [ $exit_code -eq 0 ]; then
        print_success "E2E tests passed"
        return 0
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Run WebSocket stability tests
run_websocket_tests() {
    print_header "Running WebSocket Stability Tests"
    
    cd "$FRONTEND_DIR"
    npx playwright test tests/e2e/websocket-stability.spec.ts \
        --reporter=html \
        --output="$TEST_RESULTS_DIR/websocket" \
        | tee "$LOG_DIR/websocket-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    cd - > /dev/null
    
    if [ $exit_code -eq 0 ]; then
        print_success "WebSocket tests passed"
        return 0
    else
        print_error "WebSocket tests failed"
        return 1
    fi
}

# Run quick smoke tests
run_smoke_tests() {
    print_header "Running Quick Smoke Tests"
    
    cd "$FRONTEND_DIR"
    npx playwright test tests/smoke.test.ts \
        --reporter=html \
        --output="$TEST_RESULTS_DIR/smoke" \
        | tee "$LOG_DIR/smoke-tests.log"
    
    local exit_code=${PIPESTATUS[0]}
    cd - > /dev/null
    
    if [ $exit_code -eq 0 ]; then
        print_success "Smoke tests passed"
        return 0
    else
        print_error "Smoke tests failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    print_header "Generating Test Report"
    
    local report_file="$TEST_RESULTS_DIR/phase65-test-report.md"
    
    cat > "$report_file" << REPORT
# Phase 6.5 - Integration & Stability Testing Report
**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**Status:** ${1:-UNKNOWN}

## Test Summary

### E2E Integration Tests
- **Status:** ${E2E_STATUS:-NOT RUN}
- **Log:** logs-phase65/e2e-tests.log
- **Results:** test-results-phase65/e2e/

### WebSocket Stability Tests
- **Status:** ${WEBSOCKET_STATUS:-NOT RUN}
- **Log:** logs-phase65/websocket-tests.log
- **Results:** test-results-phase65/websocket/

### Smoke Tests
- **Status:** ${SMOKE_STATUS:-NOT RUN}
- **Log:** logs-phase65/smoke-tests.log
- **Results:** test-results-phase65/smoke/

## Service Logs

### Backend Log
\`\`\`
$(tail -n 50 "$LOG_DIR/backend.log" 2>/dev/null || echo "No backend log available")
\`\`\`

### Frontend Log
\`\`\`
$(tail -n 50 "$LOG_DIR/frontend.log" 2>/dev/null || echo "No frontend log available")
\`\`\`

## Next Steps

- Review test results in Playwright HTML report
- Check logs for any errors or warnings
- Address any failing tests
- Update RUTA.md with Phase 6.5 completion status

---
*Generated by run-phase65-tests.sh*
REPORT

    print_success "Test report generated: $report_file"
    cat "$report_file"
}

# Main execution
main() {
    local test_suite="${1:-all}"
    local services_started=false
    local exit_code=0
    
    print_header "Phase 6.5 - Test Orchestration"
    print_info "Test Suite: $test_suite"
    
    # Check if services are already running
    if ! check_backend; then
        start_backend || exit 1
        services_started=true
    fi
    
    if ! check_frontend; then
        start_frontend || exit 1
        services_started=true
    fi
    
    # Run tests based on suite
    case "$test_suite" in
        all)
            print_info "Running all test suites..."
            
            run_smoke_tests
            SMOKE_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            
            run_e2e_tests
            E2E_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            
            run_websocket_tests
            WEBSOCKET_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            ;;
        e2e)
            run_e2e_tests
            E2E_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            exit_code=$?
            ;;
        websocket)
            run_websocket_tests
            WEBSOCKET_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            exit_code=$?
            ;;
        quick)
            run_smoke_tests
            SMOKE_STATUS=$([[ $? -eq 0 ]] && echo "✅ PASSED" || echo "❌ FAILED")
            exit_code=$?
            ;;
        *)
            print_error "Unknown test suite: $test_suite"
            print_info "Available suites: all, e2e, websocket, quick"
            exit 1
            ;;
    esac
    
    # Generate report
    local overall_status="✅ ALL TESTS PASSED"
    if [[ "$E2E_STATUS" == *"FAILED"* ]] || [[ "$WEBSOCKET_STATUS" == *"FAILED"* ]] || [[ "$SMOKE_STATUS" == *"FAILED"* ]]; then
        overall_status="❌ SOME TESTS FAILED"
        exit_code=1
    fi
    
    generate_report "$overall_status"
    
    # Stop services if we started them
    if [ "$services_started" = true ]; then
        print_info "Stopping services (started by script)..."
        stop_services
    else
        print_info "Services were already running, leaving them running..."
    fi
    
    print_header "Test Orchestration Complete"
    print_info "Overall Status: $overall_status"
    print_info "Detailed report: $TEST_RESULTS_DIR/phase65-test-report.md"
    
    exit $exit_code
}

# Trap Ctrl+C
trap 'print_warning "Interrupted by user"; stop_services; exit 130' INT

# Run main
main "$@"
