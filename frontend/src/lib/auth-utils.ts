/**
 * Auth Utilities - Inspired by ic-use-internet-identity patterns
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 * 
 * Provides:
 * - ensureInitialized() - Restore cached identity on app load
 * - requireAuth() - Route guard for protected routes
 * - AuthGuard component - Invalidate routes on identity changes
 */

import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// ============================================================================
// Singleton AuthClient Management
// ============================================================================

let authClientInstance: AuthClient | null = null;
let initPromise: Promise<AuthClient> | null = null;

/**
 * Get or create the singleton AuthClient instance.
 * Uses a promise lock to prevent race conditions during initialization.
 */
async function getAuthClient(): Promise<AuthClient> {
  if (authClientInstance) {
    return authClientInstance;
  }

  if (!initPromise) {
    initPromise = AuthClient.create({
      idleOptions: {
        disableIdle: true, // Disable auto-logout for long sessions
      },
    }).then(client => {
      authClientInstance = client;
      return client;
    });
  }

  return initPromise;
}

// ============================================================================
// Identity Initialization (like ensureInitialized from ic-use-internet-identity)
// ============================================================================

interface IdentityResult {
  identity: Identity;
  principal: Principal;
  isAuthenticated: boolean;
}

/**
 * Ensure the AuthClient is initialized and restore any cached identity.
 * This is the key pattern from the ii-tanstack-router-demo.
 * 
 * @returns The restored identity if authenticated, null otherwise
 */
export async function ensureInitialized(): Promise<IdentityResult | null> {
  try {
    const client = await getAuthClient();
    const isAuthenticated = await client.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = client.getIdentity();
      const principal = identity.getPrincipal();
      
      // Skip anonymous principals
      if (principal.isAnonymous()) {
        return null;
      }
      
      console.log('✅ Auth restored from cache:', principal.toText().slice(0, 20) + '...');
      
      return {
        identity,
        principal,
        isAuthenticated: true,
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to restore cached identity:', error);
    return null;
  }
}

/**
 * Get the current identity without initializing.
 * Returns null if not authenticated.
 */
export function getIdentity(): Identity | null {
  if (!authClientInstance) return null;
  
  const identity = authClientInstance.getIdentity();
  if (identity.getPrincipal().isAnonymous()) return null;
  
  return identity;
}

/**
 * Get the current principal without initializing.
 */
export function getPrincipal(): Principal | null {
  const identity = getIdentity();
  return identity?.getPrincipal() ?? null;
}

/**
 * Check if currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuthClient();
  return client.isAuthenticated();
}

// ============================================================================
// Login / Logout
// ============================================================================

interface LoginOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  maxTimeToLive?: bigint;
}

/**
 * Trigger Internet Identity login flow.
 */
export async function login(options: LoginOptions = {}): Promise<IdentityResult | null> {
  const client = await getAuthClient();
  
  // Determine identity provider based on environment
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
  
  const identityProvider = isLocal
    ? `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
    : 'https://identity.ic0.app';
  
  return new Promise((resolve, reject) => {
    client.login({
      identityProvider,
      maxTimeToLive: options.maxTimeToLive ?? BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
      onSuccess: () => {
        const identity = client.getIdentity();
        const principal = identity.getPrincipal();
        
        console.log('✅ Login successful:', principal.toText().slice(0, 20) + '...');
        
        options.onSuccess?.();
        resolve({
          identity,
          principal,
          isAuthenticated: true,
        });
      },
      onError: (error) => {
        console.error('❌ Login failed:', error);
        options.onError?.(new Error(error || 'Login failed'));
        reject(new Error(error || 'Login failed'));
      },
    });
  });
}

/**
 * Logout and clear cached identity.
 */
export async function logout(): Promise<void> {
  const client = await getAuthClient();
  await client.logout();
  console.log('✅ Logged out');
}

// ============================================================================
// Auth Status Hook State (for components to observe)
// ============================================================================

export type AuthStatus = 
  | 'idle'           // Not initialized yet
  | 'initializing'   // AuthClient being created
  | 'logging-in'     // Login popup open
  | 'authenticated'  // User is logged in
  | 'unauthenticated'; // User is not logged in

/**
 * Get current auth status synchronously (for initial render).
 */
export function getAuthStatus(): AuthStatus {
  if (!authClientInstance) return 'idle';
  
  const identity = authClientInstance.getIdentity();
  if (identity.getPrincipal().isAnonymous()) {
    return 'unauthenticated';
  }
  
  return 'authenticated';
}

// ============================================================================
// Route Guard (like requireAuth from ii-tanstack-router-demo)
// ============================================================================

interface RequireAuthResult {
  identity: Identity;
  principal: Principal;
}

/**
 * Route guard function for protected routes.
 * Use in route loaders or beforeLoad to ensure authentication.
 * 
 * @example
 * ```ts
 * // In a route loader
 * export async function loader() {
 *   const auth = await requireAuth();
 *   if (!auth) {
 *     throw redirect('/login');
 *   }
 *   return { principal: auth.principal };
 * }
 * ```
 */
export async function requireAuth(): Promise<RequireAuthResult | null> {
  const result = await ensureInitialized();
  
  if (!result?.isAuthenticated) {
    console.log('🔒 Auth required but not authenticated');
    return null;
  }
  
  return {
    identity: result.identity,
    principal: result.principal,
  };
}

// ============================================================================
// Actor Authentication Helpers
// ============================================================================

import { HttpAgent } from '@dfinity/agent';
import { getICHost, isMainnet } from '../services/canisterConfig';

let authenticatedAgent: HttpAgent | null = null;

/**
 * Get or create an authenticated HttpAgent.
 * Caches the agent for reuse across actor hooks.
 */
export async function getAuthenticatedAgent(): Promise<HttpAgent | null> {
  const result = await ensureInitialized();
  
  if (!result?.identity) {
    // Return anonymous agent for query calls
    const anonymousAgent = await HttpAgent.create({
      host: getICHost(),
    });
    if (!isMainnet()) {
      await anonymousAgent.fetchRootKey();
    }
    return anonymousAgent;
  }
  
  // Create authenticated agent if needed
  if (!authenticatedAgent) {
    authenticatedAgent = await HttpAgent.create({
      identity: result.identity,
      host: getICHost(),
    });
    if (!isMainnet()) {
      await authenticatedAgent.fetchRootKey();
    }
  }
  
  return authenticatedAgent;
}

/**
 * Clear the cached authenticated agent (call on logout).
 */
export function clearAuthenticatedAgent(): void {
  authenticatedAgent = null;
}

// ============================================================================
// Admin Check
// ============================================================================

// Known admin principals
const ADMIN_PRINCIPALS = [
  'imnyd-k37s2-xlg7c-omeed-ezrzg-6oesa-r3ek6-xrwuz-qbliq-5h675-yae',
  // Add more admin principals as needed
];

/**
 * Check if the current principal is an admin.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const principal = getPrincipal();
  if (!principal) return false;
  
  const principalText = principal.toText();
  return ADMIN_PRINCIPALS.includes(principalText);
}

