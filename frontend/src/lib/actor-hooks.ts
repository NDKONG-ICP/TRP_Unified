/**
 * Typed Actor Hooks - Inspired by ic-use-actor patterns
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 * 
 * Provides type-safe actor hooks that:
 * - Auto-initialize with anonymous agent
 * - Can be authenticated with user identity
 * - Cache actors for reuse
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { getICHost, isMainnet, CANISTER_IDS } from '../services/canisterConfig';
import { getAuthenticatedAgent, ensureInitialized } from './auth-utils';

// ============================================================================
// Actor Hook Factory
// ============================================================================

interface ActorHookOptions<T> {
  canisterId: string | Principal;
  idlFactory: IDL.InterfaceFactory;
}

interface ActorHookState<T> {
  actor: T | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

interface ActorHook<T> {
  // State
  actor: T | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  
  // Methods
  initialize: () => Promise<void>;
  authenticate: (identity: Identity) => Promise<void>;
  ensureInitialized: () => Promise<void>;
  clear: () => void;
}

// Global registry of all actor hooks for batch operations
const actorHookRegistry: Map<string, ActorHook<any>> = new Map();

/**
 * Create a typed actor hook for a canister.
 * 
 * @example
 * ```ts
 * import { idlFactory, _SERVICE } from '../declarations/raven_ai';
 * 
 * export const useRavenAI = createActorHook<_SERVICE>({
 *   canisterId: CANISTER_IDS.raven_ai,
 *   idlFactory,
 * });
 * 
 * // In a component:
 * const { actor, isInitialized } = useRavenAI();
 * if (actor) {
 *   const response = await actor.chat([], 'Hello', []);
 * }
 * ```
 */
export function createActorHook<T>(options: ActorHookOptions<T>): () => ActorHook<T> {
  const canisterIdStr = typeof options.canisterId === 'string' 
    ? options.canisterId 
    : options.canisterId.toText();
  
  // State shared across all hook instances
  let state: ActorHookState<T> = {
    actor: null,
    isInitialized: false,
    isAuthenticated: false,
    error: null,
  };
  
  let initPromise: Promise<void> | null = null;
  let listeners: Set<() => void> = new Set();
  
  const notify = () => {
    listeners.forEach(fn => fn());
  };
  
  const hook: ActorHook<T> = {
    get actor() { return state.actor; },
    get isInitialized() { return state.isInitialized; },
    get isAuthenticated() { return state.isAuthenticated; },
    get error() { return state.error; },
    
    /**
     * Initialize the actor with an anonymous agent.
     * This allows query calls before authentication.
     */
    async initialize() {
      if (state.isInitialized) return;
      
      try {
        const agent = await HttpAgent.create({
          host: getICHost(),
        });
        
        if (!isMainnet()) {
          await agent.fetchRootKey();
        }
        
        const actor = Actor.createActor<T>(options.idlFactory, {
          agent,
          canisterId: canisterIdStr,
        });
        
        state = {
          ...state,
          actor,
          isInitialized: true,
          isAuthenticated: false,
          error: null,
        };
        
        notify();
        console.log(`✅ Actor initialized (anonymous): ${canisterIdStr.slice(0, 15)}...`);
      } catch (error) {
        state = {
          ...state,
          error: error instanceof Error ? error : new Error(String(error)),
        };
        notify();
        throw error;
      }
    },
    
    /**
     * Authenticate the actor with a user identity.
     * This allows update calls.
     */
    async authenticate(identity: Identity) {
      try {
        const agent = await HttpAgent.create({
          identity,
          host: getICHost(),
        });
        
        if (!isMainnet()) {
          await agent.fetchRootKey();
        }
        
        const actor = Actor.createActor<T>(options.idlFactory, {
          agent,
          canisterId: canisterIdStr,
        });
        
        state = {
          ...state,
          actor,
          isAuthenticated: true,
          error: null,
        };
        
        notify();
        console.log(`✅ Actor authenticated: ${canisterIdStr.slice(0, 15)}...`);
      } catch (error) {
        state = {
          ...state,
          error: error instanceof Error ? error : new Error(String(error)),
        };
        notify();
        throw error;
      }
    },
    
    /**
     * Ensure the actor is initialized (wait for init if in progress).
     */
    async ensureInitialized() {
      if (state.isInitialized) return;
      
      if (!initPromise) {
        initPromise = hook.initialize().finally(() => {
          initPromise = null;
        });
      }
      
      await initPromise;
    },
    
    /**
     * Clear the actor state (for logout).
     */
    clear() {
      state = {
        actor: null,
        isInitialized: false,
        isAuthenticated: false,
        error: null,
      };
      notify();
    },
  };
  
  // Register the hook
  actorHookRegistry.set(canisterIdStr, hook);
  
  // Return hook factory (React-friendly pattern)
  return () => hook;
}

// ============================================================================
// Batch Operations (like authenticateAll from ic-use-actor)
// ============================================================================

/**
 * Ensure all registered actor hooks are initialized.
 */
