/**
 * Backend AI Service
 * Routes all AI and voice API calls through the backend canister
 * This avoids CORS issues by using HTTP outcalls from the canister
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';

// IDL Factory for raven_ai canister
const ravenAIIdlFactory = ({ IDL }: { IDL: any }) => {
  const VoiceSynthesisRequest = IDL.Record({
    text: IDL.Text,
    voice_id: IDL.Opt(IDL.Text),
    model_id: IDL.Opt(IDL.Text),
    stability: IDL.Opt(IDL.Float32),
    similarity_boost: IDL.Opt(IDL.Float32),
  });

  const VoiceSynthesisResponse = IDL.Record({
    audio_base64: IDL.Text,
    duration_ms: IDL.Nat64,
    characters_used: IDL.Nat32,
  });

  const ChatMessage = IDL.Record({
    role: IDL.Text,
    content: IDL.Text,
    timestamp: IDL.Nat64,
  });

  const CouncilResponse = IDL.Record({
    llm_name: IDL.Text,
    response: IDL.Text,
    confidence: IDL.Float32,
    tokens_used: IDL.Nat64,
    latency_ms: IDL.Nat64,
    timestamp: IDL.Nat64,
    error: IDL.Opt(IDL.Text),
  });

  const ConsensusResult = IDL.Record({
    final_response: IDL.Text,
    confidence_score: IDL.Float32,
    agreement_level: IDL.Float32,
    key_points: IDL.Vec(IDL.Text),
    dissenting_views: IDL.Vec(IDL.Text),
    synthesis_method: IDL.Text,
  });

  const AICouncilSession = IDL.Record({
    session_id: IDL.Text,
    user: IDL.Principal,
    query: IDL.Text,
    system_prompt: IDL.Opt(IDL.Text),
    context: IDL.Vec(ChatMessage),
    responses: IDL.Vec(CouncilResponse),
    consensus: IDL.Opt(ConsensusResult),
    created_at: IDL.Nat64,
    completed_at: IDL.Opt(IDL.Nat64),
    total_tokens_used: IDL.Nat64,
    total_cost_usd: IDL.Float64,
  });

  const ChatResponse = IDL.Record({
    message: IDL.Text,
    agent_id: IDL.Opt(IDL.Nat64),
    conversation_id: IDL.Text,
    tokens_used: IDL.Nat32,
  });

  return IDL.Service({
    // AI Chat - routes through backend LLMs
    chat: IDL.Func(
      [IDL.Opt(IDL.Nat64), IDL.Text, IDL.Opt(IDL.Text)],
      [IDL.Variant({ Ok: ChatResponse, Err: IDL.Text })],
      []
    ),
    
    // AI Council - queries multiple LLMs via HTTP outcalls
    // Backend signature: (text, opt text, vec ChatMessage, opt nat64) -> (variant { Ok: AICouncilSession; Err: text })
    query_ai_council: IDL.Func(
      [IDL.Text, IDL.Opt(IDL.Text), IDL.Vec(ChatMessage), IDL.Opt(IDL.Nat64)],
      [IDL.Variant({ Ok: AICouncilSession, Err: IDL.Text })],
      []
    ),
    
    // Start 3-day free demo subscription
    start_demo: IDL.Func(
      [],
      [IDL.Variant({ Ok: IDL.Record({
        user: IDL.Principal,
        plan: IDL.Variant({
          Demo: IDL.Null,
          Monthly: IDL.Null,
          Yearly: IDL.Null,
          Lifetime: IDL.Null,
          NFTHolder: IDL.Null,
        }),
        started_at: IDL.Nat64,
        expires_at: IDL.Opt(IDL.Nat64),
        is_active: IDL.Bool,
        payment_history: IDL.Vec(IDL.Text),
      }), Err: IDL.Text })],
      []
    ),
    
    // Voice synthesis - proxied through backend
    synthesize_voice: IDL.Func(
      [VoiceSynthesisRequest],
      [IDL.Variant({ Ok: VoiceSynthesisResponse, Err: IDL.Text })],
      []
    ),
    
    // Subscription status
    check_subscription: IDL.Func(
      [IDL.Principal],
      [IDL.Variant({ Ok: IDL.Record({
        is_active: IDL.Bool,
        plan: IDL.Opt(IDL.Text),
        expires_at: IDL.Opt(IDL.Nat64),
        demo_available: IDL.Bool,
      }), Err: IDL.Text })],
      ['query']
    ),
  });
};

// Response types
export interface ChatResponse {
  message: string;
  agentId?: bigint;
  conversationId: string;
  tokensUsed: number;
}

export interface AICouncilResponse {
  finalResponse: string;
  confidenceScore: number;
  providerResponses: Array<[string, string]>;
  totalProvidersQueried: number;
  successfulProviders: number;
  consensusMethod: string;
}

export interface VoiceSynthesisResponse {
  audioBase64: string;
  durationMs: bigint;
  charactersUsed: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: string;
  expiresAt?: bigint;
  demoAvailable: boolean;
}

/**
 * Backend AI Service - handles all AI operations through the canister
 */
