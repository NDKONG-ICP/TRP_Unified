//! Escrow Canister - NFT-based escrow for logistics payments
//! Handles QR code verification and automatic payment release

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const ESCROWS_MEM_ID: MemoryId = MemoryId::new(0);
const QR_CODES_MEM_ID: MemoryId = MemoryId::new(1);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(2);

// Escrow status
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    Created,
    Funded,
    PickupConfirmed,
    InTransit,
    DeliveryConfirmed,
    Released,
    Disputed,
    Refunded,
    Cancelled,
}

impl Default for EscrowStatus {
    fn default() -> Self {
        EscrowStatus::Created
    }
}

// Escrow record
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Escrow {
    pub id: String,
    pub load_id: String,
    pub nft_token_id: Option<u64>,
    pub shipper: Principal,
    pub driver: Principal,
    pub warehouse: Option<Principal>,
    pub amount: u64, // In e8s
    pub platform_fee: u64,
    pub status: EscrowStatus,
    pub pickup_qr: String,
    pub delivery_qr: String,
    pub pickup_confirmed_at: Option<u64>,
    pub delivery_confirmed_at: Option<u64>,
    pub created_at: u64,
    pub updated_at: u64,
    pub metadata: String, // JSON metadata
}

impl Storable for Escrow {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// QR Code verification record
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct QRVerification {
    pub qr_code: String,
    pub escrow_id: String,
    pub verification_type: String, // "pickup" or "delivery"
    pub verified_by: Option<Principal>,
    pub verified_at: Option<u64>,
    pub location: Option<String>,
}

impl Storable for QRVerification {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Escrow config
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EscrowConfig {
    pub admin: Principal,
    pub platform_fee_bps: u16, // 300 = 3%
    pub treasury_canister: Principal,
    pub nft_canister: Principal,
    pub auto_release_delay: u64, // Nanoseconds
}

impl Default for EscrowConfig {
    fn default() -> Self {
        Self {
            admin: Principal::anonymous(),
            platform_fee_bps: 300,
            treasury_canister: Principal::anonymous(),
            nft_canister: Principal::anonymous(),
            auto_release_delay: 24 * 60 * 60 * 1_000_000_000, // 24 hours
        }
    }
}

impl Storable for EscrowConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 300,
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

    static ESCROWS: RefCell<StableBTreeMap<StorableString, Escrow, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ESCROWS_MEM_ID))
        ));

    static QR_CODES: RefCell<StableBTreeMap<StorableString, QRVerification, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(QR_CODES_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<EscrowConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            EscrowConfig::default()
        ).unwrap());
}

// Admin principal
const ADMIN_PRINCIPAL: &str = "lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae";

fn is_admin(caller: Principal) -> bool {
    CONFIG.with(|c| c.borrow().get().admin == caller)
        || caller.to_text() == ADMIN_PRINCIPAL
}

fn generate_escrow_id(shipper: Principal, load_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(shipper.as_slice());
    hasher.update(load_id.as_bytes());
    hasher.update(ic_cdk::api::time().to_le_bytes());
    format!("ESC-{}", &hex::encode(hasher.finalize())[..12])
}

fn generate_qr_code(escrow_id: &str, qr_type: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(escrow_id.as_bytes());
    hasher.update(qr_type.as_bytes());
    hasher.update(ic_cdk::api::time().to_le_bytes());
    format!("QR-{}-{}", qr_type.to_uppercase(), &hex::encode(hasher.finalize())[..16])
}

// Initialization
#[init]
fn init() {
    let caller = ic_cdk::caller();
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin = if caller != Principal::anonymous() {
            caller
        } else {
            Principal::from_text(ADMIN_PRINCIPAL).unwrap()
        };
        c.borrow_mut().set(config).unwrap();
    });
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

// === Escrow Management ===

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct CreateEscrowArgs {
    pub load_id: String,
    pub driver: Principal,
    pub warehouse: Option<Principal>,
    pub amount: u64,
    pub metadata: String,
}

