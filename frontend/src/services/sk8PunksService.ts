/**
 * Sk8 Punks NFT Collection Service
 * Interacts with the EXT standard Sk8 Punks collection canister
 * Canister ID: b4mk6-5qaaa-aaaah-arerq-cai
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { getICHost, isMainnet } from './canisterConfig';

const SK8_PUNKS_CANISTER_ID = 'b4mk6-5qaaa-aaaah-arerq-cai';

// Types matching the EXT standard
export interface Sk8PunksNFT {
  tokenId: number;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
    properties?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

// Convert principal to AccountIdentifier (EXT standard uses AccountIdentifier)
// EXT standard AccountIdentifier is typically the principal's text representation
// Some implementations use account ID format, but this canister accepts principal text
function principalToAccountIdentifier(principal: Principal): string {
  // For EXT standard, AccountIdentifier can be the principal's text representation
  // or a derived account ID. This canister accepts principal text directly.
  return principal.toText();
}

// EXT Canister IDL Factory
const extIdlFactory = ({ IDL }: { IDL: any }) => {
  const User = IDL.Variant({
    'address': IDL.Text,
    'principal': IDL.Principal,
  });

  const TokenIdentifier = IDL.Text;
  const TokenIndex = IDL.Nat32;
  const AccountIdentifier = IDL.Text;

  const Metadata = IDL.Variant({
    'fungible': IDL.Record({
      'decimals': IDL.Nat8,
      'metadata': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'name': IDL.Text,
      'symbol': IDL.Text,
    }),
    'nonfungible': IDL.Record({
      'metadata': IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
  });

  const Property = IDL.Record({
    'trait_type': IDL.Text,
    'value': IDL.Text,
  });

  const CommonError = IDL.Variant({
    'InvalidToken': TokenIdentifier,
    'Other': IDL.Text,
  });

  return IDL.Service({
    'tokens': IDL.Func(
      [AccountIdentifier],
      [IDL.Variant({ 'err': CommonError, 'ok': IDL.Vec(TokenIndex) })],
      ['query']
    ),
    'tokens_ext': IDL.Func(
      [AccountIdentifier],
      [
        IDL.Variant({
          'err': CommonError,
          'ok': IDL.Vec(
            IDL.Tuple(
              TokenIndex,
              IDL.Opt(
                IDL.Record({
                  'locked': IDL.Opt(IDL.Int),
                  'price': IDL.Nat64,
                  'seller': IDL.Principal,
                })
              ),
              IDL.Opt(IDL.Vec(IDL.Nat8))
            )
          ),
        }),
      ],
      ['query']
    ),
    'metadata': IDL.Func(
      [TokenIdentifier],
      [IDL.Variant({ 'err': CommonError, 'ok': Metadata })],
      ['query']
    ),
    'getTokensByIds': IDL.Func(
      [IDL.Vec(TokenIndex)],
      [IDL.Vec(IDL.Tuple(TokenIndex, Metadata))],
      ['query']
    ),
    'getProperties': IDL.Func(
      [],
      [
        IDL.Vec(
          IDL.Tuple(
            IDL.Text,
            IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))
          )
        ),
      ],
      ['query']
    ),
  });
};

// Create actor for Sk8 Punks canister
async function createSk8PunksActor(identity: Identity | null): Promise<any> {
  const isLocal = !isMainnet();
  const agent = new HttpAgent({
    identity: identity || undefined,
    host: getICHost(),
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(extIdlFactory, {
    agent,
    canisterId: SK8_PUNKS_CANISTER_ID,
  });
}

// Parse metadata blob to extract properties
function parseMetadata(metadataBlob: Uint8Array | null): Sk8PunksNFT['metadata'] {
  if (!metadataBlob) return undefined;

  try {
    const text = new TextDecoder().decode(metadataBlob);
    const parsed = JSON.parse(text);
    return {
      name: parsed.name,
      description: parsed.description,
      image: parsed.image,
      properties: parsed.attributes || parsed.properties,
    };
  } catch (error) {
    console.error('Failed to parse metadata:', error);
    return undefined;
  }
}

// Determine rarity from metadata properties
function determineRarity(metadata?: Sk8PunksNFT['metadata']): Sk8PunksNFT['rarity'] {
  if (!metadata?.properties) return 'common';

  // Look for rarity property
  const rarityProp = metadata.properties.find(
    (p) => p.trait_type?.toLowerCase() === 'rarity'
  );
  if (rarityProp) {
    const rarity = rarityProp.value?.toLowerCase();
    if (['common', 'rare', 'epic', 'legendary'].includes(rarity)) {
      return rarity as Sk8PunksNFT['rarity'];
    }
  }

  // Fallback: determine by token ID (simple distribution)
  return 'common';
}

export class Sk8PunksService {
  /**
   * Get all token IDs owned by a user
   */
  static async getUserTokens(
    principal: Principal,
    identity: Identity | null = null
  ): Promise<number[]> {
    try {
      const actor = await createSk8PunksActor(identity);
      const accountId = principalToAccountIdentifier(principal);
      const result = await actor.tokens(accountId);

      if ('ok' in result) {
        return result.ok.map((id: bigint) => Number(id));
      } else {
        throw new Error(result.err.Other || 'Failed to fetch tokens');
      }
    } catch (error: any) {
      console.error('Failed to fetch user tokens:', error);
      throw error;
    }
  }

  /**
   * Get detailed token information including metadata
   */
  static async getUserNFTs(
    principal: Principal,
    identity: Identity | null = null
  ): Promise<Sk8PunksNFT[]> {
    try {
      const tokenIds = await this.getUserTokens(principal, identity);
      if (tokenIds.length === 0) return [];

      const actor = await createSk8PunksActor(identity);
      const result = await actor.getTokensByIds(tokenIds.map((id) => BigInt(id)));

      return result.map((token: any) => {
        const tokenId = Number(token[0]); // TokenIndex
        const metadata = token[1]; // Metadata

        let parsedMetadata: Sk8PunksNFT['metadata'] | undefined;
        if ('nonfungible' in metadata && metadata.nonfungible.metadata?.[0]) {
          parsedMetadata = parseMetadata(metadata.nonfungible.metadata[0]);
        }

        return {
          tokenId,
          metadata: parsedMetadata,
          rarity: determineRarity(parsedMetadata),
        };
      });
    } catch (error: any) {
      console.error('Failed to fetch user NFTs:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific token
   */
  static async getTokenMetadata(
    tokenId: number,
    identity: Identity | null = null
  ): Promise<Sk8PunksNFT['metadata']> {
    try {
      const actor = await createSk8PunksActor(identity);
      const tokenIdentifier = `${SK8_PUNKS_CANISTER_ID}-${tokenId}`;
      const result = await actor.metadata(tokenIdentifier);

      if ('ok' in result) {
        const metadata = result.ok;
        if ('nonfungible' in metadata && metadata.nonfungible.metadata?.[0]) {
          return parseMetadata(metadata.nonfungible.metadata[0]);
        }
      }
      return undefined;
    } catch (error: any) {
      console.error(`Failed to fetch metadata for token ${tokenId}:`, error);
      return undefined;
    }
  }
}

