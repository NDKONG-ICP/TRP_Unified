//! NFT Canister - ICRC-7/ICRC-37 compliant NFT implementation
//! Handles generative NFT minting, transfers, and metadata
//! Application canisters are set as controllers for all minted NFTs

pub mod controller;
pub mod multichain;

use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::BTreeMap;

use controller::{ControllerConfig, NFTControllerRecord, build_controller_list, is_authorized_controller};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const TOKENS_MEM_ID: MemoryId = MemoryId::new(0);
const OWNERS_MEM_ID: MemoryId = MemoryId::new(1);
const METADATA_MEM_ID: MemoryId = MemoryId::new(2);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(3);
const APPROVALS_MEM_ID: MemoryId = MemoryId::new(4);
const CONTROLLER_CONFIG_MEM_ID: MemoryId = MemoryId::new(5);
const CONTROLLER_RECORDS_MEM_ID: MemoryId = MemoryId::new(6);

// Admin principals that should always be controllers - Managed dynamically

// Rarity tiers
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

impl Default for Rarity {
    fn default() -> Self {
        Rarity::Common
    }
}

// NFT Trait
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Trait {
    pub trait_type: String,
    pub value: String,
    pub rarity_score: u8,
}

// NFT Metadata
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NFTMetadata {
    pub name: String,
    pub description: String,
    pub image: String, // IPFS or on-chain reference
    pub external_url: Option<String>,
    pub attributes: Vec<Trait>,
    pub rarity: Rarity,
    pub rarity_score: u32,
    pub collection: String,
    pub created_at: u64,
    pub creator: Principal,
}

impl Storable for NFTMetadata {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Token ownership
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TokenOwnership {
    pub owner: Principal,
    pub approved: Option<Principal>,
    pub transferred_at: u64,
}

impl Storable for TokenOwnership {
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

// Collection config
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CollectionConfig {
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub max_supply: u64,
    pub minted: u64,
    pub royalty_bps: u16,
    pub admin: Principal,
    pub paused: bool,
}

impl Default for CollectionConfig {
    fn default() -> Self {
        Self {
            name: "IC Spicy Collection".to_string(),
            symbol: "SPICY".to_string(),
            description: "Generative NFT collection with RWA backing".to_string(),
            max_supply: 1000,
            minted: 0,
            royalty_bps: 500, // 5%
            admin: Principal::anonymous(),
            paused: false,
        }
    }
}

impl Storable for CollectionConfig {
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

// Storable wrapper for u64
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableNat(u64);

impl Storable for StorableNat {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let arr: [u8; 8] = bytes.as_ref().try_into().unwrap_or([0; 8]);
        StorableNat(u64::from_le_bytes(arr))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
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

// Storable for Vec<u64>
#[derive(Clone, Debug, Default)]
struct StorableTokenList(Vec<u64>);

impl Storable for StorableTokenList {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableTokenList(Decode!(bytes.as_ref(), Vec<u64>).unwrap_or_default())
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Storable wrapper for ControllerConfig
impl Storable for ControllerConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap_or_default()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Storable wrapper for NFTControllerRecord
impl Storable for NFTControllerRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static TOKENS: RefCell<StableBTreeMap<StorableNat, TokenOwnership, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TOKENS_MEM_ID))
        ));

    static OWNER_TOKENS: RefCell<StableBTreeMap<StorablePrincipal, StorableTokenList, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(OWNERS_MEM_ID))
        ));

    static METADATA: RefCell<StableBTreeMap<StorableNat, NFTMetadata, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(METADATA_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<CollectionConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            CollectionConfig::default()
        ).unwrap());

    // Controller configuration for NFT canisters
    static CONTROLLER_CONFIG: RefCell<StableCell<ControllerConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONTROLLER_CONFIG_MEM_ID)),
            ControllerConfig::default()
        ).unwrap());

    // Controller records for each NFT
    static CONTROLLER_RECORDS: RefCell<StableBTreeMap<StorableNat, NFTControllerRecord, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONTROLLER_RECORDS_MEM_ID))
        ));
}

