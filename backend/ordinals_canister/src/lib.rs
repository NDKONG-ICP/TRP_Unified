//! Bitcoin Ordinals Canister
//! Handles Bitcoin Ordinals inscription creation and management

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use sha2::{Digest, Sha256};

type Memory = VirtualMemory<DefaultMemoryImpl>;

const INSCRIPTIONS_MEM_ID: MemoryId = MemoryId::new(0);
const USER_INSCRIPTIONS_MEM_ID: MemoryId = MemoryId::new(1);

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Inscription {
    pub id: String,
    pub content: Vec<u8>,
    pub content_type: String,
    pub owner: String,
    pub sat: u64,
    pub timestamp: u64,
}

impl Storable for Inscription {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Deserialize, Serialize)]
pub struct CreateRequest {
    pub content: Vec<u8>,
    pub content_type: String,
    pub fee_rate: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize)]
pub enum CreateResult {
    Ok { inscription_id: String, tx_id: String },
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

// Wrapper for Vec<String> to make it Storable
#[derive(Clone, Debug)]
struct StorableStringVec(Vec<String>);

impl Storable for StorableStringVec {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(&self.0).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorableStringVec(Decode!(bytes.as_ref(), Vec<String>).unwrap())
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static INSCRIPTIONS: RefCell<StableBTreeMap<StorableString, Inscription, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(INSCRIPTIONS_MEM_ID))
        )
    );

    static USER_INSCRIPTIONS: RefCell<StableBTreeMap<StorableString, StorableStringVec, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(USER_INSCRIPTIONS_MEM_ID))
        )
    );
}

#[init]
fn init() {}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {}

fn generate_inscription_id(content: &[u8], owner: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    hasher.update(owner.as_bytes());
    hasher.update(&ic_cdk::api::time().to_be_bytes());
    let hash = hasher.finalize();
    format!("inscription-{}", hex::encode(&hash[..16]))
}

#[update]
fn create_inscription(request: CreateRequest) -> CreateResult {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return CreateResult::Err("Authentication required".to_string());
    }
    
    let owner = caller.to_text();
    let inscription_id = generate_inscription_id(&request.content, &owner);
    let now = ic_cdk::api::time();
    
    // Generate a mock transaction ID (in production, this would be a real Bitcoin transaction)
    let mut tx_hasher = Sha256::new();
    tx_hasher.update(&inscription_id.as_bytes());
    tx_hasher.update(&now.to_be_bytes());
    let tx_hash = tx_hasher.finalize();
    let tx_id = hex::encode(&tx_hash[..16]);
    
    let inscription = Inscription {
        id: inscription_id.clone(),
        content: request.content,
        content_type: request.content_type,
        owner: owner.clone(),
        sat: 0, // Would be assigned from Bitcoin network
        timestamp: now,
    };
    
    // Store inscription
    INSCRIPTIONS.with(|i| {
        i.borrow_mut().insert(StorableString(inscription_id.clone()), inscription.clone());
    });
    
    // Add to user's inscriptions
    let owner_key = StorableString(owner.clone());
    USER_INSCRIPTIONS.with(|u| {
        let mut user_inscriptions = u.borrow_mut();
        let mut user_list = user_inscriptions.get(&owner_key)
            .map(|v| v.0.clone())
            .unwrap_or_default();
        user_list.push(inscription_id.clone());
        user_inscriptions.insert(owner_key, StorableStringVec(user_list));
    });
    
    CreateResult::Ok {
        inscription_id,
        tx_id,
    }
}

#[query]
fn get_inscription(inscription_id: String) -> Option<Inscription> {
    INSCRIPTIONS.with(|i| {
        i.borrow().get(&StorableString(inscription_id))
    })
}

#[query]
fn get_user_inscriptions(owner: String) -> Vec<Inscription> {
    USER_INSCRIPTIONS.with(|u| {
        let user_ids = u.borrow().get(&StorableString(owner))
            .map(|v| v.0.clone())
            .unwrap_or_default();
        INSCRIPTIONS.with(|i| {
            let inscriptions = i.borrow();
            user_ids.iter()
                .filter_map(|id| inscriptions.get(&StorableString(id.clone())))
                .collect()
        })
    })
}

#[update]
fn transfer_inscription(inscription_id: String, to_address: String) -> Result<String, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }
    
    INSCRIPTIONS.with(|i| {
        let mut inscriptions = i.borrow_mut();
        if let Some(mut inscription) = inscriptions.get(&StorableString(inscription_id.clone())) {
            if inscription.owner != caller.to_text() {
                return Err("Not the owner of this inscription".to_string());
            }
            
            let old_owner = inscription.owner.clone();
            inscription.owner = to_address.clone();
            inscriptions.insert(StorableString(inscription_id.clone()), inscription);
            
            // Update user inscriptions
            let old_owner_key = StorableString(old_owner.clone());
            let new_owner_key = StorableString(to_address.clone());
            USER_INSCRIPTIONS.with(|u| {
                let mut user_inscriptions = u.borrow_mut();
                
                // Remove from old owner
                if let Some(old_vec) = user_inscriptions.get(&old_owner_key) {
                    let mut old_list = old_vec.0.clone();
                    old_list.retain(|id| id != &inscription_id);
                    user_inscriptions.insert(old_owner_key, StorableStringVec(old_list));
                }
                
                // Add to new owner
                let mut new_list = user_inscriptions.get(&new_owner_key)
                    .map(|v| v.0.clone())
                    .unwrap_or_default();
                new_list.push(inscription_id.clone());
                user_inscriptions.insert(new_owner_key, StorableStringVec(new_list));
            });
            
            Ok(format!("Transferred inscription {} to {}", inscription_id, to_address))
        } else {
            Err("Inscription not found".to_string())
        }
    })
}

