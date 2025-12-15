/**
 * AXIOM NFT Service - Backend Integration
 * Handles fetching AXIOM NFT metadata and multichain addresses
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { getICHost, isMainnet } from './canisterConfig';
// Import generated IDL factories for axiom canisters
import { idlFactory as axiom1Idl } from '../declarations/axiom_1';
import { idlFactory as axiom2Idl } from '../declarations/axiom_2';
import { idlFactory as axiom3Idl } from '../declarations/axiom_3';
import { idlFactory as axiom4Idl } from '../declarations/axiom_4';
import { idlFactory as axiom5Idl } from '../declarations/axiom_5';

// ============ TYPES ============

export interface MultichainMetadata {
  icpCanister: string;
  ethContract?: string;
  ethTokenId?: string;
  evmChainId?: bigint;
  erc1155Contract?: string;
  erc1155TokenId?: string;
  solMint?: string;
  solEdition?: string;
  btcInscription?: string;
  btcBrc20?: string;
  btcRunes?: string;
  tonCollection?: string;
  tonItem?: string;
  suiObjectId?: string;
  suiPackageId?: string;
  standards: string[];
  bridgeProtocol?: string;
  bridgeAddress?: string;
}

export interface AxiomMetadata {
  tokenId: bigint;
  name: string;
  description: string;
  imageUrl: string;
  owner: string;
  createdAt: bigint;
  personality: string;
  specialization: string;
  totalConversations: bigint;
  totalMessages: bigint;
  lastActive: bigint;
  multichainMetadata: MultichainMetadata;
}

// AXIOM Canister IDs (5 Genesis NFTs)
export const AXIOM_CANISTER_IDS = [
  'axiom_1', // Will be resolved from dfx.json or environment
  'axiom_2',
  'axiom_3',
  'axiom_4',
  'axiom_5',
] as const;

// Get the appropriate IDL factory based on canister ID
function getAxiomIdlFactory(canisterId: string) {
  const idlMap: Record<string, any> = {
    '46odg-5iaaa-aaaao-a4xqa-cai': axiom1Idl,
    '4zpfs-qqaaa-aaaao-a4xqq-cai': axiom2Idl,
    '4ckzx-kiaaa-aaaao-a4xsa-cai': axiom3Idl,
    '4fl7d-hqaaa-aaaao-a4xsq-cai': axiom4Idl,
    '4miu7-ryaaa-aaaao-a4xta-cai': axiom5Idl,
  };
  return idlMap[canisterId] || axiom1Idl; // Fallback to axiom1Idl
}

// ============ SERVICE ============

class AxiomService {
  private async createActor(canisterId: string) {
    const authClient = await AuthClient.create();
    const identity = authClient.getIdentity();

    const agent = new HttpAgent({
      identity,
      host: getICHost(),
    });

    if (!isMainnet()) {
      await agent.fetchRootKey();
    }

    // Use the generated IDL factory for this specific canister
    const idlFactory = getAxiomIdlFactory(canisterId);
    
    return Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(canisterId),
    });
  }

  // Convert backend multichain metadata to frontend format
  private convertMultichainMetadata(backend: any): MultichainMetadata {
    return {
      icpCanister: backend.icp_canister || String(backend.icp_canister),
      ethContract: backend.eth_contract?.[0],
      ethTokenId: backend.eth_token_id?.[0],
      evmChainId: backend.evm_chain_id?.[0],
      erc1155Contract: backend.erc1155_contract?.[0],
      erc1155TokenId: backend.erc1155_token_id?.[0],
      solMint: backend.sol_mint?.[0],
      solEdition: backend.sol_edition?.[0],
      btcInscription: backend.btc_inscription?.[0],
      btcBrc20: backend.btc_brc20?.[0],
      btcRunes: backend.btc_runes?.[0],
      tonCollection: backend.ton_collection?.[0],
      tonItem: backend.ton_item?.[0],
      suiObjectId: backend.sui_object_id?.[0],
      suiPackageId: backend.sui_package_id?.[0],
      standards: backend.standards || [],
      bridgeProtocol: backend.bridge_protocol?.[0],
      bridgeAddress: backend.bridge_address?.[0],
    };
  }

  async getMultichainMetadata(canisterId: string): Promise<MultichainMetadata | null> {
    try {
      const actor = await this.createActor(canisterId);
      const backend = await actor.get_multichain_metadata() as any;
      return this.convertMultichainMetadata(backend);
    } catch (error: any) {
      console.error(`Failed to fetch multichain metadata from ${canisterId}:`, error);
      return null;
    }
  }

  async getMetadata(canisterId: string): Promise<AxiomMetadata | null> {
    try {
      const actor = await this.createActor(canisterId);
      const backend = await actor.get_metadata() as any;
      
      return {
        tokenId: backend.token_id,
        name: backend.name,
        description: backend.description,
        imageUrl: backend.image_url,
        owner: typeof backend.owner === 'object' && 'toText' in backend.owner
          ? backend.owner.toText()
          : String(backend.owner),
        createdAt: backend.created_at,
        personality: backend.personality,
        specialization: backend.specialization,
        totalConversations: backend.total_conversations,
        totalMessages: backend.total_messages,
        lastActive: backend.last_active,
        multichainMetadata: this.convertMultichainMetadata(backend.multichain_metadata),
      };
    } catch (error: any) {
      console.error(`Failed to fetch metadata from ${canisterId}:`, error);
      return null;
    }
  }

  async getAllGenesisMultichainAddresses(): Promise<Array<{
    tokenId: number;
    canisterId: string;
    metadata: MultichainMetadata | null;
  }>> {
    // AXIOM Genesis canister IDs (from canister_ids.json)
    const canisterIds = [
      '46odg-5iaaa-aaaao-a4xqa-cai', // AXIOM #1
      '4zpfs-qqaaa-aaaao-a4xqq-cai', // AXIOM #2
      '4ckzx-kiaaa-aaaao-a4xsa-cai', // AXIOM #3
      '4fl7d-hqaaa-aaaao-a4xsq-cai', // AXIOM #4
      '4miu7-ryaaa-aaaao-a4xta-cai', // AXIOM #5
    ];

    const results = await Promise.all(
      canisterIds.map(async (canisterId, index) => {
        const metadata = await this.getMultichainMetadata(canisterId);
        return {
          tokenId: index + 1,
          canisterId,
          metadata,
        };
      })
    );

    return results;
  }
}

export const axiomService = new AxiomService();