// Primary admin principal - Managed dynamically

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin == caller)
        || ic_cdk::api::is_controller(&caller)
}

fn is_controller(caller: Principal) -> bool {
    CONTROLLER_CONFIG.with(|c| {
        let config = c.borrow().get().clone();
        is_authorized_controller(caller, &config, ic_cdk::id())
    })
}

// Initialization
#[init]
fn init() {
    let caller = ic_cdk::caller();
    let this_canister = ic_cdk::id();
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin = caller;
        c.borrow_mut().set(config).unwrap();
    });

    // Initialize controller config with caller and this canister
    CONTROLLER_CONFIG.with(|c| {
        let mut config = ControllerConfig::default();
        
        // Add caller as an admin principal
        config.admin_principals.push(caller);
        
        // Add this canister as a backend canister controller
        config.backend_canisters.push(this_canister);
        config.auto_add_app_controllers = true;
        config.minter_retains_control = true;
        
        c.borrow_mut().set(config).unwrap();
    });
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// === ICRC-7 Standard Methods ===

#[query]
fn icrc7_collection_metadata() -> Vec<(String, String)> {
    CONFIG.with(|c| {
        let binding = c.borrow();
        let config = binding.get();
        vec![
            ("icrc7:name".to_string(), config.name.clone()),
            ("icrc7:symbol".to_string(), config.symbol.clone()),
            ("icrc7:description".to_string(), config.description.clone()),
            ("icrc7:total_supply".to_string(), config.minted.to_string()),
            ("icrc7:max_supply".to_string(), config.max_supply.to_string()),
        ]
    })
}

#[query]
fn icrc7_name() -> String {
    CONFIG.with(|c| c.borrow().get().name.clone())
}

#[query]
fn icrc7_symbol() -> String {
    CONFIG.with(|c| c.borrow().get().symbol.clone())
}

#[query]
fn icrc7_total_supply() -> Nat {
    CONFIG.with(|c| Nat::from(c.borrow().get().minted))
}

#[query]
fn icrc7_supply_cap() -> Option<Nat> {
    CONFIG.with(|c| Some(Nat::from(c.borrow().get().max_supply)))
}

#[query]
fn icrc7_owner_of(token_id: Nat) -> Option<Principal> {
    let id: u64 = token_id.0.try_into().ok()?;
    TOKENS.with(|t| {
        t.borrow().get(&StorableNat(id)).map(|o| o.owner)
    })
}

#[query]
fn icrc7_balance_of(owner: Principal) -> Nat {
    OWNER_TOKENS.with(|ot| {
        ot.borrow()
            .get(&StorablePrincipal(owner))
            .map(|list| Nat::from(list.0.len() as u64))
            .unwrap_or(Nat::from(0u64))
    })
}

#[query]
fn icrc7_tokens_of(owner: Principal) -> Vec<Nat> {
    OWNER_TOKENS.with(|ot| {
        ot.borrow()
            .get(&StorablePrincipal(owner))
            .map(|list| list.0.iter().map(|id| Nat::from(*id)).collect())
            .unwrap_or_default()
    })
}

#[query]
fn icrc7_token_metadata(token_id: Nat) -> Option<Vec<(String, String)>> {
    let id: u64 = token_id.0.try_into().ok()?;
    METADATA.with(|m| {
        m.borrow().get(&StorableNat(id)).map(|meta| {
            let mut result = vec![
                ("name".to_string(), meta.name.clone()),
                ("description".to_string(), meta.description.clone()),
                ("image".to_string(), meta.image.clone()),
                ("collection".to_string(), meta.collection.clone()),
                ("rarity".to_string(), format!("{:?}", meta.rarity)),
                ("rarity_score".to_string(), meta.rarity_score.to_string()),
            ];
            
            if let Some(ref url) = meta.external_url {
                result.push(("external_url".to_string(), url.clone()));
            }
            
            for (i, attr) in meta.attributes.iter().enumerate() {
                result.push((
                    format!("attribute_{}_type", i),
                    attr.trait_type.clone(),
                ));
                result.push((
                    format!("attribute_{}_value", i),
                    attr.value.clone(),
                ));
            }
            
            result
        })
    })
}

