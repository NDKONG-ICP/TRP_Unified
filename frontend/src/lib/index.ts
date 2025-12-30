/**
 * Library exports for Raven Unified Ecosystem
 * 
 * Patterns inspired by:
 * - ic-use-internet-identity
 * - ic-use-actor
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 */

// Auth utilities
export {
  ensureInitialized,
  getIdentity,
  getPrincipal,
  isAuthenticated,
  login,
  logout,
  getAuthStatus,
  requireAuth,
  getAuthenticatedAgent,
  clearAuthenticatedAgent,
  checkIsAdmin,
  type AuthStatus,
} from './auth-utils';

// Actor hooks
export {
  createActorHook,
  ensureAllInitialized,
  authenticateAll,
  clearAll,
  createActor,
  useActor,
  useAuthState,
} from './actor-hooks';

