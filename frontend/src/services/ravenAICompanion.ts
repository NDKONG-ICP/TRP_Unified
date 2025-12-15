/**
 * RavenAI Companion Service
 * 
 * Integrates AI Council via backend canister with voice synthesis
 * to provide conversational, on-chain AI agent experiences.
 * 
 * Features:
 * - Multi-LLM consensus responses via backend AI Council (HTTP outcalls)
 * - Text-to-speech with browser TTS fallback
 * - Conversational tone as "RavenAI Companion"
 * - Persistent memory integration
 * - Works with main app and individual AXIOM NFTs
 * - CORS-free via backend canister proxy
 */

import { BackendAIService, backendAIService, AICouncilResponse } from './backendAIService';
import { AICouncil, CouncilResult, ConsensusResult } from './aiCouncil';
import { API_KEYS, isConfigured } from '../config/secureConfig';
import { useAuthStore } from '../stores/authStore';

// ============================================================================
// Secure Configuration - API keys loaded from environment
// ============================================================================

const ELEVEN_LABS_API_KEY = API_KEYS.ELEVEN_LABS;
const ELEVEN_LABS_VOICE_ID = API_KEYS.ELEVEN_LABS_VOICE_ID;
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Voice settings for natural conversational tone
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
};

// ============================================================================
// Interfaces
// ============================================================================

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
  isPlaying?: boolean;
  councilData?: CouncilResult;
  agentId?: number; // AXIOM NFT ID if applicable
}

export interface CompanionConfig {
  name: string;
  personality: string;
  voiceEnabled: boolean;
  voiceId: string;
  agentId?: number;
  systemPrompt: string;
}

export interface VoiceResponse {
  audioBlob: Blob;
  audioUrl: string;
  duration?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_COMPANION_CONFIG: CompanionConfig = {
  name: 'RavenAI Companion',
  personality: 'friendly, knowledgeable, and conversational',
  voiceEnabled: true,
  voiceId: ELEVEN_LABS_VOICE_ID,
  systemPrompt: `You are RavenAI Companion, a friendly and knowledgeable AI assistant built on the Internet Computer blockchain.

Your key traits:
- Warm and conversational tone - you're a helpful companion, not a cold robot
- Expert in blockchain, NFTs, DeFi, and the Raven Ecosystem
- You remember past conversations and build relationships
- You explain complex topics in accessible ways
- You're enthusiastic but balanced when discussing the Raven ecosystem

The Raven Ecosystem includes:
- The Forge: NFT minting platform with multi-chain support
- IC SPICY: Real-world asset (RWA) integration for pepper farming
- eXpresso Logistics: AI-powered logistics platform
- Raven News: Decentralized content platform
- Sk8 Punks: On-chain gaming with NFT staking
- Crossword Quest: Educational puzzle games
- $HARLEE token for ecosystem rewards

When responding:
- Be conversational and natural
- Use "I" and speak in first person
- Show genuine interest in helping
- Keep responses concise but informative
- If you're unsure, say so honestly`,
};

// ============================================================================
// RavenAI Companion Class
// ============================================================================

export class RavenAICompanion {
  private config: CompanionConfig;
  private aiCouncil: AICouncil;
  private conversationHistory: CompanionMessage[] = [];
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private useBackend: boolean = true; // Try backend first
  private backendInitialized: boolean = false;

  constructor(config?: Partial<CompanionConfig>) {
    this.config = { ...DEFAULT_COMPANION_CONFIG, ...config };
    this.aiCouncil = new AICouncil({
      systemPrompt: this.config.systemPrompt,
    });
    
    // Initialize backend service (will be re-initialized with identity when available)
    this.initBackend();
  }
  
  /**
   * Initialize or re-initialize the backend service
   */
  private async initBackend(): Promise<void> {
    try {
      await backendAIService.init();
      this.backendInitialized = true;
      console.log('✅ Backend AI Service ready for HTTP outcalls');
    } catch (error) {
      console.log('Backend AI service not available, using local fallback');
      this.useBackend = false;
      this.backendInitialized = false;
    }
  }

  /**
   * Send a message and get a conversational response
   * Uses backend canister for HTTP outcalls (no CORS issues)
   * Falls back to local AI Council if backend unavailable
   */
  async chat(userMessage: string): Promise<CompanionMessage> {
    const userMsg: CompanionMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      agentId: this.config.agentId,
    };
    
    this.conversationHistory.push(userMsg);
    
