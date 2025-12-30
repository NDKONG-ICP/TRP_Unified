/**
 * Pre-configured Actor Hooks for Raven Ecosystem
 * 
 * Inspired by ic-use-actor pattern from:
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 * 
 * Usage:
 * ```ts
 * const { actor, isInitialized } = useRavenAI();
 * if (actor) {
 *   const result = await actor.chat([], "Hello", []);
 * }
 * ```
 */

import { createActorHook } from '../lib/actor-hooks';
import { CANISTER_IDS } from '../services/canisterConfig';

// Import IDL factories from index files
import { idlFactory as ravenAiIdl } from '../declarations/raven_ai';
import { idlFactory as kipIdl } from '../declarations/kip';
import { idlFactory as treasuryIdl } from '../declarations/treasury';
import { idlFactory as stakingIdl } from '../declarations/staking';
import { idlFactory as logisticsIdl } from '../declarations/logistics';
import { idlFactory as queenBeeIdl } from '../declarations/queen_bee';
import { idlFactory as nftIdl } from '../declarations/nft';
import { idlFactory as coreIdl } from '../declarations/core';
import { idlFactory as axiomNftIdl } from '../declarations/axiom_nft';

// Import service types from .did.d.ts files
import type { _SERVICE as RavenAIService } from '../declarations/raven_ai/raven_ai.did';
import type { _SERVICE as KIPService } from '../declarations/kip/kip.did';
import type { _SERVICE as TreasuryService } from '../declarations/treasury/treasury.did';
import type { _SERVICE as StakingService } from '../declarations/staking/staking.did';
import type { _SERVICE as LogisticsService } from '../declarations/logistics/logistics.did';
import type { _SERVICE as QueenBeeService } from '../declarations/queen_bee/queen_bee.did';
import type { _SERVICE as NFTService } from '../declarations/nft/nft.did';
import type { _SERVICE as CoreService } from '../declarations/core/core.did';
import type { _SERVICE as AxiomNFTService } from '../declarations/axiom_nft/axiom_nft.did';

// ============================================================================
// RavenAI Actor Hook
// ============================================================================

/**
 * Hook for interacting with the RavenAI canister.
 * Provides AI council, voice synthesis, article generation, and more.
 */
export const useRavenAI = createActorHook<RavenAIService>({
  canisterId: CANISTER_IDS.raven_ai,
  idlFactory: ravenAiIdl,
});

// ============================================================================
// KIP (Knowledge Identity Protocol) Actor Hook
// ============================================================================

/**
 * Hook for interacting with the KIP canister.
 * Handles user profiles, wallet linking, and document verification.
 */
export const useKIP = createActorHook<KIPService>({
  canisterId: CANISTER_IDS.kip,
  idlFactory: kipIdl,
});

// ============================================================================
// Treasury Actor Hook
// ============================================================================

/**
 * Hook for interacting with the Treasury canister.
 * Manages token balances, transactions, and fee distribution.
 */
export const useTreasury = createActorHook<TreasuryService>({
  canisterId: CANISTER_IDS.treasury,
  idlFactory: treasuryIdl,
});

// ============================================================================
// Staking Actor Hook
// ============================================================================

/**
 * Hook for interacting with the Staking canister.
 * Handles Sk8 Punks NFT staking and HARLEE rewards.
 */
export const useStaking = createActorHook<StakingService>({
  canisterId: CANISTER_IDS.staking,
  idlFactory: stakingIdl,
});

// ============================================================================
// Logistics Actor Hook
// ============================================================================

/**
 * Hook for interacting with the Logistics canister.
 * Manages Expresso Logistics loads, shipments, and tracking.
 */
export const useLogistics = createActorHook<LogisticsService>({
  canisterId: CANISTER_IDS.logistics,
  idlFactory: logisticsIdl,
});

// ============================================================================
// Queen Bee Actor Hook
// ============================================================================

/**
 * Hook for interacting with the Queen Bee canister.
 * Orchestrates AI requests across multiple models.
 */
export const useQueenBee = createActorHook<QueenBeeService>({
  canisterId: CANISTER_IDS.queen_bee,
  idlFactory: queenBeeIdl,
});

// ============================================================================
// NFT Actor Hook
// ============================================================================

/**
 * Hook for interacting with the NFT canister.
 * Handles NFT minting, transfers, and metadata.
 */
export const useNFT = createActorHook<NFTService>({
  canisterId: CANISTER_IDS.nft,
  idlFactory: nftIdl,
});

// ============================================================================
// Core Actor Hook
// ============================================================================

/**
 * Hook for interacting with the Core canister.
 * Central registry and configuration.
 */
export const useCore = createActorHook<CoreService>({
  canisterId: CANISTER_IDS.core,
  idlFactory: coreIdl,
});

// ============================================================================
// AXIOM NFT Actor Hook
// ============================================================================

/**
 * Hook for interacting with the AXIOM NFT canister.
 * Manages AXIOM Genesis NFT collection.
 */
export const useAxiomNFT = createActorHook<AxiomNFTService>({
  canisterId: CANISTER_IDS.axiom_nft,
  idlFactory: axiomNftIdl,
});

// ============================================================================
// Re-export batch operations
// ============================================================================

export { 
  ensureAllInitialized, 
  authenticateAll, 
  clearAll 
} from '../lib/actor-hooks';