export class BackendAIService {
  private actor: any = null;
  private identity?: Identity;
  private isInitialized = false;

  /**
   * Initialize the service with an identity
   * Works with any connected wallet (Plug, Internet Identity, OISY, etc.)
   */
  async init(identity?: Identity): Promise<void> {
    if (this.isInitialized && this.identity === identity) {
      return;
    }

    this.identity = identity;
    
    // Use actorFactory for proper wallet abstraction (supports Plug, II, OISY, etc.)
    const canisterId = getCanisterId('raven_ai');
    this.actor = await createActorWithIdl(canisterId, ravenAIIdlFactory, identity);

    this.isInitialized = true;
  }

  /**
   * Send a chat message - routed through backend LLMs
   */
  async chat(
    message: string,
    agentId?: bigint,
    conversationId?: string
  ): Promise<ChatResponse> {
    if (!this.actor) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await this.actor.chat(
        agentId ? [agentId] : [],
        message,
        conversationId ? [conversationId] : []
      );

      if ('Ok' in result) {
        return {
          message: result.Ok.message,
          agentId: result.Ok.agent_id?.[0],
          conversationId: result.Ok.conversation_id,
          tokensUsed: Number(result.Ok.tokens_used),
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error: any) {
      console.error('Backend chat error:', error);
      // Return a fallback response if backend fails
      return this.generateFallbackResponse(message, conversationId);
    }
  }

  /**
   * Query the AI Council - routes through all configured LLMs
   */
  async queryAICouncil(
    query: string,
    systemPrompt?: string,
    context?: string
  ): Promise<AICouncilResponse> {
    if (!this.actor) {
      throw new Error('Service not initialized');
    }

    if (!this.identity) {
      throw new Error('Authentication required');
    }

    try {
      // Convert context string to ChatMessage array
      const contextMessages: Array<{ role: string; content: string; timestamp: bigint }> = [];
      if (context) {
        // Parse context string (format: "role: content\nrole: content")
        const lines = context.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const parts = line.split(':').map(p => p.trim());
          if (parts.length >= 2) {
            contextMessages.push({
              role: parts[0],
              content: parts.slice(1).join(':'),
              timestamp: BigInt(Date.now()),
            });
          }
        }
      }

      const result = await this.actor.query_ai_council(
        query,
        systemPrompt ? [systemPrompt] : [],
        contextMessages,
        [] // token_id (optional)
      );

      if ('Ok' in result) {
        const session = result.Ok;
        // Extract consensus data from session
        if (session.consensus) {
          const consensus = session.consensus;
          // Convert CouncilResponse array to tuple array for compatibility
          const providerResponses: Array<[string, string]> = session.responses
            .filter((r: any) => !r.error)
            .map((r: any) => [r.llm_name, r.response]);
          
          return {
            finalResponse: consensus.final_response,
            confidenceScore: consensus.confidence_score,
            providerResponses,
            totalProvidersQueried: session.responses.length,
            successfulProviders: providerResponses.length,
            consensusMethod: consensus.synthesis_method,
          };
        } else {
          // No consensus yet, use responses directly
          const providerResponses: Array<[string, string]> = session.responses
            .filter((r: any) => !r.error)
            .map((r: any) => [r.llm_name, r.response]);
          
          return {
            finalResponse: providerResponses.length > 0 
              ? providerResponses[0][1] 
              : 'Processing...',
            confidenceScore: 0.5,
            providerResponses,
            totalProvidersQueried: session.responses.length,
            successfulProviders: providerResponses.length,
            consensusMethod: 'direct',
          };
        }
      } else {
        // If subscription required, try to start demo automatically
        if (result.Err && result.Err.includes('subscription')) {
          // Starting free demo subscription
          try {
            await this.actor.start_demo();
            // Retry the query after starting demo
            const retryResult = await this.actor.query_ai_council(
              query,
              systemPrompt ? [systemPrompt] : [],
              contextMessages,
              [] // token_id (optional)
            );
            if ('Ok' in retryResult) {
              const session = retryResult.Ok;
              if (session.consensus) {
                const consensus = session.consensus;
                const providerResponses: Array<[string, string]> = session.responses
                  .filter((r: any) => !r.error)
                  .map((r: any) => [r.llm_name, r.response]);
                
                return {
                  finalResponse: consensus.final_response,
                  confidenceScore: consensus.confidence_score,
                  providerResponses,
                  totalProvidersQueried: session.responses.length,
                  successfulProviders: providerResponses.length,
                  consensusMethod: consensus.synthesis_method,
                };
              } else {
                // No consensus, use first successful response
                const providerResponses: Array<[string, string]> = session.responses
                  .filter((r: any) => !r.error)
                  .map((r: any) => [r.llm_name, r.response]);
                
                return {
                  finalResponse: providerResponses.length > 0 ? providerResponses[0][1] : 'Processing...',
                  confidenceScore: 0.5,
                  providerResponses,
                  totalProvidersQueried: session.responses.length,
                  successfulProviders: providerResponses.length,
                  consensusMethod: 'direct',
                };
              }
            }
          } catch (demoError) {
            // Demo start failed, continuing without demo
          }
        }
        throw new Error(result.Err);
      }
    } catch (error: any) {
      console.error('AI Council error:', error);
      // Return fallback
      return this.generateFallbackCouncilResponse(query);
    }
  }

