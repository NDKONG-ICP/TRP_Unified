/**
 * Helper function to create actors for multi-chain authentication canisters
 * Uses actorFactory for Plug wallet support
 */

import { createMultiChainActor } from '../actorFactory';

/**
 * Create an actor for a multi-chain authentication canister
 */
export async function createAuthActor(
  canisterName: 'siwe_canister' | 'siws_canister' | 'siwb_canister' | 'sis_canister',
  idlFactory: any
): Promise<any> {
  return createMultiChainActor(canisterName, idlFactory);
}

