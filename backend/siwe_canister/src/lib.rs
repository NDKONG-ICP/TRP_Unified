//! Sign-In with Ethereum (SIWE) Canister
//! Verifies Ethereum signatures and maps ETH addresses to ICP principals

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use sha3::{Digest, Keccak256};
use hex;
use sha2::Sha256;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const SESSIONS_MEM_ID: MemoryId = MemoryId::new(0);
const ADDRESS_TO_PRINCIPAL_MEM_ID: MemoryId = MemoryId::new(1);
const PRINCIPAL_TO_ADDRESS_MEM_ID: MemoryId = MemoryId::new(2);

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SIWEMessage {
    pub domain: String,
    pub address: String,
    pub statement: Option<String>,
    pub uri: String,
    pub version: String,
    pub chain_id: u64,
    pub nonce: String,
    pub issued_at: String,
    pub expiration_time: Option<String>,
    pub not_before: Option<String>,
    pub request_id: Option<String>,
    pub resources: Option<Vec<String>>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SIWESession {
    pub session_id: String,
    pub eth_address: String,
    pub principal: Principal,
    pub created_at: u64,
    pub expires_at: u64,
}

impl Storable for SIWESession {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Serialize)]
pub enum VerifyResult {
    Ok(SIWESession),
    Err(String),
}

// Wrapper for String to make it Storable
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableString(String);

impl Storable for StorableString {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableString(String::from_utf8(bytes.into_owned()).unwrap_or_default())
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Wrapper for Principal to make it Storable
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

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static SESSIONS: RefCell<StableBTreeMap<StorableString, SIWESession, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(SESSIONS_MEM_ID))
        )
    );

    static ADDRESS_TO_PRINCIPAL: RefCell<StableBTreeMap<StorableString, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(ADDRESS_TO_PRINCIPAL_MEM_ID))
        )
    );

    static PRINCIPAL_TO_ADDRESS: RefCell<StableBTreeMap<StorablePrincipal, StorableString, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PRINCIPAL_TO_ADDRESS_MEM_ID))
        )
    );
}

#[init]
fn init() {
    // Initialize canister
}

#[pre_upgrade]
fn pre_upgrade() {
    // Persist state before upgrade
}

#[post_upgrade]
fn post_upgrade() {
    // Restore state after upgrade
}

/// Format SIWE message according to EIP-4361
fn format_siwe_message(msg: &SIWEMessage) -> String {
    let mut message = format!("{} wants you to sign in with your Ethereum account:\n", msg.domain);
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

/// Verify Ethereum signature
/// NOTE: This is a placeholder implementation for deployment
/// In production, proper ECDSA signature verification should be implemented
fn verify_ethereum_signature(message: &str, signature: &str, address: &str) -> bool {
    // Basic format validation
    let sig_bytes = match hex::decode(signature.strip_prefix("0x").unwrap_or(signature)) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };
    
    if sig_bytes.len() != 65 {
        return false;
    }
    
    // Ethereum message prefix
    let prefix = format!("\x19Ethereum Signed Message:\n{}", message.len());
    let prefixed_message = format!("{}{}", prefix, message);
    
    // Hash the prefixed message
    let mut hasher = Keccak256::new();
    hasher.update(prefixed_message.as_bytes());
    let _message_hash = hasher.finalize();
    
    // TODO: Implement proper ECDSA signature recovery and verification
    // For now, accept valid format signatures
    // In production, this must verify the signature cryptographically
    !address.is_empty() && !signature.is_empty()
}

/// Derive ICP principal from Ethereum address
fn derive_principal_from_address(address: &str) -> Principal {
    // Use address hash to derive a deterministic principal
    let mut hasher = Sha256::new();
    hasher.update(address.as_bytes());
    let hash = hasher.finalize();
    
    // Use first 29 bytes for principal (ICP principals are 29 bytes)
    let principal_bytes = &hash[..29];
    Principal::from_slice(principal_bytes)
}

#[update]
fn verify_siwe(message: SIWEMessage, signature: String) -> VerifyResult {
    // Validate message
    if message.address.is_empty() || message.domain.is_empty() {
        return VerifyResult::Err("Invalid message: missing required fields".to_string());
    }
    
    // Check expiration
    if let Some(ref expiration) = message.expiration_time {
        // Parse and check expiration time
        // For now, we'll skip detailed time parsing
    }
    
    // Format SIWE message
    let formatted_message = format_siwe_message(&message);
    
    // Verify signature
    if !verify_ethereum_signature(&formatted_message, &signature, &message.address) {
        return VerifyResult::Err("Invalid signature".to_string());
    }
    
    // Derive principal from address
    let principal = derive_principal_from_address(&message.address);
    
    // Create session
    let session_id = format!("siwe-{}-{}", message.address, ic_cdk::api::time());
    let now = ic_cdk::api::time();
    let expires_at = now + (7 * 24 * 60 * 60 * 1_000_000_000); // 7 days
    
    let session = SIWESession {
        session_id: session_id.clone(),
        eth_address: message.address.clone(),
        principal,
        created_at: now,
        expires_at,
    };
    
    // Store session
    SESSIONS.with(|s| {
        s.borrow_mut().insert(StorableString(session_id.clone()), session.clone());
    });
    
    // Store address to principal mapping
    ADDRESS_TO_PRINCIPAL.with(|m| {
        m.borrow_mut().insert(StorableString(message.address.clone()), StorablePrincipal(principal));
    });
    
    // Store principal to address mapping
    PRINCIPAL_TO_ADDRESS.with(|m| {
        m.borrow_mut().insert(StorablePrincipal(principal), StorableString(message.address.clone()));
    });
    
    VerifyResult::Ok(session)
}

#[query]
fn get_session(session_id: String) -> Option<SIWESession> {
    SESSIONS.with(|s| {
        s.borrow().get(&StorableString(session_id))
    })
}

#[query]
fn get_principal_by_address(address: String) -> Option<Principal> {
    ADDRESS_TO_PRINCIPAL.with(|m| {
        m.borrow().get(&StorableString(address)).map(|p| p.0)
    })
}

#[query]
fn get_address_by_principal(principal: Principal) -> Option<String> {
    PRINCIPAL_TO_ADDRESS.with(|m| {
        m.borrow().get(&StorablePrincipal(principal)).map(|s| s.0)
    })
}

#[update]
fn revoke_session(session_id: String) -> bool {
    SESSIONS.with(|s| {
        s.borrow_mut().remove(&StorableString(session_id)).is_some()
    })
}

#[update]
fn cleanup_sessions() -> u64 {
    let now = ic_cdk::api::time();
    let mut count = 0u64;
    
    SESSIONS.with(|s| {
        let mut sessions = s.borrow_mut();
        let expired: Vec<StorableString> = sessions.iter()
            .filter(|(_, session)| session.expires_at < now)
            .map(|(id, _)| id.clone())
            .collect();
        
        for id in expired {
            sessions.remove(&id);
            count += 1;
        }
    });
    
    count
}

