import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Document {
  'id' : string,
  'status' : VerificationStatus,
  'owner' : Principal,
  'hash' : string,
  'reviewed_at' : [] | [bigint],
  'rejection_reason' : [] | [string],
  'reviewer' : [] | [Principal],
  'expires_at' : [] | [bigint],
  'doc_type' : DocumentType,
  'uploaded_at' : bigint,
}
export type DocumentType = { 'Insurance' : null } |
  { 'DOTNumber' : null } |
  { 'VehicleRegistration' : null } |
  { 'ProofOfAddress' : null } |
  { 'DriversLicense' : null } |
  { 'Other' : string } |
  { 'MCNumber' : null };
export interface KIPProfile {
  'bio' : [] | [string],
  'user_principal' : Principal,
  'updated_at' : bigint,
  'username' : string,
  'banner_url' : [] | [string],
  'newsletter_subscribed' : boolean,
  'created_at' : bigint,
  'profile_picture_url' : [] | [string],
  'email' : [] | [string],
  'preferences' : Array<[string, string]>,
  'verification_status' : VerificationStatus,
  'oisy_wallet_principal' : [] | [Principal],
  'display_name' : string,
  'stats' : UserStats,
  'address' : [] | [string],
  'verified_at' : [] | [bigint],
  'mailing_address' : [] | [MailingAddress],
  'phone' : [] | [string],
  'social_links' : SocialLinks,
}
export interface MailingAddress {
  'zip' : [] | [string],
  'street' : [] | [string],
  'country' : [] | [string],
  'city' : [] | [string],
  'state' : [] | [string],
}
export type ProfileResult = { 'Ok' : KIPProfile } |
  { 'Err' : string };
export interface ProfileUpdateRequest {
  'bio' : [] | [string],
  'banner_url' : [] | [string],
  'newsletter_subscribed' : [] | [boolean],
  'profile_picture_url' : [] | [string],
  'email' : [] | [string],
  'display_name' : [] | [string],
  'mailing_address' : [] | [MailingAddress],
  'phone' : [] | [string],
  'social_links' : [] | [SocialLinks],
}
export interface SocialLinks {
  'twitter' : [] | [string],
  'instagram' : [] | [string],
  'website' : [] | [string],
  'discord' : [] | [string],
}
export type StatsResult = { 'Ok' : UserStats } |
  { 'Err' : string };
export interface UserStats {
  'sk8_punks_high_score' : bigint,
  'nfts_owned' : bigint,
  'total_games_played' : bigint,
  'memes_uploaded' : bigint,
  'total_harlee_earned' : bigint,
  'crossword_puzzles_solved' : bigint,
  'articles_written' : bigint,
}
/**
 * KIP Canister - Know-Your-Identity Provider
 * User profiles, verification, and leaderboard management
 */
export type VerificationStatus = { 'Approved' : null } |
  { 'Rejected' : null } |
  { 'Expired' : null } |
  { 'Pending' : null };
export type VoidResult = { 'Ok' : null } |
  { 'Err' : string };
export interface _SERVICE {
  /**
   * Profile Management
   */
  'create_profile' : ActorMethod<
    [string, string, [] | [string]],
    ProfileResult
  >,
  'get_all_profiles' : ActorMethod<[], Array<KIPProfile>>,
  'get_document' : ActorMethod<[string], [] | [Document]>,
  /**
   * Leaderboards
   */
  'get_leaderboard' : ActorMethod<
    [string, bigint],
    Array<[KIPProfile, bigint]>
  >,
  'get_my_documents' : ActorMethod<[], Array<Document>>,
  'get_my_profile' : ActorMethod<[], [] | [KIPProfile]>,
  'get_pending_documents' : ActorMethod<[], Array<Document>>,
  'get_profile' : ActorMethod<[Principal], [] | [KIPProfile]>,
  'get_profile_by_username' : ActorMethod<[string], [] | [KIPProfile]>,
  'get_stats' : ActorMethod<
    [],
    {
      'verified_profiles' : bigint,
      'pending_docs' : bigint,
      'total_profiles' : bigint,
    }
  >,
  /**
   * Username
   */
  'is_username_available' : ActorMethod<[string], boolean>,
  /**
   * Admin: Document Review
   */
  'review_document' : ActorMethod<
    [string, VerificationStatus, [] | [string]],
    { 'Ok' : Document } |
      { 'Err' : string }
  >,
  /**
   * Admin
   */
  'set_admin' : ActorMethod<[Principal], undefined>,
  /**
   * Newsletter
   */
  'subscribe_newsletter' : ActorMethod<
    [string, [] | [MailingAddress]],
    VoidResult
  >,
  'update_profile' : ActorMethod<
    [[] | [string], [] | [string], [] | [string], [] | [string]],
    ProfileResult
  >,
  'update_profile_v2' : ActorMethod<[ProfileUpdateRequest], ProfileResult>,
  'update_user_stats' : ActorMethod<
    [
      Principal,
      [] | [bigint],
      [] | [bigint],
      [] | [bigint],
      [] | [bigint],
      [] | [bigint],
      [] | [bigint],
      [] | [bigint],
    ],
    StatsResult
  >,
  /**
   * Document Management
   */
  'upload_document' : ActorMethod<
    [DocumentType, string],
    { 'Ok' : Document } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
