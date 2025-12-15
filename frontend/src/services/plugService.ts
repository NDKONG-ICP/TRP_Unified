/**
 * Plug Wallet Service
 * Robust integration following official Plug documentation
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/
 */

import { Principal } from '@dfinity/principal';
import { Actor, HttpAgent } from '@dfinity/agent';
import { getAllCanisterIds, getICHost, getCanisterId } from './canisterConfig';

// Plug window interface
interface PlugWindow {
  ic?: {
    plug?: PlugAPI;
  };
}

interface PlugAPI {
  requestConnect: (options?: PlugConnectOptions) => Promise<PublicKey | null>;
  isConnected: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  agent: HttpAgent;
  principalId: string;
  accountId: string;
  isWalletLocked: boolean;
  createActor: <T>(options: CreateActorOptions) => Promise<T>;
  onExternalDisconnect: (callback: () => void) => void;
  onLockStateChange: (callback: (isLocked: boolean) => void) => void;
}

interface PlugConnectOptions {
  whitelist?: string[];
  host?: string;
  timeout?: number;
}

interface PublicKey {
  rawKey: Uint8Array;
  derKey: Uint8Array;
}

interface CreateActorOptions {
  canisterId: string;
  interfaceFactory: any;
}

/**
 * Check if Plug wallet is available
 */
export function isPlugAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const plugWindow = window as unknown as PlugWindow;
  return !!(plugWindow.ic?.plug);
}

/**
 * Get Plug API instance
 */
export function getPlugAPI(): PlugAPI {
  if (!isPlugAvailable()) {
    throw new Error('Plug wallet is not installed. Please install from https://plugwallet.ooo/');
  }
  return (window as unknown as PlugWindow).ic!.plug!;
}

/**
 * Check if Plug is connected
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#isconnected
 */
export async function isPlugConnected(): Promise<boolean> {
  if (!isPlugAvailable()) return false;
  try {
    return await getPlugAPI().isConnected();
  } catch (error) {
    console.error('Error checking Plug connection:', error);
    return false;
  }
}

/**
 * Request connection to Plug wallet
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#requestconnect
 */
export async function requestPlugConnect(): Promise<PublicKey | null> {
  if (!isPlugAvailable()) {
    throw new Error('Plug wallet is not installed. Please install from https://plugwallet.ooo/');
  }

  const plug = getPlugAPI();
  
  // Check if already connected (persistence)
  const connected = await plug.isConnected();
  if (connected) {
    console.log('Plug already connected');
    return null; // Already connected, no need to request again
  }

  // Get all canister IDs for whitelist
  const whitelist = getAllCanisterIds();
  const host = getICHost();

  try {
    const publicKey = await plug.requestConnect({
      whitelist,
      host,
      timeout: 50000,
    });

    return publicKey;
  } catch (error) {
    console.error('Plug connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from Plug wallet
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#disconnect
 */
export async function disconnectPlug(): Promise<void> {
  if (!isPlugAvailable()) return;
  
  try {
    await getPlugAPI().disconnect();
  } catch (error) {
    console.error('Error disconnecting Plug:', error);
  }
}

/**
 * Get Plug session data
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#accessing-session-data
 */
export function getPlugSession() {
  if (!isPlugAvailable()) {
    throw new Error('Plug wallet is not available');
  }

  const plug = getPlugAPI();
  
  // Check if session data is available
  if (!plug.principalId) {
    throw new Error('Plug wallet is not connected');
  }
  
  return {
    agent: plug.agent,
    principalId: plug.principalId,
    accountId: plug.accountId,
    isWalletLocked: plug.isWalletLocked,
    principal: Principal.fromText(plug.principalId),
  };
}

/**
 * Create an actor for a canister using Plug
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/
 * Note: Plug's createActor uses the whitelisted agent automatically
 */
export async function createPlugActor<T>(
  canisterId: string | Principal,
  interfaceFactory: any
): Promise<T> {
  if (!isPlugAvailable()) {
    throw new Error('Plug wallet is not available');
  }

  const plug = getPlugAPI();
  const canisterIdString = typeof canisterId === 'string' 
    ? canisterId 
    : canisterId.toText();

  try {
    const actor = await plug.createActor<T>({
      canisterId: canisterIdString,
      interfaceFactory,
    });

    return actor;
  } catch (error) {
    console.error('Error creating Plug actor:', error);
    throw error;
  }
}

/**
 * Set up Plug callbacks
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#plug-callbacks
 */
export function setupPlugCallbacks(
  onDisconnect?: () => void,
  onLockStateChange?: (isLocked: boolean) => void
): () => void {
  if (!isPlugAvailable()) return () => {};

  const plug = getPlugAPI();

  // Set up external disconnect callback
  if (onDisconnect) {
    plug.onExternalDisconnect(() => {
      console.log('Plug wallet disconnected externally');
      onDisconnect();
    });
  }

  // Set up lock state change callback
  if (onLockStateChange) {
    plug.onLockStateChange((isLocked: boolean) => {
      console.log('Plug wallet lock state changed:', isLocked);
      onLockStateChange(isLocked);
    });
  }

  // Return cleanup function
  return () => {
    // Plug doesn't provide a way to remove callbacks, but we can track them
    console.log('Plug callbacks cleanup');
  };
}

/**
 * Verify and persist Plug connection
 * Reference: https://docs.plugwallet.ooo/developer-guides/connect-to-plug/#persisting-an-appplug-connection
 */
export async function verifyPlugConnection(): Promise<boolean> {
  if (!isPlugAvailable()) return false;

  const connected = await isPlugConnected();
  
  if (!connected) {
    try {
      await requestPlugConnect();
      return true;
    } catch (error) {
      console.error('Failed to reconnect Plug:', error);
      return false;
    }
  }

  return true;
}

/**
 * Get Plug wallet balance (ICP)
 */
export async function getPlugBalance(): Promise<bigint> {
  if (!isPlugAvailable()) {
    throw new Error('Plug wallet is not available');
  }

  const plug = getPlugAPI();
  
  try {
    // Plug provides balance through its agent
    // This is a simplified version - in production, query the ledger canister
    return BigInt(0); // Placeholder - would query ICP ledger
  } catch (error) {
    console.error('Error getting Plug balance:', error);
    return BigInt(0);
  }
}

