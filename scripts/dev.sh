#!/bin/bash

# Development script for Raven Unified Ecosystem
# Generates TypeScript declarations and starts Vite dev server
# This follows the standard ICP pattern: TypeScript + Vite for development

set -e

echo "🚀 Starting development environment..."
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

echo "📦 Generating TypeScript declarations from CANDID files..."
dfx generate

echo ""
echo "✅ TypeScript declarations generated in src/declarations/"
echo ""

# Copy declarations to frontend if they don't exist or are outdated
if [ -d "src/declarations" ] && [ -d "frontend/src/declarations" ]; then
    echo "📋 Syncing declarations to frontend..."
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
echo "🌐 Starting Vite dev server..."
echo "   Frontend will be available at http://localhost:5173"
echo "   Make sure dfx is running: dfx start (in another terminal)"
echo ""

npm run dev

