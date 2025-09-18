#!/bin/bash

# QUALIA.CODE v1.0 - Full System Debug Script
# Levanta frontend/backend, captura logs, y debugea errores automáticamente

set -e
set -u

# Configuration
PROJECT_ROOT="/media/seikarii/Nvme/QualiaTempo"
PROTOTYPE_ROOT="$PROJECT_ROOT/qualia-tempo-prototype"
BACKEND_DIR="$PROTOTYPE_ROOT/backend"
FRONTEND_DIR="$PROTOTYPE_ROOT/frontend"
VENV_PATH="$PROJECT_ROOT/.venv"

# Log files with timestamp - UPDATED: logs go inside debuglogs directory
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DEBUGLOGS_DIR="$PROJECT_ROOT/debuglogs"
LOG_DIR="$DEBUGLOGS_DIR/debug-logs-$TIMESTAMP"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BROWSER_LOG="$LOG_DIR/browser-console.log"
DEBUG_REPORT="$LOG_DIR/debug-report.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$DEBUG_REPORT"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$DEBUG_REPORT"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$DEBUG_REPORT"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$DEBUG_REPORT"
}

log_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $1" | tee -a "$DEBUG_REPORT"
}

# Initialize debug environment
init_debug() {
    echo "🔍 QUALIA TEMPO FULL SYSTEM DEBUG"
    echo "=================================="
    echo "Timestamp: $TIMESTAMP"
    echo "Project: $PROJECT_ROOT"
    echo ""
    
    # Create debuglogs directory first, then specific log directory
    mkdir -p "$DEBUGLOGS_DIR"
    mkdir -p "$LOG_DIR"
    
    # Initialize debug report
    cat > "$DEBUG_REPORT" << EOF
# Qualia Tempo Debug Report
**Generated:** $(date)
**Session:** $TIMESTAMP

## System Information
- **Project Root:** $PROJECT_ROOT
- **Python Virtual Env:** $VENV_PATH
- **Backend Dir:** $BACKEND_DIR
- **Frontend Dir:** $FRONTEND_DIR

## Debug Session Log
EOF
    
    log_info "Debug environment initialized"
    log_info "Logs will be saved to: $LOG_DIR"
}

# Check system health
check_system() {
    log_info "Checking system health..."
    
    # Check dependencies
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 not found"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        exit 1
    fi
    
    # Check project structure
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    # Check virtual environment
    if [ ! -d "$VENV_PATH" ]; then
        log_warning "Virtual environment not found, creating..."
        python3 -m venv "$VENV_PATH"
    fi
    
    log_success "System health check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Activate virtual environment
    source "$VENV_PATH/bin/activate"
    log_debug "Virtual environment activated: $VIRTUAL_ENV"
    
    # Install backend dependencies
    cd "$BACKEND_DIR"
    if [ -f "requirements.txt" ]; then
        log_info "Installing backend dependencies..."
        pip install -r requirements.txt >> "$DEBUG_REPORT" 2>&1
    fi
    
    # Install frontend dependencies  
    cd "$FRONTEND_DIR"
    if [ -f "package.json" ]; then
        log_info "Installing frontend dependencies..."
        npm install >> "$DEBUG_REPORT" 2>&1
    fi
    
    log_success "Environment setup complete"
}

# Kill any existing processes
cleanup_existing() {
    log_info "Cleaning up existing processes..."
    
    # Kill existing backend processes
    pkill -f "uvicorn" 2>/dev/null || true
    pkill -f "python.*main.py" 2>/dev/null || true
    
    # Kill existing frontend processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    
    # Wait for processes to die
    sleep 2
    
    log_success "Existing processes cleaned up"
}

