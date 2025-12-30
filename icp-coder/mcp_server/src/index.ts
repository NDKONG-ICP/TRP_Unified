#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getMotokoContext } from './tools/get-motoko-context.tool.js';
import { generateMotokoCode } from './tools/generate-motoko-code.tool.js';

const API_KEY = process.env.API_KEY || '';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

if (!API_KEY) {
  console.error('ERROR: API_KEY environment variable is required');
  process.exit(1);
}

const server = new Server(
  {
    name: 'icp-coder',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_motoko_context',
        description: 'Retrieves relevant Motoko code snippets and documentation based on a query. Search through curated examples and official docs to get contextual code samples.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant Motoko code and documentation',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 5)',
              default: 5,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'generate_motoko_code',
        description: 'Generates complete Motoko code using AI assistance. Combines RAG context with LLM generation for smart, context-aware code creation.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt describing what Motoko code to generate',
            },
            query: {
              type: 'string',
              description: 'Optional RAG query to retrieve relevant context before generation',
            },
            temperature: {
              type: 'number',
              description: 'Temperature for code generation (0.0-1.0, default: 0.7)',
              default: 0.7,
            },
            max_tokens: {
              type: 'number',
              description: 'Maximum tokens to generate (default: 2000)',
              default: 2000,
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_motoko_context':
        return await getMotokoContext(
          args?.query as string,
          (args?.limit as number) || 5,
          BACKEND_URL,
          API_KEY
        );

      case 'generate_motoko_code':
        return await generateMotokoCode(
          args?.prompt as string,
          args?.query as string | undefined,
          (args?.temperature as number) || 0.7,
          (args?.max_tokens as number) || 2000,
          BACKEND_URL,
          API_KEY
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ICP Coder MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
