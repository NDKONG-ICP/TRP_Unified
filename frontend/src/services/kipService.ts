/**
 * KIP Service - User profiles and stats from KIP canister
 */

import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getCanisterId, getICHost, isMainnet } from './canisterConfig';

// KIP Canister IDL
const kipIdlFactory = ({ IDL }: { IDL: any }) => {
  const VerificationStatus = IDL.Variant({
    'Pending': IDL.Null,
    'Approved': IDL.Null,
    'Rejected': IDL.Null,
    'Expired': IDL.Null,
  });

  const MailingAddress = IDL.Record({
    'street': IDL.Opt(IDL.Text),
    'city': IDL.Opt(IDL.Text),
    'state': IDL.Opt(IDL.Text),
    'zip': IDL.Opt(IDL.Text),
    'country': IDL.Opt(IDL.Text),
  });

  const SocialLinks = IDL.Record({
    'twitter': IDL.Opt(IDL.Text),
    'instagram': IDL.Opt(IDL.Text),
    'discord': IDL.Opt(IDL.Text),
    'website': IDL.Opt(IDL.Text),
  });

  const UserStats = IDL.Record({
    'total_games_played': IDL.Nat64,
    'total_harlee_earned': IDL.Nat64,
    'crossword_puzzles_solved': IDL.Nat64,
    'sk8_punks_high_score': IDL.Nat64,
    'articles_written': IDL.Nat64,
    'memes_uploaded': IDL.Nat64,
    'nfts_owned': IDL.Nat64,
  });

  const KIPProfile = IDL.Record({
    'principal': IDL.Principal,
    'username': IDL.Text,
    'display_name': IDL.Text,
    'bio': IDL.Opt(IDL.Text),
    'profile_picture_url': IDL.Opt(IDL.Text),
    'banner_url': IDL.Opt(IDL.Text),
    'email': IDL.Opt(IDL.Text),
    'phone': IDL.Opt(IDL.Text),
    'address': IDL.Opt(IDL.Text),
    'mailing_address': IDL.Opt(MailingAddress),
    'oisy_wallet_principal': IDL.Opt(IDL.Principal),
    'verification_status': VerificationStatus,
    'verified_at': IDL.Opt(IDL.Nat64),
    'created_at': IDL.Nat64,
    'updated_at': IDL.Nat64,
    'preferences': IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'social_links': SocialLinks,
    'newsletter_subscribed': IDL.Bool,
    'stats': UserStats,
  });

  const ProfileUpdateRequest = IDL.Record({
    'display_name': IDL.Opt(IDL.Text),
    'bio': IDL.Opt(IDL.Text),
    'profile_picture_url': IDL.Opt(IDL.Text),
    'banner_url': IDL.Opt(IDL.Text),
    'email': IDL.Opt(IDL.Text),
    'phone': IDL.Opt(IDL.Text),
    'mailing_address': IDL.Opt(MailingAddress),
    'social_links': IDL.Opt(SocialLinks),
    'newsletter_subscribed': IDL.Opt(IDL.Bool),
  });

  const ProfileResult = IDL.Variant({
    'Ok': KIPProfile,
    'Err': IDL.Text,
  });

  const StatsResult = IDL.Variant({
    'Ok': UserStats,
    'Err': IDL.Text,
  });

  const VoidResult = IDL.Variant({
    'Ok': IDL.Null,
    'Err': IDL.Text,
  });

  const LeaderboardEntry = IDL.Tuple(KIPProfile, IDL.Nat64);

  const PlatformStats = IDL.Record({
    'total_profiles': IDL.Nat64,
    'verified_profiles': IDL.Nat64,
    'pending_docs': IDL.Nat64,
  });

  return IDL.Service({
    'create_profile': IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [ProfileResult], []),
    'get_profile': IDL.Func([IDL.Principal], [IDL.Opt(KIPProfile)], ['query']),
    'get_my_profile': IDL.Func([], [IDL.Opt(KIPProfile)], ['query']),
    'update_profile': IDL.Func([IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text), IDL.Opt(IDL.Text)], [ProfileResult], []),
    'update_profile_v2': IDL.Func([ProfileUpdateRequest], [ProfileResult], []),
    'is_username_available': IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    'get_profile_by_username': IDL.Func([IDL.Text], [IDL.Opt(KIPProfile)], ['query']),
    'get_leaderboard': IDL.Func([IDL.Text, IDL.Nat64], [IDL.Vec(LeaderboardEntry)], ['query']),
    'update_user_stats': IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)],
      [StatsResult],
      []
    ),
    'subscribe_newsletter': IDL.Func([IDL.Text, IDL.Opt(MailingAddress)], [VoidResult], []),
    'get_stats': IDL.Func([], [PlatformStats], ['query']),
    'get_all_profiles': IDL.Func([], [IDL.Vec(KIPProfile)], ['query']),
  });
};