// === ICRC-37 Transfer Methods ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TransferArg {
    pub from_subaccount: Option<Vec<u8>>,
    pub to: Principal,
    pub token_id: Nat,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum TransferError {
    NonExistingTokenId,
    InvalidRecipient,
    Unauthorized,
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    GenericError { error_code: Nat, message: String },
    GenericBatchError { error_code: Nat, message: String },
}

#[update]
fn icrc7_transfer(args: Vec<TransferArg>) -> Vec<Option<Result<Nat, TransferError>>> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    args.into_iter().map(|arg| {
        let token_id: u64 = match arg.token_id.0.try_into() {
            Ok(id) => id,
            Err(_) => return Some(Err(TransferError::NonExistingTokenId)),
        };
        
        // Validate recipient
        if arg.to == Principal::anonymous() {
            return Some(Err(TransferError::InvalidRecipient));
        }
        
        // Check ownership
        let ownership = TOKENS.with(|t| t.borrow().get(&StorableNat(token_id)));
        
        match ownership {
            Some(own) => {
                if own.owner != caller && own.approved != Some(caller) && !is_admin(caller) {
                    return Some(Err(TransferError::Unauthorized));
                }
                
                // Perform transfer
                let new_ownership = TokenOwnership {
                    owner: arg.to,
                    approved: None,
                    transferred_at: now,
                };
                
                TOKENS.with(|t| {
                    t.borrow_mut().insert(StorableNat(token_id), new_ownership);
                });
                
                // Update owner token lists
                OWNER_TOKENS.with(|ot| {
                    let mut owner_tokens = ot.borrow_mut();
                    
                    // Remove from old owner
                    if let Some(mut list) = owner_tokens.get(&StorablePrincipal(own.owner)) {
                        list.0.retain(|&id| id != token_id);
                        owner_tokens.insert(StorablePrincipal(own.owner), list);
                    }
                    
                    // Add to new owner
                    let mut new_list = owner_tokens
                        .get(&StorablePrincipal(arg.to))
                        .unwrap_or_default();
                    new_list.0.push(token_id);
                    owner_tokens.insert(StorablePrincipal(arg.to), new_list);
                });
                
                Some(Ok(Nat::from(token_id)))
            }
            None => Some(Err(TransferError::NonExistingTokenId)),
        }
    }).collect()
}

#[update]
fn icrc37_approve(token_id: Nat, spender: Principal) -> Result<(), TransferError> {
    let caller = ic_cdk::caller();
    let id: u64 = token_id.0.try_into().map_err(|_| TransferError::NonExistingTokenId)?;
    
    TOKENS.with(|t| {
        let mut tokens = t.borrow_mut();
        
        match tokens.get(&StorableNat(id)) {
            Some(mut own) => {
                if own.owner != caller && !is_admin(caller) {
                    return Err(TransferError::Unauthorized);
                }
                
                own.approved = Some(spender);
                tokens.insert(StorableNat(id), own);
                Ok(())
            }
            None => Err(TransferError::NonExistingTokenId),
        }
    })
}

// === Minting ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MintArgs {
    pub to: Principal,
    pub name: String,
    pub description: String,
    pub image: String,
    pub attributes: Vec<Trait>,
}

