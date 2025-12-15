#!/usr/bin/env npx ts-node

/**
 * AI Council CLI - Multi-LLM Consensus System
 * 
 * A command-line tool that queries 7 open-source LLMs via Hugging Face
 * and synthesizes consensus responses.
 * 
 * Installation (run once):
 * npm install @huggingface/inference
 * 
 * Usage:
 * npx ts-node ai_council.ts "Your query here"
 * 
 * Example:
 * npx ts-node ai_council.ts "What are the benefits of blockchain technology?"
 */

// ============================================================================
// Interfaces
// ============================================================================

interface AICouncilConfig {
  apiKey: string;
  maxNewTokens: number;
  temperature: number;
  topP: number;
  systemPrompt: string;
  timeout: number;
}

interface ModelConfig {
  name: string;
  repoId: string;
  weight: number;
  enabled: boolean;
}

interface ModelResponse {
  model: string;
  response: string;
  success: boolean;
  error?: string;
  latencyMs: number;
  tokensGenerated?: number;
}

interface CouncilResult {
  query: string;
  responses: ModelResponse[];
  consensus: ConsensusResult;
  totalLatencyMs: number;
  timestamp: number;
}

interface ConsensusResult {
  finalResponse: string;
  confidenceScore: number;
  agreementLevel: number;
  keyPoints: string[];
  dissentingViews: string[];
  synthesisMethod: string;
  voteSummary?: VoteSummary;
}

interface VoteSummary {
  yes: number;
  no: number;
  neutral: number;
  total: number;
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG: AICouncilConfig = {
  apiKey: process.env.HUGGINGFACE_API_KEY || '', // Set via environment variable
  maxNewTokens: 512,
  temperature: 0.7,
  topP: 0.95,
  systemPrompt: 'You are a helpful AI assistant. Respond concisely to the query.',
  timeout: 60000, // 60 seconds
};

// 7 Open-Source Models from Hugging Face
const COUNCIL_MODELS: ModelConfig[] = [
  {
    name: 'Qwen2.5-72B',
    repoId: 'Qwen/Qwen2.5-72B-Instruct',
    weight: 1.0,
    enabled: true,
  },
  {
    name: 'Llama-3.3-70B',
    repoId: 'meta-llama/Llama-3.3-70B-Instruct',
    weight: 1.0,
    enabled: true,
  },
  {
    name: 'DeepSeek-V2.5',
    repoId: 'deepseek-ai/DeepSeek-V2.5',
    weight: 1.0,
    enabled: true,
  },
  {
    name: 'Mixtral-8x22B',
    repoId: 'mistralai/Mixtral-8x22B-Instruct-v0.1',
    weight: 0.9,
    enabled: true,
  },
  {
    name: 'GLM-4-9B',
    repoId: 'THUDM/glm-4-9b-chat',
    weight: 0.8,
    enabled: true,
  },
  {
    name: 'Gemma-2-27B',
    repoId: 'google/gemma-2-27b-it',
    weight: 0.9,
    enabled: true,
  },
  {
    name: 'Mistral-7B-v0.3',
    repoId: 'mistralai/Mistral-7B-Instruct-v0.3',
    weight: 0.7,
    enabled: true,
  },
];

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build prompt with system instruction
 */
function buildPrompt(query: string, systemPrompt: string): string {
  return `<|system|>\n${systemPrompt}\n<|end|>\n<|user|>\n${query}\n<|end|>\n<|assistant|>\n`;
}

/**
 * Clean model response
 */
function cleanResponse(response: string, query: string): string {
  let cleaned = response
    .replace(/<\|.*?\|>/g, '') // Remove special tokens
    .replace(/^(Assistant:|AI:|Response:)/i, '') // Remove prefixes
    .trim();
  
  // Remove echoed query
  if (cleaned.toLowerCase().startsWith(query.toLowerCase())) {
    cleaned = cleaned.substring(query.length).trim();
  }
  
  return cleaned;
}

/**
 * Query a single model
 */
async function queryModel(model: ModelConfig, query: string): Promise<ModelResponse> {
  const startTime = Date.now();
  
  try {
    const url = `${HF_API_BASE}/${model.repoId}`;
    const prompt = buildPrompt(query, CONFIG.systemPrompt);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: CONFIG.maxNewTokens,
          temperature: CONFIG.temperature,
          top_p: CONFIG.topP,
          return_full_text: false,
          do_sample: true,
        },
        options: {
          wait_for_model: true,
          use_cache: false,
        },
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    
    // Extract generated text
    let generatedText = '';
    if (Array.isArray(data) && data.length > 0) {
      generatedText = data[0].generated_text || data[0].text || '';
    } else if (typeof data === 'object' && data.generated_text) {
      generatedText = data.generated_text;
    } else if (typeof data === 'string') {
      generatedText = data;
    }
    
    generatedText = cleanResponse(generatedText, query);
    
    return {
      model: model.name,
      response: generatedText,
      success: true,
      latencyMs,
      tokensGenerated: generatedText.split(' ').length,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    
    let errorMessage = error.message || 'Unknown error';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'Rate limit exceeded';
    } else if (errorMessage.includes('503')) {
      errorMessage = 'Model is loading, please retry';
    }
    
    return {
      model: model.name,
      response: '',
      success: false,
      error: errorMessage,
      latencyMs,
    };
  }
}

