/**
 * AuthGuard Component - Inspired by ii-tanstack-router-demo
 * @see https://github.com/kristoferlund/ii-tanstack-router-demo
 * 
 * Monitors authentication state and reacts to identity changes.
 * Place at the root level to ensure route invalidation on auth changes.
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { ensureInitialized, clearAuthenticatedAgent } from '../../lib/auth-utils';
import { clearAll as clearAllActors } from '../../lib/actor-hooks';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/about',
  '/news',
  '/tokenomics',
  '/error',
  '/ic-spicy',
  '/crossword',
];

// Routes that should redirect to after login
const DEFAULT_AUTHENTICATED_ROUTE = '/profile';
const DEFAULT_LOGIN_ROUTE = '/login';

interface AuthGuardProps {
  children?: React.ReactNode;
}

/**
 * AuthGuard monitors authentication state and handles:
 * 1. Session restoration on app load
 * 2. Redirecting unauthenticated users from protected routes
 * 3. Clearing actors and agents on logout
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    isAuthenticated: authStoreAuthenticated, 
    identity, 
    initialize: initAuthStore,
    isLoading: authStoreLoading,
  } = useAuthStore();
  
  const { 
    isConnected: walletConnected,
    identity: walletIdentity,
  } = useWalletStore();
  
  // Combined auth state - user is authenticated if either store says so
  const isAuthenticated = authStoreAuthenticated || walletConnected;
  const currentIdentity = identity || walletIdentity;
  
  /**
   * Initialize auth on mount - restore cached identity
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Try to restore from our auth-utils first
        const result = await ensureInitialized();
        
        if (result?.isAuthenticated) {
          console.log('🔐 AuthGuard: Session restored from cache');
          // The authStore.initialize() will handle syncing state
        }
        
        // Also initialize the auth store
        await initAuthStore();
      } catch (error) {
        console.error('❌ AuthGuard: Failed to restore session:', error);
      }
    };
    
    restoreSession();
  }, [initAuthStore]);
  
  /**
   * Handle identity changes - clear actors and redirect if needed
   */
  useEffect(() => {
    if (!currentIdentity && !authStoreLoading) {
      // User logged out
      console.log('🔓 AuthGuard: Identity cleared, checking route protection');
      
      // Clear cached actors and agents
      clearAllActors();
      clearAuthenticatedAgent();
      
      // Check if current route requires auth
      const isProtectedRoute = !PUBLIC_ROUTES.some(route => 
        location.pathname === route || 
        location.pathname.startsWith(route + '/')
      );
      
      if (isProtectedRoute) {
        console.log('🔒 AuthGuard: Redirecting to login from protected route');
        navigate(DEFAULT_LOGIN_ROUTE, { 
          replace: true,
          state: { from: location.pathname }
        });
      }
    }
  }, [currentIdentity, authStoreLoading, location.pathname, navigate]);
  
  /**
   * Handle successful authentication - redirect from login page
   */
  useEffect(() => {
    if (isAuthenticated && location.pathname === DEFAULT_LOGIN_ROUTE) {
      const from = (location.state as any)?.from || DEFAULT_AUTHENTICATED_ROUTE;
      console.log('✅ AuthGuard: Authenticated, redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, location.pathname, location.state, navigate]);
  
  return <>{children}</>;
}

/**
 * Higher-order component for protected routes.
 * Wraps a component and ensures authentication before rendering.
 * 
 * @example
 * ```tsx
 * const ProtectedProfile = withAuth(ProfilePage);
 * 
 * // In routes:
 * <Route path="/profile" element={<ProtectedProfile />} />
 * ```
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading } = useAuthStore();
    const { isConnected } = useWalletStore();
    
    const isLoggedIn = isAuthenticated || isConnected;
    
    useEffect(() => {
      if (!isLoading && !isLoggedIn) {
        navigate(DEFAULT_LOGIN_ROUTE, {
          replace: true,
          state: { from: location.pathname }
        });
      }
    }, [isLoading, isLoggedIn, navigate, location.pathname]);
    
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" />
        </div>
      );
    }
    
    if (!isLoggedIn) {
      return null; // Will redirect
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook to require authentication in a component.
 * Throws a redirect if not authenticated.
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { isReady, principal } = useRequireAuth();
 *   
 *   if (!isReady) return <Loading />;
 *   
 *   return <div>Welcome, {principal?.toText()}</div>;
 * }
 * ```
 */
export function useRequireAuth(): {
  isReady: boolean;
  principal: any | null;
  redirect: () => void;
} {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, principal, isLoading } = useAuthStore();
  const { isConnected, principal: walletPrincipal } = useWalletStore();
  
  const isLoggedIn = isAuthenticated || isConnected;
  const currentPrincipal = principal || walletPrincipal;
  
  const redirect = useCallback(() => {
    navigate(DEFAULT_LOGIN_ROUTE, {
      replace: true,
      state: { from: location.pathname }
    });
  }, [navigate, location.pathname]);
  
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      redirect();
    }
  }, [isLoading, isLoggedIn, redirect]);
  
  return {
    isReady: !isLoading && isLoggedIn,
    principal: currentPrincipal,
    redirect,
  };
}

export default AuthGuard;
