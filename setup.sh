#!/bin/bash
# Campus Navigator - Quick Setup Script
# This script guides you through initial configuration

echo "=========================================="
echo "Campus Navigator - Configuration Setup"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env file"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "=========================================="
echo "Required Configuration"
echo "=========================================="
echo ""

echo "1. Google Maps API Key"
echo "   - Visit: https://console.cloud.google.com/"
echo "   - Create API Key with Maps JavaScript API enabled"
echo "   - Add to .env: REACT_APP_GOOGLE_MAPS_API_KEY=..."
echo ""

echo "2. OpenRouteService API Key (for production routing)"
echo "   - Visit: https://openrouteservice.org/"
echo "   - Sign up and create API key"
echo "   - Add to .env: REACT_APP_ORS_API_KEY=..."
echo ""

echo "=========================================="
echo "Services to Start"
echo "=========================================="
echo ""
echo "Open 3 terminals and run:"
echo ""
echo "Terminal 1 - MongoDB:"
echo "  mongod"
echo ""
echo "Terminal 2 - Python Backend:"
echo "  python main.py"
echo ""
echo "Terminal 3 - React Frontend:"
echo "  npm start"
echo ""

echo "=========================================="
echo "Edit .env File"
echo "=========================================="
echo ""
echo "Open .env in your editor and add your API keys:"
echo ""
echo "  REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE"
echo "  REACT_APP_ORS_API_KEY=YOUR_KEY_HERE"
echo ""

echo "=========================================="
echo "Testing"
echo "=========================================="
echo ""
echo "1. Open http://localhost:3000"
echo "2. Select a campus location"
echo "3. Click AR Navigation to test GPS"
echo "4. Check browser console for warnings"
echo ""

echo "For detailed setup guide, see:"
echo "  - WEBAR_API_CONFIGURATION.md"
echo "  - WEBAR_DEVELOPER_SETUP.md"
echo ""
echo "✓ Setup script complete!"
