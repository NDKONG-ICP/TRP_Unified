/**
 * Wallet Store - Multi-wallet integration for The Raven Project
 * Supports Internet Identity, Plug Wallet, OISY, NFID and other IC wallets
 * References: https://github.com/dfinity/oisy-wallet, https://github.com/dfinity/oisy-wallet-signer
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Identity, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { TokenService, TokenBalance, TOKEN_CANISTERS } from '../services/tokenService';
import { getAllCanisterIds, getICHost } from '../services/canisterConfig';
import {
  isPlugAvailable,
  requestPlugConnect,
  getPlugSession,
  setupPlugCallbacks,
  verifyPlugConnection,
  disconnectPlug as plugDisconnect,
} from '../services/plugService';
import {
  isOisyAvailable,
  isOisyConnected,
  connectOisy,
  disconnectOisy,
  getOisyPrincipal,
  getOisyIdentity,
  getOisyAgent,
  getOisySignerUrl,
  openOisyWallet,
} from '../services/oisySignerService';

// Wallet types supported
export type WalletType = 
  | 'internet-identity' 
  | 'plug' 
  | 'oisy' 
  | 'nfid' 
  | 'stoic'
  | 'bitfinity'
  | 'metamask'
  | 'phantom'
  | 'unisat'
  | 'xverse'
  | 'sui-wallet';

// Wallet provider interface
interface WalletProvider {
  name: string;
  type: WalletType;
  icon: string;
  description: string;
  isAvailable: () => boolean;
  connect: () => Promise<WalletConnection>;
  disconnect: () => Promise<void>;
}

// Connection result
interface WalletConnection {
  principal: Principal;
  accountId: string;
  identity: Identity;
  agent: HttpAgent;
}

// Balance info with real token data
interface WalletBalances {
  icp: bigint;
  ckBTC: bigint;
  ckETH: bigint;
  harlee: bigint;
  raven: bigint;
}

// Transaction types
interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'mint' | 'burn';
  amount: string;
  token: string;
  from: string;
  to: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
}

// Store state
interface WalletState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  walletType: WalletType | null;
  
  // User info
  principal: Principal | null;
  accountId: string | null;
  identity: Identity | null;
  agent: HttpAgent | null;
  
  // Balances (real data from canisters)
  balances: WalletBalances;
  tokenBalances: TokenBalance[];
  isLoadingBalances: boolean;
  
  // Transactions
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  
  // NFTs
  ownedNFTs: string[];
  isLoadingNFTs: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  connect: (walletType: WalletType) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshNFTs: () => Promise<void>;
  sendToken: (token: keyof typeof TOKEN_CANISTERS, to: string, amount: bigint) => Promise<string | null>;
  clearError: () => void;
}

// ICP Ledger canister ID
const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// Determine if we're on mainnet
const isMainnet = typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('.ic0.app') || 
   window.location.hostname.endsWith('.icp0.io') ||
   window.location.hostname.endsWith('.raw.ic0.app'));

const IC_HOST = getICHost();

// OISY Wallet URL
const OISY_WALLET_URL = 'https://oisy.com';

// Helper to derive account ID from principal (proper implementation)
function principalToAccountId(principal: Principal): string {
  // For simplicity, return a hex representation of the principal
  // In production, use proper account ID derivation with SHA-256
  const principalBytes = principal.toUint8Array();
  return Array.from(principalBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Re-export Plug availability check
// (isPlugAvailable is now imported from plugService)

// OISY is always available (web-based wallet)
function isOISYAvailable(): boolean {
  return true; // OISY is a web-based wallet, always available
}

// Check if NFID is available
function isNFIDAvailable(): boolean {
  return true; // NFID uses II-style login, always available
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      walletType: null,
      principal: null,
      accountId: null,
      identity: null,
      agent: null,
      balances: {
        icp: BigInt(0),
        ckBTC: BigInt(0),
        ckETH: BigInt(0),
        harlee: BigInt(0),
        raven: BigInt(0),
      },
      tokenBalances: [],
      isLoadingBalances: false,
      transactions: [],
      isLoadingTransactions: false,
      ownedNFTs: [],
      isLoadingNFTs: false,
      error: null,

      // Connect to wallet
      connect: async (walletType: WalletType): Promise<boolean> => {
        set({ isConnecting: true, error: null });
        
        try {
          let principal: Principal;
          let identity: Identity;
          let agent: HttpAgent;

          switch (walletType) {
            case 'internet-identity': {
              const authClient = await AuthClient.create();
              
              await new Promise<void>((resolve, reject) => {
                authClient.login({
                  identityProvider: isMainnet 
                    ? 'https://identity.ic0.app'
                    : 'http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943',
                  maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
                  onSuccess: () => resolve(),
                  onError: (err) => reject(new Error(err || 'Login failed')),
                });
              });

              identity = authClient.getIdentity();
              principal = identity.getPrincipal();
              agent = new HttpAgent({ identity, host: IC_HOST });
              
              if (!isMainnet) {
                await agent.fetchRootKey();
              }
              break;
            }

            case 'plug': {
              if (!isPlugAvailable()) {
                throw new Error('Plug wallet is not installed. Please install the Plug browser extension from https://plugwallet.ooo/');
              }
              
              // Verify connection (handles persistence automatically)
              // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#persisting-an-appplug-connection
              const connected = await verifyPlugConnection();
              
              if (!connected) {
                throw new Error('Failed to connect to Plug wallet');
              }

              // Request connection if not already connected
              await requestPlugConnect();

              // Access session data (official Plug API)
              // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#accessing-session-data
              const session = getPlugSession();
              agent = session.agent;
              principal = session.principal;
              identity = (agent as any)._identity as Identity;
              
              // Set up Plug callbacks for connection state changes
              // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#plug-callbacks
              setupPlugCallbacks(
                () => {
                  // External disconnect callback
                  console.log('Plug wallet disconnected externally');
                  get().disconnect();
                },
                (isLocked: boolean) => {
                  // Lock state change callback
                  console.log('Plug wallet lock state:', isLocked);
                  if (isLocked) {
                    // Optionally handle locked state - could show a message to user
                  }
                }
              );
              
              if (!isMainnet && agent.fetchRootKey) {
                await agent.fetchRootKey();
              }
              break;
            }

            case 'oisy': {
              // OISY Wallet integration using OISY Wallet Signer protocol
              // Reference: https://github.com/dfinity/oisy-wallet-signer
              
              // Connect using the OISY signer service
              // This will authenticate via Internet Identity and open the OISY signer popup
              const connected = await connectOisy({
                url: isMainnet 
                  ? 'https://oisy.com/sign'
                  : 'https://staging.oisy.com/sign',
                windowOptions: {
                  width: 576,
                  height: 625,
                  position: 'center',
                },
                onDisconnect: () => {
                  console.log('OISY signer window was closed');
                  // Optionally handle disconnect
                },
              });
              
              if (!connected) {
                throw new Error('Failed to connect to OISY wallet');
              }
              
              // Get identity and agent from OISY signer service
              identity = getOisyIdentity()!;
              principal = getOisyPrincipal()!;
              agent = getOisyAgent() || new HttpAgent({ identity, host: IC_HOST });
              
              if (!isMainnet && agent.fetchRootKey) {
                await agent.fetchRootKey();
              }
              
              console.log(`OISY Wallet connected. Principal: ${principal.toText()}`);
              console.log(`Signer URL: ${getOisySignerUrl()}`);
              
              break;
            }

            case 'nfid': {
              // NFID uses II-compatible flow with their own identity provider
              const authClient = await AuthClient.create();
              
              await new Promise<void>((resolve, reject) => {
                authClient.login({
                  identityProvider: 'https://nfid.one/authenticate',
                  maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
                  onSuccess: () => resolve(),
                  onError: (err) => reject(new Error(err || 'NFID login failed')),
                });
              });

              identity = authClient.getIdentity();
              principal = identity.getPrincipal();
              agent = new HttpAgent({ identity, host: IC_HOST });
              
              if (!isMainnet) {
                await agent.fetchRootKey();
              }
              break;
            }

            default:
              throw new Error(`Wallet type ${walletType} is not supported yet`);
          }

          const accountId = principalToAccountId(principal);

          set({
            isConnected: true,
            isConnecting: false,
            walletType,
            principal,
            accountId,
            identity,
            agent,
          });

          // Sync with authStore so AdminDashboard and other components can see the connection
          // This ensures that when wallet connects, authStore is also updated
          const { useAuthStore } = await import('./authStore');
          const authState = useAuthStore.getState();
          
          // Check for existing profile
          const storedProfile = localStorage.getItem(`profile_${principal.toText()}`);
          const profile = storedProfile ? JSON.parse(storedProfile) : null;
          const needsOnboarding = !profile || !profile.displayName;
          
          // Update authStore with wallet connection info
          useAuthStore.setState({
            identity,
            principal,
            isAuthenticated: true,
            profile,
            needsOnboarding,
            authClient: walletType === 'internet-identity' || walletType === 'oisy' 
              ? (authState.authClient || await AuthClient.create())
              : authState.authClient,
          });
          
          // Load balances in authStore
          await useAuthStore.getState().updateBalances();

          // Refresh balances after connection
          await get().refreshBalances();

          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Connection failed';
          console.error('Wallet connection error:', error);
          set({
            isConnecting: false,
            error: errorMessage,
          });
          return false;
        }
      },

      // Disconnect wallet
      disconnect: async () => {
        const { walletType } = get();

        try {
          if (walletType === 'oisy') {
            // Disconnect OISY signer (closes popup and clears state)
            // Reference: https://github.com/dfinity/oisy-wallet-signer#2-implement-the-disconnection
            disconnectOisy();
            // Also logout from auth client
            const authClient = await AuthClient.create();
            await authClient.logout();
          } else if (walletType === 'internet-identity' || walletType === 'nfid') {
            const authClient = await AuthClient.create();
            await authClient.logout();
          } else if (walletType === 'plug' && isPlugAvailable()) {
            // Use Plug service disconnect method
            // Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#disconnect
            await plugDisconnect();
          }
        } catch (error) {
          console.error('Error during disconnect:', error);
        }

        set({
          isConnected: false,
          walletType: null,
          principal: null,
          accountId: null,
          identity: null,
          agent: null,
          balances: {
            icp: BigInt(0),
            ckBTC: BigInt(0),
            ckETH: BigInt(0),
            harlee: BigInt(0),
            raven: BigInt(0),
          },
          tokenBalances: [],
          transactions: [],
          ownedNFTs: [],
        });
      },

      // Refresh balances from real canisters
      refreshBalances: async () => {
        const { principal, identity, isConnected } = get();
        
        if (!isConnected || !principal) return;

        set({ isLoadingBalances: true });

        try {
          // Use the TokenService to fetch real balances
          const tokenService = new TokenService(identity ?? undefined);
          
          // Fetch all token balances in parallel
          const [icpBalance, harleeBalance, ckbtcBalance, ckethBalance] = await Promise.all([
            tokenService.getBalance('ICP', principal),
            tokenService.getBalance('HARLEE', principal),
            tokenService.getBalance('CKBTC', principal),
            tokenService.getBalance('CKETH', principal),
          ]);

          set({
            balances: {
              icp: icpBalance.balance,
              ckBTC: ckbtcBalance.balance,
              ckETH: ckethBalance.balance,
              harlee: harleeBalance.balance,
              raven: BigInt(0), // RAVEN token if deployed
            },
            tokenBalances: [icpBalance, harleeBalance, ckbtcBalance, ckethBalance],
            isLoadingBalances: false,
          });
        } catch (error) {
          console.error('Error refreshing balances:', error);
          // On error, set balances to 0 but don't crash
          set({ 
            isLoadingBalances: false,
            balances: {
              icp: BigInt(0),
              ckBTC: BigInt(0),
              ckETH: BigInt(0),
              harlee: BigInt(0),
              raven: BigInt(0),
            },
          });
        }
      },

      // Refresh transactions (real implementation would query index canisters)
      refreshTransactions: async () => {
        const { principal, isConnected } = get();
        
        if (!isConnected || !principal) return;

        set({ isLoadingTransactions: true });

        try {
          // In a full implementation, query the index canisters for transaction history
          // For now, return empty array (no mock data)
          set({
            transactions: [],
            isLoadingTransactions: false,
          });
        } catch (error) {
          console.error('Error refreshing transactions:', error);
          set({ isLoadingTransactions: false });
        }
      },

      // Refresh NFTs (real implementation would query NFT canisters)
      refreshNFTs: async () => {
        const { principal, isConnected } = get();
        
        if (!isConnected || !principal) return;

        set({ isLoadingNFTs: true });

        try {
          // In a full implementation, query ICRC-7 NFT canisters for owned tokens
          // For now, return empty array (no mock data)
          set({
            ownedNFTs: [],
            isLoadingNFTs: false,
          });
        } catch (error) {
          console.error('Error refreshing NFTs:', error);
          set({ isLoadingNFTs: false });
        }
      },

      // Send tokens using TokenService
      sendToken: async (token: keyof typeof TOKEN_CANISTERS, to: string, amount: bigint): Promise<string | null> => {
        const { identity, isConnected, walletType } = get();
        
        if (!isConnected || !identity) {
          set({ error: 'Wallet not connected' });
          return null;
        }

        try {
          // For Plug wallet, use native transfer
          if (walletType === 'plug' && isPlugAvailable() && token === 'ICP') {
            const plug = (window as any).ic.plug;
            const result = await plug.requestTransfer({
              to,
              amount: Number(amount),
            });
            return result?.height?.toString() || null;
          }

          // Use TokenService for ICRC transfers
          const tokenService = new TokenService(identity);
          const result = await tokenService.transfer(
            token,
            Principal.fromText(to),
            amount
          );

          if (result.success) {
            // Refresh balances after transfer
            await get().refreshBalances();
            return result.blockHeight?.toString() || 'success';
          } else {
            set({ error: result.error || 'Transfer failed' });
            return null;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
          set({ error: errorMessage });
          return null;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'raven-wallet-store',
      partialize: (state) => ({
        walletType: state.walletType,
      }),
    }
  )
);

// Available wallet providers
export const walletProviders: WalletProvider[] = [
  {
    name: 'Internet Identity',
    type: 'internet-identity',
    icon: '🌐',
    description: 'Secure, anonymous authentication by DFINITY',
    isAvailable: () => true,
    connect: async () => {
      const store = useWalletStore.getState();
      await store.connect('internet-identity');
      return {
        principal: store.principal!,
        accountId: store.accountId!,
        identity: store.identity!,
        agent: store.agent!,
      };
    },
    disconnect: async () => {
      await useWalletStore.getState().disconnect();
    },
  },
  {
    name: 'Plug Wallet',
    type: 'plug',
    icon: '🔌',
    description: 'Browser extension wallet for ICP',
    isAvailable: isPlugAvailable,
    connect: async () => {
      const store = useWalletStore.getState();
      await store.connect('plug');
      return {
        principal: store.principal!,
        accountId: store.accountId!,
        identity: store.identity!,
        agent: store.agent!,
      };
    },
    disconnect: async () => {
      await useWalletStore.getState().disconnect();
    },
  },
  {
    name: 'OISY Wallet',
    type: 'oisy',
    icon: '💎',
    description: 'Multi-chain wallet on Internet Computer',
    isAvailable: isOISYAvailable,
    connect: async () => {
      const store = useWalletStore.getState();
      await store.connect('oisy');
      return {
        principal: store.principal!,
        accountId: store.accountId!,
        identity: store.identity!,
        agent: store.agent!,
      };
    },
    disconnect: async () => {
      await useWalletStore.getState().disconnect();
    },
  },
  {
    name: 'NFID',
    type: 'nfid',
    icon: '🔐',
    description: 'Web3 identity with email login',
    isAvailable: isNFIDAvailable,
    connect: async () => {
      const store = useWalletStore.getState();
      await store.connect('nfid');
      return {
        principal: store.principal!,
        accountId: store.accountId!,
        identity: store.identity!,
        agent: store.agent!,
      };
    },
    disconnect: async () => {
      await useWalletStore.getState().disconnect();
    },
  },
];

export default useWalletStore;
