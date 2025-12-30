//! KIP Canister - Know-Your-Identity Provider
//! Handles user profiles, document verification, and identity management

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::cell::RefCell;
use std::convert::TryInto;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const PROFILES_MEM_ID: MemoryId = MemoryId::new(0);
const DOCUMENTS_MEM_ID: MemoryId = MemoryId::new(1);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(2);
const VERIFICATIONS_MEM_ID: MemoryId = MemoryId::new(3);
const LINKED_WALLETS_MEM_ID: MemoryId = MemoryId::new(4);
const PENDING_LINKS_MEM_ID: MemoryId = MemoryId::new(5);

// =========================
// Linked wallets (Phantom/Sui)
// =========================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct LinkedWallets {
    pub solana_pubkeys: Vec<String>,
    // Note: current SIS implementation treats `address` as a 32-byte pubkey (hex/base58).
    pub sui_addresses: Vec<String>,
    pub evm_addresses: Vec<String>,
}

impl Storable for LinkedWallets {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SIWSMessage {
    pub domain: String,
    pub address: String,
    pub statement: Option<String>,
    pub uri: String,
    pub version: String,
    pub chain_id: String,
    pub nonce: String,
    pub issued_at: String,
    pub expiration_time: Option<String>,
    pub not_before: Option<String>,
    pub request_id: Option<String>,
    pub resources: Option<Vec<String>>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SISMessage {
    pub domain: String,
    pub address: String,
    pub statement: Option<String>,
    pub uri: String,
    pub version: String,
    pub chain_id: String,
    pub nonce: String,
    pub issued_at: String,
    pub expiration_time: Option<String>,
    pub not_before: Option<String>,
    pub request_id: Option<String>,
    pub resources: Option<Vec<String>>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum LinkPayload {
    Solana(SIWSMessage),
    Sui(SISMessage),
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WalletLinkChallenge {
    pub kind: String, // "phantom" | "sui"
    pub issued_at: u64,
    pub expires_at: u64,
    pub payload: LinkPayload,
}

impl Storable for WalletLinkChallenge {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, CandidType, Serialize, Deserialize)]
struct LinkKey {
    principal: Principal,
    kind: String,
}

impl Storable for LinkKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Serialize)]
pub enum WalletLinkResult {
    Ok(WalletLinkChallenge),
    Err(String),
}

fn format_siws_message(msg: &SIWSMessage) -> String {
    let mut message = format!(
        "{} wants you to sign in with your Solana account:\n",
        msg.domain
    );
    message.push_str(&format!("{}\n\n", msg.address));
    if let Some(ref statement) = msg.statement {
        message.push_str(&format!("{}\n\n", statement));
    }
    message.push_str(&format!("URI: {}\n", msg.uri));
    message.push_str(&format!("Version: {}\n", msg.version));
    message.push_str(&format!("Chain ID: {}\n", msg.chain_id));
    message.push_str(&format!("Nonce: {}\n", msg.nonce));
    message.push_str(&format!("Issued At: {}", msg.issued_at));
    if let Some(ref expiration) = msg.expiration_time {
        message.push_str(&format!("\nExpiration Time: {}", expiration));
    }
    if let Some(ref not_before) = msg.not_before {
        message.push_str(&format!("\nNot Before: {}", not_before));
    }
    if let Some(ref request_id) = msg.request_id {
        message.push_str(&format!("\nRequest ID: {}", request_id));
    }
    if let Some(ref resources) = msg.resources {
        message.push_str("\nResources:");
        for resource in resources {
            message.push_str(&format!("\n- {}", resource));
        }
    }
    message
}

fn format_sis_message(msg: &SISMessage) -> String {
    let mut message =
        format!("{} wants you to sign in with your Sui account:\n", msg.domain);
    message.push_str(&format!("{}\n\n", msg.address));
    if let Some(ref statement) = msg.statement {
        message.push_str(&format!("{}\n\n", statement));
    }
    message.push_str(&format!("URI: {}\n", msg.uri));
    message.push_str(&format!("Version: {}\n", msg.version));
    message.push_str(&format!("Chain ID: {}\n", msg.chain_id));
    message.push_str(&format!("Nonce: {}\n", msg.nonce));
    message.push_str(&format!("Issued At: {}", msg.issued_at));
    if let Some(ref expiration) = msg.expiration_time {
        message.push_str(&format!("\nExpiration Time: {}", expiration));
    }
    if let Some(ref not_before) = msg.not_before {
        message.push_str(&format!("\nNot Before: {}", not_before));
    }
    if let Some(ref request_id) = msg.request_id {
        message.push_str(&format!("\nRequest ID: {}", request_id));
    }
    if let Some(ref resources) = msg.resources {
        message.push_str("\nResources:");
        for resource in resources {
            message.push_str(&format!("\n- {}", resource));
        }
    }
    message
}

use ed25519_dalek::{Signature, Verifier, VerifyingKey};

fn decode_sig(signature: &str) -> Option<Vec<u8>> {
    if signature.starts_with("0x") {
        hex::decode(&signature[2..]).ok()
    } else {
        bs58::decode(signature).into_vec().ok()
    }
}

fn decode_addr(address: &str) -> Option<Vec<u8>> {
    if address.starts_with("0x") {
        hex::decode(&address[2..]).ok()
    } else {
        bs58::decode(address).into_vec().ok()
    }
}

fn verify_ed25519(message: &str, signature: &str, pubkey_text: &str) -> bool {
    let sig_bytes = match decode_sig(signature) {
        Some(b) => b,
        None => return false,
    };
    let pk_bytes = match decode_addr(pubkey_text) {
        Some(b) => b,
        None => return false,
    };

    if sig_bytes.len() != 64 || pk_bytes.len() != 32 {
        return false;
    }

    let public_key = match VerifyingKey::from_bytes(&pk_bytes.try_into().unwrap()) {
        Ok(pk) => pk,
        Err(_) => return false,
    };

    let signature_obj = Signature::from_bytes(&sig_bytes.try_into().unwrap());

    public_key.verify(message.as_bytes(), &signature_obj).is_ok()
}

fn nonce_hex(caller: Principal, kind: &str, issued_at: u64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(caller.as_slice());
    hasher.update(kind.as_bytes());
    hasher.update(issued_at.to_le_bytes());
    hex::encode(hasher.finalize())[..32].to_string()
}

// Verification status
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum VerificationStatus {
    Pending,
    Approved,
    Rejected,
    Expired,
}

impl Default for VerificationStatus {
    fn default() -> Self {
        VerificationStatus::Pending
    }
}

// Document type
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum DocumentType {
    DriversLicense,
    Insurance,
    MCNumber,
    DOTNumber,
    VehicleRegistration,
    ProofOfAddress,
    Other(String),
}

// User profile in KIP
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KIPProfile {
    pub principal: Principal,
    pub username: String,
    pub display_name: String,
    pub bio: Option<String>,
    pub profile_picture_url: Option<String>,
    pub banner_url: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub mailing_address: Option<MailingAddress>,
    pub oisy_wallet_principal: Option<Principal>,
    pub verification_status: VerificationStatus,
    pub verified_at: Option<u64>,
    pub created_at: u64,
    pub updated_at: u64,
    pub preferences: Vec<(String, String)>,
    pub social_links: SocialLinks,
    pub newsletter_subscribed: bool,
    pub stats: UserStats,
}

// Mailing address for newsletter
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct MailingAddress {
    pub street: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub country: Option<String>,
}

// Social links
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct SocialLinks {
    pub twitter: Option<String>,
    pub instagram: Option<String>,
    pub discord: Option<String>,
    pub website: Option<String>,
}

// User stats for leaderboards
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct UserStats {
    pub total_games_played: u64,
    pub total_harlee_earned: u64,
    pub crossword_puzzles_solved: u64,
    pub sk8_punks_high_score: u64,
    pub articles_written: u64,
    pub memes_uploaded: u64,
    pub nfts_owned: u64,
}

impl Storable for KIPProfile {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Document record
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Document {
    pub id: String,
    pub owner: Principal,
    pub doc_type: DocumentType,
    pub hash: String, // SHA256 hash of document content
    pub status: VerificationStatus,
    pub uploaded_at: u64,
    pub reviewed_at: Option<u64>,
    pub reviewer: Option<Principal>,
    pub rejection_reason: Option<String>,
    pub expires_at: Option<u64>,
}

impl Storable for Document {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// KIP Configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct KIPConfig {
    pub admin: Principal,
    pub verification_required_docs: Vec<DocumentType>,
    pub auto_expire_days: u64,
}

impl Default for KIPConfig {
    fn default() -> Self {
        Self {
            admin: Principal::anonymous(),
            verification_required_docs: vec![
                DocumentType::DriversLicense,
                DocumentType::Insurance,
            ],
            auto_expire_days: 365,
        }
    }
}

impl Storable for KIPConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 500,
        is_fixed_size: false,
    };
}

