# Integration Log: External Repository Patterns

This document tracks patterns and innovations integrated from external repositories into the Raven Unified Ecosystem.

---

## 1. ii-tanstack-router-demo by Kristofer Lund

**Source**: https://github.com/kristoferlund/ii-tanstack-router-demo

**Date Integrated**: December 30, 2025

### Overview

This repository demonstrates best practices for Internet Identity authentication in React applications using:
- `ic-use-internet-identity` - Session management and cached identity restoration
- `ic-use-actor` - Type-safe canister actor hooks with automatic authentication

### Patterns Integrated

#### 1.1 `ensureInitialized()` - Cached Identity Restoration

**Original Pattern** (from `require-auth.ts`):
```typescript
import { ensureInitialized } from "ic-use-internet-identity";

export async function requireAuth() {
  const identity = await ensureInitialized();
  if (!identity) {
    throw redirect({ to: "/login" });
  }
}
```

**Raven Implementation** (`src/lib/auth-utils.ts`):
```typescript
export async function ensureInitialized(): Promise<IdentityResult | null> {
  const client = await getAuthClient();
  const isAuthenticated = await client.isAuthenticated();
  
  if (isAuthenticated) {
    const identity = client.getIdentity();
    const principal = identity.getPrincipal();
    
    if (principal.isAnonymous()) return null;
    
    return { identity, principal, isAuthenticated: true };
  }
  return null;
}
```

**Benefits**:
- Single source of truth for authentication state
- Prevents race conditions during initialization
- Seamless session restoration on page reload

#### 1.2 `createActorHook<T>()` - Typed Actor Hooks

**Original Pattern** (from `use-backend.tsx`):
```typescript
import { createActorHook } from "ic-use-actor";

export const useBackend = createActorHook<_SERVICE>({
  canisterId,
  idlFactory,
});
```

**Raven Implementation** (`src/hooks/useActors.ts`):
```typescript
export const useRavenAI = createActorHook<RavenAIService>({
  canisterId: CANISTER_IDS.raven_ai,
  idlFactory: ravenAiIdl,
});

export const useKIP = createActorHook<KIPService>({
  canisterId: CANISTER_IDS.kip,
  idlFactory: kipIdl,
});
// ... 7 more canister hooks
```

**Benefits**:
- Type-safe canister interactions
- Automatic agent creation and caching
- Batch authentication with `authenticateAll(identity)`

#### 1.3 `AuthGuard` Component - Route Protection

**Original Pattern** (from `auth-guard.tsx`):
```typescript
export function AuthGuard() {
  const router = useRouter();
  const { identity } = useInternetIdentity();

  useEffect(() => {
    if (!identity) {
      void router.invalidate();
    }
  }, [identity, router]);

  return null;
}
```

**Raven Implementation** (`src/components/auth/AuthGuard.tsx`):
```typescript
export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, identity, initialize, isLoading } = useAuthStore();
  const { isConnected, identity: walletIdentity } = useWalletStore();

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const result = await ensureInitialized();
      if (result?.isAuthenticated) {
        console.log('Session restored from cache');
      }
      await initialize();
    };
    restoreSession();
  }, [initialize]);

  // Handle logout - clear actors and redirect from protected routes
  useEffect(() => {
    if (!currentIdentity && !authStoreLoading) {
      clearAllActors();
      clearAuthenticatedAgent();
      
      const isProtectedRoute = !PUBLIC_ROUTES.includes(location.pathname);
      if (isProtectedRoute) {
        navigate('/login', { replace: true });
      }
    }
  }, [currentIdentity, authStoreLoading, location.pathname]);

  return <>{children}</>;
}
```

**Benefits**:
- Centralized authentication monitoring
- Automatic cleanup on logout
- Support for both Internet Identity and multi-wallet auth

#### 1.4 `requireAuth()` - Route Guards for Loaders

**Original Pattern** (from route `beforeLoad`):
```typescript
export const Route = createFileRoute("/")({
  beforeLoad: async () => requireAuth(),
  component: Index,
});
```

**Raven Implementation** (`src/lib/auth-utils.ts`):
```typescript
export async function requireAuth(): Promise<RequireAuthResult | null> {
  const result = await ensureInitialized();
  
  if (!result?.isAuthenticated) {
    return null;
  }
  
  return {
    identity: result.identity,
    principal: result.principal,
  };
}
```

**Benefits**:
- Can be used in route loaders
- Works with React Router's loader pattern
- Returns null instead of throwing for more flexible handling

### Files Created

| File | Purpose |
|------|---------|
| `src/lib/auth-utils.ts` | Core auth utilities: ensureInitialized, login, logout, requireAuth |
| `src/lib/actor-hooks.ts` | Typed actor hook factory and batch operations |
| `src/lib/index.ts` | Library barrel exports |
| `src/components/auth/AuthGuard.tsx` | Route protection component with withAuth HOC |
| `src/hooks/useActors.ts` | Pre-configured actor hooks for all Raven canisters |

### Files Modified

| File | Changes |
|------|---------|
| `src/App.tsx` | Added AuthGuard component at router root |
| `src/services/session.ts` | Integrated ensureInitialized and ensureSession |

### Canisters with Typed Actor Hooks

1. **RavenAI** (`useRavenAI`) - AI council, voice synthesis, articles
2. **KIP** (`useKIP`) - User profiles, wallet linking, verification
3. **Treasury** (`useTreasury`) - Token management, transactions
4. **Staking** (`useStaking`) - Sk8 Punks staking, HARLEE rewards
5. **Logistics** (`useLogistics`) - Expresso loads and shipments
6. **Queen Bee** (`useQueenBee`) - AI orchestration
7. **NFT** (`useNFT`) - NFT minting and transfers
8. **Core** (`useCore`) - Central registry
9. **AXIOM NFT** (`useAxiomNFT`) - Genesis NFT collection

### Usage Examples

**Using Actor Hooks in Components**:
```typescript
import { useRavenAI } from '../hooks/useActors';

function AIChat() {
  const { actor, isInitialized, isAuthenticated } = useRavenAI()();
  
  const sendMessage = async (message: string) => {
    if (!actor) return;
    const response = await actor.chat([], message, []);
    return response;
  };
  
  // ...
}
```

**Using requireAuth in Loaders**:
```typescript
import { requireAuth } from '../lib/auth-utils';

export async function profileLoader() {
  const auth = await requireAuth();
  if (!auth) {
    return redirect('/login');
  }
  return { principal: auth.principal.toText() };
}
```

**Batch Authentication**:
```typescript
import { ensureAllInitialized, authenticateAll } from '../hooks/useActors';

async function authenticateAllCanisters(identity: Identity) {
  await ensureAllInitialized();  // Initialize all actors with anonymous agent
  await authenticateAll(identity); // Authenticate all with user identity
}
```

---

## Future Integrations

This document will be updated as more patterns are integrated from external repositories.

---

*Last updated: December 30, 2025*

