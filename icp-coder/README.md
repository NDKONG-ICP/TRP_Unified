# ICP Coder - Motoko AI Assistant

An AI-powered Motoko programming assistant that brings intelligent code suggestions, context-aware completions, and instant documentation access directly into your IDE. Built with Retrieval-Augmented Generation (RAG), ChromaDB vector store, and LLM integration (Gemini/OpenAI/Claude).

## ✨ Features

* 🔍 **Smart Context Retrieval** - Search through 40+ Motoko code samples and official documentation
* 🤖 **AI Code Generation** - Generate Motoko code with LLM assistance (Gemini/OpenAI/Claude)
* ⚡ **RAG-Powered** - Combines vector similarity search with intelligent code generation
* 🎯 **IDE Integration** - Works seamlessly with Cursor, Claude Desktop, and MCP-compatible editors
* 🔒 **User Authentication** - Secure API key management for multi-user environments

## 🚀 Quick Start (Local Development)

### Prerequisites

* Node.js 22+
* Go 1.24+
* Python 3.11+
* Docker & Docker Compose

### Setup Steps

#### 1. Backend Setup

```bash
cd icp-coder/backend
cp .env.example .env
# Edit .env and add your LLM API key (Gemini/OpenAI/Claude - choose one)
make up
```

The backend will be available at `http://localhost:8080`.

#### 2. Generate API Key

1. Open: `http://localhost:8080/swagger/index.html`
2. Register via `/api/v1/auth/register`
3. Login via `/api/v1/auth/login`
4. Generate your API key from `/api/v1/keys`

#### 3. Configure MCP Server in Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "icp-coder": {
      "command": "node",
      "args": ["/absolute/path/to/raven-unified-ecosystem/icp-coder/mcp_server/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key-here",
        "BACKEND_URL": "http://localhost:8080"
      }
    }
  }
}
```

Restart Cursor completely.

## 📁 Project Structure

```
icp-coder/
├── backend/                        # Go backend server
│   ├── cmd/server/                 # Main entry point
│   ├── internal/
│   │   ├── api/                    # HTTP handlers & middleware
│   │   ├── auth/                   # Authentication service
│   │   ├── codegen/                # Code generation with LLM
│   │   ├── database/               # Database connection
│   │   └── rag/                    # RAG service & Python client
│   ├── scripts/                    # Python ingestion scripts
│   └── docs/                       # Swagger API documentation
├── mcp_server/                     # MCP (Model Context Protocol) server
│   ├── src/tools/                  # MCP tools
│   └── package.json
└── README.md
```

## 🔗 Available MCP Tools

1. **`get_motoko_context`** - Retrieves relevant Motoko code snippets and documentation
2. **`generate_motoko_code`** - Generates complete Motoko code with AI assistance

## 📄 License

MIT License