// Storable wrapper for Principal
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(bytes.as_ref()))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

// Storable wrapper for String
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.into_owned()).unwrap_or_default())
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static PROFILES: RefCell<StableBTreeMap<StorablePrincipal, KIPProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PROFILES_MEM_ID))
        ));

    static DOCUMENTS: RefCell<StableBTreeMap<StorableString, Document, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(DOCUMENTS_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<KIPConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            KIPConfig::default()
        ).unwrap());

    static LINKED_WALLETS: RefCell<StableBTreeMap<StorablePrincipal, LinkedWallets, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(LINKED_WALLETS_MEM_ID))
        ));

    static PENDING_LINKS: RefCell<StableBTreeMap<LinkKey, WalletLinkChallenge, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PENDING_LINKS_MEM_ID))
        ));
}

// Admin principal
fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin == caller)
        || ic_cdk::api::is_controller(&caller)
}

fn generate_doc_id(owner: Principal, doc_type: &DocumentType) -> String {
    let mut hasher = Sha256::new();
    hasher.update(owner.as_slice());
    hasher.update(format!("{:?}", doc_type).as_bytes());
    hasher.update(ic_cdk::api::time().to_le_bytes());
    hex::encode(hasher.finalize())[..16].to_string()
}

#[init]
fn init() {
    let caller = ic_cdk::caller();
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin = caller;
        c.borrow_mut().set(config).unwrap();
    });
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// === Profile Management ===

