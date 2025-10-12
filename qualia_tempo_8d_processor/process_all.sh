#!/bin/bash
# Batch processing script for Qualia Tempo 8D Processor

MUSIC_DIR="/media/seikarii/Nvme/QualiaTempo/docs/music"
OUTPUT_DIR="tests/test_output"

echo "🎵 Qualia Tempo 8D Audio Processor - Batch Mode"
echo "================================================"
echo ""

for song in Inicio ecosdeamor ecosdepasos; do
    echo "⚙️  Processing: ${song}.mp3"
    
    cargo run --release -- \
        --input "${MUSIC_DIR}/${song}.mp3" \
        --output "${OUTPUT_DIR}/${song}_8D.wav" \
        --rotation-speed 0.2 \
        --drop-threshold 0.7
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: ${song}_8D.wav"
    else
        echo "❌ Failed: ${song}.mp3"
    fi
    echo ""
done

echo "✨ Batch processing complete!"
echo "Output files in: ${OUTPUT_DIR}/"
