//! Core Canister - Central hub for Raven Ecosystem
//! Handles user management, authentication, and cross-canister coordination

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs for stable structures
const USERS_MEM_ID: MemoryId = MemoryId::new(0);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(1);
const RATE_LIMIT_MEM_ID: MemoryId = MemoryId::new(2);

// User roles
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum UserRole {
    Admin,
    User,
    Driver,
    Shipper,
    Warehouse,
}

impl Default for UserRole {
    fn default() -> Self {
        UserRole::User
    }
}

// User profile stored on-chain
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserProfile {
    #[serde(rename = "user_principal")]
    pub principal: Principal,
    pub display_name: String,
    pub email: Option<String>,
    pub role: UserRole,
    pub created_at: u64,
    pub last_login: u64,
    pub kyc_verified: bool,
    pub wallet_addresses: WalletAddresses,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct WalletAddresses {
    pub icp: Option<String>,
    pub evm: Option<String>,
    pub btc: Option<String>,
    pub sol: Option<String>,
}

// Storable implementation for UserProfile
impl Storable for UserProfile {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
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

// Rate limit entry
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct RateLimitEntry {
    pub count: u32,
    pub window_start: u64,
}

impl Storable for RateLimitEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 100,
        is_fixed_size: false,
    };
}

// Admin configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct AdminConfig {
    pub admin_principal: Principal,
    pub platform_fee_bps: u16, // Basis points (100 = 1%)
    pub treasury_principal: Principal,
    pub paused: bool,
}

impl Default for AdminConfig {
    fn default() -> Self {
        Self {
            admin_principal: Principal::anonymous(),
            platform_fee_bps: 300, // 3%
            treasury_principal: Principal::anonymous(),
            paused: false,
        }
    }
}

impl Storable for AdminConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 200,
        is_fixed_size: false,
    };
}

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USERS: RefCell<StableBTreeMap<StorablePrincipal, UserProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(USERS_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<AdminConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            AdminConfig::default()
        ).unwrap());

    static RATE_LIMITS: RefCell<StableBTreeMap<StorablePrincipal, RateLimitEntry, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(RATE_LIMIT_MEM_ID))
        ));
}

// Constants
const RATE_LIMIT_WINDOW: u64 = 60_000_000_000; // 1 minute in nanoseconds
const MAX_REQUESTS_PER_WINDOW: u32 = 100;

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin_principal == caller)
        || ic_cdk::api::is_controller(&caller)
}

fn check_rate_limit(caller: Principal) -> Result<(), String> {
    let now = ic_cdk::api::time();
    
    RATE_LIMITS.with(|rl| {
        let mut rate_limits = rl.borrow_mut();
        let key = StorablePrincipal(caller);
        
        match rate_limits.get(&key) {
            Some(entry) => {
                if now - entry.window_start > RATE_LIMIT_WINDOW {
                    // Reset window
                    rate_limits.insert(key, RateLimitEntry {
                        count: 1,
                        window_start: now,
                    });
                    Ok(())
                } else if entry.count >= MAX_REQUESTS_PER_WINDOW {
                    Err("Rate limit exceeded. Please try again later.".to_string())
                } else {
                    rate_limits.insert(key, RateLimitEntry {
                        count: entry.count + 1,
                        window_start: entry.window_start,
                    });
                    Ok(())
                }
            }
            None => {
                rate_limits.insert(key, RateLimitEntry {
                    count: 1,
                    window_start: now,
                });
                Ok(())
            }
        }
    })
}

// Initialization
#[init]
fn init() {
    let caller = ic_cdk::caller();
    
    // Set initial admin
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin_principal = caller;
        c.borrow_mut().set(config).unwrap();
    });

    // Register first user as admin
    if caller != Principal::anonymous() {
        let profile = UserProfile {
            principal: caller,
            display_name: "Admin".to_string(),
            email: None,
            role: UserRole::Admin,
            created_at: ic_cdk::api::time(),
            last_login: ic_cdk::api::time(),
            kyc_verified: true,
            wallet_addresses: WalletAddresses::default(),
        };
        
        USERS.with(|u| {
            u.borrow_mut().insert(StorablePrincipal(caller), profile);
        });
    }
}

// Upgrade hooks
#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// === User Management ===

