#!/bin/bash
# Build script for Motivation App APK

echo "========================================="
echo "  Motivation App - Build Instructions"
echo "========================================="
echo ""
echo "To build the APK:"
echo ""
echo "1. Install Android Studio"
echo "2. Copy final.html to app/src/main/assets/index.html"
echo "3. Open this folder in Android Studio"
echo "4. Build > Generate Signed APK"
echo ""
echo "Or use command line:"
echo ""
echo "  cp ../final.html app/src/main/assets/index.html"
echo "  ./gradlew assembleDebug"
echo ""
echo "APK will be at: app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "========================================="
echo ""

# Auto-copy HTML if it exists
if [ -f "../final.html" ]; then
    echo "Copying final.html to assets..."
    mkdir -p app/src/main/assets
    cp ../final.html app/src/main/assets/index.html
    echo "Done! HTML copied to app/src/main/assets/index.html"
else
    echo "WARNING: ../final.html not found!"
    echo "Please copy your HTML file to app/src/main/assets/index.html manually."
fi