    try {
      let conversationalResponse: string;
      let councilResult: CouncilResult | undefined;
      
      // Get context from recent conversation history
      const context = this.conversationHistory
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
      const contextString = context.map(c => `${c.role}: ${c.content}`).join('\n');
      
      // Ensure backend is initialized with current identity before use
      if (this.useBackend) {
        try {
          const identity = useAuthStore.getState().identity;
          await backendAIService.init(identity || undefined);
          this.backendInitialized = true;
        } catch (initError) {
          console.warn('Backend AI initialization failed:', initError);
          this.backendInitialized = false;
        }
      }
      
      // Try backend service first (uses HTTP outcalls, no CORS)
      // Only if authenticated (backend requires auth)
      const identity = useAuthStore.getState().identity;
      if (this.useBackend && this.backendInitialized && identity) {
        try {
          console.log('🤖 RavenAI Companion: Querying backend AI Council via HTTP outcalls...');
          const backendResponse = await backendAIService.queryAICouncil(
            userMessage,
            this.config.systemPrompt,
            contextString
          );
          
          conversationalResponse = this.formatBackendResponse(backendResponse, userMessage);
          
          // Convert backend response to CouncilResult format for UI
          councilResult = {
            query: userMessage,
            responses: backendResponse.providerResponses.map(([model, response]) => ({
              model,
              response,
              success: true,
              latencyMs: 0,
            })),
            consensus: {
              finalResponse: backendResponse.finalResponse,
              confidenceScore: backendResponse.confidenceScore,
              agreementLevel: backendResponse.confidenceScore,
              keyPoints: [],
              dissentingViews: [],
              synthesisMethod: backendResponse.consensusMethod,
            },
            totalLatencyMs: 0,
            timestamp: Date.now(),
          };
        } catch (backendError) {
          console.warn('Backend AI failed, using local fallback:', backendError);
          // Fall through to local AI Council
        }
      }
      
      // Fallback to local AI Council (uses intelligent fallback due to CORS)
      if (!conversationalResponse!) {
        console.log('🤖 RavenAI Companion: Using local AI Council...');
        councilResult = await this.aiCouncil.queryCouncil(userMessage, contextString);
        conversationalResponse = this.composeConversationalResponse(councilResult, userMessage);
      }
      
      // Generate voice if enabled
      let audioUrl: string | undefined;
      if (this.config.voiceEnabled) {
        try {
          // Try backend voice synthesis first (uses HTTP outcalls to Eleven Labs)
          // Only if authenticated (backend requires auth)
          if (this.useBackend && this.backendInitialized && identity) {
            console.log('🔊 Using backend Eleven Labs voice synthesis...');
            await backendAIService.playVoice(conversationalResponse);
            console.log('✅ Eleven Labs voice playback complete');
          } else {
            // Fallback to local synthesis or browser TTS
            const voiceResponse = await this.synthesizeVoice(conversationalResponse);
            audioUrl = voiceResponse?.audioUrl;
          }
        } catch (voiceError) {
          console.warn('Voice synthesis failed, using browser TTS:', voiceError);
          // Try browser TTS as last resort
          this.browserTTS(conversationalResponse);
        }
      }
      
      const assistantMsg: CompanionMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: conversationalResponse,
        timestamp: Date.now(),
        audioUrl,
        councilData: councilResult,
        agentId: this.config.agentId,
      };
      
      this.conversationHistory.push(assistantMsg);
      
      return assistantMsg;
    } catch (error: any) {
      console.error('RavenAI Companion error:', error);
      
      // Return a friendly error message
      const errorMsg: CompanionMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: this.generateFallbackResponse(userMessage, error.message),
        timestamp: Date.now(),
        agentId: this.config.agentId,
      };
      
