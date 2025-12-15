/**
 * Actor Factory - Creates typed actors for interacting with canisters
 * Uses Plug's createActor when Plug wallet is connected for better integration
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { CANISTER_IDS, getICHost, isMainnet } from './canisterConfig';
import { isPlugAvailable, createPlugActor, getPlugSession } from './plugService';

// Import IDL factories
import { idlFactory as coreIdl, _SERVICE as CoreService } from '../declarations/core';
import { idlFactory as nftIdl, _SERVICE as NFTService } from '../declarations/nft';
import { idlFactory as ravenAiIdl, _SERVICE as RavenAIService } from '../declarations/raven_ai';
import { idlFactory as kipIdl, _SERVICE as KIPService } from '../declarations/kip';
import { idlFactory as treasuryIdl, _SERVICE as TreasuryService } from '../declarations/treasury';
import { idlFactory as escrowIdl, _SERVICE as EscrowService } from '../declarations/escrow';
import { idlFactory as logisticsIdl, _SERVICE as LogisticsService } from '../declarations/logistics';
import { idlFactory as aiEngineIdl, _SERVICE as AIEngineService } from '../declarations/ai_engine';

let cachedAgent: HttpAgent | null = null;

/**
 * Create an HTTP agent for canister calls
 */
export async function createAgent(identity?: Identity): Promise<HttpAgent> {
  const host = getICHost();
  
  const agent = new HttpAgent({
    host,
    identity,
  });

  // Only fetch root key for local development
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }

  return agent;
}

/**
 * Get or create a cached agent
 */
export async function getAgent(identity?: Identity): Promise<HttpAgent> {
  if (!cachedAgent || identity) {
    cachedAgent = await createAgent(identity);
  }
  return cachedAgent;
}

/**
 * Generic actor creation function
 * Uses Plug's createActor when Plug is connected for better integration
 */
export async function createActorWithIdl<T>(
  canisterId: string,
  idlFactory: any,
  identity?: Identity
): Promise<T> {
  // If Plug is available and connected, use Plug's createActor
  // This ensures all canister calls go through Plug's whitelisted agent
  // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/
  if (isPlugAvailable()) {
    try {
      const session = getPlugSession();
      // If we have a Plug session, use Plug's createActor
      if (session.principalId) {
        return await createPlugActor<T>(canisterId, idlFactory);
      }
    } catch (error) {
      // Plug not connected, fall through to standard actor creation
      console.log('Plug not connected, using standard actor creation');
    }
  }
  
  // Standard actor creation for Internet Identity or other wallets
  const agent = await getAgent(identity);
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId,
  });
}

/**
 * Internal actor creation function (for typed actors with declarations)
 */
async function createActor<T>(
  canisterId: string,
  idlFactory: any,
  identity?: Identity
): Promise<T> {
  return createActorWithIdl<T>(canisterId, idlFactory, identity);
}

// Typed actor creation functions

export async function createCoreActor(identity?: Identity): Promise<CoreService> {
  return createActor<CoreService>(CANISTER_IDS.core, coreIdl, identity);
}

export async function createNFTActor(identity?: Identity): Promise<NFTService> {
  return createActor<NFTService>(CANISTER_IDS.nft, nftIdl, identity);
}

export async function createRavenAIActor(identity?: Identity): Promise<RavenAIService> {
  return createActor<RavenAIService>(CANISTER_IDS.raven_ai, ravenAiIdl, identity);
}

export async function createKIPActor(identity?: Identity): Promise<KIPService> {
  return createActor<KIPService>(CANISTER_IDS.kip, kipIdl, identity);
}

export async function createTreasuryActor(identity?: Identity): Promise<TreasuryService> {
  return createActor<TreasuryService>(CANISTER_IDS.treasury, treasuryIdl, identity);
}

export async function createEscrowActor(identity?: Identity): Promise<EscrowService> {
  return createActor<EscrowService>(CANISTER_IDS.escrow, escrowIdl, identity);
}

export async function createLogisticsActor(identity?: Identity): Promise<LogisticsService> {
  return createActor<LogisticsService>(CANISTER_IDS.logistics, logisticsIdl, identity);
}

export async function createAIEngineActor(identity?: Identity): Promise<AIEngineService> {
  return createActor<AIEngineService>(CANISTER_IDS.ai_engine, aiEngineIdl, identity);
}

/**
 * Create actor for multi-chain authentication canisters
 * These use inline IDL factories defined in their respective service files
 */
export async function createMultiChainActor(
  canisterName: 'siwe_canister' | 'siws_canister' | 'siwb_canister' | 'sis_canister' | 'ordinals_canister',
  idlFactory: any,
  identity?: Identity
): Promise<any> {
  const canisterId = CANISTER_IDS[canisterName];
  return createActorWithIdl(canisterId, idlFactory, identity);
}

/**
 * Clear the cached agent (useful when identity changes)
 */
export function clearAgentCache(): void {
  cachedAgent = null;
}

// Re-export types for convenience
export type { CoreService, NFTService, RavenAIService, KIPService, TreasuryService, EscrowService, LogisticsService, AIEngineService };
