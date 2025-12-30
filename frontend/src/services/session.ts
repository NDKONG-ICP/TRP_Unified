import type { Identity, HttpAgent } from '@dfinity/agent';
import { HttpAgent as HttpAgentImpl } from '@dfinity/agent';
import { getICHost, isMainnet } from './canisterConfig';
import { useAuthStore } from '../stores/authStore';
import { useWalletStore } from '../stores/walletStore';
import { ensureInitialized, getAuthenticatedAgent } from '../lib/auth-utils';

/**
 * Canonical session utilities (SPA-wide).
 * 
 * Enhanced with patterns from ic-use-internet-identity:
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 *
 * Goal: all canister calls share the same principal/identity when the user is connected,
 * and we avoid per-service AuthClient.create() patterns that can desync session state.
 */

export function getActiveIdentity(): Identity | null {
  const walletIdentity = useWalletStore.getState().identity;
  if (walletIdentity) return walletIdentity;
  const authIdentity = useAuthStore.getState().identity;
  return authIdentity ?? null;
}

export function getActiveAgent(): HttpAgent | null {
  const walletAgent = useWalletStore.getState().agent;
  if (walletAgent) return walletAgent;
  return null;
}

export async function getOrCreateAgent(identity?: Identity | null): Promise<HttpAgent> {
  // First, try to get agent from the new auth-utils cache
  const cachedAgent = await getAuthenticatedAgent();
  if (cachedAgent) return cachedAgent;
  
  const existing = getActiveAgent();
  if (existing) return existing;

  const agent = new HttpAgentImpl({
    ...(identity ? { identity } : {}),
    host: getICHost(),
  });

  if (!isMainnet()) {
    await agent.fetchRootKey();
  }

  return agent;
}

/**
 * Ensure session is initialized and return auth state.
 * Uses the ensureInitialized pattern from ic-use-internet-identity.
 */
export async function ensureSession(): Promise<{
  isAuthenticated: boolean;
  identity: Identity | null;
  agent: HttpAgent;
}> {
  // Try to restore cached identity first
  const authResult = await ensureInitialized();
  
  const identity = authResult?.identity || getActiveIdentity();
  const agent = await getOrCreateAgent(identity);
  
  return {
    isAuthenticated: !!authResult?.isAuthenticated || !!identity,
    identity,
    agent,
  };
}


