/**
 * Profile Service - Interacts with KIP canister for on-chain profile storage
 * Handles user profiles, stats, and leaderboards
 */

import { Principal } from '@dfinity/principal';
import { HttpAgent, Actor, Identity } from '@dfinity/agent';
import { getCanisterId, isMainnet, getICHost } from './canisterConfig';

// Types
export interface UserProfile {
  principal: string;
  username: string;
  displayName: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerUrl?: string;
  email?: string;
  phone?: string;
  mailingAddress?: MailingAddress;
  socialLinks?: SocialLinks;
  verificationStatus: 'Pending' | 'Approved' | 'Rejected' | 'Expired';
  createdAt: bigint;
  updatedAt: bigint;
  newsletterSubscribed: boolean;
  stats: UserStats;
}

export interface MailingAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  discord?: string;
  website?: string;
}

export interface UserStats {
  totalGamesPlayed: bigint;
  totalHarleeEarned: bigint;
  crosswordPuzzlesSolved: bigint;
  sk8PunksHighScore: bigint;
  articlesWritten: bigint;
  memesUploaded: bigint;
  nftsOwned: bigint;
}

export interface LeaderboardEntry {
  profile: UserProfile;
  value: bigint;
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

// Social media links
export const RAVEN_SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/raven_icp',
  tiktok: 'https://www.tiktok.com/@the.raven.project',
  twitter: 'https://x.com/ravenicp',
};

// Newsletter email
export const NEWSLETTER_EMAIL = 'raven.icp@gmail.com';

class ProfileService {
  private agent: HttpAgent | null = null;
  private identity: Identity | null = null;
  private kipCanisterId: string;
  
  constructor() {
    this.kipCanisterId = getCanisterId('kip');
  }
  
  /**
   * Initialize the service with an identity
   */
  async init(identity: Identity) {
    this.identity = identity;
    this.agent = new HttpAgent({
      host: getICHost(),
      identity,
    });
    
    if (!isMainnet()) {
      await this.agent.fetchRootKey();
    }
  }
  
  /**
   * Create KIP actor
   */
  private getActor() {
    if (!this.agent) {
      throw new Error('Service not initialized. Call init() first.');
    }
    
    const idlFactory = ({ IDL }: any) => {
      const VerificationStatus = IDL.Variant({
        Pending: IDL.Null,
        Approved: IDL.Null,
        Rejected: IDL.Null,
        Expired: IDL.Null,
      });
      
      const MailingAddress = IDL.Record({
        street: IDL.Opt(IDL.Text),
        city: IDL.Opt(IDL.Text),
        state: IDL.Opt(IDL.Text),
        zip: IDL.Opt(IDL.Text),
        country: IDL.Opt(IDL.Text),
      });
      
      const SocialLinks = IDL.Record({
        twitter: IDL.Opt(IDL.Text),
        instagram: IDL.Opt(IDL.Text),
        discord: IDL.Opt(IDL.Text),
        website: IDL.Opt(IDL.Text),
      });
      
      const UserStats = IDL.Record({
        total_games_played: IDL.Nat64,
        total_harlee_earned: IDL.Nat64,
        crossword_puzzles_solved: IDL.Nat64,
        sk8_punks_high_score: IDL.Nat64,
        articles_written: IDL.Nat64,
        memes_uploaded: IDL.Nat64,
        nfts_owned: IDL.Nat64,
      });
      
      const KIPProfile = IDL.Record({
        principal: IDL.Principal,
        username: IDL.Text,
        display_name: IDL.Text,
        bio: IDL.Opt(IDL.Text),
        profile_picture_url: IDL.Opt(IDL.Text),
        banner_url: IDL.Opt(IDL.Text),
        email: IDL.Opt(IDL.Text),
        phone: IDL.Opt(IDL.Text),
        address: IDL.Opt(IDL.Text),
        mailing_address: IDL.Opt(MailingAddress),
        oisy_wallet_principal: IDL.Opt(IDL.Principal),
        verification_status: VerificationStatus,
        verified_at: IDL.Opt(IDL.Nat64),
        created_at: IDL.Nat64,
        updated_at: IDL.Nat64,
        preferences: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
        social_links: SocialLinks,
        newsletter_subscribed: IDL.Bool,
        stats: UserStats,
      });
      
      const ProfileUpdateRequest = IDL.Record({
        display_name: IDL.Opt(IDL.Text),
        bio: IDL.Opt(IDL.Text),
        profile_picture_url: IDL.Opt(IDL.Text),
        banner_url: IDL.Opt(IDL.Text),
        email: IDL.Opt(IDL.Text),
        phone: IDL.Opt(IDL.Text),
        mailing_address: IDL.Opt(MailingAddress),
        social_links: IDL.Opt(SocialLinks),
        newsletter_subscribed: IDL.Opt(IDL.Bool),
      });
      
      return IDL.Service({
        create_profile: IDL.Func(
          [IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
          [IDL.Variant({ Ok: KIPProfile, Err: IDL.Text })],
          []
        ),
        get_profile: IDL.Func(
          [IDL.Principal],
          [IDL.Opt(KIPProfile)],
          ['query']
        ),
        get_my_profile: IDL.Func(
          [],
          [IDL.Opt(KIPProfile)],
          ['query']
        ),
        update_profile_v2: IDL.Func(
          [ProfileUpdateRequest],
          [IDL.Variant({ Ok: KIPProfile, Err: IDL.Text })],
          []
        ),
        is_username_available: IDL.Func(
          [IDL.Text],
          [IDL.Bool],
          ['query']
        ),
        get_profile_by_username: IDL.Func(
          [IDL.Text],
          [IDL.Opt(KIPProfile)],
          ['query']
        ),
        get_leaderboard: IDL.Func(
          [IDL.Text, IDL.Nat64],
          [IDL.Vec(IDL.Tuple(KIPProfile, IDL.Nat64))],
          ['query']
        ),
        subscribe_newsletter: IDL.Func(
          [IDL.Text, IDL.Opt(MailingAddress)],
          [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })],
          []
        ),
        update_user_stats: IDL.Func(
          [
            IDL.Principal,
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
            IDL.Opt(IDL.Nat64),
          ],
          [IDL.Variant({ Ok: UserStats, Err: IDL.Text })],
          []
        ),
      });
    };
    
