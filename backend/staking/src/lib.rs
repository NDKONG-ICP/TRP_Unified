//! Staking Canister - Raven Sk8 Punks NFT Staking with $HARLEE Rewards
//! Rate: 100 $HARLEE per week per staked NFT
//! Rarity multipliers: common=1x, rare=1.5x, epic=2x, legendary=3x

use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs
const STAKED_NFTS_MEM_ID: MemoryId = MemoryId::new(0);
const LEADERBOARD_MEM_ID: MemoryId = MemoryId::new(1);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(2);

// Constants
const WEEKLY_HARLEE_REWARD: u64 = 10_000_000_000; // 100 $HARLEE in e8s (100 * 10^8)
const SECONDS_PER_WEEK: u64 = 604800;
const SK8_PUNKS_COLLECTION: &str = "b4mk6-5qaaa-aaaah-arerq-cai";
const HARLEE_LEDGER_STR: &str = "tlm4l-kaaaa-aaaah-qqeha-cai";

// ============ TYPES ============

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct StakedNFT {
    pub token_id: u64,
    pub collection: String,
    pub owner: Principal,
    pub staked_at: u64,
    pub last_claim_at: u64,
    pub pending_rewards: u64, // in e8s
    pub rarity: String, // "common", "rare", "epic", "legendary"
    pub multiplier: f32, // 1.0, 1.5, 2.0, 3.0
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct LeaderboardEntry {
    pub user: Principal,
    pub total_staked: u32,
    pub total_rewards_earned: u64,
    pub rank: u32,
}

impl Storable for LeaderboardEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Config {
    pub harlee_ledger: Option<Principal>,
    pub reward_rate_per_week: u64,
}

impl Storable for Config {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for StakedNFT {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// Wrapper for Principal as key
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_slice().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(&bytes))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };
}

// Wrapper for u64 as key
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableU64(u64);

