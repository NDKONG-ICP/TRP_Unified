#!/bin/bash

echo "🔍 ICP Coder Setup Verification"
echo "================================"
echo ""

ERRORS=0

# Check MCP Server
echo "📦 Checking MCP Server..."
if [ -f "mcp_server/dist/index.js" ]; then
    echo "  ✅ MCP server built successfully"
else
    echo "  ❌ MCP server not built. Run: cd mcp_server && npm install && npm run build"
    ERRORS=$((ERRORS + 1))
fi

# Check Node modules
if [ -d "mcp_server/node_modules" ]; then
    echo "  ✅ Node modules installed"
else
    echo "  ❌ Node modules missing. Run: cd mcp_server && npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check Go backend files
echo ""
echo "🔧 Checking Go Backend..."
if [ -f "backend/cmd/server/main.go" ]; then
    echo "  ✅ Main server file exists"
else
    echo "  ❌ Main server file missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/go.mod" ]; then
    echo "  ✅ go.mod exists"
else
    echo "  ❌ go.mod missing"
    ERRORS=$((ERRORS + 1))
fi

# Check environment file
echo ""
echo "⚙️  Checking Configuration..."
if [ -f "backend/.env.example" ]; then
    echo "  ✅ .env.example exists"
    if [ ! -f "backend/.env" ]; then
        echo "  ⚠️  .env file not found (copy from .env.example)"
    else
        echo "  ✅ .env file exists"
    fi
else
    echo "  ❌ .env.example missing"
    ERRORS=$((ERRORS + 1))
fi

# Check Python RAG service
echo ""
echo "🐍 Checking Python RAG Service..."
if [ -f "backend/scripts/rag_service.py" ]; then
    echo "  ✅ RAG service exists"
else
    echo "  ❌ RAG service missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/scripts/requirements.txt" ]; then
    echo "  ✅ requirements.txt exists"
else
    echo "  ❌ requirements.txt missing"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker files
echo ""
echo "🐳 Checking Docker Configuration..."
if [ -f "backend/docker-compose.yml" ]; then
    echo "  ✅ docker-compose.yml exists"
else
    echo "  ❌ docker-compose.yml missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/Dockerfile" ]; then
    echo "  ✅ Dockerfile exists"
else
    echo "  ❌ Dockerfile missing"
    ERRORS=$((ERRORS + 1))
fi

# Check documentation
echo ""
echo "📚 Checking Documentation..."
if [ -f "SETUP_COMPLETE.md" ]; then
    echo "  ✅ Setup guide exists"
else
    echo "  ⚠️  Setup guide missing (optional)"
fi

if [ -f "README.md" ]; then
    echo "  ✅ README exists"
else
    echo "  ⚠️  README missing (optional)"
fi

# Summary
echo ""
echo "================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Setup is complete."
    echo ""
    echo "Next steps:"
    echo "1. cd backend && cp .env.example .env"
    echo "2. Edit .env and add your API keys"
    echo "3. make up  # Start services"
    echo "4. Follow SETUP_COMPLETE.md for Cursor configuration"
else
    echo "❌ Found $ERRORS issue(s). Please fix them before proceeding."
    exit 1
fi
