#!/bin/bash
# Ejemplos de uso del Graph Generator (GMGA)

echo "=== Graph Generator - Ejemplos de Uso ==="
echo ""

# Compilar primero si no existe el binario
if [ ! -f "target/release/graph_generator" ]; then
    echo "Compilando Graph Generator..."
    cargo build --release
    echo ""
fi

# Ejemplo 1: Análisis básico del propio proyecto
echo "1. Análisis del proyecto actual:"
./target/release/graph_generator --path ./src --output graph_generator_self.json --stats

echo ""
echo "---"
echo ""

# Ejemplo 2: Análisis con límite de líneas custom
echo "2. Análisis con límite de líneas aumentado:"
./target/release/graph_generator --path ./src --max-lines 5000 --output graph_custom.json

echo ""
echo "---"
echo ""

# Ejemplo 3: Modo verboso
echo "3. Análisis en modo verboso:"
./target/release/graph_generator --path ./src --verbose --output graph_verbose.json

echo ""
echo "=== Ejemplos completados ==="
echo "Ficheros generados:"
ls -lh *.json 2>/dev/null || echo "  (ninguno)"
