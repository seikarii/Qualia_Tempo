#!/bin/bash

# QUALIA.CODE v1.0 - Qualia Tempo Startup Script
# Location: /media/seikarii/Nvme/QualiaTempo/start.sh
# Robust startup with error handling and validation

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
PROJECT_ROOT="/media/seikarii/Nvme/QualiaTempo"
PROTOTYPE_ROOT="$PROJECT_ROOT/qualia-tempo-prototype"
BACKEND_DIR="$PROTOTYPE_ROOT/backend"
FRONTEND_DIR="$PROTOTYPE_ROOT/frontend"
VENV_PATH="$PROJECT_ROOT/.venv"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation functions
check_dependencies() {
    log_info "Checking system dependencies..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is required but not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is required but not installed"
        exit 1
    fi
    
    log_success "All dependencies are available"
}

# Enhanced virtual environment function
setup_virtual_environment() {
    log_info "Setting up Python virtual environment..."
    
    if [ ! -d "$VENV_PATH" ]; then
        log_info "Creating virtual environment at $VENV_PATH..."
        python3 -m venv "$VENV_PATH"
        log_success "Virtual environment created"
    else
        log_info "Virtual environment already exists"
    fi
    
    log_info "Activating virtual environment..."
    source "$VENV_PATH/bin/activate"
    
    # Verify activation
    if [[ "$VIRTUAL_ENV" == "$VENV_PATH" ]]; then
        log_success "Virtual environment activated successfully"
    else
        log_error "Failed to activate virtual environment"
        exit 1
    fi
}

# Enhanced backend setup
setup_backend() {
    log_info "Configuring backend..."
    cd "$BACKEND_DIR"
    
    if [ ! -f "requirements.txt" ]; then
        log_error "requirements.txt not found in backend directory"
        exit 1
    fi
    
    log_info "Installing/updating backend dependencies..."
    pip install -r requirements.txt --quiet
    log_success "Backend dependencies installed"
}

# Enhanced frontend setup
setup_frontend() {
    log_info "Configuring frontend..."
    cd "$FRONTEND_DIR"
    
    if [ ! -f "package.json" ]; then
        log_error "package.json not found in frontend directory"
        exit 1
    fi
    
    # Check if node_modules exists and is recent
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log_info "Installing/updating frontend dependencies..."
        npm install --silent
        log_success "Frontend dependencies installed"
    else
        log_info "Frontend dependencies are up to date"
    fi
}

# Enhanced service startup
start_services() {
    log_info "Starting Qualia Tempo services..."
    
    # Start backend
    log_info "Starting backend server..."
    cd "$PROTOTYPE_ROOT"
    source "$VENV_PATH/bin/activate"
    python3 backend/main.py &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 2
    
    # Verify backend is running
    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        log_success "Backend started successfully (PID: $BACKEND_PID)"
    else
        log_error "Backend failed to start"
        exit 1
    fi
    
    # Start frontend
    log_info "Starting frontend development server..."
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    
    # Wait a moment for frontend to start
    sleep 2
    
    # Verify frontend is running
    if kill -0 "$FRONTEND_PID" 2>/dev/null; then
        log_success "Frontend started successfully (PID: $FRONTEND_PID)"
    else
        log_error "Frontend failed to start"
        kill "$BACKEND_PID" 2>/dev/null || true
        exit 1
    fi
    
    echo ""
    log_success "🎵 Qualia Tempo is now running!"
    echo "  📚 Frontend: http://localhost:5173"
    echo "  🔧 Backend API: http://localhost:8000"
    echo "  📖 API Docs: http://localhost:8000/docs"
    echo ""
    log_info "Press Ctrl+C to stop all services"
}

# Enhanced cleanup function
cleanup() {
    echo ""
    log_info "Shutting down Qualia Tempo services..."
    
    if [ ! -z "${BACKEND_PID:-}" ]; then
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            log_info "Stopping backend (PID: $BACKEND_PID)..."
            kill "$BACKEND_PID" 2>/dev/null || true
            wait "$BACKEND_PID" 2>/dev/null || true
        fi
    fi
    
    if [ ! -z "${FRONTEND_PID:-}" ]; then
        if kill -0 "$FRONTEND_PID" 2>/dev/null; then
            log_info "Stopping frontend (PID: $FRONTEND_PID)..."
            kill "$FRONTEND_PID" 2>/dev/null || true
            wait "$FRONTEND_PID" 2>/dev/null || true
        fi
    fi
    
    # Clean up any remaining processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    
    log_success "All services stopped successfully"
    exit 0
}

# Main execution
main() {
    echo "🎵 Starting Qualia Tempo (QUALIA.CODE v1.0)..."
    echo "======================================================="
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run all setup steps
    check_dependencies
    setup_virtual_environment
    setup_backend
    setup_frontend
    start_services
    
    # Set up signal handling
    trap cleanup SIGINT SIGTERM
    
    # Wait for services
    wait
}

# Execute main function
main "$@"