    return Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: Principal.fromText(this.kipCanisterId),
    });
  }
  
  /**
   * Convert canister profile to frontend format
   */
  private convertProfile(canisterProfile: any): UserProfile {
    return {
      principal: canisterProfile.principal.toString(),
      username: canisterProfile.username,
      displayName: canisterProfile.display_name,
      bio: canisterProfile.bio[0] || undefined,
      profilePictureUrl: canisterProfile.profile_picture_url[0] || undefined,
      bannerUrl: canisterProfile.banner_url[0] || undefined,
      email: canisterProfile.email[0] || undefined,
      phone: canisterProfile.phone[0] || undefined,
      mailingAddress: canisterProfile.mailing_address[0] || undefined,
      socialLinks: canisterProfile.social_links || undefined,
      verificationStatus: Object.keys(canisterProfile.verification_status)[0] as any,
      createdAt: canisterProfile.created_at,
      updatedAt: canisterProfile.updated_at,
      newsletterSubscribed: canisterProfile.newsletter_subscribed,
      stats: {
        totalGamesPlayed: canisterProfile.stats.total_games_played,
        totalHarleeEarned: canisterProfile.stats.total_harlee_earned,
        crosswordPuzzlesSolved: canisterProfile.stats.crossword_puzzles_solved,
        sk8PunksHighScore: canisterProfile.stats.sk8_punks_high_score,
        articlesWritten: canisterProfile.stats.articles_written,
        memesUploaded: canisterProfile.stats.memes_uploaded,
        nftsOwned: canisterProfile.stats.nfts_owned,
      },
    };
  }
  
  /**
   * Create a new profile
   */
  async createProfile(
    username: string,
    displayName: string,
    email?: string
  ): Promise<UserProfile> {
    const actor = this.getActor();
    const result = await (actor as any).create_profile(
      username,
      displayName,
      email ? [email] : []
    );
    
    if ('Ok' in result) {
      return this.convertProfile(result.Ok);
    } else {
      throw new Error(result.Err);
    }
  }
  
  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<UserProfile | null> {
    const actor = this.getActor();
    const result = await (actor as any).get_my_profile();
    
    if (result && result.length > 0) {
      return this.convertProfile(result[0]);
    }
    return null;
  }
  
  /**
   * Get profile by principal
   */
  async getProfile(principal: Principal): Promise<UserProfile | null> {
    const actor = this.getActor();
    const result = await (actor as any).get_profile(principal);
    
    if (result && result.length > 0) {
      return this.convertProfile(result[0]);
    }
    return null;
  }
  
  /**
   * Get profile by username
   */
  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const actor = this.getActor();
    const result = await (actor as any).get_profile_by_username(username);
    
    if (result && result.length > 0) {
      return this.convertProfile(result[0]);
    }
    return null;
  }
  
  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const actor = this.getActor();
    return await (actor as any).is_username_available(username);
  }
  
  /**
   * Update profile
   */
  async updateProfile(request: ProfileUpdateRequest): Promise<UserProfile> {
    const actor = this.getActor();
    
    const canisterRequest = {
      display_name: request.displayName ? [request.displayName] : [],
      bio: request.bio ? [request.bio] : [],
      profile_picture_url: request.profilePictureUrl ? [request.profilePictureUrl] : [],
      banner_url: request.bannerUrl ? [request.bannerUrl] : [],
      email: request.email ? [request.email] : [],
      phone: request.phone ? [request.phone] : [],
      mailing_address: request.mailingAddress ? [request.mailingAddress] : [],
      social_links: request.socialLinks ? [request.socialLinks] : [],
      newsletter_subscribed: request.newsletterSubscribed !== undefined 
        ? [request.newsletterSubscribed] 
        : [],
    };
    
    const result = await (actor as any).update_profile_v2(canisterRequest);
    
    if ('Ok' in result) {
      return this.convertProfile(result.Ok);
    } else {
      throw new Error(result.Err);
    }
  }
  
  /**
   * Subscribe to newsletter
   */
  async subscribeNewsletter(email: string, mailingAddress?: MailingAddress): Promise<void> {
    const actor = this.getActor();
    const result = await (actor as any).subscribe_newsletter(
      email,
      mailingAddress ? [mailingAddress] : []
    );
    
    if ('Err' in result) {
      throw new Error(result.Err);
    }
    
    // Also send email notification (in production, this would use a backend service)
    await this.sendNewsletterNotification(email, mailingAddress);
  }
  
  /**
   * Send newsletter signup notification to admin email
   */
  private async sendNewsletterNotification(
    email: string,
    mailingAddress?: MailingAddress
  ): Promise<void> {
    // In production, this would call a backend service or use EmailJS
    // For now, we'll log it and the admin can check the canister directly
    console.log('Newsletter signup:', {
      email,
      mailingAddress,
      timestamp: new Date().toISOString(),
      sendTo: NEWSLETTER_EMAIL,
    });
    
    // Store locally as backup
    const signups = JSON.parse(localStorage.getItem('newsletter_signups') || '[]');
    signups.push({
      email,
      mailingAddress,
      timestamp: Date.now(),
    });
    localStorage.setItem('newsletter_signups', JSON.stringify(signups));
  }
  
  /**
   * Get leaderboard for a specific stat
   */
  async getLeaderboard(
    statType: 'harlee_earned' | 'games_played' | 'crosswords' | 'sk8_punks' | 'articles' | 'memes' | 'nfts',
    limit: number = 20
  ): Promise<LeaderboardEntry[]> {
    const actor = this.getActor();
    const result = await (actor as any).get_leaderboard(statType, BigInt(limit));
    
    return result.map(([profile, value]: [any, bigint]) => ({
      profile: this.convertProfile(profile),
      value,
    }));
  }
  
  /**
   * Update user stats
   */
  async updateStats(
    userPrincipal: Principal,
    updates: {
      gamesPlayed?: bigint;
      harleeEarned?: bigint;
      crosswordsSolved?: bigint;
      sk8HighScore?: bigint;
      articles?: bigint;
      memes?: bigint;
      nfts?: bigint;
    }
  ): Promise<UserStats> {
    const actor = this.getActor();
    
    const result = await (actor as any).update_user_stats(
      userPrincipal,
      updates.gamesPlayed ? [updates.gamesPlayed] : [],
      updates.harleeEarned ? [updates.harleeEarned] : [],
      updates.crosswordsSolved ? [updates.crosswordsSolved] : [],
      updates.sk8HighScore ? [updates.sk8HighScore] : [],
      updates.articles ? [updates.articles] : [],
      updates.memes ? [updates.memes] : [],
      updates.nfts ? [updates.nfts] : [],
    );
    
    if ('Ok' in result) {
      return {
        totalGamesPlayed: result.Ok.total_games_played,
        totalHarleeEarned: result.Ok.total_harlee_earned,
        crosswordPuzzlesSolved: result.Ok.crossword_puzzles_solved,
        sk8PunksHighScore: result.Ok.sk8_punks_high_score,
        articlesWritten: result.Ok.articles_written,
        memesUploaded: result.Ok.memes_uploaded,
        nftsOwned: result.Ok.nfts_owned,
      };
    } else {
      throw new Error(result.Err);
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;