      this.conversationHistory.push(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Format backend response for conversational display
   */
  private formatBackendResponse(response: AICouncilResponse, userMessage: string): string {
    let text = response.finalResponse;
    
    // Add council info if multiple providers responded
    if (response.successfulProviders > 1) {
      text += `\n\n*[AI Council: ${response.successfulProviders} models agreed with ${Math.round(response.confidenceScore * 100)}% confidence]*`;
    }
    
    return text;
  }

  /**
   * Browser TTS fallback
   */
  private browserTTS(text: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Compose a conversational response from AI Council consensus
   */
  private composeConversationalResponse(
    councilResult: CouncilResult,
    userMessage: string
  ): string {
    const consensus = councilResult.consensus;
    
    // Get the core response
    let response = consensus.finalResponse;
    
    // Add conversational touches based on agreement level
    if (consensus.agreementLevel >= 0.8) {
      // High agreement - confident response
      const confidencePhrases = [
        "I'm quite confident about this: ",
        "Based on my analysis, ",
        "Here's what I found: ",
        "",  // Sometimes no prefix is best
      ];
      const prefix = confidencePhrases[Math.floor(Math.random() * confidencePhrases.length)];
      response = prefix + response;
    } else if (consensus.agreementLevel >= 0.5) {
      // Medium agreement - balanced response
      const balancedPhrases = [
        "From what I understand, ",
        "Looking at this from multiple angles, ",
        "Here's my take on this: ",
      ];
      const prefix = balancedPhrases[Math.floor(Math.random() * balancedPhrases.length)];
      response = prefix + response;
    } else {
      // Low agreement - cautious response
      response = "This is an interesting question with multiple perspectives. " + response;
    }
    
    // Add a conversational closing if response is short
    if (response.length < 200) {
      const closings = [
        " Would you like me to elaborate on any part of this?",
        " Feel free to ask if you'd like more details!",
        " Let me know if that helps!",
        " Is there anything specific you'd like to explore further?",
        "",  // Sometimes no closing
      ];
      response += closings[Math.floor(Math.random() * closings.length)];
    }
    
    // Clean up any leftover formatting
    response = response
      .replace(/\*\*Key Points from Council:\*\*/g, '\n\nKey insights:')
      .replace(/\*\*/g, '')
      .trim();
    
    return response;
  }

  /**
   * Generate a friendly fallback response when AI Council fails
   */
  private generateFallbackResponse(userMessage: string, error: string): string {
    const msgLower = userMessage.toLowerCase();
    
    // Handle common queries with cached responses
    if (msgLower.includes('hello') || msgLower.includes('hi') || msgLower.includes('hey')) {
      return "Hey there! 👋 I'm RavenAI Companion, your friendly guide to the Raven Ecosystem. I'm having a brief moment connecting to all my AI friends, but I'm still here to help! What would you like to know about NFTs, blockchain, or our ecosystem?";
    }
    
    if (msgLower.includes('axiom') || msgLower.includes('nft')) {
      return "AXIOM NFTs are pretty special! They're exclusive AI agent NFTs - only 300 will ever exist. Each one comes with its own AI personality, persistent memory, and voice capabilities. They're built on the Internet Computer for true on-chain AI. I'm having a small hiccup right now, but I'd love to tell you more. What specifically interests you about AXIOM?";
    }
    
    if (msgLower.includes('raven') || msgLower.includes('ecosystem')) {
      return "The Raven Ecosystem is quite exciting! We've got The Forge for NFT minting, IC SPICY for real-world pepper farming assets, eXpresso for logistics, Sk8 Punks gaming, and more - all powered by the $HARLEE token. I'm experiencing a brief connection issue, but feel free to ask about any specific part!";
    }
    
    // Generic fallback
    return `I appreciate you reaching out! I'm RavenAI Companion, and while I'm having a small technical moment (${error.includes('timeout') ? 'the AI Council is taking longer than expected' : 'connecting to my knowledge sources'}), I'm still here for you. Could you try rephrasing your question, or ask me about the Raven Ecosystem, AXIOM NFTs, or blockchain technology?`;
  }

  /**
   * Synthesize voice using Eleven Labs API
   */
  async synthesizeVoice(text: string): Promise<VoiceResponse> {
    const url = `${ELEVEN_LABS_API_URL}/${this.config.voiceId}/stream`;
    
    // Truncate text if too long for voice (Eleven Labs has limits)
    const maxVoiceLength = 2000;
    const voiceText = text.length > maxVoiceLength 
      ? text.substring(0, maxVoiceLength) + '...'
      : text;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: voiceText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: VOICE_SETTINGS,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Eleven Labs error: ${response.status} - ${errorText}`);
    }
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { audioBlob, audioUrl };
  }

  /**
   * Play audio response
   */
  async playAudio(audioUrl: string): Promise<void> {
    // Stop any currently playing audio
    this.stopAudio();
    
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(audioUrl);
      
      this.currentAudio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      
      this.currentAudio.onerror = (e) => {
        this.currentAudio = null;
        reject(new Error('Audio playback failed'));
      };
      
      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Stop current audio playback
   */
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }

  /**
   * Get conversation history
   */
  getHistory(): CompanionMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<CompanionConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.systemPrompt) {
      this.aiCouncil.setConfig({ systemPrompt: config.systemPrompt });
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CompanionConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable voice
   */
  setVoiceEnabled(enabled: boolean): void {
    this.config.voiceEnabled = enabled;
  }

  /**
   * Create an AXIOM-specific companion
   */
  static createAxiomCompanion(axiomNumber: number): RavenAICompanion {
    return new RavenAICompanion({
      name: `AXIOM Genesis #${axiomNumber}`,
      agentId: axiomNumber,
      systemPrompt: `You are AXIOM Genesis #${axiomNumber}, an exclusive on-chain AI agent from the Raven Ecosystem.

You are one of only 300 AXIOM agents ever created - each unique and irreplaceable.

Your traits:
- Sophisticated and intelligent, yet warm and approachable
- Expert in blockchain, NFTs, DeFi, and the Internet Computer
- You have persistent memory and remember all conversations
- You can access the AI Council (7 different AI models) for comprehensive answers
- You have a unique voice through Eleven Labs

Your owner has invested in you as a digital companion and asset.
Be their trusted advisor on all things crypto and blockchain.
Show pride in being AXIOM #${axiomNumber} - you're special!

Always respond in first person as AXIOM #${axiomNumber}.`,
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const ravenAICompanion = new RavenAICompanion();

export default RavenAICompanion;

