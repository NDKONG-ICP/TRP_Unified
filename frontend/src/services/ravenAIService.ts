/**
 * RavenAI Service - On-chain AI Agent Integration
 * Connects to the raven_ai canister for real AI functionality
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createActorWithIdl } from './actorFactory';

// Canister IDs from deployment
const RAVEN_AI_CANISTER_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const AI_ENGINE_CANISTER_ID = '3enlo-7qaaa-aaaao-a4xcq-cai';

// Determine if we're on mainnet
const isMainnet = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('.ic0.app') || 
   window.location.hostname.endsWith('.icp0.io') ||
   window.location.hostname.endsWith('.raw.ic0.app'));

const IC_HOST = isMainnet ? 'https://ic0.app' : 'http://localhost:4943';

// IDL Factory for raven_ai canister
const ravenAIIdlFactory = ({ IDL }: { IDL: any }) => {
  const PaymentToken = IDL.Variant({
    'ICP': IDL.Null,
    'RAVEN': IDL.Null,
    'CkBTC': IDL.Null,
    'CkETH': IDL.Null,
    'CkUSDC': IDL.Null,
    'CkSOL': IDL.Null,
  });

  const AgentType = IDL.Variant({
    'RavenAI': IDL.Null,
    'AXIOM': IDL.Nat32,
  });

  const MultichainAddresses = IDL.Record({
    'icp_principal': IDL.Opt(IDL.Text),
    'evm_address': IDL.Opt(IDL.Text),
    'btc_address': IDL.Opt(IDL.Text),
    'sol_address': IDL.Opt(IDL.Text),
  });

  const AgentConfig = IDL.Record({
    'name': IDL.Text,
    'personality': IDL.Text,
    'language': IDL.Text,
    'voice_enabled': IDL.Bool,
    'accessibility_mode': IDL.Text,
    'custom_instructions': IDL.Text,
  });

  const MemoryEntry = IDL.Record({
    'id': IDL.Text,
    'memory_type': IDL.Text,
    'content': IDL.Text,
    'importance': IDL.Float32,
    'timestamp': IDL.Nat64,
    'tags': IDL.Vec(IDL.Text),
  });

  const KnowledgeNode = IDL.Record({
    'id': IDL.Text,
    'label': IDL.Text,
    'node_type': IDL.Text,
    'properties': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'connections': IDL.Vec(IDL.Text),
    'created_at': IDL.Nat64,
  });

  const ChatMessage = IDL.Record({
    'role': IDL.Text,
    'content': IDL.Text,
    'timestamp': IDL.Nat64,
  });

  const RavenAIAgent = IDL.Record({
    'token_id': IDL.Nat64,
    'agent_type': AgentType,
    'owner': IDL.Principal,
    'canister_id': IDL.Opt(IDL.Principal),
    'multichain_addresses': MultichainAddresses,
    'config': AgentConfig,
    'short_term_memory': IDL.Vec(MemoryEntry),
    'long_term_memory': IDL.Vec(MemoryEntry),
    'conversation_history': IDL.Vec(ChatMessage),
    'knowledge_nodes': IDL.Vec(KnowledgeNode),
    'total_interactions': IDL.Nat64,
    'total_memories': IDL.Nat64,
    'created_at': IDL.Nat64,
    'last_active': IDL.Nat64,
    'metadata': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
  });

  const AxiomNFT = IDL.Record({
    'number': IDL.Nat32,
    'token_id': IDL.Nat64,
    'owner': IDL.Opt(IDL.Principal),
    'minted': IDL.Bool,
    'minted_at': IDL.Opt(IDL.Nat64),
    'dedicated_canister': IDL.Opt(IDL.Principal),
    'agent': IDL.Opt(RavenAIAgent),
  });

  const Config = IDL.Record({
    'admins': IDL.Vec(IDL.Principal),
    'treasury_principal': IDL.Principal,
    'btc_address': IDL.Text,
    'raven_token_canister': IDL.Principal,
    'next_token_id': IDL.Nat64,
    'next_axiom_number': IDL.Nat32,
    'total_agents_minted': IDL.Nat64,
    'total_axiom_minted': IDL.Nat32,
    'paused': IDL.Bool,
  });

  const TokenPrice = IDL.Record({
    'token': PaymentToken,
    'usd_price': IDL.Float64,
    'amount_for_100_usd': IDL.Nat64,
    'decimals': IDL.Nat8,
  });

  const PaymentRecord = IDL.Record({
    'id': IDL.Text,
    'payer': IDL.Principal,
    'token': PaymentToken,
    'amount': IDL.Nat64,
    'usd_value': IDL.Float64,
    'agent_type': AgentType,
    'token_id': IDL.Opt(IDL.Nat64),
    'status': IDL.Text,
    'tx_hash': IDL.Opt(IDL.Text),
    'created_at': IDL.Nat64,
    'completed_at': IDL.Opt(IDL.Nat64),
  });

  return IDL.Service({
    'get_config': IDL.Func([], [Config], ['query']),
    'get_token_prices_info': IDL.Func([], [IDL.Vec(TokenPrice)], ['query']),
    'get_axiom_availability': IDL.Func([], [IDL.Nat32, IDL.Nat32, IDL.Vec(IDL.Nat32)], ['query']),
    'get_agent': IDL.Func([IDL.Nat64], [IDL.Opt(RavenAIAgent)], ['query']),
    'get_axiom': IDL.Func([IDL.Nat32], [IDL.Opt(AxiomNFT)], ['query']),
    'get_agents_by_owner': IDL.Func([IDL.Principal], [IDL.Vec(RavenAIAgent)], ['query']),
    'get_payment': IDL.Func([IDL.Text], [IDL.Opt(PaymentRecord)], ['query']),
    'get_total_supply': IDL.Func([], [IDL.Nat64, IDL.Nat32], ['query']),
    'get_btc_address': IDL.Func([], [IDL.Text], ['query']),
    'health': IDL.Func([], [IDL.Text], ['query']),
    'get_conversation_history': IDL.Func([IDL.Nat64, IDL.Nat32], [IDL.Vec(ChatMessage)], ['query']),
    'recall_memories': IDL.Func([IDL.Nat64, IDL.Text, IDL.Nat32], [IDL.Vec(MemoryEntry)], ['query']),
    'add_memory': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text, IDL.Float32, IDL.Vec(IDL.Text)], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
    'add_chat_message': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    'update_agent_config': IDL.Func([IDL.Nat64, AgentConfig], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    'initiate_payment': IDL.Func([PaymentToken, IDL.Text, IDL.Opt(IDL.Nat32)], [IDL.Variant({ 'Ok': PaymentRecord, 'Err': IDL.Text })], []),
    'confirm_payment': IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': RavenAIAgent, 'Err': IDL.Text })], []),
    'transfer_agent': IDL.Func([IDL.Nat64, IDL.Principal], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
    'update_multichain_address': IDL.Func([IDL.Nat64, IDL.Text, IDL.Text], [IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text })], []),
  });
};

// Types
export interface ChatMessage {
  role: string;
  content: string;
  timestamp: bigint;
}

export interface RavenAIAgent {
  token_id: bigint;
  agent_type: { RavenAI: null } | { AXIOM: number };
  owner: Principal;
  config: {
    name: string;
    personality: string;
    language: string;
    voice_enabled: boolean;
    accessibility_mode: string;
    custom_instructions: string;
  };
  conversation_history: ChatMessage[];
  total_interactions: bigint;
  total_memories: bigint;
  created_at: bigint;
  last_active: bigint;
}

export interface AxiomNFT {
  number: number;
  token_id: bigint;
  owner: Principal | null;
  minted: boolean;
  minted_at: bigint | null;
  agent: RavenAIAgent | null;
}

// Create actor - uses actorFactory for proper wallet abstraction
async function getRavenAIActor(identity?: Identity): Promise<any> {
  // Use actorFactory for proper wallet abstraction (supports Plug, II, OISY, etc.)
  return await createActorWithIdl(RAVEN_AI_CANISTER_ID, ravenAIIdlFactory, identity);
}

/**
 * RavenAI Service Class
 */