# Start backend with logging
start_backend() {
    log_info "Starting backend server..."
    
    cd "$BACKEND_DIR"
    source "$VENV_PATH/bin/activate"
    
    # Start backend and redirect output to log
    python3 main.py > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    
    log_debug "Backend PID: $BACKEND_PID"
    
    # Wait for backend to start
    log_info "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            log_success "Backend is ready (http://localhost:8000)"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    log_error "Backend failed to start within 30 seconds"
    log_error "Backend log tail:"
    tail -20 "$BACKEND_LOG" | while read line; do
        log_error "  $line"
    done
    return 1
}

# Start frontend with logging  
start_frontend() {
    log_info "Starting frontend server..."
    
    cd "$FRONTEND_DIR"
    
    # Start frontend and redirect output to log
    npm run dev > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    
    log_debug "Frontend PID: $FRONTEND_PID"
    
    # Wait for frontend to start
    log_info "Waiting for frontend to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log_success "Frontend is ready (http://localhost:5173)"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    log_error "Frontend failed to start within 30 seconds"
    log_error "Frontend log tail:"
    tail -20 "$FRONTEND_LOG" | while read line; do
        log_error "  $line"
    done
    return 1
}

# Browser testing with comprehensive logging
test_browser() {
    log_info "Starting browser testing..."
    
    cd "$FRONTEND_DIR"
    
    # Create the browser test script
    cat > browser-test.js << 'EOF'
const { chromium } = require('playwright');
const fs = require('fs');

async function comprehensiveTest() {
    console.log('🌐 Starting comprehensive browser test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    const logs = [];
    const errors = [];
    const warnings = [];
    const configErrors = [];
    
    // Comprehensive log capture
    page.on('console', (msg) => {
        const text = msg.text();
        const type = msg.type();
        const entry = `[${type.toUpperCase()}] ${text}`;
        
        logs.push({
            timestamp: new Date().toISOString(),
            type: type,
            text: text,
            entry: entry
        });
        
        if (type === 'error') {
            errors.push(entry);
        } else if (type === 'warning') {
            warnings.push(entry);
        }
        
        // Specific configuration error detection
        if (text.includes('Configuration') || text.includes('config')) {
            configErrors.push(entry);
        }
        
        console.log(entry);
    });
    
    // Page errors
    page.on('pageerror', (error) => {
        const errorText = `[PAGE ERROR] ${error.message}`;
        errors.push(errorText);
        logs.push({
            timestamp: new Date().toISOString(),
            type: 'pageerror',
            text: error.message,
            entry: errorText,
            stack: error.stack
        });
        console.log(errorText);
    });
    
    try {
        console.log('📡 Navigating to http://localhost:5173...');
        
        await page.goto('http://localhost:5173', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('⏱️ Waiting for application to initialize...');
        await page.waitForTimeout(15000);  // 15 seconds max timeout
        
        // Check if app loaded
        const rootElement = await page.$('#root');
        const hasRoot = rootElement !== null;
        
        if (hasRoot) {
            const rootContent = await rootElement.innerHTML();
            console.log(`✅ Root element found (${rootContent.length} characters)`);
        } else {
            console.log('❌ Root element not found');
        }
        
        // Take screenshot
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
        console.log('📸 Screenshot saved: debug-screenshot.png');
        
        // Get page content
        const content = await page.content();
        fs.writeFileSync('debug-page-content.html', content);
        console.log('📄 Page content saved: debug-page-content.html');
        
        // Generate detailed report
        const report = {
            timestamp: new Date().toISOString(),
            url: 'http://localhost:5173',
            success: errors.length === 0,
            hasRoot: hasRoot,
            stats: {
                totalLogs: logs.length,
                errors: errors.length,
                warnings: warnings.length,
                configErrors: configErrors.length
            },
            logs: logs,
            errors: errors,
            warnings: warnings,
            configErrors: configErrors
        };
        
        fs.writeFileSync('browser-test-report.json', JSON.stringify(report, null, 2));
        console.log('📊 Detailed report saved: browser-test-report.json');
        
        // Console summary
        console.log('\n📊 BROWSER TEST SUMMARY:');
        console.log('========================');
        console.log(`Total logs: ${logs.length}`);
        console.log(`Errors: ${errors.length}`);
        console.log(`Warnings: ${warnings.length}`);
        console.log(`Config errors: ${configErrors.length}`);
        console.log(`Root element: ${hasRoot ? '✅ Found' : '❌ Missing'}`);
        console.log(`Overall status: ${errors.length === 0 ? '✅ Success' : '❌ Errors found'}`);
        
        if (configErrors.length > 0) {
            console.log('\n🔧 CONFIGURATION ERRORS:');
            configErrors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
        if (errors.length > 0) {
            console.log('\n❌ JAVASCRIPT ERRORS:');
            errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Browser test failed: ${error.message}`);
        
        const failureReport = {
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message,
            stack: error.stack,
            logs: logs,
            errors: errors
        };
        
        fs.writeFileSync('browser-test-failure.json', JSON.stringify(failureReport, null, 2));
    } finally {
        await browser.close();
    }
}

comprehensiveTest();
EOF
    
    # Run browser test
    log_info "Executing browser test..."
    if node browser-test.js > "$BROWSER_LOG" 2>&1; then
        log_success "Browser test completed"
    else
        log_error "Browser test failed"
    fi
    
    # Copy test results to debug directory
    [ -f "browser-test-report.json" ] && cp browser-test-report.json "$LOG_DIR/"
    [ -f "browser-test-failure.json" ] && cp browser-test-failure.json "$LOG_DIR/"
    [ -f "debug-screenshot.png" ] && cp debug-screenshot.png "$LOG_DIR/"
    [ -f "debug-page-content.html" ] && cp debug-page-content.html "$LOG_DIR/"
}

# Generate comprehensive debug report
generate_report() {
    log_info "Generating comprehensive debug report..."
    
    cat >> "$DEBUG_REPORT" << EOF

## Backend Status
$(if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then echo "✅ Running (PID: $BACKEND_PID)"; else echo "❌ Not running"; fi)

## Frontend Status  
$(if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then echo "✅ Running (PID: $FRONTEND_PID)"; else echo "❌ Not running"; fi)

## Log Files Generated
- Backend Log: \`$BACKEND_LOG\`
- Frontend Log: \`$FRONTEND_LOG\`
- Browser Console Log: \`$BROWSER_LOG\`

## Recent Backend Log (last 20 lines)
\`\`\`
$(tail -20 "$BACKEND_LOG" 2>/dev/null || echo "No backend log available")
\`\`\`

## Recent Frontend Log (last 20 lines)
\`\`\`
$(tail -20 "$FRONTEND_LOG" 2>/dev/null || echo "No frontend log available")
\`\`\`

## Browser Test Results
EOF

    if [ -f "$LOG_DIR/browser-test-report.json" ]; then
        echo "Browser test report available: browser-test-report.json" >> "$DEBUG_REPORT"
        
        # Extract key info from JSON report
        if command -v jq &> /dev/null; then
            cat >> "$DEBUG_REPORT" << EOF

### Browser Test Summary
- **Success:** $(jq -r '.success' "$LOG_DIR/browser-test-report.json")
- **Total Logs:** $(jq -r '.stats.totalLogs' "$LOG_DIR/browser-test-report.json")
- **Errors:** $(jq -r '.stats.errors' "$LOG_DIR/browser-test-report.json")
- **Config Errors:** $(jq -r '.stats.configErrors' "$LOG_DIR/browser-test-report.json")
- **Root Element:** $(jq -r '.hasRoot' "$LOG_DIR/browser-test-report.json")
EOF
        fi
    fi
    
    log_success "Debug report generated: $DEBUG_REPORT"
}

# Cleanup function
cleanup() {
    echo ""
    log_info "Cleaning up debug session..."
    
    if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        log_info "Stopping backend (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    
    if [ -n "${FRONTEND_PID:-}" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_info "Stopping frontend (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    # Clean up any remaining processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    
    generate_report
    
    echo ""
    log_success "🔍 DEBUG SESSION COMPLETE"
    echo "📁 Debug files location: $LOG_DIR"
    echo "📊 Debug report: $DEBUG_REPORT"
    echo ""
    echo "To view the report:"
    echo "  cat '$DEBUG_REPORT'"
    echo ""
    echo "To view real-time logs:"
    echo "  tail -f '$BACKEND_LOG'"
    echo "  tail -f '$FRONTEND_LOG'"
}

# Main execution
main() {
    # Initialize
    init_debug
    
    # Set up signal handling
    trap cleanup SIGINT SIGTERM
    
    # Execute debug sequence
    check_system
    setup_environment
    cleanup_existing
    
    # Start services
    if start_backend; then
        if start_frontend; then
            # Both services started successfully
            log_success "Both services are running!"
            
            # Wait a bit for services to stabilize
            sleep 5
            
            # Run browser tests
            test_browser
            
            # Auto-terminate after browser test
            log_info "Debug test completed, auto-terminating..."
            cleanup
            exit 0
        else
            log_error "Frontend failed to start"
            cleanup
            exit 1
        fi
    else
        log_error "Backend failed to start"
        cleanup
        exit 1
    fi
}

# Execute main function
main "$@"