// Types
export interface UserStats {
  totalGamesPlayed: number;
  totalHarleeEarned: bigint;
  crosswordPuzzlesSolved: number;
  sk8PunksHighScore: number;
  articlesWritten: number;
  memesUploaded: number;
  nftsOwned: number;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  discord?: string;
  website?: string;
}

export interface MailingAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface KIPProfile {
  principal: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  mailingAddress?: MailingAddress;
  oisyWalletPrincipal?: string;
  verificationStatus: 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  verifiedAt?: number;
  createdAt: number;
  updatedAt: number;
  socialLinks: SocialLinks;
  newsletterSubscribed: boolean;
  stats: UserStats;
}

export interface LeaderboardEntry {
  profile: KIPProfile;
  score: bigint;
}

export interface PlatformStats {
  totalProfiles: number;
  verifiedProfiles: number;
  pendingDocs: number;
}

export interface ProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerUrl?: string;
  email?: string;
  phone?: string;
  mailingAddress?: MailingAddress;
  socialLinks?: SocialLinks;
  newsletterSubscribed?: boolean;
}

export class KIPService {
  private actor: any = null;
  private agent: HttpAgent | null = null;

  async init(identity?: Identity): Promise<void> {
    const host = getICHost();
    this.agent = new HttpAgent({ identity, host });
    
    if (!isMainnet) {
      await this.agent.fetchRootKey();
    }
    
    const canisterId = getCanisterId('kip');
    this.actor = Actor.createActor(kipIdlFactory, {
      agent: this.agent,
      canisterId,
    });
  }

  private ensureActor(): void {
    if (!this.actor) {
      throw new Error('KIPService not initialized. Call init() first.');
    }
  }

  private parseProfile(raw: any): KIPProfile {
    return {
      principal: raw.principal.toText(),
      username: raw.username,
      displayName: raw.display_name,
      bio: raw.bio[0] || undefined,
      profilePictureUrl: raw.profile_picture_url[0] || undefined,
      bannerUrl: raw.banner_url[0] || undefined,
      email: raw.email[0] || undefined,
      phone: raw.phone[0] || undefined,
      address: raw.address[0] || undefined,
      mailingAddress: raw.mailing_address[0] ? {
        street: raw.mailing_address[0].street[0],
        city: raw.mailing_address[0].city[0],
        state: raw.mailing_address[0].state[0],
        zip: raw.mailing_address[0].zip[0],
        country: raw.mailing_address[0].country[0],
      } : undefined,
      oisyWalletPrincipal: raw.oisy_wallet_principal[0]?.toText(),
      verificationStatus: Object.keys(raw.verification_status)[0] as any,
      verifiedAt: raw.verified_at[0] ? Number(raw.verified_at[0]) : undefined,
      createdAt: Number(raw.created_at),
      updatedAt: Number(raw.updated_at),
      socialLinks: {
        twitter: raw.social_links.twitter[0],
        instagram: raw.social_links.instagram[0],
        discord: raw.social_links.discord[0],
        website: raw.social_links.website[0],
      },
      newsletterSubscribed: raw.newsletter_subscribed,
      stats: {
        totalGamesPlayed: Number(raw.stats.total_games_played),
        totalHarleeEarned: BigInt(raw.stats.total_harlee_earned),
        crosswordPuzzlesSolved: Number(raw.stats.crossword_puzzles_solved),
        sk8PunksHighScore: Number(raw.stats.sk8_punks_high_score),
        articlesWritten: Number(raw.stats.articles_written),
        memesUploaded: Number(raw.stats.memes_uploaded),
        nftsOwned: Number(raw.stats.nfts_owned),
      },
    };
  }

