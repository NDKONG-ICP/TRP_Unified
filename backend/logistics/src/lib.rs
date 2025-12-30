//! Logistics Canister - Load management and tracking
//! Handles load postings, bids, and shipment tracking

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const LOADS_MEM_ID: MemoryId = MemoryId::new(0);
const BIDS_MEM_ID: MemoryId = MemoryId::new(1);
const TRACKING_MEM_ID: MemoryId = MemoryId::new(2);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(3);

// Load status
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum LoadStatus {
    Posted,
    Bidding,
    Assigned,
    PickedUp,
    InTransit,
    Delivered,
    Completed,
    Cancelled,
}

impl Default for LoadStatus {
    fn default() -> Self {
        LoadStatus::Posted
    }
}

// Load type
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum LoadType {
    DryVan,
    Refrigerated,
    Flatbed,
    Tanker,
    Container,
    Other(String),
}

// Load record
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Load {
    pub id: String,
    pub shipper: Principal,
    pub origin: String,
    pub destination: String,
    pub pickup_date: String,
    pub delivery_date: String,
    pub weight: String,
    pub load_type: LoadType,
    pub rate: u64, // In e8s
    pub distance: String,
    pub description: String,
    pub status: LoadStatus,
    pub assigned_driver: Option<Principal>,
    pub escrow_id: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

impl Storable for Load {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Bid record
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Bid {
    pub id: String,
    pub load_id: String,
    pub driver: Principal,
    pub amount: u64,
    pub message: String,
    pub eta: String,
    pub status: String, // "pending", "accepted", "rejected"
    pub created_at: u64,
}

impl Storable for Bid {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Tracking update
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TrackingUpdate {
    pub load_id: String,
    pub timestamp: u64,
    pub latitude: f64,
    pub longitude: f64,
    pub status: String,
    pub message: String,
}

impl Storable for TrackingUpdate {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Config
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LogisticsConfig {
    pub admin: Principal,
    pub escrow_canister: Principal,
    pub kip_canister: Principal,
}

impl Default for LogisticsConfig {
    fn default() -> Self {
        Self {
            admin: Principal::anonymous(),
            escrow_canister: Principal::anonymous(),
            kip_canister: Principal::anonymous(),
        }
    }
}

impl Storable for LogisticsConfig {
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

    static LOADS: RefCell<StableBTreeMap<StorableString, Load, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(LOADS_MEM_ID))
        ));

    static BIDS: RefCell<StableBTreeMap<StorableString, Bid, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BIDS_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<LogisticsConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            LogisticsConfig::default()
        ).unwrap());

    static LOAD_COUNTER: RefCell<u64> = RefCell::new(0);
    static BID_COUNTER: RefCell<u64> = RefCell::new(0);
}

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin == caller)
        || ic_cdk::api::is_controller(&caller)
}

fn next_load_id() -> String {
    LOAD_COUNTER.with(|c| {
        let mut counter = c.borrow_mut();
        *counter += 1;
        format!("LOAD-{:06}", *counter)
    })
}

fn next_bid_id() -> String {
    BID_COUNTER.with(|c| {
        let mut counter = c.borrow_mut();
        *counter += 1;
        format!("BID-{:06}", *counter)
    })
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

// === Load Management ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PostLoadArgs {
    pub origin: String,
    pub destination: String,
    pub pickup_date: String,
    pub delivery_date: String,
    pub weight: String,
    pub load_type: LoadType,
    pub rate: u64,
    pub distance: String,
    pub description: String,
}

#[update]
fn post_load(args: PostLoadArgs) -> Result<Load, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot post loads".to_string());
    }
    
    if args.rate == 0 {
        return Err("Rate must be greater than 0".to_string());
    }
    
    let load_id = next_load_id();
    let now = ic_cdk::api::time();
    
    let load = Load {
        id: load_id.clone(),
        shipper: caller,
        origin: args.origin,
        destination: args.destination,
        pickup_date: args.pickup_date,
        delivery_date: args.delivery_date,
        weight: args.weight,
        load_type: args.load_type,
        rate: args.rate,
        distance: args.distance,
        description: args.description,
        status: LoadStatus::Posted,
        assigned_driver: None,
        escrow_id: None,
        created_at: now,
        updated_at: now,
    };
    
    LOADS.with(|l| {
        l.borrow_mut().insert(StorableString(load_id), load.clone());
    });
    
    Ok(load)
}

#[update]
fn place_bid(load_id: String, amount: u64, message: String, eta: String) -> Result<Bid, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot place bids".to_string());
    }
    
    // Verify load exists and is in bidding state
    let load = LOADS.with(|l| l.borrow().get(&StorableString(load_id.clone())));
    
    match load {
        Some(l) => {
            if l.status != LoadStatus::Posted && l.status != LoadStatus::Bidding {
                return Err("Load is not accepting bids".to_string());
            }
            
            if l.shipper == caller {
                return Err("Shipper cannot bid on own load".to_string());
            }
        }
        None => return Err("Load not found".to_string()),
    }
    
    let bid_id = next_bid_id();
    let now = ic_cdk::api::time();
    
    let bid = Bid {
        id: bid_id.clone(),
        load_id: load_id.clone(),
        driver: caller,
        amount,
        message,
        eta,
        status: "pending".to_string(),
        created_at: now,
    };
    
    BIDS.with(|b| {
        b.borrow_mut().insert(StorableString(bid_id), bid.clone());
    });
    
    // Update load status to Bidding
    LOADS.with(|l| {
        let mut loads = l.borrow_mut();
        if let Some(mut load) = loads.get(&StorableString(load_id.clone())) {
            load.status = LoadStatus::Bidding;
            load.updated_at = now;
            loads.insert(StorableString(load_id), load);
        }
    });
    
    Ok(bid)
}

