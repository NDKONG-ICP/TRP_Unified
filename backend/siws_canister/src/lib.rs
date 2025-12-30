//! Sign-In with Solana (SIWS) Canister
//! Verifies Solana signatures and maps Solana addresses to ICP principals

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use sha2::{Digest, Sha256};
use hex;

type Memory = VirtualMemory<DefaultMemoryImpl>;

const SESSIONS_MEM_ID: MemoryId = MemoryId::new(0);
const ADDRESS_TO_PRINCIPAL_MEM_ID: MemoryId = MemoryId::new(1);
const PRINCIPAL_TO_ADDRESS_MEM_ID: MemoryId = MemoryId::new(2);

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
pub struct SIWSSession {
    pub session_id: String,
    pub solana_address: String,
    pub principal: Principal,
    pub created_at: u64,
    pub expires_at: u64,
}

impl Storable for SIWSSession {
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
    Ok(SIWSSession),
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

    static SESSIONS: RefCell<StableBTreeMap<StorableString, SIWSSession, Memory>> = RefCell::new(
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
fn init() {}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

fn format_siws_message(msg: &SIWSMessage) -> String {
    let mut message = format!("{} wants you to sign in with your Solana account:\n", msg.domain);
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
use std::convert::TryInto;

fn verify_solana_signature(message: &str, signature: &str, address: &str) -> bool {
    let sig_bytes = if signature.starts_with("0x") {
        match hex::decode(&signature[2..]) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        }
    } else {
        // Solana standard is base58
        match bs58::decode(signature).into_vec() {
            Ok(bytes) => bytes,
            Err(_) => return false,
        }
    };
    
    let addr_bytes = match bs58::decode(address).into_vec() {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    if sig_bytes.len() != 64 || addr_bytes.len() != 32 {
        return false;
    }

    let public_key = match VerifyingKey::from_bytes(&addr_bytes.try_into().unwrap()) {
        Ok(pk) => pk,
        Err(_) => return false,
    };

    let signature_obj = match Signature::from_bytes(&sig_bytes.try_into().unwrap()) {
        Ok(sig) => sig,
        Err(_) => {
            // Some wallets might provide a different signature format
            return false;
        }
    };

    public_key.verify(message.as_bytes(), &signature_obj).is_ok()
}

fn derive_principal_from_address(address: &str) -> Principal {
    let mut hasher = Sha256::new();
    hasher.update(address.as_bytes());
    let hash = hasher.finalize();
    let principal_bytes = &hash[..29];
    Principal::from_slice(principal_bytes)
}

#[update]
fn verify_siws(message: SIWSMessage, signature: String) -> VerifyResult {
    if message.address.is_empty() || message.domain.is_empty() {
        return VerifyResult::Err("Invalid message: missing required fields".to_string());
    }
    
    let formatted_message = format_siws_message(&message);
    
    if !verify_solana_signature(&formatted_message, &signature, &message.address) {
        return VerifyResult::Err("Invalid signature".to_string());
    }
    
    let principal = derive_principal_from_address(&message.address);
    let session_id = format!("siws-{}-{}", message.address, ic_cdk::api::time());
    let now = ic_cdk::api::time();
    let expires_at = now + (7 * 24 * 60 * 60 * 1_000_000_000);
    
    let session = SIWSSession {
        session_id: session_id.clone(),
        solana_address: message.address.clone(),
        principal,
        created_at: now,
        expires_at,
    };
    
    SESSIONS.with(|s| {
        s.borrow_mut().insert(StorableString(session_id.clone()), session.clone());
    });
    
    ADDRESS_TO_PRINCIPAL.with(|m| {
        m.borrow_mut().insert(StorableString(message.address.clone()), StorablePrincipal(principal));
    });
    
    PRINCIPAL_TO_ADDRESS.with(|m| {
        m.borrow_mut().insert(StorablePrincipal(principal), StorableString(message.address.clone()));
    });
    
    VerifyResult::Ok(session)
}

#[query]
fn get_session(session_id: String) -> Option<SIWSSession> {
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

