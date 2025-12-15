/**
 * Ethereum Wallet Service
 * Supports MetaMask and other Ethereum wallets
 */

import { ethers } from 'ethers';

export interface EthereumWallet {
  address: string;
  chainId: number;
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
}

export interface EthereumConnection {
  wallet: EthereumWallet;
  isConnected: boolean;
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
}

/**
 * Get MetaMask provider
 */
export function getMetaMaskProvider(): ethers.BrowserProvider | null {
  if (!isMetaMaskInstalled()) {
    return null;
  }
  
  return new ethers.BrowserProvider((window as any).ethereum);
}

/**
 * Connect to MetaMask
 */
export async function connectMetaMask(): Promise<EthereumConnection> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask extension.');
  }

  const provider = getMetaMaskProvider()!;
  
  try {
    // Request account access
    await provider.send('eth_requestAccounts', []);
    
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    
    return {
      wallet: {
        address,
        chainId: Number(network.chainId),
        provider,
        signer,
      },
      isConnected: true,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
}

/**
 * Disconnect from MetaMask
 */
export async function disconnectMetaMask(): Promise<void> {
  // MetaMask doesn't have a disconnect method, but we can clear local state
  // The wallet will remain connected until user disconnects manually
}

/**
 * Get current MetaMask connection
 */
export async function getMetaMaskConnection(): Promise<EthereumConnection | null> {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  try {
    const provider = getMetaMaskProvider()!;
    const accounts = await provider.send('eth_accounts', []);
    
    if (accounts.length === 0) {
      return null;
    }
    
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    
    return {
      wallet: {
        address,
        chainId: Number(network.chainId),
        provider,
        signer,
      },
      isConnected: true,
    };
  } catch (error) {
    console.error('Error getting MetaMask connection:', error);
    return null;
  }
}

/**
 * Sign a message with MetaMask
 */
export async function signMessage(message: string): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const provider = getMetaMaskProvider()!;
  const signer = await provider.getSigner();
  
  try {
    const signature = await signer.signMessage(message);
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request');
    }
    throw new Error(`Failed to sign message: ${error.message}`);
  }
}

/**
 * Get ETH balance
 */
export async function getETHBalance(address: string): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const provider = getMetaMaskProvider()!;
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Switch Ethereum network
 */
export async function switchNetwork(chainId: number): Promise<void> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await (window as any).ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      throw new Error(`Network with chainId ${chainId} is not added. Please add it manually.`);
    }
    throw error;
  }
}

/**
 * Listen for account changes
 */
export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  (window as any).ethereum.on('accountsChanged', callback);
  
  return () => {
    (window as any).ethereum.removeListener('accountsChanged', callback);
  };
}

/**
 * Listen for chain changes
 */
export function onChainChanged(callback: (chainId: string) => void): () => void {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  (window as any).ethereum.on('chainChanged', callback);
  
  return () => {
    (window as any).ethereum.removeListener('chainChanged', callback);
  };
}

