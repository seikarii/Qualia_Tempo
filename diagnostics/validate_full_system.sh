#!/bin/bash
# CRISALIDA.CODE - Full System Validation Script

echo "🚀 CRISALIDA.CODE - FULL SYSTEM VALIDATION"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: OpenGL Environment
echo "1. Testing OpenGL Environment..."
cd qualia-tempo-prototype/backend
python3 -c "
import moderngl
ctx = moderngl.create_standalone_context(require=330)
print('OpenGL Context Created Successfully')
ctx.release()
"
print_status $? "OpenGL Environment"

# Test 2: Basic Particle Rendering
echo "2. Testing Basic Particle Rendering..."
python3 simple_particle_test.py > /dev/null 2>&1
print_status $? "Basic Particle Rendering"

# Test 3: Full System Integration
echo "3. Testing Full System Integration..."
cd ../..
python3 final_integration_test.py > /dev/null 2>&1
print_status $? "Full System Integration"

# Test 4: Image Generation Verification
echo "4. Verifying Generated Images..."
if [ -f "simple_particle_test.jpg" ] && [ -f "final_integration_test.jpg" ]; then
    SIMPLE_SIZE=$(stat -c%s "simple_particle_test.jpg")
    FULL_SIZE=$(stat -c%s "final_integration_test.jpg")
    echo -e "${GREEN}✅ Images Generated${NC}"
    echo "   - Simple test: ${SIMPLE_SIZE} bytes"
    echo "   - Full system: ${FULL_SIZE} bytes"
else
    echo -e "${RED}❌ Images Not Generated${NC}"
fi

# Test 5: Architecture Compliance
echo "5. Checking GOLD.CODE Architecture Compliance..."
if [ -f "qualia-tempo-prototype/backend/CompositionRoot.py" ] && \
   grep -q "shared_context" "qualia-tempo-prototype/backend/CompositionRoot.py"; then
    echo -e "${GREEN}✅ GOLD.CODE Architecture Compliant${NC}"
else
    echo -e "${RED}❌ Architecture Issues Detected${NC}"
fi

echo ""
echo "🎯 VALIDATION COMPLETE"
echo "======================"
echo "If all tests passed, the Qualia Tempo system is ready for consciousness visualization."
echo "Execute './start.sh' to launch the full system."
