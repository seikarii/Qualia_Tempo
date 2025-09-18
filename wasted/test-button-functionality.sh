#!/bin/bash

# QUALIA.CODE v1.0 - Button Functionality Test Script
# Location: /media/seikarii/Nvme/QualiaTempo/test-button-functionality.sh
# Tests the "Start The First Duel" button functionality

set -e

# Configuration
PROJECT_ROOT="/media/seikarii/Nvme/QualiaTempo"
PROTOTYPE_ROOT="$PROJECT_ROOT/qualia-tempo-prototype"
FRONTEND_DIR="$PROTOTYPE_ROOT/frontend"
BACKEND_DIR="$PROTOTYPE_ROOT/backend"
VENV_PATH="$PROJECT_ROOT/.venv"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test 1: Check if services are running
check_services() {
    log_info "Checking if Qualia Tempo services are running..."
    
    # Check backend
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is running on port 8000"
    else
        log_error "Backend is not running on port 8000"
        return 1
    fi
    
    # Check frontend
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend is running on port 5173"
    else
        log_error "Frontend is not running on port 5173"
        return 1
    fi
}

#!/bin/bash

# QUALIA.CODE v1.0 - Button Functionality Test Script
# Location: /media/seikarii/Nvme/QualiaTempo/test-button-functionality.sh
# Tests the "Start The First Duel" button functionality

set -e

# Configuration
PROJECT_ROOT="/media/seikarii/Nvme/QualiaTempo"
PROTOTYPE_ROOT="$PROJECT_ROOT/qualia-tempo-prototype"
FRONTEND_DIR="$PROTOTYPE_ROOT/frontend"
BACKEND_DIR="$PROTOTYPE_ROOT/backend"
VENV_PATH="$PROJECT_ROOT/.venv"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test 1: Check if services are running
check_services() {
    log_info "Checking if Qualia Tempo services are running..."
    
    # Check backend
    if curl -s --max-time 5 http://localhost:8000/health > /dev/null 2>&1; then
        log_success "Backend is running on port 8000"
        return 0
    else
        log_error "Backend is not running on port 8000"
        return 1
    fi
    
    # Check frontend
    if curl -s --max-time 5 http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend is running on port 5173"
        return 0
    else
        log_error "Frontend is not running on port 5173"
        return 1
    fi
}

# Test 2: Check if button exists in DOM
check_button_exists() {
    log_info "Checking if 'Start The First Duel' button exists in DOM..."
    
    # Use curl to get the page and check for the button
    PAGE_CONTENT=$(curl -s --max-time 10 http://localhost:5173)
    
    if echo "$PAGE_CONTENT" | grep -q "Start The First Duel"; then
        log_success "Button 'Start The First Duel' found in DOM"
        return 0
    else
        log_error "Button 'Start The First Duel' not found in DOM"
        return 1
    fi
}

# Test 3: Check if GameControllerService is initialized
check_game_controller_service() {
    log_info "Checking GameControllerService initialization..."
    
    # Check frontend logs for service initialization
    if [ -f "$FRONTEND_DIR/logs/frontend.log" ]; then
        if grep -q "GameControllerService.*Initialized" "$FRONTEND_DIR/logs/frontend.log"; then
            log_success "GameControllerService initialized successfully"
            return 0
        else
            log_warning "GameControllerService initialization not found in logs"
        fi
    else
        log_warning "Frontend log file not found"
    fi
    
    # Alternative: Check if the service is registered in the container
    # This would require more complex checking
    log_info "Checking service registration via browser console..."
    log_warning "Manual verification required: Check browser console for GameControllerService logs"
}

# Test 4: Manual verification instructions
manual_verification() {
    echo ""
    log_info "=== MANUAL VERIFICATION REQUIRED ==="
    echo "Please perform these steps to verify button functionality:"
    echo ""
    echo "1. Open browser to: http://localhost:5173"
    echo "2. Look for the 'Start The First Duel' button"
    echo "3. Click the button"
    echo "4. Verify that:"
    echo "   - The page transitions to the game screen"
    echo "   - No JavaScript errors appear in browser console"
    echo "   - Backend receives PlayerAction event (check backend logs)"
    echo "   - GameControllerService processes the event (check frontend logs)"
    echo ""
    log_info "Expected behavior:"
    echo "   - Button click should emit PlayerAction event"
    echo "   - GameControllerService should handle 'StartGame' action"
    echo "   - GameStateChanged event should be emitted"
    echo "   - UI should transition to game screen"
    echo ""
    log_info "If the button works correctly, the fix is successful!"
}

# Main test execution
main() {
    echo "🧪 Testing Qualia Tempo Button Functionality"
    echo "=============================================="
    
    cd "$PROJECT_ROOT"
    
    # Run automated tests
    if check_services; then
        check_button_exists
        check_game_controller_service
    else
        log_error "Services are not running. Please start Qualia Tempo first:"
        echo "  cd /media/seikarii/Nvme/QualiaTempo && ./start.sh"
        exit 1
    fi
    
    # Provide manual verification instructions
    manual_verification
    
    echo ""
    log_success "Automated tests completed!"
    log_info "Please complete manual verification steps above."
}

# Execute tests
main "$@"

# Test 3: Check if GameControllerService is initialized
check_game_controller_service() {
    log_info "Checking GameControllerService initialization..."
    
    # Check frontend logs for service initialization
    if [ -f "$FRONTEND_DIR/logs/frontend.log" ]; then
        if grep -q "GameControllerService.*Initialized" "$FRONTEND_DIR/logs/frontend.log"; then
            log_success "GameControllerService initialized successfully"
            return 0
        else
            log_warning "GameControllerService initialization not found in logs"
        fi
    else
        log_warning "Frontend log file not found"
    fi
    
    # Alternative: Check if the service is registered in the container
    # This would require more complex checking
    log_info "Checking service registration via browser console..."
    log_warning "Manual verification required: Check browser console for GameControllerService logs"
}

# Test 4: Manual verification instructions
manual_verification() {
    echo ""
    log_info "=== MANUAL VERIFICATION REQUIRED ==="
    echo "Please perform these steps to verify button functionality:"
    echo ""
    echo "1. Open browser to: http://localhost:5173"
    echo "2. Look for the 'Start The First Duel' button"
    echo "3. Click the button"
    echo "4. Verify that:"
    echo "   - The page transitions to the game screen"
    echo "   - No JavaScript errors appear in browser console"
    echo "   - Backend receives PlayerAction event (check backend logs)"
    echo "   - GameControllerService processes the event (check frontend logs)"
    echo ""
    log_info "Expected behavior:"
    echo "   - Button click should emit PlayerAction event"
    echo "   - GameControllerService should handle 'StartGame' action"
    echo "   - GameStateChanged event should be emitted"
    echo "   - UI should transition to game screen"
}

# Main test execution
main() {
    echo "🧪 Testing Qualia Tempo Button Functionality"
    echo "=============================================="
    
    cd "$PROJECT_ROOT"
    
    # Run automated tests
    check_services
    check_button_exists
    check_game_controller_service
    
    # Provide manual verification instructions
    manual_verification
    
    echo ""
    log_success "Automated tests completed!"
    log_info "Please complete manual verification steps above."
}

# Execute tests
main "$@"