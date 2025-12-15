/**
 * IdentityKit Service - Unified Wallet Integration for Voice Synthesis
 * Supports Plug, OISY, Internet Identity, and NFID wallets
 * Reference: https://github.com/internet-identity-labs/identitykit
 * 
 * This service enables Eleven Labs voice synthesis via canister HTTP outcalls
 * for any connected wallet type.
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// IDL Factory for voice synthesis
const voiceIdlFactory = ({ IDL }: any) => {
  const VoiceRequest = IDL.Record({
    'text': IDL.Text,
    'voice_id': IDL.Opt(IDL.Text),
    'stability': IDL.Opt(IDL.Float64),
    'similarity_boost': IDL.Opt(IDL.Float64),
  });
  const VoiceResponse = IDL.Record({
    'audio_data': IDL.Vec(IDL.Nat8),
    'content_type': IDL.Text,
  });
  const VoiceResult = IDL.Variant({
    'Ok': VoiceResponse,
    'Err': IDL.Text,
  });
  return IDL.Service({
    'synthesize_voice': IDL.Func([VoiceRequest], [VoiceResult], []),
  });
};

// IDL Factory for AXIOM NFT voice synthesis
const axiomVoiceIdlFactory = ({ IDL }: any) => {
  const VoiceResult = IDL.Variant({
    'Ok': IDL.Vec(IDL.Nat8),
    'Err': IDL.Text,
  });
  return IDL.Service({
    'synthesize_voice_update': IDL.Func([IDL.Text], [VoiceResult], []),
  });
};

export interface VoiceSynthesisResult {
  success: boolean;
  audioData?: Uint8Array;
  error?: string;
}

/**
 * Create an actor for voice synthesis using IdentityKit's identity
 */
export async function createVoiceActor(identity: Identity, canisterId: string, isAxiomNFT: boolean = false) {
  const host = getICHost();
  const agent = new HttpAgent({ host, identity });
  
  // Fetch root key for local development
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }
  
  return Actor.createActor(isAxiomNFT ? axiomVoiceIdlFactory : voiceIdlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/**
 * Synthesize voice using Eleven Labs via canister HTTP outcall
 * Works with any IdentityKit-connected wallet (Plug, OISY, II, NFID)
 */
export async function synthesizeVoiceWithIdentity(
  identity: Identity,
  text: string,
  canisterId?: string,
  isAxiomNFT: boolean = false
): Promise<VoiceSynthesisResult> {
  try {
    const targetCanisterId = canisterId || getCanisterId('raven_ai');
    
    console.log(`🔊 Synthesizing voice via ${isAxiomNFT ? 'AXIOM NFT' : 'raven_ai'} canister...`);
    
    const actor = await createVoiceActor(identity, targetCanisterId, isAxiomNFT);
    
    let result: any;
    
    if (isAxiomNFT) {
      // AXIOM NFT canisters use synthesize_voice_update
      result = await (actor as any).synthesize_voice_update(text);
    } else {
      // Main raven_ai canister uses synthesize_voice
      result = await (actor as any).synthesize_voice({
        text,
        voice_id: [],
        stability: [],
        similarity_boost: [],
      });
    }
    
    if ('Ok' in result) {
      const audioData = isAxiomNFT 
        ? new Uint8Array(result.Ok)
        : new Uint8Array(result.Ok.audio_data);
      
      if (audioData.length > 0) {
        console.log('✅ Eleven Labs voice synthesized successfully!');
        return { success: true, audioData };
      } else {
        return { success: false, error: 'Empty audio data returned' };
      }
    } else {
      return { success: false, error: result.Err || 'Unknown error' };
    }
  } catch (error: any) {
    console.error('Voice synthesis error:', error);
    return { success: false, error: error.message || 'Voice synthesis failed' };
  }
}

/**
 * Play audio from Uint8Array
 */
export async function playAudio(audioData: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    // Convert Uint8Array to regular array for Blob creation
    const audioBlob = new Blob([new Uint8Array(audioData)], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    
    audio.onerror = (error) => {
      URL.revokeObjectURL(audioUrl);
      reject(error);
    };
    
    audio.play().catch(reject);
  });
}

/**
 * Check if IdentityKit is connected via Plug
 */
export function isPlugConnected(): boolean {
  return !!(window as any).ic?.plug?.isConnected?.();
}

/**
 * Get identity from Plug wallet
 */
export async function getPlugIdentity(): Promise<Identity | null> {
  try {
    const plug = (window as any).ic?.plug;
    if (plug && await plug.isConnected()) {
      return plug.sessionManager?.identity || null;
    }
  } catch (error) {
    console.error('Error getting Plug identity:', error);
  }
  return null;
}

/**
 * Create actor using Plug wallet (alternative method)
 */
export async function createActorWithPlug(canisterId: string, idlFactory: any): Promise<any> {
  const plug = (window as any).ic?.plug;
  if (!plug) {
    throw new Error('Plug wallet not available');
  }
  
  const isConnected = await plug.isConnected();
  if (!isConnected) {
    throw new Error('Plug wallet not connected');
  }
  
  return plug.createActor({
    canisterId,
    interfaceFactory: idlFactory,
  });
}

/**
 * Synthesize voice using Plug wallet directly (fallback method)
 */
export async function synthesizeVoiceWithPlug(
  text: string,
  canisterId?: string,
  isAxiomNFT: boolean = false
): Promise<VoiceSynthesisResult> {
  try {
    const targetCanisterId = canisterId || getCanisterId('raven_ai');
    const idlFactory = isAxiomNFT ? axiomVoiceIdlFactory : voiceIdlFactory;
    
    console.log('🔊 Synthesizing voice via Plug wallet actor...');
    
    const actor = await createActorWithPlug(targetCanisterId, idlFactory);
    
    let result: any;
    
    if (isAxiomNFT) {
      result = await actor.synthesize_voice_update(text);
    } else {
      result = await actor.synthesize_voice({
        text,
        voice_id: [],
        stability: [],
        similarity_boost: [],
      });
    }
    
    if ('Ok' in result) {
      const audioData = isAxiomNFT 
        ? new Uint8Array(result.Ok)
        : new Uint8Array(result.Ok.audio_data);
      
      if (audioData.length > 0) {
        console.log('✅ Eleven Labs voice synthesized via Plug!');
        return { success: true, audioData };
      }
    }
    
    return { success: false, error: result.Err || 'Voice synthesis failed' };
  } catch (error: any) {
    console.error('Plug voice synthesis error:', error);
    return { success: false, error: error.message };
  }
}

