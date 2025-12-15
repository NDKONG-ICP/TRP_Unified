/**
 * Core Service - User management and driver verification
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// Core Canister IDL
const coreIdlFactory = ({ IDL }: { IDL: any }) => {
  const UserRole = IDL.Variant({
    'Admin': IDL.Null,
    'User': IDL.Null,
    'Driver': IDL.Null,
    'Shipper': IDL.Null,
    'Warehouse': IDL.Null,
  });

  const WalletAddresses = IDL.Record({
    'icp': IDL.Opt(IDL.Text),
    'evm': IDL.Opt(IDL.Text),
    'btc': IDL.Opt(IDL.Text),
    'sol': IDL.Opt(IDL.Text),
  });

  const UserProfile = IDL.Record({
    'principal': IDL.Principal,
    'display_name': IDL.Text,
    'email': IDL.Opt(IDL.Text),
    'role': UserRole,
    'created_at': IDL.Nat64,
    'last_login': IDL.Nat64,
    'kyc_verified': IDL.Bool,
    'wallet_addresses': WalletAddresses,
  });

  return IDL.Service({
    get_verified_drivers: IDL.Func([], [IDL.Vec(UserProfile)], ['query']),
    get_profile: IDL.Func([IDL.Principal], [IDL.Opt(UserProfile)], ['query']),
    get_my_profile: IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    register_user: IDL.Func([], [IDL.Variant({ 'Ok': UserProfile, 'Err': IDL.Text })], []),
  });
};

export interface UserProfile {
  principal: Principal;
  display_name: string;
  email?: string;
  role: 'Admin' | 'User' | 'Driver' | 'Shipper' | 'Warehouse';
  created_at: bigint;
  last_login: bigint;
  kyc_verified: boolean;
  wallet_addresses: {
    icp?: string;
    evm?: string;
    btc?: string;
    sol?: string;
  };
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  completedLoads: number;
  location: string;
  verified: boolean;
  truckType: string;
  available: boolean;
}

export class CoreService {
  private agent: HttpAgent | null = null;
  private actor: any = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet()) {
      await this.agent.fetchRootKey();
    }

    const canisterId = getCanisterId('core');
    this.actor = Actor.createActor(coreIdlFactory, {
      agent: this.agent,
      canisterId,
    });
  }

  async getVerifiedDrivers(): Promise<Driver[]> {
    try {
      if (!this.actor) {
        await this.init();
      }

      const profiles = await this.actor.get_verified_drivers();
      
      // Convert UserProfile to Driver format
      return profiles.map((profile: UserProfile, index: number) => ({
        id: profile.principal.toText(),
        name: profile.display_name || `Driver ${index + 1}`,
        rating: 4.5, // Default rating - could be calculated from completed loads
        completedLoads: 0, // Would need to fetch from logistics canister
        location: 'N/A', // Would need to fetch from profile
        verified: profile.kyc_verified,
        truckType: 'Dry Van', // Default - would need additional data
        available: true, // Would need to check logistics canister
      }));
    } catch (error) {
      console.error('Error fetching verified drivers:', error);
      return [];
    }
  }
}

export const coreService = new CoreService();



