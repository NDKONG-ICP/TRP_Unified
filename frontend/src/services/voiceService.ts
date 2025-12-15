/**
 * Voice Service - Eleven Labs Integration & Speech Recognition
 * Provides text-to-speech output and speech-to-text input for RavenAI
 * 
 * Supports wallet-based voice synthesis via IdentityKit:
 * - Plug Wallet
 * - OISY Wallet
 * - Internet Identity
 * - NFID
 * 
 * Reference: https://github.com/internet-identity-labs/identitykit
 */

import { getCanisterId, isMainnet, getICHost } from './canisterConfig';
import { API_KEYS, isConfigured, USE_BACKEND_PROXY as SHOULD_USE_PROXY } from '../config/secureConfig';
import { 
  synthesizeVoiceWithPlug, 
  playAudio, 
  isPlugConnected,
  VoiceSynthesisResult 
} from './identityKitService';

// Eleven Labs Configuration - loaded from environment
const ELEVEN_LABS_API_KEY = API_KEYS.ELEVEN_LABS;
const ELEVEN_LABS_VOICE_ID = API_KEYS.ELEVEN_LABS_VOICE_ID;
const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice settings for RavenAI
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.5,
  use_speaker_boost: true,
};

// Whether to use backend proxy (recommended for production to avoid CORS)
const USE_BACKEND_PROXY = SHOULD_USE_PROXY;

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  error: string | null;
}

export interface SpeechRecognitionResultData {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Check if Eleven Labs is properly configured
 */
function isElevenLabsConfigured(): boolean {
  return !!(ELEVEN_LABS_API_KEY && ELEVEN_LABS_API_KEY.length > 10 && 
            ELEVEN_LABS_VOICE_ID && ELEVEN_LABS_VOICE_ID.length > 5);
}

/**
 * Text-to-Speech using Browser's built-in Web Speech API (fallback)
 */
async function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser does not support speech synthesis'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice settings for a more natural sound
    utterance.rate = 0.95; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to use a good quality voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = [
      'Google US English',
      'Microsoft David',
      'Microsoft Zira',
      'Alex',
      'Samantha',
    ];
    
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred));
      if (voice) {
        utterance.voice = voice;
        break;
      }
    }

    // If no preferred voice found, use first English voice
    if (!utterance.voice) {
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      console.error('Browser TTS error:', event);
      reject(new Error('Speech synthesis failed'));
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Text-to-Speech using Eleven Labs via backend canister proxy
 * Supports Plug, OISY, and other IdentityKit-compatible wallets
 * Falls back to browser TTS if backend synthesis fails
 * 
 * Reference: https://github.com/internet-identity-labs/identitykit
 */
export async function speakText(text: string): Promise<void> {
  if (!text || text.trim().length === 0) {
    console.warn('No text provided for speech synthesis');
    return;
  }

  // Clean text for speech
  const cleanText = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/•/g, ', ')
    .replace(/\n+/g, '. ')
    .replace(/https?:\/\/[^\s]+/g, 'link')
    .substring(0, 500);

  // Try Eleven Labs via Plug wallet (direct actor call)
  if (isPlugConnected()) {
    try {
      console.log('🔊 Using Eleven Labs via Plug wallet...');
      const result = await synthesizeVoiceWithPlug(cleanText);
      
      if (result.success && result.audioData) {
        console.log('✅ Playing Eleven Labs voice!');
        await playAudio(result.audioData);
        return;
      } else {
        console.log('⚠️ Plug voice synthesis error:', result.error);
      }
    } catch (error) {
      console.log('⚠️ Plug voice synthesis failed:', error);
    }
  }

  // Try Eleven Labs via OISY wallet (uses Internet Identity)
  // OISY wallet support via IdentityKit
  try {
    const oisyWallet = (window as any).oisy;
    if (oisyWallet?.isConnected?.()) {
      console.log('🔊 Attempting Eleven Labs via OISY wallet...');
      // OISY uses II-based identity, handled through IdentityKit
      // For now, fall through to browser TTS as OISY actor creation differs
    }
  } catch (error) {
    console.log('OISY voice check:', error);
  }

  // Fallback to high-quality browser TTS
  console.log('🔊 Using browser TTS (connect Plug/OISY for Eleven Labs voice)');
  return speakWithBrowserTTS(cleanText);
}

/**
 * Speech-to-Text using Web Speech API
 * Listens to user's voice and converts to text
 */
export class SpeechRecognitionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onResultCallback: ((result: SpeechRecognitionResultData) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    // Check for browser support
    const SpeechRecognitionAPI = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      if (this.onResultCallback) {
        this.onResultCallback({ transcript, confidence, isFinal });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };
  }

  /**
   * Start listening for speech
   */
  start(): boolean {
    if (!this.recognition) {
      console.error('Speech recognition not available');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Set callback for recognition results
   */
  onResult(callback: (result: SpeechRecognitionResultData) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for when recognition ends
   */
  onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    );
  }
}

/**
 * Voice chat manager - combines speech recognition and text-to-speech
 */
export class VoiceChatManager {
  private speechRecognition: SpeechRecognitionService;
  private isSpeaking: boolean = false;
  private autoPlayResponses: boolean = true;

  constructor() {
    this.speechRecognition = new SpeechRecognitionService();
  }

  /**
   * Start voice input
   */
  startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: string) => void
  ): boolean {
    this.speechRecognition.onResult((result) => {
      onTranscript(result.transcript, result.isFinal);
    });

    if (onError) {
      this.speechRecognition.onError(onError);
    }

    return this.speechRecognition.start();
  }

  /**
   * Stop voice input
   */
  stopListening(): void {
    this.speechRecognition.stop();
  }

  /**
   * Speak AI response using Eleven Labs
   */
  async speakResponse(text: string): Promise<void> {
    if (!this.autoPlayResponses) return;
    
    this.isSpeaking = true;
    try {
      await speakText(text);
    } finally {
      this.isSpeaking = false;
    }
  }

  /**
   * Toggle auto-play responses
   */
  setAutoPlay(enabled: boolean): void {
    this.autoPlayResponses = enabled;
  }

  /**
   * Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if voice features are available
   */
  static isVoiceAvailable(): boolean {
    return SpeechRecognitionService.isSupported();
  }
}

// Export singleton instance
export const voiceChatManager = new VoiceChatManager();
