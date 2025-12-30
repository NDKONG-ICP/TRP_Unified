/**
 * AI Council System - Multi-LLM Consensus using Hugging Face Inference API
 * 
 * Queries 7 open-source LLMs in parallel and synthesizes consensus responses.
 * Based on Anda Framework patterns for composable AI agents.
 * 
 * Models used:
 * 1. Qwen/Qwen3-235B-Instruct
 * 2. meta-llama/Llama-4-Scout
 * 3. deepseek-ai/DeepSeek-V3
 * 4. mistral-ai/Mixtral-8x22B-Instruct-v0.1
 * 5. THUDM/GLM-4.6
 * 6. google/gemma-2-27b-it
 * 7. meta-llama/Llama-3.3-70B-Instruct
 */

// ============================================================================
// Interfaces
// ============================================================================

export interface AICouncilConfig {
  apiKey: string;
  maxNewTokens: number;
  temperature: number;
  topP: number;
  systemPrompt: string;
  timeout: number;
}

export interface ModelConfig {
  name: string;
  repoId: string;
  weight: number;
  enabled: boolean;
}

export interface ModelResponse {
  model: string;
  response: string;
  success: boolean;
  error?: string;
  latencyMs: number;
  tokensGenerated?: number;
}

export interface CouncilResult {
  query: string;
  responses: ModelResponse[];
  consensus: ConsensusResult;
  totalLatencyMs: number;
  timestamp: number;
}

export interface ConsensusResult {
  finalResponse: string;
  confidenceScore: number;
  agreementLevel: number;
  keyPoints: string[];
  dissentingViews: string[];
  synthesisMethod: string;
  voteSummary?: VoteSummary;
}

export interface VoteSummary {
  yes: number;
  no: number;
  neutral: number;
  total: number;
}

// ============================================================================
// Secure Configuration - API keys loaded from environment
// ============================================================================

import { API_KEYS, isConfigured } from '../config/secureConfig';
import { isMainnet } from './canisterConfig';

const DEFAULT_CONFIG: AICouncilConfig = {
  apiKey: API_KEYS.HUGGING_FACE,
  maxNewTokens: 512,
  temperature: 0.7,
  topP: 0.95,
  systemPrompt: 'You are a helpful AI assistant. Respond concisely to the query.',
  timeout: 60000, // 60 seconds
};

// Perplexity API Configuration - loaded from environment
const PERPLEXITY_API_KEY = API_KEYS.PERPLEXITY;
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

const COUNCIL_MODELS: ModelConfig[] = [
  {
    name: 'Perplexity-Sonar',
    repoId: 'perplexity/sonar-pro', // Special marker for Perplexity
    weight: 1.2, // Higher weight - Perplexity has real-time search
    enabled: !!PERPLEXITY_API_KEY,
  },
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
    name: 'Mistral-7B',
    repoId: 'mistralai/Mistral-7B-Instruct-v0.3',
    weight: 0.7,
    enabled: true,
  },
];

// ============================================================================
// AI Council Class
// ============================================================================

