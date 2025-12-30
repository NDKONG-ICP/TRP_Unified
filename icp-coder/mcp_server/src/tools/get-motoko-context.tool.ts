export async function getMotokoContext(
  query: string,
  limit: number,
  backendUrl: string,
  apiKey: string
) {
  const response = await fetch(`${backendUrl}/api/v1/context`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      limit,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get context: ${error}`);
  }

  const data = await response.json() as { results?: Array<{ content: string; source?: string; score?: number }> };

  // Format results for MCP
  const results = data.results || [];
  const formattedResults = results
    .map((result, index: number) => {
      return `## Result ${index + 1} (Score: ${result.score?.toFixed(3) || 'N/A'})\n\n**Source:** ${result.source || 'Unknown'}\n\n\`\`\`motoko\n${result.content}\n\`\`\`\n`;
    })
    .join('\n---\n\n');

  return {
    content: [
      {
        type: 'text',
        text: results.length > 0
          ? `Found ${results.length} relevant Motoko code samples:\n\n${formattedResults}`
          : `No relevant Motoko code found for query: "${query}"`,
      },
    ],
  };
}