#[update]
fn create_escrow(args: CreateEscrowArgs) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create escrows".to_string());
    }
    
    if args.amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    let config = CONFIG.with(|c| c.borrow().get().clone());
    let platform_fee = (args.amount * config.platform_fee_bps as u64) / 10000;
    
    let escrow_id = generate_escrow_id(caller, &args.load_id);
    let pickup_qr = generate_qr_code(&escrow_id, "pickup");
    let delivery_qr = generate_qr_code(&escrow_id, "delivery");
    let now = ic_cdk::api::time();
    
    let escrow = Escrow {
        id: escrow_id.clone(),
        load_id: args.load_id,
        nft_token_id: None,
        shipper: caller,
        driver: args.driver,
        warehouse: args.warehouse,
        amount: args.amount,
        platform_fee,
        status: EscrowStatus::Created,
        pickup_qr: pickup_qr.clone(),
        delivery_qr: delivery_qr.clone(),
        pickup_confirmed_at: None,
        delivery_confirmed_at: None,
        created_at: now,
        updated_at: now,
        metadata: args.metadata,
    };
    
    // Store escrow
    ESCROWS.with(|e| {
        e.borrow_mut().insert(StorableString(escrow_id.clone()), escrow.clone());
    });
    
    // Store QR codes
    QR_CODES.with(|q| {
        let mut qr_codes = q.borrow_mut();
        
        qr_codes.insert(
            StorableString(pickup_qr.clone()),
            QRVerification {
                qr_code: pickup_qr,
                escrow_id: escrow_id.clone(),
                verification_type: "pickup".to_string(),
                verified_by: None,
                verified_at: None,
                location: None,
            },
        );
        
        qr_codes.insert(
            StorableString(delivery_qr.clone()),
            QRVerification {
                qr_code: delivery_qr,
                escrow_id: escrow_id.clone(),
                verification_type: "delivery".to_string(),
                verified_by: None,
                verified_at: None,
                location: None,
            },
        );
    });
    
    Ok(escrow)
}

#[update]
fn fund_escrow(escrow_id: String) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    
    ESCROWS.with(|e| {
        let mut escrows = e.borrow_mut();
        let key = StorableString(escrow_id.clone());
        
        match escrows.get(&key) {
            Some(mut escrow) => {
                if escrow.shipper != caller && !is_admin(caller) {
                    return Err("Only shipper can fund escrow".to_string());
                }
                
                if escrow.status != EscrowStatus::Created {
                    return Err("Escrow already funded or in invalid state".to_string());
                }
                
                escrow.status = EscrowStatus::Funded;
                escrow.updated_at = ic_cdk::api::time();
                
                // In production, this would verify actual ICP transfer
                // and potentially mint an NFT for the shipment
                
                escrows.insert(key, escrow.clone());
                Ok(escrow)
            }
            None => Err("Escrow not found".to_string()),
        }
    })
}

#[update]
fn verify_qr(qr_code: String, location: Option<String>) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    // Get QR verification record
    let qr_verification = QR_CODES.with(|q| {
        q.borrow().get(&StorableString(qr_code.clone()))
    });
    
    match qr_verification {
        Some(mut qr) => {
            if qr.verified_at.is_some() {
                return Err("QR code already verified".to_string());
            }
            
            // Update QR verification
            qr.verified_by = Some(caller);
            qr.verified_at = Some(now);
            qr.location = location;
            
            QR_CODES.with(|q| {
                q.borrow_mut().insert(StorableString(qr_code), qr.clone());
            });
            
            // Update escrow status
            ESCROWS.with(|e| {
                let mut escrows = e.borrow_mut();
                let key = StorableString(qr.escrow_id.clone());
                
                match escrows.get(&key) {
                    Some(mut escrow) => {
                        if qr.verification_type == "pickup" {
                            // Verify driver is scanning pickup
                            if escrow.driver != caller && !is_admin(caller) {
                                return Err("Only driver can confirm pickup".to_string());
                            }
                            
                            escrow.status = EscrowStatus::PickupConfirmed;
                            escrow.pickup_confirmed_at = Some(now);
                        } else if qr.verification_type == "delivery" {
                            // Verify warehouse/shipper is scanning delivery
                            let is_authorized = escrow.warehouse.map(|w| w == caller).unwrap_or(false)
                                || escrow.shipper == caller
                                || is_admin(caller);
                            
                            if !is_authorized {
                                return Err("Not authorized to confirm delivery".to_string());
                            }
                            
                            escrow.status = EscrowStatus::DeliveryConfirmed;
                            escrow.delivery_confirmed_at = Some(now);
                        }
                        
                        escrow.updated_at = now;
                        escrows.insert(key, escrow.clone());
                        Ok(escrow)
                    }
                    None => Err("Escrow not found".to_string()),
                }
            })
        }
        None => Err("Invalid QR code".to_string()),
    }
}