/**
 * Check if query is yes/no question
 */
function isYesNoQuestion(query: string): boolean {
  const yesNoPatterns = [
    /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\s/i,
  ];
  
  return yesNoPatterns.some(pattern => pattern.test(query)) &&
         !query.toLowerCase().includes(' or ');
}

/**
 * Synthesize yes/no consensus
 */
function synthesizeYesNoConsensus(responses: ModelResponse[]): ConsensusResult {
  const votes: VoteSummary = { yes: 0, no: 0, neutral: 0, total: responses.length };
  
  const yesIndicators = ['yes', 'correct', 'true', 'affirmative', 'indeed', 'absolutely', 'certainly'];
  const noIndicators = ['no', 'incorrect', 'false', 'negative', 'not', "don't", "doesn't", "can't", "won't"];
  
  responses.forEach(r => {
    const responseLower = r.response.toLowerCase();
    const firstSentence = responseLower.split(/[.!?]/)[0];
    
    const hasYes = yesIndicators.some(ind => firstSentence.includes(ind));
    const hasNo = noIndicators.some(ind => firstSentence.includes(ind));
    
    if (hasYes && !hasNo) votes.yes++;
    else if (hasNo && !hasYes) votes.no++;
    else votes.neutral++;
  });
  
  let majorityResponse: string;
  let agreementLevel: number;
  
  if (votes.yes > votes.no && votes.yes > votes.neutral) {
    majorityResponse = 'Yes';
    agreementLevel = votes.yes / votes.total;
  } else if (votes.no > votes.yes && votes.no > votes.neutral) {
    majorityResponse = 'No';
    agreementLevel = votes.no / votes.total;
  } else {
    majorityResponse = 'The council is divided on this question.';
    agreementLevel = Math.max(votes.yes, votes.no, votes.neutral) / votes.total;
  }
  
  const bestResponse = responses.reduce((best, current) => 
    current.response.length > best.response.length ? current : best
  );
  
  return {
    finalResponse: `${majorityResponse}\n\n**Council Analysis:**\n${bestResponse.response}`,
    confidenceScore: agreementLevel,
    agreementLevel,
    keyPoints: [
      `Vote: ${votes.yes} Yes, ${votes.no} No, ${votes.neutral} Neutral`,
      `${Math.round(agreementLevel * 100)}% agreement`,
    ],
    dissentingViews: [],
    synthesisMethod: 'majority_vote',
    voteSummary: votes,
  };
}

/**
 * Calculate response similarities
 */
