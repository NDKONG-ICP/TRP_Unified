#!/bin/bash

# Build script for Raven Unified Ecosystem
# Generates TypeScript declarations from CANDID files and builds frontend with Vite
# This follows the standard ICP pattern: TypeScript for canister interfaces + frontend, Vite for building

set -e

echo "🔨 Building Raven Unified Ecosystem..."
echo ""

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: dfx is not installed. Please install the DFINITY SDK."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Error: dfx.json not found. Are you in the project root?"
    exit 1
fi

echo "📦 Step 1: Generating TypeScript declarations from CANDID files..."
echo "   This creates TypeScript interfaces for all canisters"
dfx generate

echo ""
echo "✅ TypeScript declarations generated in src/declarations/"
echo ""

# Copy declarations to frontend if they don't exist or are outdated
# This ensures frontend can access the generated types
if [ -d "src/declarations" ] && [ -d "frontend/src/declarations" ]; then
    echo "📋 Syncing declarations to frontend..."
    # Copy only if source is newer (basic check)
    rsync -a --update src/declarations/ frontend/src/declarations/ 2>/dev/null || {
        echo "⚠️  Note: Could not sync declarations. Using existing frontend declarations."
    }
    echo "✅ Declarations synced"
    echo ""
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found"
    exit 1
fi

cd frontend

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "🔧 Step 2: Type-checking TypeScript code..."
npm run lint || echo "⚠️  Linting issues found, but continuing..."

echo ""
echo "🏗️  Step 3: Building frontend with Vite..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Output: frontend/dist/"
echo ""
echo "🚀 To deploy:"
echo "   dfx deploy"
echo ""

