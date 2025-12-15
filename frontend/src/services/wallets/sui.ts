/**
 * Sui Wallet Service
 * Supports Sui Wallet and other Sui-compatible wallets
 */

export interface SuiWallet {
  address: string;
  publicKey?: string;
}

export interface SuiConnection {
  wallet: SuiWallet;
  isConnected: boolean;
}

/**
 * Check if Sui Wallet is installed
 */
export function isSuiWalletInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).suiWallet !== 'undefined';
}

/**
 * Get Sui Wallet provider
 */
export function getSuiWalletProvider(): any {
  if (!isSuiWalletInstalled()) {
    return null;
  }
  
  return (window as any).suiWallet;
}

/**
 * Connect to Sui Wallet
 */
export async function connectSuiWallet(): Promise<SuiConnection> {
  if (!isSuiWalletInstalled()) {
    throw new Error('Sui Wallet is not installed. Please install Sui Wallet extension.');
  }

  const provider = getSuiWalletProvider()!;
  
  try {
    // Request connection
    const response = await provider.connect();
    
    if (!response || !response.accounts || response.accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    return {
      wallet: {
        address: response.accounts[0],
        publicKey: response.publicKey,
      },
      isConnected: true,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw new Error(`Failed to connect to Sui Wallet: ${error.message}`);
  }
}

/**
 * Disconnect from Sui Wallet
 */
export async function disconnectSuiWallet(): Promise<void> {
  if (!isSuiWalletInstalled()) {
    return;
  }

  const provider = getSuiWalletProvider()!;
  try {
    await provider.disconnect();
  } catch (error) {
    console.error('Error disconnecting Sui Wallet:', error);
  }
}

/**
 * Get current Sui Wallet connection
 */
export async function getSuiWalletConnection(): Promise<SuiConnection | null> {
  if (!isSuiWalletInstalled()) {
    return null;
  }

  try {
    const provider = getSuiWalletProvider()!;
    const accounts = await provider.getAccounts();
    
    if (!accounts || accounts.length === 0) {
      return null;
    }
    
    return {
      wallet: {
        address: accounts[0],
      },
      isConnected: true,
    };
  } catch (error) {
    console.error('Error getting Sui Wallet connection:', error);
    return null;
  }
}

/**
 * Sign a message with Sui Wallet
 */
export async function signMessage(message: string): Promise<string> {
  if (!isSuiWalletInstalled()) {
    throw new Error('Sui Wallet is not installed');
  }

  const provider = getSuiWalletProvider()!;
  
  if (!provider.isConnected) {
    throw new Error('Sui Wallet is not connected');
  }
  
  try {
    const connection = await getSuiWalletConnection();
    if (!connection) {
      throw new Error('Not connected');
    }
    
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await provider.signMessage({
      message: encodedMessage,
    });
    
    return signature.signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    }
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get SUI balance
 */
export async function getSUIBalance(address: string): Promise<number> {
  // Query Sui network via RPC
  // This is a placeholder - in production, use Sui RPC
  try {
    const response = await fetch(`https://fullnode.mainnet.sui.io`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getBalance',
        params: [address],
      }),
    });
    const data = await response.json();
    return parseInt(data.result.totalBalance) / 1e9; // Convert MIST to SUI
  } catch (error) {
    console.error('Error getting SUI balance:', error);
    return 0;
  }
}

/**
 * Listen for account changes
 */
export function onAccountChange(callback: (address: string | null) => void): () => void {
  if (!isSuiWalletInstalled()) {
    return () => {};
  }

  const provider = getSuiWalletProvider()!;
  provider.on('accountChange', (address: string | null) => {
    callback(address);
  });
  
  return () => {
    provider.removeListener('accountChange', callback);
  };
}

/**
 * Listen for disconnect
 */
export function onDisconnect(callback: () => void): () => void {
  if (!isSuiWalletInstalled()) {
    return () => {};
  }

  const provider = getSuiWalletProvider()!;
  provider.on('disconnect', callback);
  
  return () => {
    provider.removeListener('disconnect', callback);
  };
}