#[update]
fn mint(args: MintArgs) -> Result<Nat, String> {
    let caller = ic_cdk::caller();
    
    // Only admin can mint
    if !is_admin(caller) {
        return Err("Only admin can mint NFTs".to_string());
    }
    
    // Check supply
    let (token_id, config) = CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        
        if config.minted >= config.max_supply {
            return Err("Max supply reached".to_string());
        }
        
        if config.paused {
            return Err("Minting is paused".to_string());
        }
        
        let token_id = config.minted;
        config.minted += 1;
        c.borrow_mut().set(config.clone()).unwrap();
        
        Ok((token_id, config))
    })?;
    
    // Calculate rarity
    let rarity_score: u32 = args.attributes.iter().map(|a| a.rarity_score as u32).sum();
    let rarity = match rarity_score {
        0..=20 => Rarity::Common,
        21..=40 => Rarity::Uncommon,
        41..=60 => Rarity::Rare,
        61..=80 => Rarity::Epic,
        _ => Rarity::Legendary,
    };
    
    // Create metadata
    let metadata = NFTMetadata {
        name: args.name,
        description: args.description,
        image: args.image,
        external_url: None,
        attributes: args.attributes,
        rarity,
        rarity_score,
        collection: config.name,
        created_at: ic_cdk::api::time(),
        creator: caller,
    };
    
    // Store metadata
    METADATA.with(|m| {
        m.borrow_mut().insert(StorableNat(token_id), metadata);
    });
    
    // Create ownership
    let ownership = TokenOwnership {
        owner: args.to,
        approved: None,
        transferred_at: ic_cdk::api::time(),
    };
    
    TOKENS.with(|t| {
        t.borrow_mut().insert(StorableNat(token_id), ownership);
    });
    
    // Update owner token list
    OWNER_TOKENS.with(|ot| {
        let mut owner_tokens = ot.borrow_mut();
        let mut list = owner_tokens
            .get(&StorablePrincipal(args.to))
            .unwrap_or_default();
        list.0.push(token_id);
        owner_tokens.insert(StorablePrincipal(args.to), list);
    });
    
    // Automatically register controllers for this NFT
    // Application canisters are set as controllers for customer service and updates
    let controller_config = CONTROLLER_CONFIG.with(|c| c.borrow().get().clone());
    let controllers = build_controller_list(&controller_config, args.to, ic_cdk::id());
    
    let controller_record = NFTControllerRecord {
        token_id,
        canister_id: None, // Will be set if NFT gets its own canister
        controllers,
        owner: args.to,
        created_at: ic_cdk::api::time(),
        last_updated: ic_cdk::api::time(),
    };
    
    CONTROLLER_RECORDS.with(|r| {
        r.borrow_mut().insert(StorableNat(token_id), controller_record);
    });
    
    Ok(Nat::from(token_id))
}

#[update]
fn batch_mint(args: Vec<MintArgs>) -> Vec<Result<Nat, String>> {
    args.into_iter().map(|arg| mint(arg)).collect()
}

// === Admin Functions ===

