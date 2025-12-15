/**
 * OISY Wallet Signer Service
 * Implements the OISY Wallet Signer protocol for transaction signing
 * Based on: https://github.com/dfinity/oisy-wallet-signer
 * 
 * The OISY Wallet Signer allows dApps to communicate with OISY Wallet
 * for signing transactions without requiring users to share their keys.
 */

import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Identity } from '@dfinity/agent';

// OISY Signer URLs
const OISY_SIGNER_URL_MAINNET = 'https://oisy.com/sign';
const OISY_SIGNER_URL_STAGING = 'https://staging.oisy.com/sign';
const OISY_WALLET_URL = 'https://oisy.com';

// Default window features for signer popup
export const DEFAULT_SIGNER_WINDOW_FEATURES = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes';

// Connection timeouts
const CONNECTION_TIMEOUT_MS = 30000;
const POLLING_INTERVAL_MS = 500;

// ICRC-21 Standard message types (used by OISY signer protocol)
export enum IcrcMethod {
  icrc1_transfer = 'icrc1_transfer',
  icrc2_approve = 'icrc2_approve',
  icrc21_canister_call_consent_message = 'icrc21_canister_call_consent_message',
  icrc25_request_permissions = 'icrc25_request_permissions',
  icrc25_permissions = 'icrc25_permissions',
  icrc25_supported_standards = 'icrc25_supported_standards',
  icrc27_accounts = 'icrc27_accounts',
  icrc29_status = 'icrc29_status',
  icrc34_delegation = 'icrc34_delegation',
  icrc49_call_canister = 'icrc49_call_canister',
}

// Signer request/response types
export interface SignerRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: unknown;
}

export interface SignerResponse {
  jsonrpc: '2.0';
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface IcrcAccount {
  owner: Principal;
  subaccount?: Uint8Array;
}

export interface OisyConnectionOptions {
  url?: string;
  windowOptions?: {
    width?: number;
    height?: number;
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    features?: string;
  };
  connectionOptions?: {
    timeoutMs?: number;
    pollingIntervalMs?: number;
  };
  onDisconnect?: () => void;
}

export interface TransferRequest {
  to: {
    owner: Principal;
    subaccount?: Uint8Array;
  };
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  created_at_time?: bigint;
  from_subaccount?: Uint8Array;
}

/**
 * OISY Wallet Signer Service
 * Manages connection and communication with OISY Wallet signer
 */
class OisySignerService {
  private signerWindow: Window | null = null;
  private messageHandlers: Map<string, (response: SignerResponse) => void> = new Map();
  private messageIdCounter = 0;
  private isConnected = false;
  private connectionOptions: OisyConnectionOptions = {};
  private pollingInterval: NodeJS.Timeout | null = null;
  private accounts: IcrcAccount[] = [];
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;
  private principal: Principal | null = null;
  private agent: HttpAgent | null = null;

