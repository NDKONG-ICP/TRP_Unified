import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { ravenAICanisterService } from '../services/ravenAICanisterService';
import { tokenService } from '../services/tokenService';

interface WalletBalance {
  icp: bigint;
  ckBTC: bigint;
  ckETH: bigint;
  ckSOL: bigint;
  ckUSDC: bigint;
  harlee: bigint;
  raven: bigint;
}

interface UserProfile {
  principal: string;
  displayName: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'user' | 'driver' | 'shipper' | 'warehouse';
  createdAt: number;
  lastLogin: number;
  kycVerified: boolean;
  walletAddresses: {
    icp?: string;
    evm?: string;
    btc?: string;
    sol?: string;
  };
}

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  authClient: AuthClient | null;
  identity: Identity | null;
  principal: Principal | null;
  isAdmin: boolean;
  
  // User profile
  profile: UserProfile | null;
  needsOnboarding: boolean;
  
  // Wallet state
  balances: WalletBalance;
  isLoadingBalances: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  setNeedsOnboarding: (needs: boolean) => void;
  completeOnboarding: (profileData: Partial<UserProfile>) => Promise<void>;
  updateBalances: () => Promise<void>;
  getPrincipalText: () => string | null;
}

const defaultBalances: WalletBalance = {
  icp: BigInt(0),
  ckBTC: BigInt(0),
  ckETH: BigInt(0),
  ckSOL: BigInt(0),
  ckUSDC: BigInt(0),
  harlee: BigInt(0),
  raven: BigInt(0),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: true,
      authClient: null,
      identity: null,
      principal: null,
      isAdmin: false,
      profile: null,
      needsOnboarding: false,
      balances: defaultBalances,
      isLoadingBalances: false,

      // Initialize auth client
      initialize: async () => {
        try {
          set({ isLoading: true });
          
          const authClient = await AuthClient.create({
            idleOptions: {
              disableIdle: true, // Disable auto-logout
            },
          });

          const isAuthenticated = await authClient.isAuthenticated();
          
          if (isAuthenticated) {
            const identity = authClient.getIdentity();
            const principal = identity.getPrincipal();
            
            set({
              authClient,
              identity,
              principal,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Check admin status
            try {
              await ravenAICanisterService.init(identity);
              const isAdmin = await ravenAICanisterService.isAdmin(principal);
              set({ isAdmin });
            } catch (e) {
              console.error('Admin check failed:', e);
            }
            
            // Load balances on re-auth
            try {
              console.log('Loading balances for:', principal.toText());
              await get().updateBalances();
              console.log('Balances loaded successfully');
            } catch (e) {
              console.error('Failed to load balances:', e);
            }
          } else {
            set({
              authClient,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          set({ isLoading: false });
        }
      },

      // Login with Internet Identity
      login: async () => {
        try {
          let client = get().authClient;
          
          // Ensure AuthClient is initialized
          if (!client) {
            await get().initialize();
            client = get().authClient;
          }

          if (!client) {
            console.error('Failed to initialize AuthClient');
            return false;
          }

          // Detect if we're on mainnet by checking the hostname
          const isMainnet = typeof window !== 'undefined' && 
            (window.location.hostname.endsWith('.ic0.app') || 
             window.location.hostname.endsWith('.icp0.io') ||
             window.location.hostname.endsWith('.raw.ic0.app') ||
             !window.location.hostname.includes('localhost'));

          console.log('Attempting login, isMainnet:', isMainnet);
          console.log('Current hostname:', window.location.hostname);

          return new Promise((resolve) => {
            client!.login({
              identityProvider: isMainnet 
                ? 'https://identity.ic0.app'
                : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,
              maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000000000), // 7 days
              // Window features for the popup - proper sizing
              windowOpenerFeatures: 
                `left=${window.screen.width / 2 - 250},` +
                `top=${window.screen.height / 2 - 300},` +
                'width=500,height=600,toolbar=0,menubar=0,location=0',
              onSuccess: async () => {
                console.log('Login successful!');
                const identity = client!.getIdentity();
                const principal = identity.getPrincipal();
                
                console.log('Principal:', principal.toText());
                
                // Check admin status
                let isAdmin = false;
                try {
                  await ravenAICanisterService.init(identity);
                  isAdmin = await ravenAICanisterService.isAdmin(principal);
                } catch (e) {
                  console.error('Admin check failed:', e);
                }
                
                // Check for existing profile
                const storedProfile = localStorage.getItem(`profile_${principal.toText()}`);
                const profile = storedProfile ? JSON.parse(storedProfile) : null;
                const needsOnboarding = !profile || !profile.displayName;
                
                set({
                  identity,
                  principal,
                  isAdmin,
                  isAuthenticated: true,
                  profile,
                  needsOnboarding,
                });
                
                // Load balances
                await get().updateBalances();
                
                resolve(true);
              },
              onError: (error) => {
                console.error('Login failed:', error);
                resolve(false);
              },
            });
          });
        } catch (error) {
          console.error('Login exception:', error);
          return false;
        }
      },

      // Logout
      logout: async () => {
        const { authClient } = get();
        if (authClient) {
          await authClient.logout();
        }
        
        set({
          isAuthenticated: false,
          identity: null,
          principal: null,
          isAdmin: false,
          profile: null,
          balances: defaultBalances,
        });
      },

      // Set user profile
      setProfile: (profile) => {
        set({ profile });
      },

      // Set onboarding state
      setNeedsOnboarding: (needs) => {
        set({ needsOnboarding: needs });
      },

      // Complete onboarding - create profile on-chain
      completeOnboarding: async (profileData) => {
        const { principal, profile } = get();
        if (!principal) {
          throw new Error('Not authenticated');
        }

        // Create/update profile
        const updatedProfile: UserProfile = {
          ...profile,
          principal: principal.toText(),
          displayName: profileData.displayName || 'Anonymous',
          email: profileData.email,
          avatar: profileData.avatar,
          role: profile?.role || 'user',
          createdAt: profile?.createdAt || Date.now(),
          lastLogin: Date.now(),
          kycVerified: profile?.kycVerified || false,
          walletAddresses: profile?.walletAddresses || {},
        };

        // Store locally
        localStorage.setItem(`profile_${principal.toText()}`, JSON.stringify(updatedProfile));

        set({
          profile: updatedProfile,
          needsOnboarding: false,
        });
      },

      // Update wallet balances
      updateBalances: async () => {
        const { principal, isAuthenticated, identity } = get();
        if (!isAuthenticated || !principal || !identity) {
          console.log('updateBalances: skipped - not authenticated or missing identity');
          return;
        }

        console.log('updateBalances: fetching balances for', principal.toText());
        set({ isLoadingBalances: true });
        
        try {
          const { TokenService } = await import('../services/tokenService');
          const service = new TokenService(identity);
          
          // Fetch balances with individual error handling
          const [icp, ckBTC, ckETH, harlee, raven] = await Promise.all([
            service.getBalance('ICP', principal).catch(e => {
              console.error('ICP balance fetch failed:', e);
              return { balance: BigInt(0), symbol: 'ICP', decimals: 8, formatted: '0', token: 'ICP' as const };
            }),
            service.getBalance('CKBTC', principal).catch(e => {
              console.error('ckBTC balance fetch failed:', e);
              return { balance: BigInt(0), symbol: 'ckBTC', decimals: 8, formatted: '0', token: 'CKBTC' as const };
            }),
            service.getBalance('CKETH', principal).catch(e => {
              console.error('ckETH balance fetch failed:', e);
              return { balance: BigInt(0), symbol: 'ckETH', decimals: 18, formatted: '0', token: 'CKETH' as const };
            }),
            service.getBalance('HARLEE', principal).catch(e => {
              console.error('HARLEE balance fetch failed:', e);
              return { balance: BigInt(0), symbol: 'HARLEE', decimals: 8, formatted: '0', token: 'HARLEE' as const };
            }),
            service.getBalance('RAVEN', principal).catch(e => {
              console.error('RAVEN balance fetch failed:', e);
              return { balance: BigInt(0), symbol: 'RAVEN', decimals: 8, formatted: '0', token: 'RAVEN' as const };
            }),
          ]);
          
          console.log('Balances fetched:', {
            icp: icp.formatted,
            ckBTC: ckBTC.formatted,
            ckETH: ckETH.formatted,
            harlee: harlee.formatted,
            raven: raven.formatted,
          });
          
          const balances: WalletBalance = {
            icp: icp.balance,
            ckBTC: ckBTC.balance,
            ckETH: ckETH.balance,
            ckSOL: BigInt(0), // ckSOL not yet supported in tokenService
            ckUSDC: BigInt(0), // ckUSDC not yet supported in tokenService
            harlee: harlee.balance,
            raven: raven.balance,
          };
          
          set({ balances, isLoadingBalances: false });
        } catch (error) {
          console.error('Failed to update balances:', error);
          set({ isLoadingBalances: false });
        }
      },

      // Get principal as text
      getPrincipalText: () => {
        const { principal } = get();
        return principal ? principal.toText() : null;
      },
    }),
    {
      name: 'raven-auth',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);

// Auto-initialize on import
if (typeof window !== 'undefined') {
  useAuthStore.getState().initialize();
}


