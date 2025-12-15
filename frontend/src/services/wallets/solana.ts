/**
 * Solana Wallet Service
 * Supports Phantom, Solflare, and other Solana wallets
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface SolanaWallet {
  address: string;
  publicKey: PublicKey;
  connection: Connection;
}

export interface SolanaConnection {
  wallet: SolanaWallet;
  isConnected: boolean;
}

/**
 * Check if Phantom is installed
 */
export function isPhantomInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).solana !== 'undefined' && (window as any).solana.isPhantom;
}

/**
 * Get Phantom provider
 */
export function getPhantomProvider(): any {
  if (!isPhantomInstalled()) {
    return null;
  }
  
  return (window as any).solana;
}

/**
 * Connect to Phantom
 */
export async function connectPhantom(): Promise<SolanaConnection> {
  if (!isPhantomInstalled()) {
    throw new Error('Phantom is not installed. Please install Phantom extension.');
  }

  const provider = getPhantomProvider()!;
  
  try {
    // Request connection
    const response = await provider.connect();
    const publicKey = new PublicKey(response.publicKey);
    
    // Create connection to Solana network
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    return {
      wallet: {
        address: publicKey.toBase58(),
        publicKey,
        connection,
      },
      isConnected: true,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw new Error(`Failed to connect to Phantom: ${error.message}`);
  }
}

/**
 * Disconnect from Phantom
 */
export async function disconnectPhantom(): Promise<void> {
  if (!isPhantomInstalled()) {
    return;
  }

  const provider = getPhantomProvider()!;
  try {
    await provider.disconnect();
  } catch (error) {
    console.error('Error disconnecting Phantom:', error);
  }
}

/**
 * Get current Phantom connection
 */
export async function getPhantomConnection(): Promise<SolanaConnection | null> {
  if (!isPhantomInstalled()) {
    return null;
  }

  try {
    const provider = getPhantomProvider()!;
    
    if (!provider.isConnected) {
      return null;
    }
    
    const publicKey = new PublicKey(provider.publicKey.toBase58());
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    return {
      wallet: {
        address: publicKey.toBase58(),
        publicKey,
        connection,
      },
      isConnected: true,
    };
  } catch (error) {
    console.error('Error getting Phantom connection:', error);
    return null;
  }
}

/**
 * Sign a message with Phantom
 */
export async function signMessage(message: string): Promise<Uint8Array> {
  if (!isPhantomInstalled()) {
    throw new Error('Phantom is not installed');
  }

  const provider = getPhantomProvider()!;
  
  if (!provider.isConnected) {
    throw new Error('Phantom is not connected');
  }
  
  try {
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
    return signedMessage.signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    }
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get SOL balance
 */
export async function getSOLBalance(address: string): Promise<number> {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return balance / 1e9; // Convert lamports to SOL
}

/**
 * Sign a transaction
 */
export async function signTransaction(transaction: Transaction | VersionedTransaction): Promise<Transaction | VersionedTransaction> {
  if (!isPhantomInstalled()) {
    throw new Error('Phantom is not installed');
  }

  const provider = getPhantomProvider()!;
  
  if (!provider.isConnected) {
    throw new Error('Phantom is not connected');
  }
  
  try {
    const signed = await provider.signTransaction(transaction);
    return signed;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the transaction');
    }
    throw new Error(`Failed to sign transaction: ${error.message}`);
  }
}

/**
 * Listen for account changes
 */
export function onAccountChange(callback: (publicKey: PublicKey | null) => void): () => void {
  if (!isPhantomInstalled()) {
    return () => {};
  }

  const provider = getPhantomProvider()!;
  provider.on('accountChanged', (publicKey: PublicKey | null) => {
    callback(publicKey);
  });
  
  return () => {
    provider.removeListener('accountChanged', callback);
  };
}

/**
 * Listen for disconnect
 */
export function onDisconnect(callback: () => void): () => void {
  if (!isPhantomInstalled()) {
    return () => {};
  }

  const provider = getPhantomProvider()!;
  provider.on('disconnect', callback);
  
  return () => {
    provider.removeListener('disconnect', callback);
  };
}