  async getMyProfile(): Promise<KIPProfile | null> {
    this.ensureActor();
    try {
      const result = await this.actor.get_my_profile();
      if (result[0]) {
        return this.parseProfile(result[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }

  async getProfile(principal: string): Promise<KIPProfile | null> {
    this.ensureActor();
    try {
      const result = await this.actor.get_profile(Principal.fromText(principal));
      if (result[0]) {
        return this.parseProfile(result[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }

  async getProfileByUsername(username: string): Promise<KIPProfile | null> {
    this.ensureActor();
    try {
      const result = await this.actor.get_profile_by_username(username);
      if (result[0]) {
        return this.parseProfile(result[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch profile by username:', error);
      throw error;
    }
  }

  async createProfile(username: string, displayName: string, bio?: string): Promise<KIPProfile> {
    this.ensureActor();
    try {
      const result = await this.actor.create_profile(username, displayName, bio ? [bio] : []);
      if ('Ok' in result) {
        return this.parseProfile(result.Ok);
      }
      throw new Error(result.Err);
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  }

  async updateProfile(request: ProfileUpdateRequest): Promise<KIPProfile> {
    this.ensureActor();
    try {
      const formattedRequest = {
        display_name: request.displayName ? [request.displayName] : [],
        bio: request.bio ? [request.bio] : [],
        profile_picture_url: request.profilePictureUrl ? [request.profilePictureUrl] : [],
        banner_url: request.bannerUrl ? [request.bannerUrl] : [],
        email: request.email ? [request.email] : [],
        phone: request.phone ? [request.phone] : [],
        mailing_address: request.mailingAddress ? [{
          street: request.mailingAddress.street ? [request.mailingAddress.street] : [],
          city: request.mailingAddress.city ? [request.mailingAddress.city] : [],
          state: request.mailingAddress.state ? [request.mailingAddress.state] : [],
          zip: request.mailingAddress.zip ? [request.mailingAddress.zip] : [],
          country: request.mailingAddress.country ? [request.mailingAddress.country] : [],
        }] : [],
        social_links: request.socialLinks ? [{
          twitter: request.socialLinks.twitter ? [request.socialLinks.twitter] : [],
          instagram: request.socialLinks.instagram ? [request.socialLinks.instagram] : [],
          discord: request.socialLinks.discord ? [request.socialLinks.discord] : [],
          website: request.socialLinks.website ? [request.socialLinks.website] : [],
        }] : [],
        newsletter_subscribed: request.newsletterSubscribed !== undefined ? [request.newsletterSubscribed] : [],
      };

      const result = await this.actor.update_profile_v2(formattedRequest);
      if ('Ok' in result) {
        return this.parseProfile(result.Ok);
      }
      throw new Error(result.Err);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    this.ensureActor();
    try {
      return await this.actor.is_username_available(username);
    } catch (error) {
      console.error('Failed to check username availability:', error);
      throw error;
    }
  }

  async getLeaderboard(category: string, limit: number = 20): Promise<LeaderboardEntry[]> {
    this.ensureActor();
    try {
      const result = await this.actor.get_leaderboard(category, BigInt(limit));
      return result.map((entry: any) => ({
        profile: this.parseProfile(entry[0]),
        score: BigInt(entry[1]),
      }));
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  async getPlatformStats(): Promise<PlatformStats> {
    this.ensureActor();
    try {
      const result = await this.actor.get_stats();
      return {
        totalProfiles: Number(result.total_profiles),
        verifiedProfiles: Number(result.verified_profiles),
        pendingDocs: Number(result.pending_docs),
      };
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
      throw error;
    }
  }

  async subscribeNewsletter(email: string, mailingAddress?: MailingAddress): Promise<void> {
    this.ensureActor();
    try {
      const address = mailingAddress ? [{
        street: mailingAddress.street ? [mailingAddress.street] : [],
        city: mailingAddress.city ? [mailingAddress.city] : [],
        state: mailingAddress.state ? [mailingAddress.state] : [],
        zip: mailingAddress.zip ? [mailingAddress.zip] : [],
        country: mailingAddress.country ? [mailingAddress.country] : [],
      }] : [];

      const result = await this.actor.subscribe_newsletter(email, address);
      if ('Err' in result) {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error('Failed to subscribe to newsletter:', error);
      throw error;
    }
  }

  async updateUserStats(
    principal: Principal,
    stats: {
      games_played?: number;
      harlee_earned?: number;
      crosswords_solved?: number;
      sk8_high_score?: number;
      articles?: number;
      memes?: number;
      nfts?: number;
    },
    identity?: Identity
  ): Promise<UserStats> {
    this.ensureActor();
    
    // Reinitialize with new identity if provided
    if (identity && identity !== this.identity) {
      await this.init(identity);
    }
    
    try {
      const result = await this.actor.update_user_stats(
        principal,
        stats.games_played ? [BigInt(stats.games_played)] : [],
        stats.harlee_earned ? [BigInt(stats.harlee_earned)] : [],
        stats.crosswords_solved ? [BigInt(stats.crosswords_solved)] : [],
        stats.sk8_high_score ? [BigInt(stats.sk8_high_score)] : [],
        stats.articles ? [BigInt(stats.articles)] : [],
        stats.memes ? [BigInt(stats.memes)] : [],
        stats.nfts ? [BigInt(stats.nfts)] : [],
      );
      
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      
      const rawStats = result.Ok;
      return {
        totalGamesPlayed: Number(rawStats.total_games_played),
        totalHarleeEarned: BigInt(rawStats.total_harlee_earned),
        crosswordPuzzlesSolved: Number(rawStats.crossword_puzzles_solved),
        sk8PunksHighScore: Number(rawStats.sk8_punks_high_score),
        articlesWritten: Number(rawStats.articles_written),
        memesUploaded: Number(rawStats.memes_uploaded),
        nftsOwned: Number(rawStats.nfts_owned),
      };
    } catch (error) {
      console.error('Failed to update user stats:', error);
      throw error;
    }
  }
}

// Singleton instance
export const kipService = new KIPService();

// React hook for KIP data
import { useState, useEffect, useCallback } from 'react';

export function useKIPProfile(identity?: Identity, principalId?: string) {
  const [profile, setProfile] = useState<KIPProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await kipService.init(identity);
      
      let profileData: KIPProfile | null;
      if (principalId) {
        profileData = await kipService.getProfile(principalId);
      } else {
        profileData = await kipService.getMyProfile();
      }
      
      setProfile(profileData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
      console.error('Profile fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity, principalId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    refresh: fetchProfile,
    updateProfile: kipService.updateProfile.bind(kipService),
  };
}

export function useLeaderboard(category: string, identity?: Identity, limit: number = 20) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await kipService.init(identity);
      const data = await kipService.getLeaderboard(category, limit);
      setLeaderboard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
      console.error('Leaderboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [identity, category, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    isLoading,
    error,
    refresh: fetchLeaderboard,
  };
}

export default kipService;