#[update]
fn set_paused(paused: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can pause minting".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.paused = paused;
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[update]
fn update_collection_config(
    name: String,
    symbol: String,
    description: String,
    royalty_bps: u16,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can update config".to_string());
    }
    
    if royalty_bps > 1000 {
        return Err("Royalty cannot exceed 10%".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.name = name;
        config.symbol = symbol;
        config.description = description;
        config.royalty_bps = royalty_bps;
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

// === Query Methods ===

#[query]
fn get_collection_config() -> CollectionConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[query]
fn get_nft_metadata(token_id: Nat) -> Option<NFTMetadata> {
    let id: u64 = token_id.0.try_into().ok()?;
    METADATA.with(|m| m.borrow().get(&StorableNat(id)))
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// === Controller Management Functions ===

/// Get the current controller configuration
#[query]
fn get_controller_config() -> ControllerConfig {
    CONTROLLER_CONFIG.with(|c| c.borrow().get().clone())
}

/// Get controller record for a specific NFT
#[query]
fn get_nft_controllers(token_id: u64) -> Option<NFTControllerRecord> {
    CONTROLLER_RECORDS.with(|r| r.borrow().get(&StorableNat(token_id)))
}

/// Set backend canister IDs that should be controllers of all NFTs
#[update]
fn set_backend_canisters(canisters: Vec<Principal>) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can set backend canisters".to_string());
    }
    
    CONTROLLER_CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.backend_canisters = canisters;
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

/// Set frontend canister ID that should be a controller
#[update]
fn set_frontend_canister(canister: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can set frontend canister".to_string());
    }
    
    CONTROLLER_CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.frontend_canister = Some(canister);
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

/// Add an admin principal
#[update]
fn add_admin_principal(principal: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can add admin principals".to_string());
    }
    
    CONTROLLER_CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        if !config.admin_principals.contains(&principal) {
            config.admin_principals.push(principal);
        }
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

/// Remove an admin principal
#[update]
fn remove_admin_principal(principal: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can remove admin principals".to_string());
    }
    
    // Prevent removing the primary admin
    if principal.to_text() == ADMIN_PRINCIPAL {
        return Err("Cannot remove primary admin".to_string());
    }
    
    CONTROLLER_CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin_principals.retain(|p| *p != principal);
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

/// Register controller record for a minted NFT
#[update]
fn register_nft_controllers(token_id: u64, canister_id: Option<Principal>) -> Result<NFTControllerRecord, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) && !is_controller(caller) {
        return Err("Not authorized to register controllers".to_string());
    }
    
    // Get the NFT owner
    let owner = TOKENS.with(|t| {
        t.borrow().get(&StorableNat(token_id)).map(|o| o.owner)
    }).ok_or("NFT not found")?;
    
    // Build controller list
    let config = CONTROLLER_CONFIG.with(|c| c.borrow().get().clone());
    let controllers = build_controller_list(&config, owner, ic_cdk::id());
    
    let record = NFTControllerRecord {
        token_id,
        canister_id,
        controllers: controllers.clone(),
        owner,
        created_at: ic_cdk::api::time(),
        last_updated: ic_cdk::api::time(),
    };
    
    CONTROLLER_RECORDS.with(|r| {
        r.borrow_mut().insert(StorableNat(token_id), record.clone());
    });
    
    Ok(record)
}

/// Update controllers for an NFT (e.g., after transfer)
#[update]
fn update_nft_controllers(token_id: u64) -> Result<NFTControllerRecord, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) && !is_controller(caller) {
        return Err("Not authorized to update controllers".to_string());
    }
    
    // Get existing record
    let existing = CONTROLLER_RECORDS.with(|r| r.borrow().get(&StorableNat(token_id)));
    
    // Get current owner
    let owner = TOKENS.with(|t| {
        t.borrow().get(&StorableNat(token_id)).map(|o| o.owner)
    }).ok_or("NFT not found")?;
    
    // Rebuild controller list
    let config = CONTROLLER_CONFIG.with(|c| c.borrow().get().clone());
    let controllers = build_controller_list(&config, owner, ic_cdk::id());
    
    let record = NFTControllerRecord {
        token_id,
        canister_id: existing.as_ref().and_then(|e| e.canister_id),
        controllers: controllers.clone(),
        owner,
        created_at: existing.map(|e| e.created_at).unwrap_or(ic_cdk::api::time()),
        last_updated: ic_cdk::api::time(),
    };
    
    CONTROLLER_RECORDS.with(|r| {
        r.borrow_mut().insert(StorableNat(token_id), record.clone());
    });
    
    Ok(record)
}

/// Get all NFTs with their controller records
#[query]
fn get_all_controller_records() -> Vec<NFTControllerRecord> {
    CONTROLLER_RECORDS.with(|r| {
        r.borrow().iter().map(|(_, record)| record).collect()
    })
}

/// Check if a principal is an authorized controller for any NFT operations
#[query]
fn is_authorized_nft_controller(principal: Principal) -> bool {
    is_controller(principal)
}

/// Get list of all backend canister controllers
#[query]
fn get_backend_controllers() -> Vec<Principal> {
    CONTROLLER_CONFIG.with(|c| c.borrow().get().backend_canisters.clone())
}

/// Get list of all admin principals
#[query]
fn get_admin_principals() -> Vec<Principal> {
    CONTROLLER_CONFIG.with(|c| c.borrow().get().admin_principals.clone())
}

// Generate Candid
ic_cdk::export_candid!();

