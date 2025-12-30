/**
 * Backend AI Service
 * Routes all AI and voice API calls through the backend canister
 * This avoids CORS issues by using HTTP outcalls from the canister
 */

import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';
import { createActorWithIdl } from './actorFactory';
import { idlFactory as ravenAiIdlFactory } from '../declarations/raven_ai';
import type { AICouncilSession, ChatMessage, VoiceSynthesisResponse as RavenVoiceSynthesisResponse } from '../declarations/raven_ai/raven_ai.did';

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
  audioData: Uint8Array;
  contentType: string;
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
    this.actor = await createActorWithIdl(canisterId, ravenAiIdlFactory as any, identity);

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
      // Canister signature: chat: (opt nat64, text, opt text) -> (variant { Ok: text; Err: text })
      const result = await this.actor.chat(
        agentId ? [agentId] : [],
        message,
        [] // system_prompt is optional; companion passes systemPrompt via query_ai_council
      ) as { Ok?: string; Err?: string };

      if (result.Err) {
        throw new Error(result.Err);
      }
      return {
        message: result.Ok ?? '',
        agentId,
        conversationId: conversationId || `c_${Date.now()}`,
        tokensUsed: 0,
      };
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
      const contextMessages: ChatMessage[] = [];
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
      ) as { Ok?: AICouncilSession; Err?: string };

      if (result.Err) {
        // If subscription required, try to start demo automatically
        if (result.Err.includes('subscription')) {
          // Starting free demo subscription
          try {
            await this.actor.start_demo();
            // Retry the query after starting demo
            const retryResult = await this.actor.query_ai_council(
              query,
              systemPrompt ? [systemPrompt] : [],
              contextMessages,
              [] // token_id (optional)
            ) as { Ok?: AICouncilSession; Err?: string };

            if (!retryResult.Err && retryResult.Ok) {
              return this.sessionToCouncilResponse(retryResult.Ok);
            }
          } catch (demoError) {
            // Demo start failed, continuing without demo
          }
        }
        throw new Error(result.Err);
      }

      if (!result.Ok) {
        throw new Error('AI Council returned empty result');
      }
      return this.sessionToCouncilResponse(result.Ok);
    } catch (error: any) {
      console.error('AI Council error:', error);
      // Return fallback
      return this.generateFallbackCouncilResponse(query);
    }
  }

  private sessionToCouncilResponse(session: AICouncilSession): AICouncilResponse {
    const providerResponses: Array<[string, string]> = (session.responses || [])
      .filter((r) => r.success && (!r.error || r.error.length === 0))
      .map((r) => [r.model, r.response]);

    const consensus = session.consensus?.[0];
    if (consensus) {
      return {
        finalResponse: consensus.final_response,
        confidenceScore: consensus.confidence_score,
        providerResponses,
        totalProvidersQueried: session.responses.length,
        successfulProviders: providerResponses.length,
        consensusMethod: consensus.synthesis_method,
      };
    }

    return {
      finalResponse: providerResponses.length > 0 ? providerResponses[0][1] : 'Processing...',
      confidenceScore: 0.5,
      providerResponses,
      totalProvidersQueried: session.responses.length,
      successfulProviders: providerResponses.length,
      consensusMethod: 'direct',
    };
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

      const result = await this.actor.synthesize_voice(request) as { Ok?: RavenVoiceSynthesisResponse; Err?: string };

      if (!result.Err && result.Ok) {
        const bytes = Array.isArray(result.Ok.audio_data)
          ? new Uint8Array(result.Ok.audio_data as number[])
          : new Uint8Array(result.Ok.audio_data as Uint8Array);
        return {
          audioData: bytes,
          contentType: result.Ok.content_type,
        };
      }
      console.error('Voice synthesis error:', result.Err);
      return null;
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

    if (voiceData?.audioData && voiceData.audioData.length > 0) {
      // Convert to a plain ArrayBuffer to avoid TS/dom lib edge-cases around SharedArrayBuffer typing.
      // Force a plain Uint8Array copy so DOM typing doesn't treat it as SharedArrayBuffer-backed.
      const bytes = Uint8Array.from(voiceData.audioData);
      const blob = new Blob([bytes], { type: voiceData.contentType || 'audio/mpeg' });
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
      response = "$HARLEE is our ICRC-1 utility token (100M supply, 8 decimals, ledger: tlm4l-kaaaa-aaaah-qqeha-cai). Earn through: NFT staking (100/week with rarity multipliers up to 3x), Crossword Quest (1/puzzle), gaming, and content tips. Use for AI subscriptions, NFT purchases, governance, and reduced fees.";
    } else if (lowerMessage.includes('wallet') || lowerMessage.includes('connect')) {
      response = "We support Internet Identity, Plug Wallet, and OISY. Click 'Connect' in the header to get started. For the best experience with NFTs, we recommend Plug Wallet.";
    } else if (lowerMessage.includes('stake') || lowerMessage.includes('staking')) {
      response = "Stake Sk8 Punks NFTs for $HARLEE rewards: Common=100/week, Rare=150/week (1.5x), Epic=200/week (2x), Legendary=300/week (3x). That's up to 15,600 $HARLEE/year per Legendary! Go to Sk8 Punks → Staking.";
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

