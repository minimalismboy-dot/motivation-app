#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Motivation App Builder ==="
echo ""

# Copy final.html as index.html
if [ -f "../final.html" ]; then
    cp "../final.html" "index.html"
    echo "[OK] Copied final.html -> index.html"
else
    echo "[ERROR] ../final.html not found!"
    exit 1
fi

# Compile
echo "[..] Compiling main.swift..."
swiftc -framework Cocoa -framework WebKit \
    -O -o MotivationApp main.swift

echo "[OK] Compiled MotivationApp"
echo ""

# Run
echo "[>>] Launching app..."
./MotivationApp