#[update]
fn release_payment(escrow_id: String) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    ESCROWS.with(|e| {
        let mut escrows = e.borrow_mut();
        let key = StorableString(escrow_id.clone());
        
        match escrows.get(&key) {
            Some(mut escrow) => {
                // Only shipper or admin can release
                if escrow.shipper != caller && !is_admin(caller) {
                    return Err("Not authorized to release payment".to_string());
                }
                
                // Must be in delivery confirmed state
                if escrow.status != EscrowStatus::DeliveryConfirmed {
                    return Err("Delivery not confirmed yet".to_string());
                }
                
                escrow.status = EscrowStatus::Released;
                escrow.updated_at = now;
                
                // In production, this would:
                // 1. Transfer payment to driver
                // 2. Transfer platform fee to treasury
                // 3. Update NFT metadata
                
                escrows.insert(key, escrow.clone());
                Ok(escrow)
            }
            None => Err("Escrow not found".to_string()),
        }
    })
}

#[update]
fn dispute_escrow(escrow_id: String, reason: String) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    let now = ic_cdk::api::time();
    
    ESCROWS.with(|e| {
        let mut escrows = e.borrow_mut();
        let key = StorableString(escrow_id.clone());
        
        match escrows.get(&key) {
            Some(mut escrow) => {
                // Only shipper or driver can dispute
                if escrow.shipper != caller && escrow.driver != caller {
                    return Err("Not authorized to dispute".to_string());
                }
                
                // Can't dispute if already released or refunded
                if escrow.status == EscrowStatus::Released || escrow.status == EscrowStatus::Refunded {
                    return Err("Cannot dispute completed escrow".to_string());
                }
                
                escrow.status = EscrowStatus::Disputed;
                escrow.updated_at = now;
                
                escrows.insert(key, escrow.clone());
                Ok(escrow)
            }
            None => Err("Escrow not found".to_string()),
        }
    })
}

// === Query Methods ===

#[query]
fn get_escrow(escrow_id: String) -> Option<Escrow> {
    ESCROWS.with(|e| e.borrow().get(&StorableString(escrow_id)))
}

#[query]
fn get_my_escrows() -> Vec<Escrow> {
    let caller = ic_cdk::caller();
    
    ESCROWS.with(|e| {
        e.borrow()
            .iter()
            .filter(|(_, escrow)| escrow.shipper == caller || escrow.driver == caller)
            .map(|(_, escrow)| escrow)
            .collect()
    })
}

#[query]
fn get_escrows_by_status(status: EscrowStatus) -> Vec<Escrow> {
    ESCROWS.with(|e| {
        e.borrow()
            .iter()
            .filter(|(_, escrow)| escrow.status == status)
            .map(|(_, escrow)| escrow)
            .collect()
    })
}

#[query]
fn verify_qr_code(qr_code: String) -> Option<QRVerification> {
    QR_CODES.with(|q| q.borrow().get(&StorableString(qr_code)))
}

#[query]
fn get_config() -> EscrowConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

// === Admin Functions ===

#[update]
fn resolve_dispute(escrow_id: String, refund: bool) -> Result<Escrow, String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can resolve disputes".to_string());
    }
    
    let now = ic_cdk::api::time();
    
    ESCROWS.with(|e| {
        let mut escrows = e.borrow_mut();
        let key = StorableString(escrow_id.clone());
        
        match escrows.get(&key) {
            Some(mut escrow) => {
                if escrow.status != EscrowStatus::Disputed {
                    return Err("Escrow not in disputed state".to_string());
                }
                
                escrow.status = if refund {
                    EscrowStatus::Refunded
                } else {
                    EscrowStatus::Released
                };
                escrow.updated_at = now;
                
                escrows.insert(key, escrow.clone());
                Ok(escrow)
            }
            None => Err("Escrow not found".to_string()),
        }
    })
}

#[update]
fn update_config(
    platform_fee_bps: u16,
    treasury_canister: Principal,
    nft_canister: Principal,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    
    if !is_admin(caller) {
        return Err("Only admin can update config".to_string());
    }
    
    if platform_fee_bps > 1000 {
        return Err("Platform fee cannot exceed 10%".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.platform_fee_bps = platform_fee_bps;
        config.treasury_canister = treasury_canister;
        config.nft_canister = nft_canister;
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// Generate Candid
ic_cdk::export_candid!();