#[update]
fn accept_bid(bid_id: String) -> Result<Load, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    // Get bid
    let bid = BIDS.with(|b| b.borrow().get(&StorableString(bid_id.clone())));
    
    match bid {
        Some(mut bid) => {
            // Get load
            let load = LOADS.with(|l| l.borrow().get(&StorableString(bid.load_id.clone())));
            
            match load {
                Some(mut load) => {
                    if load.shipper != caller && !is_admin(caller) {
                        return Err("Only shipper can accept bids".to_string());
                    }
                    
                    // Update bid status
                    bid.status = "accepted".to_string();
                    BIDS.with(|b| {
                        b.borrow_mut().insert(StorableString(bid_id), bid.clone());
                    });
                    
                    // Update load
                    load.status = LoadStatus::Assigned;
                    load.assigned_driver = Some(bid.driver);
                    load.rate = bid.amount;
                    load.updated_at = now;
                    
                    LOADS.with(|l| {
                        l.borrow_mut().insert(StorableString(load.id.clone()), load.clone());
                    });
                    
                    // Reject other bids for this load
                    BIDS.with(|b| {
                        let mut bids = b.borrow_mut();
                        let load_id = load.id.clone();
                        
                        // Collect keys to update
                        let keys_to_update: Vec<_> = bids
                            .iter()
                            .filter(|(_, b)| b.load_id == load_id && b.status == "pending")
                            .map(|(k, _)| k.clone())
                            .collect();
                        
                        for key in keys_to_update {
                            if let Some(mut other_bid) = bids.get(&key) {
                                other_bid.status = "rejected".to_string();
                                bids.insert(key, other_bid);
                            }
                        }
                    });
                    
                    Ok(load)
                }
                None => Err("Load not found".to_string()),
            }
        }
        None => Err("Bid not found".to_string()),
    }
}

#[update]
fn update_load_status(load_id: String, status: LoadStatus) -> Result<Load, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    LOADS.with(|l| {
        let mut loads = l.borrow_mut();
        let key = StorableString(load_id);
        
        match loads.get(&key) {
            Some(mut load) => {
                // Verify authorization
                let is_authorized = load.shipper == caller
                    || load.assigned_driver == Some(caller)
                    || is_admin(caller);
                
                if !is_authorized {
                    return Err("Not authorized to update load status".to_string());
                }
                
                load.status = status;
                load.updated_at = now;
                
                loads.insert(key, load.clone());
                Ok(load)
            }
            None => Err("Load not found".to_string()),
        }
    })
}

// === Query Methods ===

#[query]
fn get_load(load_id: String) -> Option<Load> {
    LOADS.with(|l| l.borrow().get(&StorableString(load_id)))
}

#[query]
fn get_available_loads() -> Vec<Load> {
    LOADS.with(|l| {
        l.borrow()
            .iter()
            .filter(|(_, load)| load.status == LoadStatus::Posted || load.status == LoadStatus::Bidding)
            .map(|(_, load)| load)
            .collect()
    })
}

#[query]
fn get_my_loads() -> Vec<Load> {
    let caller = ic_cdk::caller();
    
    LOADS.with(|l| {
        l.borrow()
            .iter()
            .filter(|(_, load)| load.shipper == caller || load.assigned_driver == Some(caller))
            .map(|(_, load)| load)
            .collect()
    })
}

#[query]
fn get_bids_for_load(load_id: String) -> Vec<Bid> {
    BIDS.with(|b| {
        b.borrow()
            .iter()
            .filter(|(_, bid)| bid.load_id == load_id)
            .map(|(_, bid)| bid)
            .collect()
    })
}

#[query]
fn get_my_bids() -> Vec<Bid> {
    let caller = ic_cdk::caller();
    
    BIDS.with(|b| {
        b.borrow()
            .iter()
            .filter(|(_, bid)| bid.driver == caller)
            .map(|(_, bid)| bid)
            .collect()
    })
}

#[query]
fn get_total_loads() -> u64 {
    LOADS.with(|l| l.borrow().len())
}

#[query]
fn get_config() -> LogisticsConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

#[update]
fn update_config(platform_fee_bps: Option<u16>, escrow_canister: Option<Principal>, kip_canister: Option<Principal>) -> Result<(), String> {
    let caller = ic_cdk::caller();
    if !is_admin(caller) {
        return Err("Only admin can update config".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        if let Some(escrow) = escrow_canister { config.escrow_canister = escrow; }
        if let Some(kip) = kip_canister { config.kip_canister = kip; }
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(())
}

// Generate Candid
ic_cdk::export_candid!();