export async function ensureAllInitialized(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  actorHookRegistry.forEach((hook) => {
    promises.push(hook.ensureInitialized());
  });
  
  await Promise.all(promises);
  console.log(`✅ All ${actorHookRegistry.size} actor hooks initialized`);
}

/**
 * Authenticate all registered actor hooks with the given identity.
 */
export async function authenticateAll(identity: Identity): Promise<void> {
  const promises: Promise<void>[] = [];
  
  actorHookRegistry.forEach((hook) => {
    promises.push(hook.authenticate(identity));
  });
  
  await Promise.all(promises);
  console.log(`✅ All ${actorHookRegistry.size} actor hooks authenticated`);
}

/**
 * Clear all registered actor hooks (for logout).
 */
export function clearAll(): void {
  actorHookRegistry.forEach((hook) => {
    hook.clear();
  });
  console.log(`✅ All ${actorHookRegistry.size} actor hooks cleared`);
}

// ============================================================================
// Pre-built Actor Hooks for Raven Ecosystem
// ============================================================================

// Import IDL factories - these will be lazy-loaded to avoid circular deps
type LazyIDLFactory = () => Promise<{ idlFactory: IDL.InterfaceFactory }>;

const lazyIdlFactories: Record<string, LazyIDLFactory> = {
  raven_ai: () => import('../declarations/raven_ai'),
  kip: () => import('../declarations/kip'),
  core: () => import('../declarations/core'),
  treasury: () => import('../declarations/treasury'),
  staking: () => import('../declarations/staking'),
  logistics: () => import('../declarations/logistics'),
  axiom_nft: () => import('../declarations/axiom_nft'),
  queen_bee: () => import('../declarations/queen_bee'),
  ai_engine: () => import('../declarations/ai_engine'),
  nft: () => import('../declarations/nft'),
  escrow: () => import('../declarations/escrow'),
  vector_db: () => import('../declarations/vector_db'),
  deepseek_model: () => import('../declarations/deepseek_model'),
};

/**
 * Create an actor for a canister on-demand.
 * Use this when you need an actor outside of the hook pattern.
 */
export async function createActor<T>(
  canisterName: keyof typeof CANISTER_IDS,
  options: { identity?: Identity } = {}
): Promise<T | null> {
  const canisterId = CANISTER_IDS[canisterName];
  if (!canisterId) {
    console.error(`❌ Unknown canister: ${canisterName}`);
    return null;
  }
  
  // Get IDL factory
  const factoryKey = canisterName.replace(/-/g, '_');
  const lazyFactory = lazyIdlFactories[factoryKey];
  
  if (!lazyFactory) {
    console.error(`❌ No IDL factory for: ${canisterName}`);
    return null;
  }
  
  try {
    const { idlFactory } = await lazyFactory();
    
    let agent: HttpAgent;
    
    if (options.identity) {
      agent = await HttpAgent.create({
        identity: options.identity,
        host: getICHost(),
      });
    } else {
      const authAgent = await getAuthenticatedAgent();
      agent = authAgent || await HttpAgent.create({ host: getICHost() });
    }
    
    if (!isMainnet()) {
      await agent.fetchRootKey();
    }
    
    return Actor.createActor<T>(idlFactory, {
      agent,
      canisterId,
    });
  } catch (error) {
    console.error(`❌ Failed to create actor for ${canisterName}:`, error);
    return null;
  }
}

// ============================================================================
// React Integration Helpers
// ============================================================================

import { useEffect, useState, useCallback } from 'react';

/**
 * React hook to use an actor with automatic initialization.
 * 
 * @example
 * ```ts
 * function MyComponent() {
 *   const { actor, isLoading, error } = useActor<_SERVICE>('raven_ai');
 *   
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   if (!actor) return <NotAuthenticated />;
 *   
 *   // Use actor...
 * }
 * ```
 */
export function useActor<T>(canisterName: keyof typeof CANISTER_IDS): {
  actor: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [actor, setActor] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const loadActor = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const auth = await ensureInitialized();
      const newActor = await createActor<T>(canisterName, {
        identity: auth?.identity,
      });
      setActor(newActor);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [canisterName]);
  
  useEffect(() => {
    loadActor();
  }, [loadActor]);
  
  return {
    actor,
    isLoading,
    error,
    refresh: loadActor,
  };
}

/**
 * React hook to subscribe to auth state changes.
 * 
 * @example
 * ```ts
 * function AuthGuard({ children }) {
 *   const { isAuthenticated, principal } = useAuthState();
 *   
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" />;
 *   }
 *   
 *   return children;
 * }
 * ```
 */
export function useAuthState(): {
  isAuthenticated: boolean;
  principal: Principal | null;
  isLoading: boolean;
} {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    
    ensureInitialized().then(result => {
      if (mounted) {
        setIsAuthenticated(result?.isAuthenticated ?? false);
        setPrincipal(result?.principal ?? null);
        setIsLoading(false);
      }
    });
    
    return () => { mounted = false; };
  }, []);
  
  return { isAuthenticated, principal, isLoading };
}