  /**
   * Synthesize voice - proxied through backend to Eleven Labs
   */
  async synthesizeVoice(
    text: string,
    voiceId?: string,
    modelId?: string
  ): Promise<VoiceSynthesisResponse | null> {
    if (!this.actor) {
      throw new Error('Service not initialized');
    }

    if (!this.identity) {
      throw new Error('Authentication required');
    }

    try {
      const request = {
        text,
        voice_id: voiceId ? [voiceId] : [],
        model_id: modelId ? [modelId] : [],
        stability: [0.5],
        similarity_boost: [0.75],
      };

      const result = await this.actor.synthesize_voice(request);

      if ('Ok' in result) {
        return {
          audioBase64: result.Ok.audio_base64,
          durationMs: result.Ok.duration_ms,
          charactersUsed: Number(result.Ok.characters_used),
        };
      } else {
        console.error('Voice synthesis error:', result.Err);
        return null;
      }
    } catch (error: any) {
      console.error('Voice synthesis error:', error);
      return null;
    }
  }

  /**
   * Check subscription status
   */
  async checkSubscription(principal: Principal): Promise<SubscriptionStatus> {
    if (!this.actor) {
      throw new Error('Service not initialized');
    }

    try {
      const result = await this.actor.check_subscription(principal);

      if ('Ok' in result) {
        return {
          isActive: result.Ok.is_active,
          plan: result.Ok.plan?.[0],
          expiresAt: result.Ok.expires_at?.[0],
          demoAvailable: result.Ok.demo_available,
        };
      } else {
        throw new Error(result.Err);
      }
    } catch (error: any) {
      console.error('Subscription check error:', error);
      return {
        isActive: false,
        demoAvailable: true,
      };
    }
  }