#[update]
fn create_profile(username: String, display_name: String, email: Option<String>) -> Result<KIPProfile, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create profiles".to_string());
    }
    
    // Validate username
    if username.len() < 3 || username.len() > 20 {
        return Err("Username must be 3-20 characters".to_string());
    }
    
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Username can only contain letters, numbers, and underscores".to_string());
    }
    
    if display_name.len() > 50 {
        return Err("Display name too long".to_string());
    }
    
    // Check if username is taken
    let username_taken = PROFILES.with(|p| {
        p.borrow().iter().any(|(_, profile)| 
            profile.username.to_lowercase() == username.to_lowercase()
        )
    });
    
    if username_taken {
        return Err("Username is already taken".to_string());
    }
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(caller);
        
        if profiles.contains_key(&key) {
            return Err("Profile already exists".to_string());
        }
        
        let now = ic_cdk::api::time();
        let profile = KIPProfile {
            principal: caller,
            username,
            display_name,
            bio: None,
            profile_picture_url: None,
            banner_url: None,
            email,
            phone: None,
            address: None,
            mailing_address: None,
            oisy_wallet_principal: None,
            verification_status: VerificationStatus::Pending,
            verified_at: None,
            created_at: now,
            updated_at: now,
            preferences: Vec::new(),
            social_links: SocialLinks::default(),
            newsletter_subscribed: false,
            stats: UserStats::default(),
        };
        
        profiles.insert(key, profile.clone());
        Ok(profile)
    })
}

#[derive(CandidType, Deserialize)]
pub struct ProfileUpdateRequest {
    pub display_name: Option<String>,
    pub bio: Option<String>,
    pub profile_picture_url: Option<String>,
    pub banner_url: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mailing_address: Option<MailingAddress>,
    pub social_links: Option<SocialLinks>,
    pub newsletter_subscribed: Option<bool>,
}

