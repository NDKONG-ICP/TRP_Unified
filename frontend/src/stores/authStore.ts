import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthClient } from '@dfinity/auth-client';
import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

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
            
            // Load profile and balances
            await get().updateBalances();
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
                
                // Check for existing profile
                const storedProfile = localStorage.getItem(`profile_${principal.toText()}`);
                const profile = storedProfile ? JSON.parse(storedProfile) : null;
                const needsOnboarding = !profile || !profile.displayName;
                
                set({
                  identity,
                  principal,
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
        const { principal, isAuthenticated } = get();
        if (!isAuthenticated || !principal) return;

        set({ isLoadingBalances: true });
        
        try {
          // In production, fetch from ICP Ledger and other canisters
          // For now, set placeholder - will be replaced with real calls
          const balances: WalletBalance = {
            icp: BigInt(0),
            ckBTC: BigInt(0),
            ckETH: BigInt(0),
            ckSOL: BigInt(0),
            ckUSDC: BigInt(0),
            harlee: BigInt(0),
            raven: BigInt(0),
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