  /**
   * Play synthesized voice
   */
  async playVoice(text: string): Promise<void> {
    const voiceData = await this.synthesizeVoice(text);

    if (voiceData?.audioBase64) {
      // Decode base64 and play
      const audioData = atob(voiceData.audioBase64);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
      });
    } else {
      // Fall back to browser TTS
      await this.browserTTS(text);
    }
  }

  /**
   * Browser TTS fallback
   */
  private async browserTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error('Speech synthesis failed'));

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Generate fallback response when backend fails
   */
  private generateFallbackResponse(
    message: string,
    conversationId?: string
  ): ChatResponse {
    const lowerMessage = message.toLowerCase();
    let response = '';

    // Pattern matching for common queries
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      response = "Hello! I'm RavenAI. I can help you with the Raven Ecosystem, AXIOM NFTs, staking, and more. What would you like to know?";
    } else if (lowerMessage.includes('raven') || lowerMessage.includes('ecosystem')) {
      response = "The Raven Ecosystem is a multi-chain platform on the Internet Computer featuring AI agents, NFT minting, gaming, logistics, and RWA integration. Our key products include RavenAI, The Forge, IC SPICY, and Sk8 Punks.";
    } else if (lowerMessage.includes('axiom') || lowerMessage.includes('nft')) {
      response = "AXIOM NFTs are unique AI agents with persistent memory. There are 5 Genesis NFTs (#1-5) with legendary rarity, plus 295 more available. Each AXIOM has specialized knowledge and can learn from conversations.";
    } else if (lowerMessage.includes('harlee') || lowerMessage.includes('token')) {
      response = "$HARLEE is our utility token. You can earn it through staking (100/week per NFT), gaming, and content creation. Use it for subscriptions, NFT purchases, and governance.";
    } else if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
      response = "We support Internet Identity, Plug Wallet, and OISY. Click 'Connect' in the header to get started. For the best experience with NFTs, we recommend Plug Wallet.";
    } else if (lowerMessage.includes('stake') || lowerMessage.includes('staking')) {
      response = "Stake your Sk8 Punks NFTs to earn 100 $HARLEE per week per NFT. Navigate to the Sk8 Punks section and click 'Staking' to get started. Rewards accumulate continuously.";
    } else {
      response = `Thanks for your question about "${message.substring(0, 30)}...". As RavenAI, I can help with our ecosystem, tokens, NFTs, staking, and features. Please ask something specific about the Raven Project!`;
    }

    return {
      message: response,
      conversationId: conversationId || `fallback_${Date.now()}`,
      tokensUsed: 0,
    };
  }

  /**
   * Generate fallback AI Council response
   */
  private generateFallbackCouncilResponse(query: string): AICouncilResponse {
    const fallback = this.generateFallbackResponse(query);

    return {
      finalResponse: fallback.message,
      confidenceScore: 0.7,
      providerResponses: [['LocalFallback', fallback.message]],
      totalProvidersQueried: 1,
      successfulProviders: 1,
      consensusMethod: 'local_fallback',
    };
  }
}

// Singleton instance
export const backendAIService = new BackendAIService();

// React hook
import { useState, useCallback } from 'react';

export function useBackendAI(identity?: Identity) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chat = useCallback(async (message: string, agentId?: bigint) => {
    setIsLoading(true);
    setError(null);

    try {
      await backendAIService.init(identity);
      return await backendAIService.chat(message, agentId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  const queryCouncil = useCallback(async (query: string, context?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await backendAIService.init(identity);
      return await backendAIService.queryAICouncil(query, undefined, context);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [identity]);

  const speak = useCallback(async (text: string) => {
    try {
      await backendAIService.init(identity);
      await backendAIService.playVoice(text);
    } catch (err: any) {
      console.error('Speech error:', err);
      // Silently fail - voice is optional
    }
  }, [identity]);

  return {
    chat,
    queryCouncil,
    speak,
    isLoading,
    error,
  };
}

export default backendAIService;

