#!/bin/bash

# QUALIA.CODE v1.0 - Full System Debug Script
# Levanta frontend/backend, captura logs, y debugea errores automáticamente
# 
# MAXIMUM EXECUTION TIME: 20 seconds
# If the script takes longer than 20 seconds, something is DEFINITELY wrong.
# DO NOT increase this timeout - fix the underlying issue instead.
# INSTRUCTION TO ALL AGENTS: DO NOT TOUCH THE TIMERS IN THE TEST. THEY ARE THE STANDARD FOR MEASURING APPLICATION PERFORMANCE. IF IT TAKES LONGER, SOMETHING IS TERRIBLY WRONG.

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
    for i in {1..5}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            log_success "Backend is ready (http://localhost:8000)"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    log_error "Backend failed to start within 5 seconds"
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
    for i in {1..5}; do
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            log_success "Frontend is ready (http://localhost:5173)"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    log_error "Frontend failed to start within 5 seconds"
    log_error "Frontend log tail:"
    tail -20 "$FRONTEND_LOG" | while read line; do
        log_error "  $line"
    done
    return 1
}

# Browser testing with GUARANTEED artifact generation and cleanup
test_browser() {
    log_info "Entering browser testing phase..."
    cd "$FRONTEND_DIR"

    # MANDATO 2: A robust test script that captures failure states.
    # This version includes screenshot-on-failure logic in the catch block.
    log_info "Generating dynamic browser test script with enhanced failure reporting..."
    cat > browser-test.js << 'EOF'
import { chromium } from 'playwright';
import fs from 'fs';

async function comprehensiveTest() {
    console.log('🌐 Starting comprehensive browser test...');
    let browser;
    let page;

    const logs = [];
    const errors = [];

    try {
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        page = await browser.newPage();

        page.on('console', (msg) => {
            const text = msg.text();
            const type = msg.type();
            const entry = `[${type.toUpperCase()}] ${text}`;
            logs.push({ timestamp: new Date().toISOString(), type, text, entry });
            if (type === 'error') errors.push(entry);
            console.log(entry);
        });

        page.on('pageerror', (error) => {
            const errorText = `[PAGE ERROR] ${error.message}`;
            errors.push(errorText);
            logs.push({ timestamp: new Date().toISOString(), type: 'pageerror', text: error.message, entry: errorText, stack: error.stack });
            console.log(errorText);
        });

        console.log('📡 Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for the main menu to be fully loaded - look for the INITIATE NEURAL SYNC button
        console.log('⏳ Waiting for main menu to load...');
        await page.waitForSelector('text=INITIATE NEURAL SYNC', { timeout: 10000 });
        console.log('✅ Main menu loaded successfully');

        // --- Phase 1: Main Menu ---
        console.log('📸 Capturing main menu state (Screenshot + DOM)...');
        await page.screenshot({ path: 'LOG_DIR_PLACEHOLDER/debug-screenshot-main-menu.png', fullPage: true });
        const mainMenuContent = await page.content();
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/debug-page-content-main-menu.html', mainMenuContent);
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/browser-test-report-main-menu.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'main-menu',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Main menu state captured.');

        // --- Phase 2: Interaction ---
        console.log('🚀 Clicking "INITIATE NEURAL SYNC" button...');
        await page.getByText('INITIATE NEURAL SYNC').click();
        
        // Wait for game to transition - look for some game element or reduced timeout
        console.log('⏳ Waiting for game transition...');
        await page.waitForTimeout(2000); // Keep original 2s but add logging

        // --- Phase 3: Game View ---
        console.log('📸 Capturing game view state (Screenshot + DOM)...');
        await page.screenshot({ path: 'LOG_DIR_PLACEHOLDER/debug-screenshot-game-view.png', fullPage: true });
        const gameViewContent = await page.content();
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/debug-page-content-game-view.html', gameViewContent);
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/browser-test-report-game-view.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'game-view',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Game view state captured.');

        // --- Phase 4: Movement Test ---
        console.log('🎮 Testing character movement (W + D keys)...');
        console.log("Forzando foco en el canvas");
        await page.focus('canvas');
        console.log("Foco en canvas establecido");
        // Press and hold W and D keys simultaneously
        await page.keyboard.down('KeyW');
        await page.keyboard.down('KeyD');
        
        // Hold for 1 second to allow movement
        await page.waitForTimeout(1000);
        
        // Release keys
        await page.keyboard.up('KeyD');
        await page.keyboard.up('KeyW');
        
        console.log('⏳ Waiting for movement to register...');
        await page.waitForTimeout(500);

        // --- Phase 5: Movement Result ---
        console.log('📸 Capturing movement test state (Screenshot + DOM)...');
        await page.screenshot({ path: 'LOG_DIR_PLACEHOLDER/debug-screenshot-movement-test.png', fullPage: true });
        const movementContent = await page.content();
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/debug-page-content-movement-test.html', movementContent);
        fs.writeFileSync('LOG_DIR_PLACEHOLDER/browser-test-report-movement-test.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            phase: 'movement-test',
            success: errors.length === 0,
            stats: { errors: errors.length, logs: logs.length },
            logs, errors
        }, null, 2));
        console.log('📊 Movement test state captured.');

    } catch (error) {
        console.error(`❌❌❌ BROWSER TEST FAILED: ${error.message}`);

        if (page && !page.isClosed()) {
            try {
                console.log('📸 Capturing FAILURE state (Screenshot + DOM)...');
                await page.screenshot({ path: 'LOG_DIR_PLACEHOLDER/debug-screenshot-FAILURE.png', fullPage: true });
                const failureContent = await page.content();
                fs.writeFileSync('LOG_DIR_PLACEHOLDER/debug-page-content-FAILURE.html', failureContent);
                console.log('📸 Failure state captured.');
            } catch (captureError) {
                console.error(`📸 Could not capture failure state: ${captureError.message}`);
            }
        } else {
            console.log('Page not available, cannot capture failure state.');
        }

        fs.writeFileSync('LOG_DIR_PLACEHOLDER/browser-test-failure.json', JSON.stringify({
            timestamp: new Date().toISOString(),
            success: false,
            error: error.message,
            stack: error.stack,
            logs: logs,
            errors: errors
        }, null, 2));
        console.log('📊 Failure report generated.');

    } finally {
        console.log('Closing browser if it exists...');
        if (browser) {
            await browser.close();
        }
    }
}