function calculateSimilarities(responses: ModelResponse[]): { averageSimilarity: number; outliers: number[] } {
  if (responses.length < 2) return { averageSimilarity: 1.0, outliers: [] };
  
  const tokenSets = responses.map(r => 
    new Set(r.response.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  );
  
  let totalSimilarity = 0;
  let comparisons = 0;
  const individualScores: number[] = [];
  
  for (let i = 0; i < responses.length; i++) {
    let scoreSum = 0;
    for (let j = 0; j < responses.length; j++) {
      if (i !== j) {
        const intersection = new Set([...tokenSets[i]].filter(x => tokenSets[j].has(x)));
        const union = new Set([...tokenSets[i], ...tokenSets[j]]);
        const similarity = intersection.size / union.size;
        scoreSum += similarity;
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    individualScores.push(scoreSum / (responses.length - 1));
  }
  
  const averageSimilarity = totalSimilarity / comparisons;
  const threshold = averageSimilarity * 0.5;
  const outliers = individualScores
    .map((score, idx) => ({ score, idx }))
    .filter(item => item.score < threshold)
    .map(item => item.idx);
  
  return { averageSimilarity, outliers };
}

/**
 * Extract key points from responses
 */
function extractKeyPoints(responses: ModelResponse[]): string[] {
  const allSentences: { sentence: string; count: number }[] = [];
  
  responses.forEach(r => {
    const sentences = r.response.split(/[.!?]+/).filter(s => s.trim().length > 20);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      const existing = allSentences.find(s => {
        const words1 = new Set(s.sentence.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(trimmed.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size > 0.5;
      });
      
      if (existing) existing.count++;
      else allSentences.push({ sentence: trimmed, count: 1 });
    });
  });
  
  return allSentences
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(s => s.sentence);
}

/**
 * Select best response
 */
function selectBestResponse(responses: ModelResponse[]): ModelResponse {
  const qualityIndicators = ['because', 'therefore', 'however', 'additionally', 'specifically'];
  
  return responses.reduce((best, current) => {
    const lengthScore = Math.min(current.response.length / 500, 1);
    const qualityScore = qualityIndicators.filter(ind => 
      current.response.toLowerCase().includes(ind)
    ).length / qualityIndicators.length;
    const currentScore = lengthScore * 0.4 + qualityScore * 0.6;
    
    const bestLengthScore = Math.min(best.response.length / 500, 1);
    const bestQualityScore = qualityIndicators.filter(ind => 
      best.response.toLowerCase().includes(ind)
    ).length / qualityIndicators.length;
    const bestScore = bestLengthScore * 0.4 + bestQualityScore * 0.6;
    
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Synthesize open-ended consensus
 */
function synthesizeOpenEndedConsensus(responses: ModelResponse[]): ConsensusResult {
  const similarities = calculateSimilarities(responses);
  const keyPoints = extractKeyPoints(responses);
  const dissentingViews = similarities.outliers.map(idx => 
    `${responses[idx].model}: ${responses[idx].response.substring(0, 100)}...`
  );
  const bestResponse = selectBestResponse(responses);
  
  let finalResponse = bestResponse.response;
  
  if (keyPoints.length > 0) {
    finalResponse += '\n\n**Key Points from Council:**\n';
    keyPoints.forEach((point, i) => {
      finalResponse += `${i + 1}. ${point}\n`;
    });
  }
  
  return {
    finalResponse,
    confidenceScore: similarities.averageSimilarity,
    agreementLevel: similarities.averageSimilarity,
    keyPoints,
    dissentingViews,
    synthesisMethod: 'weighted_synthesis',
  };
}

/**
 * Synthesize consensus from all responses
 */
function synthesizeConsensus(responses: ModelResponse[], query: string): ConsensusResult {
  const successfulResponses = responses.filter(r => r.success && r.response.length > 0);
  
  if (successfulResponses.length === 0) {
    return {
      finalResponse: 'Unable to generate response. All models failed.',
      confidenceScore: 0,
      agreementLevel: 0,
      keyPoints: [],
      dissentingViews: responses.map(r => r.error || 'No response').filter(Boolean),
      synthesisMethod: 'none',
    };
  }
  
  if (isYesNoQuestion(query)) {
    return synthesizeYesNoConsensus(successfulResponses);
  }
  
  return synthesizeOpenEndedConsensus(successfulResponses);
}

/**
 * Query all models in parallel
 */
async function queryCouncil(query: string): Promise<CouncilResult> {
  const startTime = Date.now();
  const enabledModels = COUNCIL_MODELS.filter(m => m.enabled);
  
  console.log(`\n🤖 AI Council: Querying ${enabledModels.length} models in parallel...\n`);
  console.log('Models:');
  enabledModels.forEach(m => console.log(`  • ${m.name} (${m.repoId})`));
  console.log('');
  
  // Query all models in parallel using Promise.all
  const responsePromises = enabledModels.map(model => queryModel(model, query));
  const responses = await Promise.all(responsePromises);
  
  const totalLatencyMs = Date.now() - startTime;
  
  // Display individual responses
  console.log('─'.repeat(60));
  console.log('📊 INDIVIDUAL RESPONSES');
  console.log('─'.repeat(60));
  
  responses.forEach(r => {
    if (r.success) {
      console.log(`\n✅ ${r.model} (${r.latencyMs}ms):`);
      console.log(`   ${r.response.substring(0, 300)}${r.response.length > 300 ? '...' : ''}`);
    } else {
      console.log(`\n❌ ${r.model}: ${r.error}`);
    }
  });
  
  // Synthesize consensus
  const consensus = synthesizeConsensus(responses, query);
  
  return {
    query,
    responses,
    consensus,
    totalLatencyMs,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║            🤖 AI COUNCIL - Multi-LLM Consensus System            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Queries 7 open-source LLMs via Hugging Face Inference API       ║
║  and synthesizes a consensus response.                           ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  USAGE:                                                          ║
║    npx ts-node ai_council.ts "Your query here"                   ║
║                                                                  ║
║  EXAMPLES:                                                       ║
║    npx ts-node ai_council.ts "What is blockchain?"               ║
║    npx ts-node ai_council.ts "Is AI beneficial for society?"     ║
║    npx ts-node ai_council.ts "Explain quantum computing"         ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  MODELS USED:                                                    ║
║    1. Qwen2.5-72B-Instruct                                       ║
║    2. Llama-3.3-70B-Instruct                                     ║
║    3. DeepSeek-V2.5                                              ║
║    4. Mixtral-8x22B-Instruct                                     ║
║    5. GLM-4-9B-Chat                                              ║
║    6. Gemma-2-27B-IT                                             ║
║    7. Mistral-7B-Instruct-v0.3                                   ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  FEATURES:                                                       ║
║    • Parallel queries using Promise.all for efficiency           ║
║    • Majority vote for yes/no questions                          ║
║    • Weighted synthesis for open-ended questions                 ║
║    • Key point extraction from consensus                         ║
║    • Error handling for rate limits and timeouts                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    process.exit(0);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`🔍 QUERY: "${query}"`);
  console.log('═'.repeat(60));
  
  try {
    const result = await queryCouncil(query);
    
    console.log('\n' + '═'.repeat(60));
    console.log('📋 CONSENSUS RESULT');
    console.log('═'.repeat(60));
    
    console.log(`\n${result.consensus.finalResponse}`);
    
    console.log('\n' + '─'.repeat(60));
    console.log('📊 STATISTICS');
    console.log('─'.repeat(60));
    console.log(`  • Agreement Level: ${Math.round(result.consensus.agreementLevel * 100)}%`);
    console.log(`  • Confidence Score: ${Math.round(result.consensus.confidenceScore * 100)}%`);
    console.log(`  • Synthesis Method: ${result.consensus.synthesisMethod}`);
    console.log(`  • Total Latency: ${result.totalLatencyMs}ms`);
    console.log(`  • Successful Models: ${result.responses.filter(r => r.success).length}/${result.responses.length}`);
    
    if (result.consensus.voteSummary) {
      console.log('\n  Vote Summary:');
      console.log(`    Yes: ${result.consensus.voteSummary.yes}`);
      console.log(`    No: ${result.consensus.voteSummary.no}`);
      console.log(`    Neutral: ${result.consensus.voteSummary.neutral}`);
    }
    
    if (result.consensus.keyPoints.length > 0) {
      console.log('\n  Key Points:');
      result.consensus.keyPoints.forEach((point, i) => {
        console.log(`    ${i + 1}. ${point}`);
      });
    }
    
    if (result.consensus.dissentingViews.length > 0) {
      console.log('\n  Dissenting Views:');
      result.consensus.dissentingViews.forEach((view, i) => {
        console.log(`    ${i + 1}. ${view}`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run main function
main();




