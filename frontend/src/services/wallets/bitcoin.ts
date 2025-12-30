/**
 * Bitcoin Wallet Service
 * Supports Unisat, Xverse, and other Bitcoin wallets
 */

export interface BitcoinWallet {
  address: string;
  publicKey?: string;
}

export interface BitcoinConnection {
  wallet: BitcoinWallet;
  isConnected: boolean;
}

/**
 * Check if Unisat is installed
 */
export function isUnisatInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).unisat !== 'undefined';
}

/**
 * Get Unisat provider
 */
export function getUnisatProvider(): any {
  if (!isUnisatInstalled()) {
    return null;
  }
  
  return (window as any).unisat;
}

/**
 * Connect to Unisat
 */
export async function connectUnisat(): Promise<BitcoinConnection> {
  if (!isUnisatInstalled()) {
    throw new Error('Unisat is not installed. Please install Unisat extension.');
  }

  const provider = getUnisatProvider()!;
  
  try {
    // Request account access
    const accounts = await provider.requestAccounts();
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    const address = accounts[0];
    
    return {
      wallet: {
        address,
      },
      isConnected: true,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw new Error(`Failed to connect to Unisat: ${error.message}`);
  }
}

/**
 * Disconnect from Unisat
 */
export async function disconnectUnisat(): Promise<void> {
  // Unisat doesn't have a disconnect method
  // The wallet will remain connected until user disconnects manually
}

/**
 * Get current Unisat connection
 */
export async function getUnisatConnection(): Promise<BitcoinConnection | null> {
  if (!isUnisatInstalled()) {
    return null;
  }

  try {
    const provider = getUnisatProvider()!;
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
    console.error('Error getting Unisat connection:', error);
    return null;
  }
}

/**
 * Sign a message with Unisat
 */
export async function signMessage(message: string): Promise<string> {
  if (!isUnisatInstalled()) {
    throw new Error('Unisat is not installed');
  }

  const provider = getUnisatProvider()!;
  
  try {
    const signature = await provider.signMessage(message);
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    }
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get BTC balance
 */
export async function getBTCBalance(address: string): Promise<number> {
  try {
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    const data = await response.json();
    return (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000; // Convert satoshis to BTC
  } catch (error) {
    console.error('Error getting BTC balance:', error);
    return 0;
  }
}

/**
 * Check if Xverse is installed
 */
export function isXverseInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).XverseProviders !== 'undefined';
}

/**
 * Connect to Xverse
 */
export async function connectXverse(): Promise<BitcoinConnection> {
  if (!isXverseInstalled()) {
    throw new Error('Xverse is not installed. Please install Xverse extension.');
  }

  try {
    const provider = (window as any).XverseProviders.BitcoinProvider;
    const response = await provider.request('getAccounts', {});
    
    if (!response || !response.accounts || response.accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    return {
      wallet: {
        address: response.accounts[0],
      },
      isConnected: true,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw new Error(`Failed to connect to Xverse: ${error.message}`);
  }
}

/**
 * Sign message with Xverse
 */
export async function signMessageXverse(message: string): Promise<string> {
  if (!isXverseInstalled()) {
    throw new Error('Xverse is not installed');
  }

  try {
    const provider = (window as any).XverseProviders.BitcoinProvider;
    const response = await provider.request('signMessage', {
      address: (await getXverseConnection())?.wallet.address,
      message,
    });
    return response.signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    }
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get Xverse connection
 */
export async function getXverseConnection(): Promise<BitcoinConnection | null> {
  if (!isXverseInstalled()) {
    return null;
  }

  try {
    const provider = (window as any).XverseProviders.BitcoinProvider;
    const response = await provider.request('getAccounts', {});
    
    if (!response || !response.accounts || response.accounts.length === 0) {
      return null;
    }
    
    return {
      wallet: {
        address: response.accounts[0],
      },
      isConnected: true,
    };
  } catch (error) {
    console.error('Error getting Xverse connection:', error);
    return null;
  }
}