impl Storable for StorableU64 {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes[..8]);
        StorableU64(u64::from_le_bytes(arr))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static STAKED_NFTS: RefCell<StableBTreeMap<StorableU64, StakedNFT, Memory>> = 
        MEMORY_MANAGER.with(|m| RefCell::new(
            StableBTreeMap::init(m.borrow().get(STAKED_NFTS_MEM_ID))
        ));

    static LEADERBOARD: RefCell<StableBTreeMap<StorablePrincipal, LeaderboardEntry, Memory>> = 
        MEMORY_MANAGER.with(|m| RefCell::new(
            StableBTreeMap::init(m.borrow().get(LEADERBOARD_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<Config, Memory>> = 
        MEMORY_MANAGER.with(|m| RefCell::new(
            StableCell::init(m.borrow().get(CONFIG_MEM_ID), Config {
                harlee_ledger: None,
                reward_rate_per_week: WEEKLY_HARLEE_REWARD,
            }).unwrap()
        ));
}

// ============ INIT ============

#[init]
fn init() {
    CONFIG.with(|c| {
        c.borrow_mut().set(Config {
            harlee_ledger: Some(Principal::from_text(HARLEE_LEDGER_STR).unwrap()),
            reward_rate_per_week: WEEKLY_HARLEE_REWARD,
        }).unwrap();
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    // Stable structures handle serialization automatically
}

#[post_upgrade]
fn post_upgrade() {
    // Stable structures handle deserialization automatically
}

// ============ HELPER FUNCTIONS ============

fn get_rarity_multiplier(rarity: &str) -> f32 {
    match rarity {
        "legendary" => 3.0,
        "epic" => 2.0,
        "rare" => 1.5,
        _ => 1.0,
    }
}

fn calculate_rewards(staked_at: u64, last_claim_at: u64, multiplier: f32) -> u64 {
    let now = ic_cdk::api::time() / 1_000_000_000; // Convert to seconds
    let elapsed = now.saturating_sub(last_claim_at.max(staked_at));
    
    // Reward per second per NFT = (100 $HARLEE / week) / seconds_per_week
    let reward_per_second = WEEKLY_HARLEE_REWARD / SECONDS_PER_WEEK;
    let base_rewards = (reward_per_second as u128) * (elapsed as u128);
    let multiplied = (base_rewards as f64 * multiplier as f64) as u128;
    
    multiplied.min(u64::MAX as u128) as u64
}

// ============ UPDATE FUNCTIONS ============

#[update]
async fn stake_nft(token_id: u64, collection: String) -> Result<StakedNFT, String> {
    let caller = ic_cdk::caller();
    
    if caller == Principal::anonymous() {
        return Err("Anonymous caller not allowed".to_string());
    }

    // Verify NFT ownership (in production, call NFT canister)
    // For now, we'll allow staking and verify later
    
    let now = ic_cdk::api::time() / 1_000_000_000;
    
    // Determine rarity (in production, fetch from NFT metadata)
    let rarity = if token_id % 100 == 0 {
        "legendary"
    } else if token_id % 20 == 0 {
        "epic"
    } else if token_id % 5 == 0 {
        "rare"
    } else {
        "common"
    }.to_string();
    
    let multiplier = get_rarity_multiplier(&rarity);
    
    let staked_nft = StakedNFT {
        token_id,
        collection: collection.clone(),
        owner: caller,
        staked_at: now,
        last_claim_at: now,
        pending_rewards: 0,
        rarity,
        multiplier,
    };
    
    // Check if already staked
    if STAKED_NFTS.with(|s| s.borrow().contains_key(&StorableU64(token_id))) {
        return Err("NFT already staked".to_string());
    }
    
    STAKED_NFTS.with(|s| {
        s.borrow_mut().insert(StorableU64(token_id), staked_nft.clone());
    });
    
    // Update leaderboard
    update_leaderboard(caller, 1, 0);
    
    Ok(staked_nft)
}

#[update]
async fn unstake_nft(token_id: u64, collection: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    let staked_nft = STAKED_NFTS.with(|s| {
        s.borrow().get(&StorableU64(token_id))
    });
    
    let staked_nft = match staked_nft {
        Some(nft) => nft,
        None => return Err("NFT not staked".to_string()),
    };
    
    if staked_nft.owner != caller {
        return Err("Not the owner of this staked NFT".to_string());
    }
    
    // Calculate final rewards
    let rewards = calculate_rewards(
        staked_nft.staked_at,
        staked_nft.last_claim_at,
        staked_nft.multiplier,
    ) + staked_nft.pending_rewards;
    
    // Remove from staked NFTs
    STAKED_NFTS.with(|s| {
        s.borrow_mut().remove(&StorableU64(token_id));
    });
    
    // Update leaderboard
    update_leaderboard(caller, -1, rewards);
    
    // In production, transfer $HARLEE tokens here
    let ledger = CONFIG.with(|c| c.borrow().get().harlee_ledger).ok_or("Ledger not configured")?;
    let _ = transfer_tokens(ledger, caller, rewards).await?;
    
    Ok(rewards)
}

async fn transfer_tokens(ledger: Principal, to: Principal, amount: u64) -> Result<u64, String> {
    #[derive(CandidType, serde::Deserialize)]
    struct Account { owner: Principal, subaccount: Option<Vec<u8>> }
    #[derive(CandidType)]
    struct TransferArg { to: Account, fee: Option<candid::Nat>, memo: Option<Vec<u8>>, from_subaccount: Option<Vec<u8>>, created_at_time: Option<u64>, amount: candid::Nat }
    #[derive(CandidType, serde::Deserialize)]
    enum TransferResult { Ok(candid::Nat), Err(TransferError) }
    #[derive(CandidType, serde::Deserialize, Debug)]
    enum TransferError { BadFee { expected_fee: candid::Nat }, InsufficientFunds { balance: candid::Nat }, TooOld, CreatedInFuture { ledger_time: u64 }, Duplicate { duplicate_of: candid::Nat }, TemporarilyUnavailable, GenericError { error_code: candid::Nat, message: String } }

    let args = TransferArg { to: Account { owner: to, subaccount: None }, fee: None, memo: None, from_subaccount: None, created_at_time: None, amount: candid::Nat::from(amount) };
    let res: Result<(TransferResult,), _> = ic_cdk::call(ledger, "icrc1_transfer", (args,)).await;
    match res {
        Ok((TransferResult::Ok(block),)) => Ok(block.0.try_into().unwrap_or(0)),
        Ok((TransferResult::Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}

#[update]
async fn claim_rewards(token_id: u64, collection: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    
    let mut staked_nft = STAKED_NFTS.with(|s| {
        s.borrow().get(&StorableU64(token_id))
    });
    
    let staked_nft = match staked_nft.take() {
        Some(nft) => nft,
        None => return Err("NFT not staked".to_string()),
    };
    
    if staked_nft.owner != caller {
        return Err("Not the owner of this staked NFT".to_string());
    }
    
    // Calculate rewards
    let rewards = calculate_rewards(
        staked_nft.staked_at,
        staked_nft.last_claim_at,
        staked_nft.multiplier,
    ) + staked_nft.pending_rewards;
    
    // Update last claim time
    let now = ic_cdk::api::time() / 1_000_000_000;
    let updated_nft = StakedNFT {
        last_claim_at: now,
        pending_rewards: 0,
        ..staked_nft.clone()
    };
    
    STAKED_NFTS.with(|s| {
        s.borrow_mut().insert(StorableU64(token_id), updated_nft);
    });
    
    // Update leaderboard
    update_leaderboard(caller, 0, rewards);
    
    // In production, transfer $HARLEE tokens here
    let ledger = CONFIG.with(|c| c.borrow().get().harlee_ledger).ok_or("Ledger not configured")?;
    let _ = transfer_tokens(ledger, caller, rewards).await?;
    
    Ok(rewards)
}

async fn transfer_tokens(ledger: Principal, to: Principal, amount: u64) -> Result<u64, String> {
    #[derive(CandidType, serde::Deserialize)]
    struct Account { owner: Principal, subaccount: Option<Vec<u8>> }
    #[derive(CandidType)]
    struct TransferArg { to: Account, fee: Option<candid::Nat>, memo: Option<Vec<u8>>, from_subaccount: Option<Vec<u8>>, created_at_time: Option<u64>, amount: candid::Nat }
    #[derive(CandidType, serde::Deserialize)]
    enum TransferResult { Ok(candid::Nat), Err(TransferError) }
    #[derive(CandidType, serde::Deserialize, Debug)]
    enum TransferError { BadFee { expected_fee: candid::Nat }, InsufficientFunds { balance: candid::Nat }, TooOld, CreatedInFuture { ledger_time: u64 }, Duplicate { duplicate_of: candid::Nat }, TemporarilyUnavailable, GenericError { error_code: candid::Nat, message: String } }

    let args = TransferArg { to: Account { owner: to, subaccount: None }, fee: None, memo: None, from_subaccount: None, created_at_time: None, amount: candid::Nat::from(amount) };
    let res: Result<(TransferResult,), _> = ic_cdk::call(ledger, "icrc1_transfer", (args,)).await;
    match res {
        Ok((TransferResult::Ok(block),)) => Ok(block.0.try_into().unwrap_or(0)),
        Ok((TransferResult::Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg))
    }
}

fn update_leaderboard(principal: Principal, stake_delta: i32, rewards_earned: u64) {
    LEADERBOARD.with(|l| {
        let mut leaderboard = l.borrow_mut();
        let entry = leaderboard.get(&StorablePrincipal(principal));
        
        let mut new_entry = match entry {
            Some(e) => e.clone(),
            None => LeaderboardEntry {
                user: principal,
                total_staked: 0,
                total_rewards_earned: 0,
                rank: 0,
            },
        };
        
        if stake_delta > 0 {
            new_entry.total_staked += stake_delta as u32;
        } else if stake_delta < 0 {
            new_entry.total_staked = new_entry.total_staked.saturating_sub((-stake_delta) as u32);
        }
        
        new_entry.total_rewards_earned += rewards_earned;
        
        leaderboard.insert(StorablePrincipal(principal), new_entry);
    });
}

// ============ QUERY FUNCTIONS ============

#[query]
fn get_staked_nfts(owner: Principal) -> Vec<StakedNFT> {
    STAKED_NFTS.with(|s| {
        s.borrow()
            .iter()
            .filter(|(_, nft)| nft.owner == owner)
            .map(|(_, nft)| {
                // Calculate current pending rewards
                let rewards = calculate_rewards(
                    nft.staked_at,
                    nft.last_claim_at,
                    nft.multiplier,
                ) + nft.pending_rewards;
                
                StakedNFT {
                    pending_rewards: rewards,
                    ..nft
                }
            })
            .collect()
    })
}

#[query]
fn get_pending_rewards(owner: Principal) -> u64 {
    get_staked_nfts(owner)
        .iter()
        .map(|nft| nft.pending_rewards)
        .sum()
}

#[query]
fn get_leaderboard(limit: u32) -> Vec<LeaderboardEntry> {
    let mut entries: Vec<LeaderboardEntry> = LEADERBOARD.with(|l| {
        l.borrow()
            .iter()
            .map(|(_, entry)| entry)
            .collect()
    });
    
    // Sort by total rewards earned (descending)
    entries.sort_by(|a, b| b.total_rewards_earned.cmp(&a.total_rewards_earned));
    
    // Assign ranks
    for (i, entry) in entries.iter_mut().enumerate() {
        entry.rank = (i + 1) as u32;
    }
    
    entries.into_iter().take(limit as usize).collect()
}

// ============ ADMIN FUNCTIONS ============

#[update]
fn set_harlee_ledger(ledger: Principal) -> Result<(), String> {
    // In production, check admin permissions
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.harlee_ledger = Some(ledger);
        c.borrow_mut().set(config).unwrap();
    });
    Ok(())
}

#[update]
async fn distribute_rewards() -> Result<u32, String> {
    // In production, check admin permissions
    // Distribute rewards to all stakers
    let count = STAKED_NFTS.with(|s| s.borrow().len());
    // In production, batch transfer $HARLEE tokens
    Ok(count as u32)
}

// Export Candid
ic_cdk::export_candid!();