  constructor() {
    // Listen for messages from signer window
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleMessage.bind(this));
    }
  }

  /**
   * Check if OISY signer is available
   */
  isOisyAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  /**
   * Check if currently connected to OISY signer
   */
  isOisyConnected(): boolean {
    return this.isConnected && this.signerWindow !== null && !this.signerWindow.closed;
  }

  /**
   * Get the connected accounts
   */
  getAccounts(): IcrcAccount[] {
    return this.accounts;
  }

  /**
   * Get the connected principal
   */
  getPrincipal(): Principal | null {
    return this.principal;
  }

  /**
   * Get the connected identity
   */
  getIdentity(): Identity | null {
    return this.identity;
  }

  /**
   * Get the HTTP agent
   */
  getAgent(): HttpAgent | null {
    return this.agent;
  }

  /**
   * Get the OISY signer URL
   */
  getSignerUrl(): string {
    return this.connectionOptions.url || OISY_SIGNER_URL_MAINNET;
  }

  /**
   * Connect to OISY Wallet
   * Uses Internet Identity for authentication
   * The signer window is optional - if it fails, we still have a valid II session
   * Based on: https://github.com/dfinity/oisy-wallet-signer
   */
  async connect(options: OisyConnectionOptions = {}): Promise<boolean> {
    this.connectionOptions = options;

    try {
      // First, authenticate via Internet Identity (OISY uses II)
      this.authClient = await AuthClient.create();
      const isAuthenticated = await this.authClient.isAuthenticated();

      if (!isAuthenticated) {
        // Authenticate via Internet Identity
        await new Promise<void>((resolve, reject) => {
          this.authClient!.login({
            identityProvider: 'https://identity.ic0.app',
            maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
            onSuccess: () => resolve(),
            onError: (err) => reject(new Error(err || 'Internet Identity authentication failed')),
          });
        });
      }

      this.identity = this.authClient.getIdentity();
      this.principal = this.identity.getPrincipal();
      this.agent = new HttpAgent({ identity: this.identity, host: 'https://icp0.io' });

      // Set connected immediately after successful II authentication
      // The signer window is for advanced transaction signing, but basic auth works without it
      this.isConnected = true;
      this.accounts = [{ owner: this.principal }];
      
      // OISY Wallet connected via Internet Identity

      // Try to open the OISY signer window for advanced features (optional)
      try {
        const signerUrl = options.url || OISY_SIGNER_URL_MAINNET;
        const windowOptions = options.windowOptions || {};
        const width = windowOptions.width || 576;
        const height = windowOptions.height || 625;
        
        // Calculate window position
        let left = 0;
        let top = 0;
        if (typeof window !== 'undefined') {
          const position = windowOptions.position || 'center';
          switch (position) {
            case 'center':
              left = (window.screen.width - width) / 2;
              top = (window.screen.height - height) / 2;
              break;
            case 'top-right':
              left = window.screen.width - width;
              top = 0;
              break;
            case 'bottom-right':
              left = window.screen.width - width;
              top = window.screen.height - height;
              break;
            case 'bottom-left':
              left = 0;
              top = window.screen.height - height;
              break;
            default: // top-left
              left = 0;
              top = 0;
          }
        }

        const features = windowOptions.features || 
          `width=${width},height=${height},left=${left},top=${top},${DEFAULT_SIGNER_WINDOW_FEATURES}`;

        // Open signer window in background - don't block on it
        this.signerWindow = window.open(signerUrl, 'oisy-signer', features);

        if (this.signerWindow) {
          // Try to establish signer connection (non-blocking)
          const pollingIntervalMs = options.connectionOptions?.pollingIntervalMs || POLLING_INTERVAL_MS;
          this.startPolling(pollingIntervalMs, options.onDisconnect);
          
          // Immediately send status check to acknowledge the signer window
          // This tells OISY that the dapp is ready and listening
          // The signer window shows "Waiting on dapp" until we send this
          setTimeout(async () => {
            try {
              // Wait a bit for the signer window to fully load
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Send status check first - this acknowledges the connection and clears "Waiting on dapp"
              const status = await this.sendRequest(IcrcMethod.icrc29_status, {}) as { version: string; [key: string]: unknown };
              // OISY signer connection acknowledged
              
              // Then request permissions and accounts
              try {
                await this.requestPermissions();
                const accounts = await this.requestAccounts();
                if (accounts.length > 0) {
                  this.accounts = accounts;
                  // OISY accounts loaded successfully
                }
              } catch (permError) {
                // OISY permissions/accounts not available, using basic II auth
              }
            } catch (e) {
              // OISY signer status check failed, using basic II auth
              // This is fine - we still have valid II authentication
            }
          }, 800); // Reduced delay to respond faster
        }
      } catch (signerError) {
        console.log('OISY signer window not available, using Internet Identity authentication');
        // This is fine - we still have valid II authentication
      }

      return true;
    } catch (error) {
      console.error('OISY connection error:', error);
      this.disconnect();
      throw error;
    }
  }

  /**
   * Wait for the signer window to be ready
   */
  private async waitForConnection(timeoutMs: number, pollingIntervalMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkConnection = () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Connection timeout: OISY signer window did not respond'));
          return;
        }

        if (this.signerWindow && !this.signerWindow.closed) {
          // Try to send a status request
          this.sendRequest(IcrcMethod.icrc29_status, {})
            .then(() => resolve())
            .catch(() => {
              setTimeout(checkConnection, pollingIntervalMs);
            });
        } else {
          reject(new Error('OISY signer window was closed'));
        }
      };

      // Give the window time to load before starting checks
      setTimeout(checkConnection, 1000);
    });
  }

  /**
   * Start polling to check if signer window is still open
   */
  private startPolling(intervalMs: number, onDisconnect?: () => void): void {
    this.pollingInterval = setInterval(() => {
      if (this.signerWindow && this.signerWindow.closed) {
        this.handleDisconnect(onDisconnect);
      }
    }, intervalMs);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(onDisconnect?: () => void): void {
    this.isConnected = false;
    this.signerWindow = null;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (onDisconnect) {
      onDisconnect();
    }
  }

  /**
   * Disconnect from OISY Wallet
   * Based on: https://github.com/dfinity/oisy-wallet-signer#2-implement-the-disconnection
   */
  disconnect(): void {
    if (this.signerWindow && !this.signerWindow.closed) {
      this.signerWindow.close();
    }

    this.handleDisconnect(this.connectionOptions.onDisconnect);
    this.messageHandlers.clear();
    this.accounts = [];
    this.principal = null;
    this.identity = null;
    this.agent = null;
  }

  /**
   * Send a request to the signer window
   */
  private sendRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.signerWindow || this.signerWindow.closed) {
        reject(new Error('OISY signer window is not available'));
        return;
      }

      const id = `req-${++this.messageIdCounter}-${Date.now()}`;
      const request: SignerRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      // Set up response handler
      this.messageHandlers.set(id, (response: SignerResponse) => {
        this.messageHandlers.delete(id);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });

      // Send message to signer window
      this.signerWindow.postMessage(request, '*');

      // Set timeout for response
      setTimeout(() => {
        if (this.messageHandlers.has(id)) {
          this.messageHandlers.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Handle messages from signer window
   */
  private handleMessage(event: MessageEvent): void {
    // Verify origin for security
    if (!event.origin.includes('oisy.com')) {
      return;
    }

    const response = event.data as SignerResponse;
    if (response.jsonrpc === '2.0' && response.id) {
      const handler = this.messageHandlers.get(response.id);
      if (handler) {
        handler(response);
      }
    }
  }

  /**
   * Request permissions from OISY signer
   * Based on: https://github.com/dfinity/oisy-wallet-signer#3-request-permissions-and-accounts
   */
  async requestPermissions(): Promise<{ allPermissionsGranted: boolean }> {
    try {
      const result = await this.sendRequest(IcrcMethod.icrc25_request_permissions, {
        scopes: [
          { method: IcrcMethod.icrc1_transfer },
          { method: IcrcMethod.icrc2_approve },
          { method: IcrcMethod.icrc27_accounts },
          { method: IcrcMethod.icrc49_call_canister },
        ],
      }) as { scopes: unknown[] };

      return {
        allPermissionsGranted: result.scopes?.length > 0,
      };
    } catch (error) {
      // OISY signer permissions are optional - basic II auth still works
      // OISY signer permissions not granted - using basic auth
      return { allPermissionsGranted: false };
    }
  }

  /**
   * Request accounts from OISY signer
   * Based on: https://github.com/dfinity/oisy-wallet-signer#3-request-permissions-and-accounts
   */
  async requestAccounts(): Promise<IcrcAccount[]> {
    try {
      const result = await this.sendRequest(IcrcMethod.icrc27_accounts, {}) as {
        accounts: Array<{
          owner: string;
          subaccount?: number[];
        }>;
      };

      return result.accounts?.map((acc) => ({
        owner: Principal.fromText(acc.owner),
        subaccount: acc.subaccount ? new Uint8Array(acc.subaccount) : undefined,
      })) || [];
    } catch (error) {
      // OISY signer accounts request is optional - use II principal as fallback
      // OISY signer accounts not available - using II principal
      // Return authenticated principal as fallback
      if (this.principal) {
        return [{ owner: this.principal }];
      }
      return [];
    }
  }

  /**
   * Perform ICRC-1 transfer via OISY signer
   * Based on: https://github.com/dfinity/oisy-wallet-signer#4-call-canister
   */
  async icrc1Transfer(
    canisterId: string,
    fromAccount: IcrcAccount,
    request: TransferRequest
  ): Promise<bigint> {
    if (!this.isOisyConnected()) {
      throw new Error('OISY signer is not connected');
    }

    const result = await this.sendRequest(IcrcMethod.icrc49_call_canister, {
      canisterId,
      method: IcrcMethod.icrc1_transfer,
      arg: {
        from_subaccount: request.from_subaccount,
        to: {
          owner: request.to.owner.toText(),
          subaccount: request.to.subaccount ? Array.from(request.to.subaccount) : undefined,
        },
        amount: request.amount.toString(),
        fee: request.fee?.toString(),
        memo: request.memo ? Array.from(request.memo) : undefined,
        created_at_time: request.created_at_time?.toString(),
      },
    }) as { Ok: string } | { Err: unknown };

    if ('Err' in (result as { Err: unknown })) {
      throw new Error(`Transfer failed: ${JSON.stringify((result as { Err: unknown }).Err)}`);
    }

    return BigInt((result as { Ok: string }).Ok);
  }

  /**
   * Perform generic canister call via OISY signer
   */
  async callCanister(
    canisterId: string,
    method: string,
    arg: unknown
  ): Promise<unknown> {
    if (!this.isOisyConnected()) {
      throw new Error('OISY signer is not connected');
    }

    return this.sendRequest(IcrcMethod.icrc49_call_canister, {
      canisterId,
      method,
      arg,
    });
  }

  /**
   * Open OISY wallet in a new tab (for manual management)
   */
  openOisyWallet(): void {
    window.open(OISY_WALLET_URL, '_blank');
  }
}

// Export singleton instance
export const oisySignerService = new OisySignerService();

// Export convenience functions
export const isOisyAvailable = () => oisySignerService.isOisyAvailable();
export const isOisyConnected = () => oisySignerService.isOisyConnected();
export const connectOisy = (options?: OisyConnectionOptions) => oisySignerService.connect(options);
export const disconnectOisy = () => oisySignerService.disconnect();
export const getOisyAccounts = () => oisySignerService.getAccounts();
export const getOisyPrincipal = () => oisySignerService.getPrincipal();
export const getOisyIdentity = () => oisySignerService.getIdentity();
export const getOisyAgent = () => oisySignerService.getAgent();
export const getOisySignerUrl = () => oisySignerService.getSignerUrl();
export const openOisyWallet = () => oisySignerService.openOisyWallet();
export const oisyIcrc1Transfer = (
  canisterId: string,
  fromAccount: IcrcAccount,
  request: TransferRequest
) => oisySignerService.icrc1Transfer(canisterId, fromAccount, request);
export const oisyCallCanister = (
  canisterId: string,
  method: string,
  arg: unknown
) => oisySignerService.callCanister(canisterId, method, arg);