export class AICouncil {
  private config: AICouncilConfig;
  private models: ModelConfig[];
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(config?: Partial<AICouncilConfig>, models?: ModelConfig[]) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.models = models || COUNCIL_MODELS;
  }

  /**
   * Query a single model via appropriate API
   */
  private async queryModel(model: ModelConfig, query: string, context?: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      // Check if this is Perplexity (uses OpenAI-compatible API)
      if (model.name === 'Perplexity-Sonar') {
        return await this.queryPerplexity(model, query, context);
      }
      
      const url = `${this.baseUrl}/${model.repoId}`;
      
      // Build the prompt with system instruction and context
      const fullPrompt = this.buildPrompt(query, context);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: this.config.maxNewTokens,
            temperature: this.config.temperature,
            top_p: this.config.topP,
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
      
      // Handle different response formats
      let generatedText = '';
      if (Array.isArray(data) && data.length > 0) {
        generatedText = data[0].generated_text || data[0].text || '';
      } else if (typeof data === 'object' && data.generated_text) {
        generatedText = data.generated_text;
      } else if (typeof data === 'string') {
        generatedText = data;
      }
      
      // Clean up the response
      generatedText = this.cleanResponse(generatedText, query);
      
      return {
        model: model.name,
        response: generatedText,
        success: true,
        latencyMs,
        tokensGenerated: generatedText.split(' ').length,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      // Handle specific error types
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
   * Query Perplexity API (OpenAI-compatible format with real-time search)
   */
  private async queryPerplexity(model: ModelConfig, query: string, context?: string): Promise<ModelResponse> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      // Build messages array for OpenAI-compatible format
      const messages: Array<{ role: string; content: string }> = [
        {
          role: 'system',
          content: this.config.systemPrompt,
        },
      ];
      
      if (context) {
        messages.push({
          role: 'user',
          content: `Context from previous conversation:\n${context}`,
        });
      }
      
      messages.push({
        role: 'user',
        content: query,
      });
      
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Perplexity's most capable model with search
          messages,
          max_tokens: this.config.maxNewTokens,
          temperature: this.config.temperature,
          top_p: this.config.topP,
          return_citations: true, // Include source citations
          search_recency_filter: 'month', // Prefer recent sources
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      const latencyMs = Date.now() - startTime;
      
      // Extract response from OpenAI-compatible format
      let generatedText = '';
      if (data.choices && data.choices.length > 0) {
        generatedText = data.choices[0].message?.content || '';
      }
      
      // Add citations if available
      if (data.citations && data.citations.length > 0) {
        generatedText += '\n\n📚 Sources: ' + data.citations.slice(0, 3).join(', ');
      }
      
      const tokensUsed = data.usage?.total_tokens || generatedText.split(' ').length;
      
      return {
        model: model.name,
        response: generatedText,
        success: true,
        latencyMs,
        tokensGenerated: tokensUsed,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      
      let errorMessage = error.message || 'Unknown error';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (errorMessage.includes('429')) {
        errorMessage = 'Rate limit exceeded';
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
   * Build the full prompt with system instruction
   */
  private buildPrompt(query: string, context?: string): string {
    let prompt = `<|system|>\n${this.config.systemPrompt}\n<|end|>\n`;
    
    if (context) {
      prompt += `<|context|>\n${context}\n<|end|>\n`;
    }
    
    prompt += `<|user|>\n${query}\n<|end|>\n<|assistant|>\n`;
    
    return prompt;
  }

  /**
   * Clean up the model response
   */
  private cleanResponse(response: string, query: string): string {
    // Remove common artifacts
    let cleaned = response
      .replace(/<\|.*?\|>/g, '') // Remove special tokens
      .replace(/^(Assistant:|AI:|Response:)/i, '') // Remove prefixes
      .trim();
    
    // Remove the query if it was echoed back
    if (cleaned.toLowerCase().startsWith(query.toLowerCase())) {
      cleaned = cleaned.substring(query.length).trim();
    }
    
    return cleaned;
  }

  /**
   * Query all models in parallel
   */
  async queryCouncil(query: string, context?: string): Promise<CouncilResult> {
    // On mainnet, browser-side HuggingFace calls fail due to CORS
    // AI must be accessed via backend canister (raven_ai.query_ai_council)
    if (isMainnet()) {
      throw new Error('AI requires login (backend) on mainnet. Please connect your wallet to use RavenAI.');
    }
    
    const startTime = Date.now();
    const enabledModels = this.models.filter(m => m.enabled);
    
    console.log(`🤖 AI Council: Querying ${enabledModels.length} models...`);
    
    // Query all models in parallel
    const responsePromises = enabledModels.map(model => 
      this.queryModel(model, query, context)
    );
    
    const responses = await Promise.all(responsePromises);
    const totalLatencyMs = Date.now() - startTime;
    
    // Log individual responses
    console.log('\n📊 Individual Responses:');
    responses.forEach(r => {
      if (r.success) {
        console.log(`\n✅ ${r.model} (${r.latencyMs}ms):`);
        console.log(`   ${r.response.substring(0, 200)}${r.response.length > 200 ? '...' : ''}`);
      } else {
        console.log(`\n❌ ${r.model}: ${r.error}`);
      }
    });
    
    // Synthesize consensus
    const consensus = this.synthesizeConsensus(responses, query);
    
    return {
      query,
      responses,
      consensus,
      totalLatencyMs,
      timestamp: Date.now(),
    };
  }

  /**
   * Synthesize consensus from multiple model responses
   */
  private synthesizeConsensus(responses: ModelResponse[], query: string): ConsensusResult {
    const successfulResponses = responses.filter(r => r.success && r.response.length > 0);
    
    if (successfulResponses.length === 0) {
      // Use intelligent fallback response when all external APIs fail (e.g., due to CORS)
      const fallbackResponse = this.generateFallbackResponse(query);
      return {
        finalResponse: fallbackResponse,
        confidenceScore: 0.7,
        agreementLevel: 1.0,
        keyPoints: ['Response generated using local AI capabilities'],
        dissentingViews: [],
        synthesisMethod: 'local_fallback',
      };
    }
    
    // Check if this is a yes/no question
    const isYesNoQuestion = this.isYesNoQuestion(query);
    
    if (isYesNoQuestion) {
      return this.synthesizeYesNoConsensus(successfulResponses);
    }
    
    return this.synthesizeOpenEndedConsensus(successfulResponses);
  }

  /**
   * Check if the query is a yes/no question
   */
  private isYesNoQuestion(query: string): boolean {
    const yesNoPatterns = [
      /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\s/i,
      /\?$/,
    ];
    
    const queryLower = query.toLowerCase();
    return yesNoPatterns.some(pattern => pattern.test(query)) &&
           (queryLower.includes(' or ') === false); // Exclude "X or Y" questions
  }

  /**
   * Synthesize consensus for yes/no questions using majority vote
   */
  private synthesizeYesNoConsensus(responses: ModelResponse[]): ConsensusResult {
    const votes: VoteSummary = { yes: 0, no: 0, neutral: 0, total: responses.length };
    
    const yesIndicators = ['yes', 'correct', 'true', 'affirmative', 'indeed', 'absolutely', 'certainly'];
    const noIndicators = ['no', 'incorrect', 'false', 'negative', 'not', "don't", "doesn't", "can't", "won't"];
    
    responses.forEach(r => {
      const responseLower = r.response.toLowerCase();
      const firstSentence = responseLower.split(/[.!?]/)[0];
      
      const hasYes = yesIndicators.some(indicator => firstSentence.includes(indicator));
      const hasNo = noIndicators.some(indicator => firstSentence.includes(indicator));
      
      if (hasYes && !hasNo) {
        votes.yes++;
      } else if (hasNo && !hasYes) {
        votes.no++;
      } else {
        votes.neutral++;
      }
    });
    
    // Determine majority
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
    
    // Find the best supporting response
    const bestResponse = responses.reduce((best, current) => {
      return current.response.length > best.response.length ? current : best;
    });
    
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
   * Synthesize consensus for open-ended questions
   */
  private synthesizeOpenEndedConsensus(responses: ModelResponse[]): ConsensusResult {
    // Calculate response similarity
    const similarities = this.calculateResponseSimilarities(responses);
    const agreementLevel = similarities.averageSimilarity;
    
    // Extract key points that appear in multiple responses
    const keyPoints = this.extractKeyPoints(responses);
    
    // Find dissenting views (responses with low similarity)
    const dissentingViews = similarities.outliers.map(idx => 
      `${responses[idx].model}: ${responses[idx].response.substring(0, 100)}...`
    );
    
    // Select the best response based on length and content quality
    const bestResponse = this.selectBestResponse(responses);
    
    // Build final response
    let finalResponse = bestResponse.response;
    
    if (keyPoints.length > 0) {
      finalResponse += '\n\n**Key Points from Council:**\n';
      keyPoints.forEach((point, i) => {
        finalResponse += `${i + 1}. ${point}\n`;
      });
    }
    
    return {
      finalResponse,
      confidenceScore: agreementLevel,
      agreementLevel,
      keyPoints,
      dissentingViews,
      synthesisMethod: 'weighted_synthesis',
    };
  }

  /**
   * Calculate similarity between responses
   */
  private calculateResponseSimilarities(responses: ModelResponse[]): {
    averageSimilarity: number;
    outliers: number[];
  } {
    if (responses.length < 2) {
      return { averageSimilarity: 1.0, outliers: [] };
    }
    
    // Simple word-based similarity
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
   * Extract key points that appear in multiple responses
   */
  private extractKeyPoints(responses: ModelResponse[]): string[] {
    // Extract sentences from all responses
    const allSentences: { sentence: string; count: number }[] = [];
    
    responses.forEach(r => {
      const sentences = r.response.split(/[.!?]+/).filter(s => s.trim().length > 20);
      sentences.forEach(sentence => {
        const trimmed = sentence.trim();
        const existing = allSentences.find(s => 
          this.calculateSentenceSimilarity(s.sentence, trimmed) > 0.5
        );
        if (existing) {
          existing.count++;
        } else {
          allSentences.push({ sentence: trimmed, count: 1 });
        }
      });
    });
    
    // Return sentences that appear in multiple responses
    return allSentences
      .filter(s => s.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => s.sentence);
  }

  /**
   * Calculate similarity between two sentences
   */
  private calculateSentenceSimilarity(s1: string, s2: string): number {
    const words1 = new Set(s1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(s2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Generate intelligent fallback response when external APIs fail
   * Uses pattern matching and knowledge base for contextual responses
   */
  private generateFallbackResponse(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Knowledge base for common topics
    const knowledgeBase: { patterns: RegExp[]; response: string }[] = [
      {
        patterns: [/what is (raven|the raven|raven ecosystem)/i, /tell me about raven/i],
        response: `The Raven Ecosystem is a comprehensive multi-chain platform built on the Internet Computer. It features:

🔹 **RavenAI** - On-chain AI agents with persistent memory
🔹 **The Forge** - NFT minting platform with multi-chain support
🔹 **IC SPICY** - Real-World Asset (RWA) co-op integration
🔹 **eXpresso Logistics** - Decentralized logistics platform
🔹 **Sk8 Punks** - On-chain gaming with $HARLEE rewards
🔹 **Crossword Quest** - Educational games with crypto rewards

The ecosystem is powered by the $HARLEE token and supports Chain Fusion for multi-chain interoperability.`,
      },
      {
        patterns: [/what is (axiom|an axiom)/i, /tell me about axiom/i, /axiom nft/i],
        response: `AXIOM NFTs are unique AI agent tokens in the Raven Ecosystem. Each AXIOM has:

🧠 **Persistent Memory** - Learns and remembers from conversations
🎭 **Unique Personality** - Each has specialized knowledge areas
🔗 **Multi-Chain** - Works across ICP, Ethereum, Solana, and more
🎤 **Voice Integration** - Text-to-speech with Eleven Labs
💰 **On-Chain Value** - Tradeable AI companions

There are 5 Genesis AXIOM NFTs (#1-5) with legendary rarity, and 295 more available for minting.`,
      },
      {
        patterns: [/what is (harlee|\$harlee|harlee token)/i, /tell me about harlee/i],
        response: `$HARLEE is the utility token powering the Raven Ecosystem:

**Token Details:**
- Total Supply: 100,000,000 $HARLEE
- Decimals: 8
- Standard: ICRC-1
- Ledger: tlm4l-kaaaa-aaaah-qqeha-cai

💰 **Staking Rewards** - Earn 100 $HARLEE/week per staked NFT (with rarity multipliers: Rare 1.5x, Epic 2x, Legendary 3x)
🎮 **Game Rewards** - Win $HARLEE in Sk8 Punks and Crossword Quest (1 $HARLEE per puzzle)
📰 **Content Rewards** - Earn for quality articles and memes
🛒 **Payments** - Use for NFT purchases and subscriptions
🏦 **Governance** - Participate in ecosystem decisions

Token Details:
- Ledger: tlm4l-kaaaa-aaaah-qqeha-cai
- Index: 5ipsq-2iaaa-aaaae-qffka-cai`,
      },
      {
        patterns: [/how (do i|can i|to) (connect|link) (wallet|my wallet)/i, /wallet connection/i],
        response: `To connect your wallet to the Raven Ecosystem:

1. **Internet Identity** - Click "Connect" → Select "Internet Identity" → Authenticate
2. **Plug Wallet** - Install Plug extension → Click "Connect" → Select "Plug" → Approve
3. **OISY Wallet** - Click "Connect" → Select "OISY" → Sign in with Internet Identity

Once connected, you can:
- View your token balances
- Mint and trade NFTs
- Stake for rewards
- Access AI features`,
      },
      {
        patterns: [/how (do i|can i|to) (stake|staking)/i, /staking rewards/i, /staking calculator/i],
        response: `NFT Staking for $HARLEE rewards:

**How to Stake:**
1. Connect your wallet (Plug recommended for NFT custody)
2. Navigate to Sk8 Punks → Staking section
3. Select NFTs to stake
4. Confirm the transaction

**Base Rewards:**
- 100 $HARLEE per week per staked NFT
- Rewards accumulate continuously
- Claim anytime or let them build up

**Rarity Multipliers:**
- Common: 1x (100/week)
- Rare: 1.5x (150/week)
- Epic: 2x (200/week)
- Legendary: 3x (300/week)

**Yearly Earnings (per NFT):**
- Common: 5,200 $HARLEE
- Legendary: 15,600 $HARLEE

**Supported Collections:**
- Raven's Sk8 Punks (b4mk6-5qaaa-aaaah-arerq-cai)`,
      },
      {
        patterns: [/what is (ic spicy|icspicy)/i, /tell me about (ic spicy|the farm)/i],
        response: `IC SPICY is our Real-World Asset (RWA) co-op integration:

🌶️ **Products:**
- Fresh Pepper Pods (Carolina Reaper, Ghost, Habanero)
- Nursery Plants (Florida registered)
- Seeds & Spice Blends

🍽️ **In-Person Menu:**
- Reaper Wings, Ghost Burgers, Jerk Bowls
- House-made hot sauces

🌱 **Farm Dashboard:**
- IoT-connected greenhouse monitoring
- Live inventory tracking
- Harvest scheduling

Visit ic-spicy.com for more!`,
      },
      {
        patterns: [/internet computer|icp|dfinity/i],
        response: `The Internet Computer (ICP) is a revolutionary blockchain platform by DFINITY:

🌐 **Key Features:**
- Web-speed transactions
- Reverse gas model (developers pay)
- True on-chain smart contracts
- Chain Fusion for multi-chain

💻 **Why We Built on ICP:**
- Full on-chain AI with HTTP outcalls
- Persistent canister memory
- Low cost, high throughput
- Native multi-chain support`,
      },
      {
        patterns: [/blockchain|crypto|web3/i],
        response: `The Raven Ecosystem leverages blockchain technology for:

🔐 **Security** - Immutable on-chain data
🌍 **Decentralization** - No single point of failure
💎 **Ownership** - True digital property rights
🔗 **Interoperability** - Multi-chain support

We support:
- ICP (native)
- Ethereum (ckETH)
- Bitcoin (ckBTC)
- Solana
- And more through Chain Fusion`,
      },
    ];
    
    // Check against knowledge base
    for (const entry of knowledgeBase) {
      if (entry.patterns.some(pattern => pattern.test(queryLower))) {
        return entry.response;
      }
    }
    
    // General contextual responses
    if (queryLower.includes('hello') || queryLower.includes('hi ') || queryLower.startsWith('hi')) {
      return `Hello! I'm RavenAI, your on-chain AI assistant. I can help you with:

🔹 Learning about the Raven Ecosystem
🔹 Understanding AXIOM AI agents
🔹 $HARLEE token and staking
🔹 NFT minting and trading
🔹 Wallet connection and setup

What would you like to know?`;
    }
    
    if (queryLower.includes('help') || queryLower.includes('what can you do')) {
      return `I'm RavenAI, and I can assist you with:

📚 **Information:**
- Ecosystem overview
- Token details ($HARLEE, ICP)
- NFT collections (AXIOM, Sk8 Punks)

🛠️ **Guidance:**
- Wallet setup and connection
- NFT staking process
- Payment options

🎮 **Features:**
- Game information (Sk8 Punks, Crossword)
- IC SPICY products and menu
- eXpresso logistics

Just ask me anything about the Raven Ecosystem!`;
    }
    
    if (queryLower.includes('price') || queryLower.includes('cost') || queryLower.includes('how much')) {
      return `Pricing in the Raven Ecosystem:

💳 **Subscription Plans:**
- Monthly: 2 ICP (~$25)
- Yearly: 10 ICP (~$125)
- Lifetime: 25 ICP (~$312.50)

🎨 **NFT Minting:**
- AXIOM NFT: ~$100 equivalent in any supported token
- Supports: ICP, ckBTC, ckETH, ckUSDC, $HARLEE

🎮 **Games:**
- Free to play
- Earn $HARLEE rewards

Is there a specific price you'd like to know about?`;
    }
    
    // Default intelligent response
    return `Thank you for your question about "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}".

As RavenAI, I'm here to help with the Raven Ecosystem. While my external AI council is temporarily unavailable, I can provide information on:

🔹 **Core Features** - NFT minting, AI agents, staking
🔹 **Tokens** - $HARLEE, ICP, multi-chain support
🔹 **Applications** - Sk8 Punks, Crossword Quest, IC SPICY
🔹 **Technical** - Wallet connection, transactions

Please try asking a more specific question, or explore our ecosystem sections in the navigation menu above.`;
  }

  /**
   * Select the best response based on quality metrics
   */
  private selectBestResponse(responses: ModelResponse[]): ModelResponse {
    return responses.reduce((best, current) => {
      // Score based on length (moderate length preferred)
      const lengthScore = Math.min(current.response.length / 500, 1);
      
      // Score based on response quality indicators
      const qualityIndicators = ['because', 'therefore', 'however', 'additionally', 'specifically'];
      const qualityScore = qualityIndicators.filter(ind => 
        current.response.toLowerCase().includes(ind)
      ).length / qualityIndicators.length;
      
      // Combined score
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
   * Update configuration
   */
  setConfig(config: Partial<AICouncilConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable specific models
   */
  setModelEnabled(modelName: string, enabled: boolean): void {
    const model = this.models.find(m => m.name === modelName);
    if (model) {
      model.enabled = enabled;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AICouncilConfig {
    return { ...this.config };
  }

  /**
   * Get available models
   */
  getModels(): ModelConfig[] {
    return this.models.map(m => ({ ...m }));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const aiCouncil = new AICouncil();

// ============================================================================
// React Hook for AI Council
// ============================================================================

import { useState, useCallback } from 'react';

export interface UseAICouncilReturn {
  query: (input: string, context?: string) => Promise<CouncilResult>;
  isLoading: boolean;
  lastResult: CouncilResult | null;
  error: string | null;
}

export function useAICouncil(): UseAICouncilReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CouncilResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(async (input: string, context?: string): Promise<CouncilResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await aiCouncil.queryCouncil(input, context);
      setLastResult(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to query AI Council';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { query, isLoading, lastResult, error };
}

// ============================================================================
// Command Line Interface (for standalone use)
// ============================================================================

// This section runs when the script is executed directly
if (typeof process !== 'undefined' && process.argv) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🤖 AI Council - Multi-LLM Consensus System
==========================================

Usage: npx ts-node aiCouncil.ts "Your query here"

Example: npx ts-node aiCouncil.ts "What is the Internet Computer?"

Models used:
- Qwen3-235B-Instruct
- Llama-3.3-70B-Instruct  
- DeepSeek-V3
- Mixtral-8x22B-Instruct
- GLM-4
- Gemma-2-27B
- Mistral-7B-Instruct

The council will query all models in parallel and synthesize a consensus response.
    `);
  } else {
    const query = args.join(' ');
    console.log(`\n🔍 Query: "${query}"\n`);
    
    const council = new AICouncil();
    council.queryCouncil(query).then(result => {
      console.log('\n' + '='.repeat(60));
      console.log('📋 CONSENSUS RESULT');
      console.log('='.repeat(60));
      console.log(`\n${result.consensus.finalResponse}`);
      console.log(`\n📊 Statistics:`);
      console.log(`   - Agreement Level: ${Math.round(result.consensus.agreementLevel * 100)}%`);
      console.log(`   - Confidence: ${Math.round(result.consensus.confidenceScore * 100)}%`);
      console.log(`   - Total Latency: ${result.totalLatencyMs}ms`);
      console.log(`   - Method: ${result.consensus.synthesisMethod}`);
      
      if (result.consensus.keyPoints.length > 0) {
        console.log(`\n🔑 Key Points:`);
        result.consensus.keyPoints.forEach((point, i) => {
          console.log(`   ${i + 1}. ${point}`);
        });
      }
    }).catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
  }
}

export default AICouncil;