comprehensiveTest();
EOF
    # Replace the placeholder with the actual log directory path
    sed -i "s|LOG_DIR_PLACEHOLDER|$LOG_DIR|g" browser-test.js
    log_success "Dynamic browser test script generated."

    # Execute the test. We use `|| true` to prevent `set -e` from halting the script on test failure.
    # We NEED to proceed to the artifact copy step regardless of the outcome.
    # MAXIMUM EXECUTION TIME: 20 seconds - if exceeded, something is definitely wrong
    log_info "Executing browser test... (Errors are expected during failure tests)"
    timeout 20 node browser-test.js > "$BROWSER_LOG" 2>&1 || {
        echo "❌ Browser test exceeded 20 seconds - something is definitely wrong!"
        echo "⚠️  DO NOT increase this timeout. Fix the underlying issue instead."
        true
    }
    log_info "Browser test execution finished."
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

    if [ -f "$LOG_DIR/browser-test-report-main-menu.json" ] || [ -f "$LOG_DIR/browser-test-report-game-view.json" ] || [ -f "$LOG_DIR/browser-test-report-movement-test.json" ]; then
        echo "Browser test reports available: browser-test-report-main-menu.json, browser-test-report-game-view.json, browser-test-report-movement-test.json" >> "$DEBUG_REPORT"
        
        # Extract key info from JSON reports
        if command -v jq &> /dev/null; then
            if [ -f "$LOG_DIR/browser-test-report-main-menu.json" ]; then
                cat >> "$DEBUG_REPORT" << EOF

### Main Menu Browser Test Summary
- **Success:** $(jq -r '.success' "$LOG_DIR/browser-test-report-main-menu.json")
- **Total Logs:** $(jq -r '.stats.totalLogs' "$LOG_DIR/browser-test-report-main-menu.json")
- **Errors:** $(jq -r '.stats.errors' "$LOG_DIR/browser-test-report-main-menu.json")
- **Config Errors:** $(jq -r '.stats.configErrors' "$LOG_DIR/browser-test-report-main-menu.json")
- **Root Element:** $(jq -r '.hasRoot' "$LOG_DIR/browser-test-report-main-menu.json")
EOF
            fi
            
            if [ -f "$LOG_DIR/browser-test-report-game-view.json" ]; then
                cat >> "$DEBUG_REPORT" << EOF

### Game View Browser Test Summary
- **Success:** $(jq -r '.success' "$LOG_DIR/browser-test-report-game-view.json")
- **Total Logs:** $(jq -r '.stats.totalLogs' "$LOG_DIR/browser-test-report-game-view.json")
- **Errors:** $(jq -r '.stats.errors' "$LOG_DIR/browser-test-report-game-view.json")
- **Config Errors:** $(jq -r '.stats.configErrors' "$LOG_DIR/browser-test-report-game-view.json")
- **Root Element:** $(jq -r '.hasRoot' "$LOG_DIR/browser-test-report-game-view.json")
EOF
            fi
            
            if [ -f "$LOG_DIR/browser-test-report-movement-test.json" ]; then
                cat >> "$DEBUG_REPORT" << EOF

### Movement Test Browser Test Summary
- **Success:** $(jq -r '.success' "$LOG_DIR/browser-test-report-movement-test.json")
- **Total Logs:** $(jq -r '.stats.totalLogs' "$LOG_DIR/browser-test-report-movement-test.json")
- **Errors:** $(jq -r '.stats.errors' "$LOG_DIR/browser-test-report-movement-test.json")
- **Config Errors:** $(jq -r '.stats.configErrors' "$LOG_DIR/browser-test-report-movement-test.json")
- **Root Element:** $(jq -r '.hasRoot' "$LOG_DIR/browser-test-report-movement-test.json")
EOF
            fi
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
    # TOTAL MAXIMUM EXECUTION TIME: 20 seconds
    # Backend startup: 5s, Frontend startup: 5s, Browser test: 20s (with timeout enforcement)
    # If exceeded, something is definitely wrong - DO NOT increase timeouts
    
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