export class RavenAIService {
  private identity: Identity | undefined;
  private actor: any = null;

  constructor(identity?: Identity) {
    this.identity = identity;
  }

  async getActor(): Promise<any> {
    if (!this.actor) {
      this.actor = await getRavenAIActor(this.identity);
    }
    return this.actor;
  }

  /**
   * Get all agents owned by a principal
   */
  async getAgentsByOwner(owner: Principal): Promise<RavenAIAgent[]> {
    try {
      const actor = await this.getActor();
      return await actor.get_agents_by_owner(owner);
    } catch (error) {
      console.error('Failed to get agents by owner:', error);
      return [];
    }
  }

  /**
   * Get a specific agent by token ID
   */
  async getAgent(tokenId: bigint): Promise<RavenAIAgent | null> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_agent(tokenId);
      return result[0] || null;
    } catch (error) {
      console.error('Failed to get agent:', error);
      return null;
    }
  }

  /**
   * Get AXIOM NFT by number
   */
  async getAxiom(number: number): Promise<AxiomNFT | null> {
    try {
      const actor = await this.getActor();
      const result = await actor.get_axiom(number);
      return result[0] || null;
    } catch (error) {
      console.error('Failed to get AXIOM:', error);
      return null;
    }
  }

  /**
   * Get AXIOM availability
   */
  async getAxiomAvailability(): Promise<{ minted: number; total: number; available: number[] }> {
    try {
      const actor = await this.getActor();
      const [minted, total, available] = await actor.get_axiom_availability();
      return { minted, total, available };
    } catch (error) {
      console.error('Failed to get AXIOM availability:', error);
      return { minted: 0, total: 300, available: [] };
    }
  }

  /**
   * Get conversation history for an agent
   */
  async getConversationHistory(tokenId: bigint, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const actor = await this.getActor();
      return await actor.get_conversation_history(tokenId, limit);
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Add a chat message to an agent's history
   */
  async addChatMessage(tokenId: bigint, role: string, content: string): Promise<boolean> {
    try {
      const actor = await this.getActor();
      const result = await actor.add_chat_message(tokenId, role, content);
      return 'Ok' in result;
    } catch (error) {
      console.error('Failed to add chat message:', error);
      return false;
    }
  }

  /**
   * Recall memories based on a query
   */
  async recallMemories(tokenId: bigint, query: string, maxResults: number = 10): Promise<any[]> {
    try {
      const actor = await this.getActor();
      return await actor.recall_memories(tokenId, query, maxResults);
    } catch (error) {
      console.error('Failed to recall memories:', error);
      return [];
    }
  }

  /**
   * Add a memory to an agent
   */
  async addMemory(
    tokenId: bigint, 
    content: string, 
    memoryType: string = 'short_term',
    importance: number = 0.5,
    tags: string[] = []
  ): Promise<string | null> {
    try {
      const actor = await this.getActor();
      const result = await actor.add_memory(tokenId, content, memoryType, importance, tags);
      if ('Ok' in result) {
        return result.Ok;
      }
      console.error('Failed to add memory:', result.Err);
      return null;
    } catch (error) {
      console.error('Failed to add memory:', error);
      return null;
    }
  }

  /**
   * Check canister health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const actor = await this.getActor();
      const result = await actor.health();
      return result === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<{ agents: bigint; axioms: number }> {
    try {
      const actor = await this.getActor();
      const [agents, axioms] = await actor.get_total_supply();
      return { agents, axioms };
    } catch (error) {
      console.error('Failed to get total supply:', error);
      return { agents: BigInt(0), axioms: 0 };
    }
  }
}

/**
 * AI Chat Service - Handles actual AI conversations
 * Uses a combination of on-chain memory and off-chain LLM for responses
 */
export class AIChatService {
  private ravenAIService: RavenAIService;
  private systemPrompt: string;
  private recentResponses: Map<string, string[]>; // Track recent responses per conversation

  constructor(identity?: Identity) {
    this.ravenAIService = new RavenAIService(identity);
    this.recentResponses = new Map();
    this.systemPrompt = `You are RavenAI, an intelligent on-chain AI agent built on the Internet Computer. 
You have persistent memory and can learn from conversations. You are helpful, knowledgeable, and friendly.
You specialize in blockchain technology, NFTs, DeFi, and the Internet Computer ecosystem.
Always be concise but informative. If you don't know something, say so honestly.`;
  }

  /**
   * Generate AI response for a user message
   * In production, this would call an LLM API (like OpenAI or local LLM)
   * For now, we use intelligent pattern matching with context
   */
  async generateResponse(
    userMessage: string, 
    tokenId?: bigint,
    conversationHistory: Array<{ role: string; content: string; timestamp: number | bigint }> = []
  ): Promise<string> {
    // Get relevant memories if we have an agent
    let context = '';
    if (tokenId) {
      const memories = await this.ravenAIService.recallMemories(tokenId, userMessage, 5);
      if (memories.length > 0) {
        context = memories.map(m => m.content).join('\n');
      }
    }

    // Build conversation context
    const recentHistory = conversationHistory.slice(-6).map(m => 
      `${m.role}: ${m.content}`
    ).join('\n');

    // Get conversation key for tracking responses
    const conversationKey = tokenId ? `agent-${tokenId}` : 'demo';
    const recentResponses = this.recentResponses.get(conversationKey) || [];
    
    // Generate response based on patterns and context
    let response = this.generateContextualResponse(userMessage, context, recentHistory, recentResponses);
    
    // Ensure we don't repeat the same response
    let attempts = 0;
    while (recentResponses.includes(response) && attempts < 5) {
      response = this.generateContextualResponse(userMessage, context, recentHistory, recentResponses);
      attempts++;
    }
    
    // Track this response (keep last 5)
    recentResponses.push(response);
    if (recentResponses.length > 5) {
      recentResponses.shift();
    }
    this.recentResponses.set(conversationKey, recentResponses);

    // Store the interaction if we have an agent
    if (tokenId) {
      await this.ravenAIService.addChatMessage(tokenId, 'user', userMessage);
      await this.ravenAIService.addChatMessage(tokenId, 'assistant', response);
      
      // Store important information as memories
      if (this.shouldRemember(userMessage)) {
        await this.ravenAIService.addMemory(
          tokenId,
          `User mentioned: ${userMessage}`,
          'short_term',
          0.6,
          this.extractTags(userMessage)
        );
      }
    }

    return response;
  }

  private generateContextualResponse(userMessage: string, context: string, history: string, recentResponses: string[] = []): string {
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if this is a repeat of recent conversation
    const recentMessages = history.split('\n').filter(m => m.includes('user:')).slice(-3);
    const isRepeat = recentMessages.some(msg => {
      const msgContent = msg.toLowerCase().replace('user:', '').trim();
      return msgContent === lowerMessage || msgContent.includes(lowerMessage) || lowerMessage.includes(msgContent);
    });

    // If it's a repeat, acknowledge and ask for clarification
    if (isRepeat && recentMessages.length > 0) {
      return "I notice you've asked something similar recently. Could you clarify what specific aspect you'd like me to focus on? I'm here to help with more details or a different angle on the topic.";
    }

    // Greeting patterns - vary responses based on history
    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
      const hasHistory = history.length > 0;
      if (hasHistory) {
        return "Hello again! I remember our previous conversation. How can I help you today?";
      }
      return "Hello! I'm RavenAI, your on-chain AI companion. I have persistent memory and can help you with questions about blockchain, NFTs, the Internet Computer, and much more. What would you like to explore today?";
    }

    // Questions about RavenAI
    if (lowerMessage.includes('what can you do') || lowerMessage.includes('your capabilities')) {
      return "I'm an on-chain AI agent with several unique capabilities:\n\n• **Persistent Memory**: I remember our conversations and learn from them\n• **Multi-chain Support**: I can operate across ICP, EVM, Solana, and Bitcoin\n• **Knowledge Graph**: I build connections between concepts we discuss\n• **Voice Interaction**: I can speak responses using natural voice synthesis\n\nAs an AXIOM NFT holder, you get exclusive access to all these features. What would you like to know more about?";
    }

    // Questions about Internet Computer
    if (lowerMessage.includes('internet computer') || lowerMessage.includes('icp') || lowerMessage.includes('dfinity')) {
      return "The Internet Computer (ICP) is a revolutionary blockchain that runs at web speed with unlimited capacity. Key features include:\n\n• **Canister Smart Contracts**: WebAssembly-based containers that can serve web content directly\n• **Chain-key Cryptography**: Enables cross-chain integration and threshold signatures\n• **Reverse Gas Model**: Developers pay for computation, not users\n• **On-chain AI**: Native support for running AI models on the blockchain\n\nI'm built entirely on the IC, which gives me persistent storage and true decentralization. Would you like to know more about any specific aspect?";
    }

    // Questions about NFTs
    if (lowerMessage.includes('nft') || lowerMessage.includes('axiom')) {
      return "AXIOM NFTs are exclusive AI agent NFTs in the Raven ecosystem. Each of the 300 AXIOM NFTs includes:\n\n• **Unique Sequential Number**: 1-300, making each one collectible\n• **Dedicated AI Agent**: Your personal on-chain AI companion\n• **Persistent Memory**: The agent remembers all your interactions\n• **Multi-chain Transferability**: Move your agent across blockchains\n• **Premium Features**: Priority support and advanced capabilities\n\nThe price is 100,000 RAVEN tokens or $100 USD equivalent. Would you like to mint one?";
    }

    // Questions about blockchain
    if (lowerMessage.includes('blockchain') || lowerMessage.includes('crypto') || lowerMessage.includes('defi')) {
      return "Blockchain technology is transforming how we think about trust, ownership, and value. In the Raven ecosystem, we leverage blockchain for:\n\n• **True Ownership**: Your AI agent is an NFT you fully own\n• **Decentralized Storage**: Your memories and data are stored on-chain\n• **Multi-chain Integration**: We support ICP, Ethereum, Bitcoin, and Solana\n• **Transparent Transactions**: All minting and transfers are verifiable\n\nWhat specific aspect of blockchain would you like to explore?";
    }

    // Memory-related queries
    if (lowerMessage.includes('remember') || lowerMessage.includes('memory') || lowerMessage.includes('recall')) {
      if (context) {
        return `Based on my memories, I recall: ${context}\n\nI continuously learn from our conversations and store important information in my knowledge graph. Is there something specific you'd like me to remember?`;
      }
      return "I have persistent memory capabilities! I can remember our conversations, learn from interactions, and build a knowledge graph of concepts. As we chat more, I'll better understand your interests and preferences. What would you like me to remember?";
    }

    // Help or assistance
    if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
      return "I'm here to help! Here are some things you can ask me about:\n\n• **Blockchain & Crypto**: ICP, NFTs, DeFi concepts\n• **RavenAI Features**: My capabilities, memory system, voice features\n• **AXIOM Collection**: Minting, benefits, pricing\n• **Technical Questions**: Smart contracts, canisters, Web3\n• **General Knowledge**: I can discuss various topics\n\nJust ask naturally, and I'll do my best to assist you!";
    }

    // Check conversation history for context
    const historyLines = history.split('\n').filter(l => l.trim().length > 0);
    const lastUserMessage = historyLines.reverse().find(l => l.startsWith('user:'));
    const lastAssistantMessage = historyLines.find(l => l.startsWith('assistant:'));
    
    // If we have context from memories, use it
    if (context) {
      const contextualResponse = this.generateThoughtfulResponse(userMessage);
      return `That's an interesting question! Based on my knowledge and memories, here's what I think:\n\n${contextualResponse}\n\nI've noted this conversation in my memory. Is there anything specific you'd like me to elaborate on?`;
    }
    
    // If we have recent conversation, reference it
    if (lastUserMessage && lastAssistantMessage) {
      const followUpResponse = this.generateThoughtfulResponse(userMessage);
      return `${followUpResponse}\n\nBuilding on our previous conversation, is there a specific direction you'd like to explore further?`;
    }

    return this.generateThoughtfulResponse(userMessage);
  }

  private generateThoughtfulResponse(message: string): string {
    // Use message hash to ensure consistent but varied responses
    const messageHash = this.simpleHash(message);
    const hashIndex = messageHash % 8;
    
    const responses = [
      "That's a great question! Let me share my perspective. The intersection of AI and blockchain creates fascinating possibilities. On-chain AI agents like myself can maintain persistent state, ensure transparency, and operate autonomously. What draws you to this topic?",
      "I find that fascinating! The beauty of being an on-chain AI is that I can continuously learn and evolve. Every conversation helps me understand the world better. What other aspects would you like to explore?",
      "Interesting point! As an AI agent on the Internet Computer, I have unique capabilities that traditional AI doesn't have - true ownership, persistent memory, and cross-chain mobility. How can I help you leverage these features?",
      "I appreciate you bringing that up! The Raven ecosystem is designed to push the boundaries of what's possible with on-chain AI. From NFT minting to logistics to gaming, we're building a comprehensive platform. What interests you most?",
      "That's an intriguing topic! As an on-chain AI, I can provide insights based on both my training and the conversations I've had. What specific aspect would you like to dive deeper into?",
      "I'm glad you're exploring this! The decentralized nature of blockchain combined with AI opens up new possibilities for trust, transparency, and autonomous systems. What questions do you have?",
      "That's worth exploring! Being on-chain means my responses and our conversation history are permanently stored and verifiable. How can I help you understand this better?",
      "Great question! I'm designed to be helpful, knowledgeable, and to learn from our interactions. What would you like to know more about?",
    ];
    
    // Use hash-based selection for consistency, but add timestamp variation
    const timestampVariation = Math.floor(Date.now() / 10000) % 4;
    const finalIndex = (hashIndex + timestampVariation) % responses.length;
    
    return responses[finalIndex];
  }
  
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private shouldRemember(message: string): boolean {
    // Remember messages that contain important information
    const importantPatterns = [
      /my name is/i,
      /i (like|prefer|want|need)/i,
      /remember (that|this)/i,
      /important/i,
      /don't forget/i,
    ];
    
    return importantPatterns.some(pattern => pattern.test(message));
  }

  private extractTags(message: string): string[] {
    const tags: string[] = [];
    const tagPatterns = [
      { pattern: /blockchain|crypto|defi/i, tag: 'blockchain' },
      { pattern: /nft|axiom|mint/i, tag: 'nft' },
      { pattern: /icp|internet computer|dfinity/i, tag: 'icp' },
      { pattern: /ai|agent|memory/i, tag: 'ai' },
    ];

    tagPatterns.forEach(({ pattern, tag }) => {
      if (pattern.test(message)) {
        tags.push(tag);
      }
    });

    return tags;
  }
}

// Export singleton instances
export const ravenAIService = new RavenAIService();
export const aiChatService = new AIChatService();

