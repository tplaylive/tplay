#!/bin/bash

# T PLAY Native App Setup Script
# This script sets up native Android and iOS app generation

echo "🚀 Setting up T PLAY for native app generation..."

# Install Capacitor for native app generation
echo "📱 Installing Capacitor..."
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# Initialize Capacitor
echo "⚙️ Initializing Capacitor..."
npx cap init "T PLAY" "com.tplay.app"

# Build the web app first
echo "🔧 Building web app..."
npm run build

# Add platforms
echo "📱 Adding Android platform..."
npx cap add android

echo "🍎 Adding iOS platform..."
npx cap add ios

# Sync web assets to native platforms
echo "🔄 Syncing assets..."
npx cap sync

echo "✅ Native app setup complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "For Android APK:"
echo "1. npx cap open android"
echo "2. Build APK in Android Studio"
echo "3. Distribute via Play Store or direct download"
echo ""
echo "For iOS App:"
echo "1. npx cap open ios"
echo "2. Build in Xcode"
echo "3. Submit to App Store"
echo ""
echo "For PWA Builder (Alternative):"
echo "1. Deploy to your domain"
echo "2. Visit pwabuilder.com"
echo "3. Enter your domain URL"
echo "4. Generate APK/App Store packages"
echo ""
echo "🎉 T PLAY is ready for all platforms!"