export async function generateMotokoCode(
  prompt: string,
  query: string | undefined,
  temperature: number,
  maxTokens: number,
  backendUrl: string,
  apiKey: string
) {
  const requestBody: any = {
    prompt,
    temperature,
    max_tokens: maxTokens,
  };

  if (query) {
    requestBody.query = query;
  }

  const response = await fetch(`${backendUrl}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate code: ${error}`);
  }

  const data = await response.json() as { code?: string; response?: string; explanation?: string };

  let output = `## Generated Motoko Code\n\n\`\`\`motoko\n${data.code || data.response || 'No code generated'}\n\`\`\`\n`;

  if (data.explanation) {
    output += `\n## Explanation\n\n${data.explanation}\n`;
  }

  return {
    content: [
      {
        type: 'text',
        text: output,
      },
    ],
  };
}