#[update]
fn update_profile_v2(request: ProfileUpdateRequest) -> Result<KIPProfile, String> {
    let caller = ic_cdk::caller();
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(caller);
        
        match profiles.get(&key) {
            Some(mut profile) => {
                if let Some(name) = request.display_name {
                    if name.len() > 50 {
                        return Err("Display name too long".to_string());
                    }
                    profile.display_name = name;
                }
                if let Some(bio) = request.bio {
                    if bio.len() > 500 {
                        return Err("Bio too long (max 500 characters)".to_string());
                    }
                    profile.bio = Some(bio);
                }
                if let Some(url) = request.profile_picture_url {
                    profile.profile_picture_url = Some(url);
                }
                if let Some(url) = request.banner_url {
                    profile.banner_url = Some(url);
                }
                if let Some(email) = request.email {
                    profile.email = Some(email);
                }
                if let Some(phone) = request.phone {
                    profile.phone = Some(phone);
                }
                if let Some(addr) = request.mailing_address {
                    profile.mailing_address = Some(addr);
                }
                if let Some(social) = request.social_links {
                    profile.social_links = social;
                }
                if let Some(subscribed) = request.newsletter_subscribed {
                    profile.newsletter_subscribed = subscribed;
                }
                
                profile.updated_at = ic_cdk::api::time();
                profiles.insert(key, profile.clone());
                Ok(profile)
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

// Check if username is available
#[query]
fn is_username_available(username: String) -> bool {
    if username.len() < 3 || username.len() > 20 {
        return false;
    }
    
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return false;
    }
    
    PROFILES.with(|p| {
        !p.borrow().iter().any(|(_, profile)| 
            profile.username.to_lowercase() == username.to_lowercase()
        )
    })
}

// Get profile by username
#[query]
fn get_profile_by_username(username: String) -> Option<KIPProfile> {
    PROFILES.with(|p| {
        p.borrow().iter()
            .find(|(_, profile)| profile.username.to_lowercase() == username.to_lowercase())
            .map(|(_, profile)| profile)
    })
}

// Update user stats (called by other canisters)
#[update]
fn update_user_stats(
    user: Principal,
    games_played: Option<u64>,
    harlee_earned: Option<u64>,
    crosswords_solved: Option<u64>,
    sk8_high_score: Option<u64>,
    articles: Option<u64>,
    memes: Option<u64>,
    nfts: Option<u64>,
) -> Result<UserStats, String> {
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(user);
        
        match profiles.get(&key) {
            Some(mut profile) => {
                if let Some(v) = games_played {
                    profile.stats.total_games_played = profile.stats.total_games_played.saturating_add(v);
                }
                if let Some(v) = harlee_earned {
                    profile.stats.total_harlee_earned = profile.stats.total_harlee_earned.saturating_add(v);
                }
                if let Some(v) = crosswords_solved {
                    profile.stats.crossword_puzzles_solved = profile.stats.crossword_puzzles_solved.saturating_add(v);
                }
                if let Some(v) = sk8_high_score {
                    if v > profile.stats.sk8_punks_high_score {
                        profile.stats.sk8_punks_high_score = v;
                    }
                }
                if let Some(v) = articles {
                    profile.stats.articles_written = profile.stats.articles_written.saturating_add(v);
                }
                if let Some(v) = memes {
                    profile.stats.memes_uploaded = profile.stats.memes_uploaded.saturating_add(v);
                }
                if let Some(v) = nfts {
                    profile.stats.nfts_owned = v;
                }
                
                profile.updated_at = ic_cdk::api::time();
                let stats = profile.stats.clone();
                profiles.insert(key, profile);
                Ok(stats)
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

// Get leaderboard for a specific stat
#[query]
fn get_leaderboard(stat_type: String, limit: u64) -> Vec<(KIPProfile, u64)> {
    PROFILES.with(|p| {
        let profiles = p.borrow();
        let mut entries: Vec<(KIPProfile, u64)> = profiles.iter()
            .map(|(_, profile)| {
                let value = match stat_type.as_str() {
                    "harlee_earned" => profile.stats.total_harlee_earned,
                    "games_played" => profile.stats.total_games_played,
                    "crosswords" => profile.stats.crossword_puzzles_solved,
                    "sk8_punks" => profile.stats.sk8_punks_high_score,
                    "articles" => profile.stats.articles_written,
                    "memes" => profile.stats.memes_uploaded,
                    "nfts" => profile.stats.nfts_owned,
                    _ => 0,
                };
                (profile, value)
            })
            .filter(|(_, value)| *value > 0)
            .collect();
        
        entries.sort_by(|a, b| b.1.cmp(&a.1));
        entries.truncate(limit as usize);
        entries
    })
}

// Newsletter subscription endpoint
#[update]
fn subscribe_newsletter(email: String, mailing_address: Option<MailingAddress>) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(caller);
        
        if let Some(mut profile) = profiles.get(&key) {
            profile.email = Some(email);
            profile.mailing_address = mailing_address;
            profile.newsletter_subscribed = true;
            profile.updated_at = ic_cdk::api::time();
            profiles.insert(key, profile);
            Ok(())
        } else {
            Err("Profile not found. Please create a profile first.".to_string())
        }
    })
}

#[update]
fn update_profile(
    display_name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    address: Option<String>,
) -> Result<KIPProfile, String> {
    let caller = ic_cdk::caller();
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(caller);
        
        match profiles.get(&key) {
            Some(mut profile) => {
                if let Some(name) = display_name {
                    if name.len() > 50 {
                        return Err("Display name too long".to_string());
                    }
                    profile.display_name = name;
                }
                if email.is_some() {
                    profile.email = email;
                }
                if phone.is_some() {
                    profile.phone = phone;
                }
                if address.is_some() {
                    profile.address = address;
                }
                profile.updated_at = ic_cdk::api::time();
                
                profiles.insert(key, profile.clone());
                Ok(profile)
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

#[update]
fn set_oisy_wallet(wallet_principal: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(caller);
        
        match profiles.get(&key) {
            Some(mut profile) => {
                profile.oisy_wallet_principal = Some(wallet_principal);
                profile.updated_at = ic_cdk::api::time();
                profiles.insert(key, profile);
                Ok(())
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

#[update]
fn set_preference(key: String, value: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if key.len() > 50 || value.len() > 200 {
        return Err("Key or value too long".to_string());
    }
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let pkey = StorablePrincipal(caller);
        
        match profiles.get(&pkey) {
            Some(mut profile) => {
                // Update or add preference
                if let Some(pref) = profile.preferences.iter_mut().find(|(k, _)| k == &key) {
                    pref.1 = value;
                } else {
                    profile.preferences.push((key, value));
                }
                profile.updated_at = ic_cdk::api::time();
                profiles.insert(pkey, profile);
                Ok(())
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

#[query]
fn get_profile(principal: Principal) -> Option<KIPProfile> {
    PROFILES.with(|p| p.borrow().get(&StorablePrincipal(principal)))
}

#[query]
fn get_my_profile() -> Option<KIPProfile> {
    get_profile(ic_cdk::caller())
}

// === Document Management ===

#[update]
fn upload_document(doc_type: DocumentType, content_hash: String) -> Result<Document, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot upload documents".to_string());
    }
    
    // Validate hash format
    if content_hash.len() != 64 || hex::decode(&content_hash).is_err() {
        return Err("Invalid document hash format".to_string());
    }
    
    let doc_id = generate_doc_id(caller, &doc_type);
    let now = ic_cdk::api::time();
    
    let document = Document {
        id: doc_id.clone(),
        owner: caller,
        doc_type,
        hash: content_hash,
        status: VerificationStatus::Pending,
        uploaded_at: now,
        reviewed_at: None,
        reviewer: None,
        rejection_reason: None,
        expires_at: None,
    };
    
    DOCUMENTS.with(|d| {
        d.borrow_mut().insert(StorableString(doc_id), document.clone());
    });
    
    Ok(document)
}

#[query]
fn get_document(doc_id: String) -> Option<Document> {
    DOCUMENTS.with(|d| d.borrow().get(&StorableString(doc_id)))
}

#[query]
fn get_my_documents() -> Vec<Document> {
    let caller = ic_cdk::caller();
    
    DOCUMENTS.with(|d| {
        d.borrow()
            .iter()
            .filter(|(_, doc)| doc.owner == caller)
            .map(|(_, doc)| doc)
            .collect()
    })
}

// === Admin Functions ===

#[update]
fn review_document(
    doc_id: String,
    approved: bool,
    rejection_reason: Option<String>,
) -> Result<Document, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can review documents".to_string());
    }
    
    DOCUMENTS.with(|d| {
        let mut documents = d.borrow_mut();
        let key = StorableString(doc_id);
        
        match documents.get(&key) {
            Some(mut doc) => {
                let now = ic_cdk::api::time();
                
                doc.status = if approved {
                    VerificationStatus::Approved
                } else {
                    VerificationStatus::Rejected
                };
                doc.reviewed_at = Some(now);
                doc.reviewer = Some(caller);
                doc.rejection_reason = rejection_reason;
                
                if approved {
                    // Set expiry based on config
                    let config = CONFIG.with(|c| c.borrow().get().clone());
                    doc.expires_at = Some(now + config.auto_expire_days * 24 * 60 * 60 * 1_000_000_000);
                }
                
                documents.insert(key, doc.clone());
                
                // Update user verification status if all required docs are approved
                update_user_verification(doc.owner);
                
                Ok(doc)
            }
            None => Err("Document not found".to_string()),
        }
    })
}

fn update_user_verification(user: Principal) {
    let config = CONFIG.with(|c| c.borrow().get().clone());
    
    // Check if all required documents are approved
    let user_docs: Vec<Document> = DOCUMENTS.with(|d| {
        d.borrow()
            .iter()
            .filter(|(_, doc)| doc.owner == user)
            .map(|(_, doc)| doc)
            .collect()
    });
    
    let all_verified = config.verification_required_docs.iter().all(|required| {
        user_docs.iter().any(|doc| {
            matches!(&doc.doc_type, dt if std::mem::discriminant(dt) == std::mem::discriminant(required))
                && doc.status == VerificationStatus::Approved
        })
    });
    
    if all_verified {
        PROFILES.with(|p| {
            let mut profiles = p.borrow_mut();
            let key = StorablePrincipal(user);
            
            if let Some(mut profile) = profiles.get(&key) {
                profile.verification_status = VerificationStatus::Approved;
                profile.verified_at = Some(ic_cdk::api::time());
                profiles.insert(key, profile);
            }
        });
    }
}

#[update]
fn set_verification_status(user: Principal, status: VerificationStatus) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can set verification status".to_string());
    }
    
    PROFILES.with(|p| {
        let mut profiles = p.borrow_mut();
        let key = StorablePrincipal(user);
        
        match profiles.get(&key) {
            Some(mut profile) => {
                profile.verification_status = status.clone();
                if status == VerificationStatus::Approved {
                    profile.verified_at = Some(ic_cdk::api::time());
                }
                profiles.insert(key, profile);
                Ok(())
            }
            None => Err("Profile not found".to_string()),
        }
    })
}

#[query]
fn get_pending_documents() -> Vec<Document> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Vec::new();
    }
    
    DOCUMENTS.with(|d| {
        d.borrow()
            .iter()
            .filter(|(_, doc)| doc.status == VerificationStatus::Pending)
            .map(|(_, doc)| doc)
            .collect()
    })
}

#[query]
fn get_config() -> KIPConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[query]
fn is_verified(principal: Principal) -> bool {
    PROFILES.with(|p| {
        p.borrow()
            .get(&StorablePrincipal(principal))
            .map(|profile| profile.verification_status == VerificationStatus::Approved)
            .unwrap_or(false)
    })
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// =========================
// Linked wallets (Phantom/Sui)
// =========================

#[update]
fn start_link_wallet(kind: String) -> WalletLinkResult {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return WalletLinkResult::Err("Anonymous principals cannot link wallets".to_string());
    }

    let kind_norm = kind.to_lowercase();
    if kind_norm != "phantom" && kind_norm != "sui" {
        return WalletLinkResult::Err("Unsupported kind. Use 'phantom' or 'sui'.".to_string());
    }

    let now = ic_cdk::api::time();
    let ttl_ns: u64 = 10 * 60 * 1_000_000_000; // 10 minutes
    let expires_at = now.saturating_add(ttl_ns);
    let nonce = nonce_hex(caller, &kind_norm, now);

    let domain = "raven-ecosystem".to_string();
    let uri = "https://raven-unified-ecosystem.ic0.app".to_string();

    let statement = Some(format!(
        "Link this wallet to ICP principal: {}",
        caller.to_text()
    ));

    let payload = if kind_norm == "phantom" {
        LinkPayload::Solana(SIWSMessage {
            domain,
            address: "".to_string(), // frontend fills wallet pubkey
            statement,
            uri,
            version: "1".to_string(),
            chain_id: "mainnet-beta".to_string(),
            nonce,
            issued_at: now.to_string(),
            expiration_time: None,
            not_before: None,
            request_id: None,
            resources: None,
        })
    } else {
        LinkPayload::Sui(SISMessage {
            domain,
            address: "".to_string(), // frontend fills wallet pubkey (see sis_canister)
            statement,
            uri,
            version: "1".to_string(),
            chain_id: "mainnet".to_string(),
            nonce,
            issued_at: now.to_string(),
            expiration_time: None,
            not_before: None,
            request_id: None,
            resources: None,
        })
    };

    let challenge = WalletLinkChallenge {
        kind: kind_norm.clone(),
        issued_at: now,
        expires_at,
        payload,
    };

    PENDING_LINKS.with(|p| {
        p.borrow_mut().insert(
            LinkKey {
                principal: caller,
                kind: kind_norm,
            },
            challenge.clone(),
        );
    });

    WalletLinkResult::Ok(challenge)
}

#[update]
fn confirm_link_wallet(payload: LinkPayload, signature: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot link wallets".to_string());
    }

    let (kind, address, formatted_message, nonce) = match &payload {
        LinkPayload::Solana(msg) => {
            let kind = "phantom".to_string();
            let formatted = format_siws_message(msg);
            (kind, msg.address.clone(), formatted, msg.nonce.clone())
        }
        LinkPayload::Sui(msg) => {
            let kind = "sui".to_string();
            let formatted = format_sis_message(msg);
            (kind, msg.address.clone(), formatted, msg.nonce.clone())
        }
    };

    let pending = PENDING_LINKS.with(|p| {
        p.borrow()
            .get(&LinkKey {
                principal: caller,
                kind: kind.clone(),
            })
    });

    let pending = match pending {
        Some(p) => p,
        None => return Err("No pending link challenge. Call start_link_wallet first.".to_string()),
    };

    if ic_cdk::api::time() > pending.expires_at {
        return Err("Challenge expired. Please start again.".to_string());
    }

    // Ensure caller-bound nonce matches (prevents replay across principals/kinds)
    let expected_nonce = nonce_hex(caller, &kind, pending.issued_at);
    if nonce != expected_nonce {
        return Err("Nonce mismatch. Please start again.".to_string());
    }

    if address.is_empty() {
        return Err("Missing address/public key in payload.".to_string());
    }

    // Ensure the signed statement is caller-bound (defense in depth)
    let caller_text = caller.to_text();
    match &payload {
        LinkPayload::Solana(msg) => {
            if msg.statement.as_ref().map(|s| s.contains(&caller_text)) != Some(true) {
                return Err("Challenge statement mismatch. Please start again.".to_string());
            }
        }
        LinkPayload::Sui(msg) => {
            if msg.statement.as_ref().map(|s| s.contains(&caller_text)) != Some(true) {
                return Err("Challenge statement mismatch. Please start again.".to_string());
            }
        }
    }

    // Verify signature locally (same behavior as sis/siws canisters: signature in base58 or 0x hex)
    let ok = verify_ed25519(&formatted_message, &signature, &address);
    if !ok {
        return Err("Invalid signature".to_string());
    }

    // Store linked wallet under caller principal
    LINKED_WALLETS.with(|lw| {
        let mut map = lw.borrow_mut();
        let key = StorablePrincipal(caller);
        let mut current = map.get(&key).unwrap_or_default();
        if kind == "phantom" {
            if !current.solana_pubkeys.iter().any(|a| a == &address) {
                current.solana_pubkeys.push(address);
            }
        } else if kind == "sui" {
            if !current.sui_addresses.iter().any(|a| a == &address) {
                current.sui_addresses.push(address);
            }
        }
        map.insert(key, current);
    });

    // Clear pending
    PENDING_LINKS.with(|p| {
        p.borrow_mut().remove(&LinkKey {
            principal: caller,
            kind,
        });
    });

    Ok(())
}

#[query]
fn get_linked_wallets(principal: Principal) -> Option<LinkedWallets> {
    LINKED_WALLETS.with(|lw| lw.borrow().get(&StorablePrincipal(principal)))
}

#[query]
fn get_my_linked_wallets() -> Option<LinkedWallets> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return None;
    }
    LINKED_WALLETS.with(|lw| lw.borrow().get(&StorablePrincipal(caller)))
}

// Generate Candid
ic_cdk::export_candid!();



