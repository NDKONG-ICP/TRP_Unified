# ICP Coder - Complete Setup Guide

## ✅ What's Been Fixed

1. **TypeScript MCP Server**
   - ✅ Fixed type errors in tool handlers
   - ✅ Added proper type annotations
   - ✅ Builds successfully

2. **Go Backend**
   - ✅ Fixed type assertion panics (added safe type checks)
   - ✅ Added proper error handling
   - ✅ Fixed UUID and timestamp generation

3. **Missing Files**
   - ✅ Created `.env.example`
   - ✅ Created Python RAG service
   - ✅ Created Docker configuration

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd icp-coder/backend

# Copy environment file
cp .env.example .env

# Edit .env and add:
# - GEMINI_API_KEY (or OPENAI_API_KEY or CLAUDE_API_KEY)
# - JWT_SECRET (generate a random string)

# Start with Docker Compose
make up
```

### 2. Generate API Key

1. Open: http://localhost:8080/swagger/index.html (or use curl)
2. Register:
   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'
   ```
3. Login:
   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","password":"testpass123"}'
   ```
4. Generate API Key:
   ```bash
   curl -X POST http://localhost:8080/api/v1/keys \
     -H "x-api-key: YOUR_TOKEN_FROM_LOGIN"
   ```

### 3. Build MCP Server

```bash
cd ../mcp_server
npm install
npm run build
```

### 4. Configure Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "icp-coder": {
      "command": "node",
      "args": [
        "/Users/williambeck/The Forge NFT Minter/raven-unified-ecosystem/icp-coder/mcp_server/dist/index.js"
      ],
      "env": {
        "API_KEY": "your-api-key-from-step-2",
        "BACKEND_URL": "http://localhost:8080"
      }
    }
  }
}
```

### 5. Restart Cursor

Completely quit and restart Cursor.

## 🧪 Testing

### Test Backend

```bash
# Health check
curl http://localhost:8080/health

# Get context (requires API key)
curl -X POST http://localhost:8080/api/v1/context \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query":"stable variables","limit":3}'

# Generate code (requires API key)
curl -X POST http://localhost:8080/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"prompt":"Create a counter canister","temperature":0.7,"max_tokens":2000}'
```

### Test MCP Server

```bash
cd mcp_server
API_KEY=your-key BACKEND_URL=http://localhost:8080 node dist/index.js
```

## 📝 Notes

- The RAG service requires ChromaDB to be running (via docker-compose)
- You need at least one LLM API key configured
- The Python RAG service will need documents ingested before it can return context
- For production, update `BACKEND_URL` in Cursor config to your production URL

## 🔧 Troubleshooting

### Backend won't start
- Check database is running: `docker ps`
- Verify `.env` file exists and has correct values
- Check logs: `docker-compose logs backend`

### MCP tools not showing in Cursor
- Verify MCP server built: `ls -la mcp_server/dist/`
- Check path in `mcp.json` is absolute and correct
- Restart Cursor completely (not just reload)
- Check Cursor logs: View → Output → MCP

### API key errors
- Verify backend is running: `curl http://localhost:8080/health`
- Check API key is correct in `mcp.json`
- Test API key: `curl -H "x-api-key: YOUR_KEY" http://localhost:8080/api/v1/keys`
