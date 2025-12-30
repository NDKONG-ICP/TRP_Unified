/**
 * Demo Authentication Service
 * 
 * Creates an ephemeral Ed25519 identity from a localStorage UUID for demo mode.
 * This allows unauthenticated users to try RavenAI with rate-limited access.
 * 
 * The identity is deterministic based on the browser's demo session UUID,
 * allowing the backend to track demo usage per "device".
 */

import { Ed25519KeyIdentity } from '@dfinity/identity';
import { HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getICHost, isMainnet, getCanisterId } from './canisterConfig';

// Demo configuration
const DEMO_UUID_KEY = 'raven_demo_uuid';
const DEMO_COUNT_KEY = 'raven_demo_count';
const DEMO_RESET_KEY = 'raven_demo_reset_time';
const DEMO_MESSAGE_LIMIT = 5;
const DEMO_RESET_HOURS = 24;

export interface DemoSession {
  identity: Identity;
  principal: Principal;
  agent: HttpAgent;
  messagesUsed: number;
  messagesRemaining: number;
  isLimitReached: boolean;
  resetTime: number | null;
}

/**
 * Generate or retrieve a stable UUID for this demo session
 */
function getDemoUUID(): string {
  if (typeof window === 'undefined') {
    return 'demo-' + Date.now().toString(36);
  }
  
  let uuid = localStorage.getItem(DEMO_UUID_KEY);
  if (!uuid) {
    // Generate a new UUID
    uuid = 'demo-' + crypto.randomUUID();
    localStorage.setItem(DEMO_UUID_KEY, uuid);
  }
  return uuid;
}

/**
 * Convert a UUID string to a 32-byte seed for Ed25519
 */
function uuidToSeed(uuid: string): Uint8Array {
  // Use a simple hash-like approach to create a deterministic 32-byte seed
  const encoder = new TextEncoder();
  const data = encoder.encode(uuid + '_raven_demo_seed_v1');
  
  // Create a 32-byte array by repeating/cycling the data
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = data[i % data.length] ^ (i * 7);
  }
  
  return seed;
}

/**
 * Create an ephemeral Ed25519 identity from the demo UUID
 */
export function createDemoIdentity(): Ed25519KeyIdentity {
  const uuid = getDemoUUID();
  const seed = uuidToSeed(uuid);
  return Ed25519KeyIdentity.generate(seed);
}

/**
 * Get or reset demo message count based on time
 */
function getDemoCount(): { count: number; resetTime: number | null } {
  if (typeof window === 'undefined') {
    return { count: 0, resetTime: null };
  }
  
  const resetTimeStr = localStorage.getItem(DEMO_RESET_KEY);
  const resetTime = resetTimeStr ? parseInt(resetTimeStr, 10) : null;
  
  // Check if we should reset the count
  if (resetTime && Date.now() > resetTime) {
    localStorage.setItem(DEMO_COUNT_KEY, '0');
    localStorage.removeItem(DEMO_RESET_KEY);
    return { count: 0, resetTime: null };
  }
  
  const countStr = localStorage.getItem(DEMO_COUNT_KEY);
  const count = countStr ? parseInt(countStr, 10) : 0;
  
  return { count, resetTime };
}

/**
 * Increment the demo message count
 */
export function incrementDemoCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const { count } = getDemoCount();
  const newCount = count + 1;
  
  localStorage.setItem(DEMO_COUNT_KEY, newCount.toString());
  
  // Set reset time if this is the first message
  if (count === 0) {
    const resetTime = Date.now() + (DEMO_RESET_HOURS * 60 * 60 * 1000);
    localStorage.setItem(DEMO_RESET_KEY, resetTime.toString());
  }
  
  return newCount;
}

/**
 * Check if demo limit is reached
 */
export function isDemoLimitReached(): boolean {
  const { count } = getDemoCount();
  return count >= DEMO_MESSAGE_LIMIT;
}

/**
 * Get time until demo reset (in milliseconds)
 */
export function getTimeUntilReset(): number | null {
  const { resetTime } = getDemoCount();
  if (!resetTime) return null;
  
  const remaining = resetTime - Date.now();
  return remaining > 0 ? remaining : null;
}

/**
 * Format remaining time as human-readable string
 */
export function formatResetTime(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Create a full demo session with identity, agent, and usage tracking
 */
export async function createDemoSession(): Promise<DemoSession> {
  const identity = createDemoIdentity();
  const principal = identity.getPrincipal();
  
  const agent = new HttpAgent({
    host: getICHost(),
    identity,
  });
  
  // Fetch root key for local development
  if (!isMainnet()) {
    await agent.fetchRootKey();
  }
  
  const { count, resetTime } = getDemoCount();
  
  return {
    identity,
    principal,
    agent,
    messagesUsed: count,
    messagesRemaining: Math.max(0, DEMO_MESSAGE_LIMIT - count),
    isLimitReached: count >= DEMO_MESSAGE_LIMIT,
    resetTime,
  };
}

/**
 * Get current demo status without creating a session
 */
export function getDemoStatus(): {
  messagesUsed: number;
  messagesRemaining: number;
  isLimitReached: boolean;
  resetTime: number | null;
  formattedResetTime: string | null;
} {
  const { count, resetTime } = getDemoCount();
  const timeUntilReset = getTimeUntilReset();
  
  return {
    messagesUsed: count,
    messagesRemaining: Math.max(0, DEMO_MESSAGE_LIMIT - count),
    isLimitReached: count >= DEMO_MESSAGE_LIMIT,
    resetTime,
    formattedResetTime: timeUntilReset ? formatResetTime(timeUntilReset) : null,
  };
}

/**
 * Reset demo session (for testing/admin purposes)
 */
export function resetDemoSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(DEMO_COUNT_KEY);
  localStorage.removeItem(DEMO_RESET_KEY);
  // Keep the UUID so they get the same identity
}

/**
 * Constants for external use
 */
export const DEMO_CONSTANTS = {
  MESSAGE_LIMIT: DEMO_MESSAGE_LIMIT,
  RESET_HOURS: DEMO_RESET_HOURS,
};