#[update]
fn register_user() -> Result<UserProfile, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot register".to_string());
    }
    
    check_rate_limit(caller)?;
    
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(caller);
        
        if users.contains_key(&key) {
            // Update last login
            if let Some(mut profile) = users.get(&key) {
                profile.last_login = ic_cdk::api::time();
                users.insert(key, profile.clone());
                return Ok(profile);
            }
        }
        
        // Determine role - first user is admin
        let role = if users.is_empty() {
            UserRole::Admin
        } else {
            UserRole::User
        };
        
        let profile = UserProfile {
            principal: caller,
            display_name: String::new(),
            email: None,
            role,
            created_at: ic_cdk::api::time(),
            last_login: ic_cdk::api::time(),
            kyc_verified: false,
            wallet_addresses: WalletAddresses::default(),
        };
        
        users.insert(key, profile.clone());
        Ok(profile)
    })
}

#[update]
fn update_profile(display_name: String, email: Option<String>) -> Result<UserProfile, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot update profiles".to_string());
    }
    
    check_rate_limit(caller)?;
    
    // Validate input
    if display_name.len() > 50 {
        return Err("Display name too long (max 50 characters)".to_string());
    }
    
    if let Some(ref e) = email {
        if e.len() > 100 || !e.contains('@') {
            return Err("Invalid email address".to_string());
        }
    }
    
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(caller);
        
        match users.get(&key) {
            Some(mut profile) => {
                profile.display_name = display_name;
                profile.email = email;
                profile.last_login = ic_cdk::api::time();
                users.insert(key, profile.clone());
                Ok(profile)
            }
            None => Err("User not found. Please register first.".to_string()),
        }
    })
}

#[query]
fn get_profile(principal: Principal) -> Option<UserProfile> {
    USERS.with(|u| {
        u.borrow().get(&StorablePrincipal(principal))
    })
}

#[query]
fn get_my_profile() -> Option<UserProfile> {
    let caller = ic_cdk::caller();
    get_profile(caller)
}

#[query]
fn get_user_role(principal: Principal) -> Option<UserRole> {
    USERS.with(|u| {
        u.borrow().get(&StorablePrincipal(principal)).map(|p| p.role)
    })
}

#[query]
fn get_total_users() -> u64 {
    USERS.with(|u| u.borrow().len())
}

#[query]
fn get_verified_drivers() -> Vec<UserProfile> {
    USERS.with(|u| {
        u.borrow()
            .iter()
            .filter_map(|(_, profile)| {
                if profile.role == UserRole::Driver && profile.kyc_verified {
                    Some(profile.clone())
                } else {
                    None
                }
            })
            .collect()
    })
}

// === Admin Functions ===

#[update]
fn set_user_role(principal: Principal, role: UserRole) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can set user roles".to_string());
    }
    
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(principal);
        
        match users.get(&key) {
            Some(mut profile) => {
                profile.role = role;
                users.insert(key, profile);
                Ok(())
            }
            None => Err("User not found".to_string()),
        }
    })
}

#[update]
fn set_kyc_verified(principal: Principal, verified: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can verify KYC".to_string());
    }
    
    USERS.with(|u| {
        let mut users = u.borrow_mut();
        let key = StorablePrincipal(principal);
        
        match users.get(&key) {
            Some(mut profile) => {
                profile.kyc_verified = verified;
                users.insert(key, profile);
                Ok(())
            }
            None => Err("User not found".to_string()),
        }
    })
}

#[update]
fn update_config(platform_fee_bps: u16, treasury_principal: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can update config".to_string());
    }
    
    if platform_fee_bps > 1000 {
        return Err("Platform fee cannot exceed 10%".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.platform_fee_bps = platform_fee_bps;
        config.treasury_principal = treasury_principal;
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[update]
fn set_paused(paused: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admins can pause the platform".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.paused = paused;
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[query]
fn get_config() -> AdminConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[query]
fn is_paused() -> bool {
    CONFIG.with(|c| c.borrow().get().paused)
}

// === Health Check ===

#[query]
fn health() -> String {
    "OK".to_string()
}

#[query]
fn get_canister_info() -> String {
    format!(
        "Core Canister v1.0.0 | Users: {} | Paused: {}",
        get_total_users(),
        is_paused()
    )
}

// Generate Candid
ic_cdk::export_candid!();




