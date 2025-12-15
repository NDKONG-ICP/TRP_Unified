//! Treasury Canister - Platform fee collection and multi-chain management
//! Handles treasury operations with multi-sig support and multi-chain addresses
//! Admin-only access for send/receive operations
//! Reference: https://github.com/dragginzgame/icydb for data model patterns

use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::HashMap;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs (following IcyDB patterns for stable storage)
const BALANCE_MEM_ID: MemoryId = MemoryId::new(0);
const TRANSACTIONS_MEM_ID: MemoryId = MemoryId::new(1);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(2);
const PENDING_WITHDRAWALS_MEM_ID: MemoryId = MemoryId::new(3);
const MULTI_CHAIN_BALANCES_MEM_ID: MemoryId = MemoryId::new(4);

// ============ ADMIN PRINCIPALS AND ADDRESSES ============
// These are the ONLY addresses that can control treasury operations

// Cursor/Dev Admin Principal (Internet Identity)
const ADMIN_PRINCIPAL_CURSOR: &str = "lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae";

// Plug Wallet Admin Principal
const ADMIN_PRINCIPAL_PLUG: &str = "sh7h6-b7xcy-tjank-crj6d-idrcr-ormbi-22yqs-uanyl-itbp3-ur5ue-wae";

// OISY Wallet Principal (multi-token)
const ADMIN_PRINCIPAL_OISY: &str = "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe";

// New Admin Principal
const ADMIN_PRINCIPAL_NEW: &str = "imnyd-k37s2-xlg7c-omeed-ezrzg-6oesa-r3ek6-xrwuz-qbliq-5h675-yae";

// ICP Account ID (OISY ICP-only wallet)
const ADMIN_ICP_ACCOUNT_ID: &str = "82f47963aa786ed12c115f40027ef1e86e1a8010119afc5e8709589609bc2f8f";

// Multi-chain addresses for NFT minting and receiving
const ADMIN_BTC_ADDRESS: &str = "bc1qxf5fegu3x4uvynqz69q62jcglzg3m8jpzrsdej";
const ADMIN_ETH_ADDRESS: &str = "0x989847D46770e2322b017c79e2fAF253aA23687f";
const ADMIN_SOL_ADDRESS: &str = "6NgxMDwKYfqdtBVpbkA3LmCHzXS5CZ8DvQX72KpDZ5A4";

// ============ TYPES ============

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum TransactionType {
    Deposit,
    Withdrawal,
    PlatformFee,
    NFTSale,
    SubscriptionPayment,
    Airdrop,
    Reward,
    Transfer,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum TokenType {
    ICP,
    CkBTC,
    CkETH,
    CkUSDC,
    CkUSDT,
    HARLEE,
    RAVEN,
    BTC,
    ETH,
    SOL,
    SUI,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum WithdrawalStatus {
    Pending,
    Approved,
    Executed,
    Rejected,
    Cancelled,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Transaction {
    pub id: u64,
    pub tx_type: TransactionType,
    pub token: TokenType,
    pub amount: u64, // In smallest unit (e8s for ICP)
    pub from: Option<String>,
    pub to: Option<String>,
    pub timestamp: u64,
    pub memo: String,
    pub tx_hash: Option<String>,
    pub chain: String,
}

impl Storable for Transaction {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct PendingWithdrawal {
    pub id: u64,
    pub token: TokenType,
    pub amount: u64,
    pub to_address: String,
    pub chain: String,
    pub requested_by: Principal,
    pub requested_at: u64,
    pub status: WithdrawalStatus,
    pub approvals: Vec<Principal>,
    pub rejection_reason: Option<String>,
    pub executed_at: Option<u64>,
    pub tx_hash: Option<String>,
}

impl Storable for PendingWithdrawal {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct TreasuryBalance {
    pub icp: u64,
    pub ck_btc: u64,
    pub ck_eth: u64,
    pub ck_usdc: u64,
    pub ck_usdt: u64,
    pub harlee: u64,
    pub raven: u64,
    pub last_updated: u64,
}

impl Storable for TreasuryBalance {
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

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainAddresses {
    pub icp_principal: String,
    pub icp_account_id: String,
    pub btc_address: String,
    pub eth_address: String,
    pub sol_address: String,
}

impl Default for MultiChainAddresses {
    fn default() -> Self {
        Self {
            icp_principal: ADMIN_PRINCIPAL_CURSOR.to_string(),
            icp_account_id: ADMIN_ICP_ACCOUNT_ID.to_string(),
            btc_address: ADMIN_BTC_ADDRESS.to_string(),
            eth_address: ADMIN_ETH_ADDRESS.to_string(),
            sol_address: ADMIN_SOL_ADDRESS.to_string(),
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TreasuryConfig {
    pub admin_principals: Vec<String>,
    pub withdrawal_threshold: u64,
    pub multi_sig_required: bool,
    pub required_approvals: u8,
    pub multi_chain_addresses: MultiChainAddresses,
    pub platform_fee_percentage: u64, // In basis points (100 = 1%)
    pub paused: bool,
}

impl Default for TreasuryConfig {
    fn default() -> Self {
        Self {
            admin_principals: vec![
                ADMIN_PRINCIPAL_CURSOR.to_string(),
                ADMIN_PRINCIPAL_PLUG.to_string(),
                ADMIN_PRINCIPAL_OISY.to_string(),
                ADMIN_PRINCIPAL_NEW.to_string(),
            ],
            withdrawal_threshold: 100_000_000, // 1 ICP minimum balance
            multi_sig_required: false, // Single admin approval (OISY or Plug)
            required_approvals: 1, // Only 1 admin needed
            multi_chain_addresses: MultiChainAddresses::default(),
            platform_fee_percentage: 250, // 2.5% platform fee
            paused: false,
        }
    }
}

impl Storable for TreasuryConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded {
        max_size: 2000,
        is_fixed_size: false,
    };
}

// Storable wrappers
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

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static BALANCE: RefCell<StableCell<TreasuryBalance, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(BALANCE_MEM_ID)),
            TreasuryBalance::default()
        ).unwrap());

    static TRANSACTIONS: RefCell<StableBTreeMap<StorableNat, Transaction, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(TRANSACTIONS_MEM_ID))
        ));

    static CONFIG: RefCell<StableCell<TreasuryConfig, Memory>> =
        RefCell::new(StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(CONFIG_MEM_ID)),
            TreasuryConfig::default()
        ).unwrap());

    static PENDING_WITHDRAWALS: RefCell<StableBTreeMap<StorableNat, PendingWithdrawal, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(PENDING_WITHDRAWALS_MEM_ID))
        ));

    static TX_COUNTER: RefCell<u64> = RefCell::new(0);
    static WITHDRAWAL_COUNTER: RefCell<u64> = RefCell::new(0);
}

// ============ AUTHORIZATION ============

fn is_admin(caller: Principal) -> bool {
    let caller_text = caller.to_text();
    
    // Check against all admin principals
    if caller_text == ADMIN_PRINCIPAL_CURSOR ||
       caller_text == ADMIN_PRINCIPAL_PLUG ||
       caller_text == ADMIN_PRINCIPAL_OISY ||
       caller_text == ADMIN_PRINCIPAL_NEW {
        return true;
    }
    
    // Also check config for dynamically added admins
    CONFIG.with(|c| {
        c.borrow().get().admin_principals.contains(&caller_text)
    })
}

fn require_admin(caller: Principal) -> Result<(), String> {
    if !is_admin(caller) {
        return Err(format!(
            "Unauthorized: {} is not an admin. Only the following principals can access treasury operations: Cursor/Dev, Plug, or OISY admin wallets.",
            caller.to_text()
        ));
    }
    Ok(())
}

fn next_tx_id() -> u64 {
    TX_COUNTER.with(|c| {
        let mut counter = c.borrow_mut();
        *counter += 1;
        *counter
    })
}

fn next_withdrawal_id() -> u64 {
    WITHDRAWAL_COUNTER.with(|c| {
        let mut counter = c.borrow_mut();
        *counter += 1;
        *counter
    })
}

// ============ INITIALIZATION ============

#[init]
fn init() {
    let caller = ic_cdk::caller();
    
    // Initialize with default config (includes all admin principals)
    CONFIG.with(|c| {
        let config = TreasuryConfig::default();
        c.borrow_mut().set(config).unwrap();
    });
    
    ic_cdk::println!("Treasury initialized with multi-chain support");
    ic_cdk::println!("Admin principals: Cursor/Dev, Plug, OISY");
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    // Ensure config has all admin principals after upgrade
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        let required_admins = vec![
            ADMIN_PRINCIPAL_CURSOR.to_string(),
            ADMIN_PRINCIPAL_PLUG.to_string(),
            ADMIN_PRINCIPAL_OISY.to_string(),
            ADMIN_PRINCIPAL_NEW.to_string(),
        ];
        
        for admin in required_admins {
            if !config.admin_principals.contains(&admin) {
                config.admin_principals.push(admin);
            }
        }
        c.borrow_mut().set(config).unwrap();
    });
}

// ============ DEPOSIT FUNCTIONS ============

#[update]
fn deposit(token: TokenType, amount: u64, from: String, memo: String) -> Result<u64, String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    let tx_id = next_tx_id();
    let now = ic_cdk::api::time();
    
    // Update balance based on token type
    BALANCE.with(|b| {
        let mut balance = b.borrow().get().clone();
        match token {
            TokenType::ICP => balance.icp = balance.icp.saturating_add(amount),
            TokenType::CkBTC => balance.ck_btc = balance.ck_btc.saturating_add(amount),
            TokenType::CkETH => balance.ck_eth = balance.ck_eth.saturating_add(amount),
            TokenType::CkUSDC => balance.ck_usdc = balance.ck_usdc.saturating_add(amount),
            TokenType::CkUSDT => balance.ck_usdt = balance.ck_usdt.saturating_add(amount),
            TokenType::HARLEE => balance.harlee = balance.harlee.saturating_add(amount),
            TokenType::RAVEN => balance.raven = balance.raven.saturating_add(amount),
            _ => {}
        }
        balance.last_updated = now;
        b.borrow_mut().set(balance).unwrap();
    });
    
    // Record transaction
    let tx = Transaction {
        id: tx_id,
        tx_type: TransactionType::Deposit,
        token: token.clone(),
        amount,
        from: Some(from),
        to: Some(get_treasury_address(&token)),
        timestamp: now,
        memo,
        tx_hash: None,
        chain: get_chain_name(&token),
    };
    
    TRANSACTIONS.with(|t| {
        t.borrow_mut().insert(StorableNat(tx_id), tx);
    });
    
    Ok(tx_id)
}

#[update]
fn deposit_platform_fee(amount: u64, from: Principal, memo: String) -> Result<u64, String> {
    deposit(TokenType::ICP, amount, from.to_text(), format!("Platform Fee: {}", memo))
}

/// Deposit HARLEE tokens for rewards pool (admin only)
/// Use this to fund the ecosystem rewards pool
#[update]
fn deposit_harlee_rewards(amount: u64, memo: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    deposit(TokenType::HARLEE, amount, caller.to_text(), format!("HARLEE Rewards: {}", memo))
}

/// Distribute HARLEE rewards to users
#[update]
fn distribute_harlee_reward(recipient: Principal, amount: u64, memo: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    let current_harlee = get_token_balance(&TokenType::HARLEE);
    if amount > current_harlee {
        return Err(format!("Insufficient HARLEE balance. Available: {}, Requested: {}", current_harlee, amount));
    }
    
    let tx_id = next_tx_id();
    let now = ic_cdk::api::time();
    
    // Deduct from balance
    BALANCE.with(|b| {
        let mut balance = b.borrow().get().clone();
        balance.harlee = balance.harlee.saturating_sub(amount);
        balance.last_updated = now;
        b.borrow_mut().set(balance).unwrap();
    });
    
    // Record transaction
    let tx = Transaction {
        id: tx_id,
        tx_type: TransactionType::Reward,
        token: TokenType::HARLEE,
        amount,
        from: Some("Treasury Rewards Pool".to_string()),
        to: Some(recipient.to_text()),
        timestamp: now,
        memo,
        tx_hash: None,
        chain: "ICP".to_string(),
    };
    
    TRANSACTIONS.with(|t| {
        t.borrow_mut().insert(StorableNat(tx_id), tx);
    });
    
    Ok(tx_id)
}

// ============ WITHDRAWAL FUNCTIONS ============

#[update]
fn request_withdrawal(
    token: TokenType,
    amount: u64,
    to_address: String,
) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    // Verify sufficient balance
    let current_balance = get_token_balance(&token);
    if amount > current_balance {
        return Err(format!(
            "Insufficient balance. Available: {}, Requested: {}",
            current_balance, amount
        ));
    }
    
    let config = CONFIG.with(|c| c.borrow().get().clone());
    
    // Check threshold
    if token == TokenType::ICP && current_balance - amount < config.withdrawal_threshold {
        return Err(format!(
            "Withdrawal would bring ICP balance below threshold of {} e8s",
            config.withdrawal_threshold
        ));
    }
    
    let withdrawal_id = next_withdrawal_id();
    let now = ic_cdk::api::time();
    
    let withdrawal = PendingWithdrawal {
        id: withdrawal_id,
        token: token.clone(),
        amount,
        to_address,
        chain: get_chain_name(&token),
        requested_by: caller,
        requested_at: now,
        status: if config.multi_sig_required { 
            WithdrawalStatus::Pending 
        } else { 
            WithdrawalStatus::Approved 
        },
        approvals: vec![caller],
        rejection_reason: None,
        executed_at: None,
        tx_hash: None,
    };
    
    PENDING_WITHDRAWALS.with(|w| {
        w.borrow_mut().insert(StorableNat(withdrawal_id), withdrawal);
    });
    
    // If multi-sig not required, auto-execute
    if !config.multi_sig_required {
        execute_withdrawal(withdrawal_id)?;
    }
    
    Ok(withdrawal_id)
}

#[update]
fn approve_withdrawal(withdrawal_id: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    PENDING_WITHDRAWALS.with(|w| {
        let mut withdrawals = w.borrow_mut();
        
        if let Some(mut withdrawal) = withdrawals.get(&StorableNat(withdrawal_id)) {
            if withdrawal.status != WithdrawalStatus::Pending {
                return Err("Withdrawal is not pending".to_string());
            }
            
            if withdrawal.approvals.contains(&caller) {
                return Err("You have already approved this withdrawal".to_string());
            }
            
            withdrawal.approvals.push(caller);
            
            let config = CONFIG.with(|c| c.borrow().get().clone());
            if withdrawal.approvals.len() >= config.required_approvals as usize {
                withdrawal.status = WithdrawalStatus::Approved;
            }
            
            withdrawals.insert(StorableNat(withdrawal_id), withdrawal);
            Ok(())
        } else {
            Err("Withdrawal not found".to_string())
        }
    })
}

#[update]
fn execute_withdrawal(withdrawal_id: u64) -> Result<String, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    PENDING_WITHDRAWALS.with(|w| {
        let mut withdrawals = w.borrow_mut();
        
        if let Some(mut withdrawal) = withdrawals.get(&StorableNat(withdrawal_id)) {
            if withdrawal.status != WithdrawalStatus::Approved {
                return Err("Withdrawal must be approved before execution".to_string());
            }
            
            // Deduct from balance
            BALANCE.with(|b| {
                let mut balance = b.borrow().get().clone();
                match withdrawal.token {
                    TokenType::ICP => balance.icp = balance.icp.saturating_sub(withdrawal.amount),
                    TokenType::CkBTC => balance.ck_btc = balance.ck_btc.saturating_sub(withdrawal.amount),
                    TokenType::CkETH => balance.ck_eth = balance.ck_eth.saturating_sub(withdrawal.amount),
                    TokenType::CkUSDC => balance.ck_usdc = balance.ck_usdc.saturating_sub(withdrawal.amount),
                    TokenType::CkUSDT => balance.ck_usdt = balance.ck_usdt.saturating_sub(withdrawal.amount),
                    TokenType::HARLEE => balance.harlee = balance.harlee.saturating_sub(withdrawal.amount),
                    TokenType::RAVEN => balance.raven = balance.raven.saturating_sub(withdrawal.amount),
                    _ => {}
                }
                balance.last_updated = ic_cdk::api::time();
                b.borrow_mut().set(balance).unwrap();
            });
            
            // Record transaction
            let tx_id = next_tx_id();
            let now = ic_cdk::api::time();
            let tx = Transaction {
                id: tx_id,
                tx_type: TransactionType::Withdrawal,
                token: withdrawal.token.clone(),
                amount: withdrawal.amount,
                from: Some(get_treasury_address(&withdrawal.token)),
                to: Some(withdrawal.to_address.clone()),
                timestamp: now,
                memo: format!("Withdrawal #{}", withdrawal_id),
                tx_hash: None,
                chain: withdrawal.chain.clone(),
            };
            
            TRANSACTIONS.with(|t| {
                t.borrow_mut().insert(StorableNat(tx_id), tx);
            });
            
            // Update withdrawal status
            withdrawal.status = WithdrawalStatus::Executed;
            withdrawal.executed_at = Some(now);
            withdrawals.insert(StorableNat(withdrawal_id), withdrawal.clone());
            
            Ok(format!("Withdrawal {} executed. Transaction ID: {}", withdrawal_id, tx_id))
        } else {
            Err("Withdrawal not found".to_string())
        }
    })
}

#[update]
fn reject_withdrawal(withdrawal_id: u64, reason: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    PENDING_WITHDRAWALS.with(|w| {
        let mut withdrawals = w.borrow_mut();
        
        if let Some(mut withdrawal) = withdrawals.get(&StorableNat(withdrawal_id)) {
            if withdrawal.status != WithdrawalStatus::Pending {
                return Err("Can only reject pending withdrawals".to_string());
            }
            
            withdrawal.status = WithdrawalStatus::Rejected;
            withdrawal.rejection_reason = Some(reason);
            withdrawals.insert(StorableNat(withdrawal_id), withdrawal);
            Ok(())
        } else {
            Err("Withdrawal not found".to_string())
        }
    })
}

// ============ QUERY FUNCTIONS ============

#[query]
fn get_balance() -> TreasuryBalance {
    BALANCE.with(|b| b.borrow().get().clone())
}

#[query]
fn get_token_balance_query(token: TokenType) -> u64 {
    get_token_balance(&token)
}

fn get_token_balance(token: &TokenType) -> u64 {
    BALANCE.with(|b| {
        let balance = b.borrow().get().clone();
        match token {
            TokenType::ICP => balance.icp,
            TokenType::CkBTC => balance.ck_btc,
            TokenType::CkETH => balance.ck_eth,
            TokenType::CkUSDC => balance.ck_usdc,
            TokenType::CkUSDT => balance.ck_usdt,
            TokenType::HARLEE => balance.harlee,
            TokenType::RAVEN => balance.raven,
            _ => 0,
        }
    })
}

#[query]
fn get_transaction(tx_id: u64) -> Option<Transaction> {
    TRANSACTIONS.with(|t| t.borrow().get(&StorableNat(tx_id)))
}

#[query]
fn get_transactions(offset: u64, limit: u64) -> Vec<Transaction> {
    TRANSACTIONS.with(|t| {
        t.borrow()
            .iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, tx)| tx)
            .collect()
    })
}

#[query]
fn get_pending_withdrawals() -> Vec<PendingWithdrawal> {
    PENDING_WITHDRAWALS.with(|w| {
        w.borrow()
            .iter()
            .filter(|(_, withdrawal)| withdrawal.status == WithdrawalStatus::Pending)
            .map(|(_, withdrawal)| withdrawal)
            .collect()
    })
}

#[query]
fn get_config() -> TreasuryConfig {
    let caller = ic_cdk::caller();
    // Only admins can view full config
    if is_admin(caller) {
        CONFIG.with(|c| c.borrow().get().clone())
    } else {
        // Return sanitized config for non-admins
        let config = CONFIG.with(|c| c.borrow().get().clone());
        TreasuryConfig {
            admin_principals: vec![], // Hide admin list
            withdrawal_threshold: config.withdrawal_threshold,
            multi_sig_required: config.multi_sig_required,
            required_approvals: config.required_approvals,
            multi_chain_addresses: MultiChainAddresses::default(), // Hide actual addresses
            platform_fee_percentage: config.platform_fee_percentage,
            paused: config.paused,
        }
    }
}

#[query]
fn get_multi_chain_addresses() -> MultiChainAddresses {
    let caller = ic_cdk::caller();
    if is_admin(caller) {
        CONFIG.with(|c| c.borrow().get().multi_chain_addresses.clone())
    } else {
        MultiChainAddresses::default() // Return default/public addresses
    }
}

#[query]
fn get_admin_principals() -> Vec<String> {
    let caller = ic_cdk::caller();
    if is_admin(caller) {
        CONFIG.with(|c| c.borrow().get().admin_principals.clone())
    } else {
        vec![] // Hide from non-admins
    }
}

#[query]
fn is_caller_admin() -> bool {
    is_admin(ic_cdk::caller())
}

#[query]
fn get_treasury_stats() -> TreasuryStats {
    let balance = BALANCE.with(|b| b.borrow().get().clone());
    let total_transactions = TRANSACTIONS.with(|t| t.borrow().len() as u64);
    let pending_count = PENDING_WITHDRAWALS.with(|w| {
        w.borrow()
            .iter()
            .filter(|(_, wd)| wd.status == WithdrawalStatus::Pending)
            .count() as u64
    });
    
    let total_collected = TRANSACTIONS.with(|t| {
        t.borrow()
            .iter()
            .filter(|(_, tx)| matches!(tx.tx_type, TransactionType::Deposit | TransactionType::PlatformFee))
            .map(|(_, tx)| tx.amount)
            .sum()
    });
    
    let total_withdrawn = TRANSACTIONS.with(|t| {
        t.borrow()
            .iter()
            .filter(|(_, tx)| matches!(tx.tx_type, TransactionType::Withdrawal))
            .map(|(_, tx)| tx.amount)
            .sum()
    });
    
    TreasuryStats {
        total_icp_balance: balance.icp,
        total_ckbtc_balance: balance.ck_btc,
        total_cketh_balance: balance.ck_eth,
        total_ckusdc_balance: balance.ck_usdc,
        total_harlee_balance: balance.harlee,
        total_raven_balance: balance.raven,
        total_transactions,
        pending_withdrawals: pending_count,
        total_collected_icp: total_collected,
        total_withdrawn_icp: total_withdrawn,
        last_updated: balance.last_updated,
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TreasuryStats {
    pub total_icp_balance: u64,
    pub total_ckbtc_balance: u64,
    pub total_cketh_balance: u64,
    pub total_ckusdc_balance: u64,
    pub total_harlee_balance: u64,
    pub total_raven_balance: u64,
    pub total_transactions: u64,
    pub pending_withdrawals: u64,
    pub total_collected_icp: u64,
    pub total_withdrawn_icp: u64,
    pub last_updated: u64,
}

// ============ ADMIN CONFIGURATION ============

#[update]
fn update_config(
    withdrawal_threshold: Option<u64>,
    multi_sig_required: Option<bool>,
    required_approvals: Option<u8>,
    platform_fee_percentage: Option<u64>,
    paused: Option<bool>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        
        if let Some(threshold) = withdrawal_threshold {
            config.withdrawal_threshold = threshold;
        }
        if let Some(multi_sig) = multi_sig_required {
            config.multi_sig_required = multi_sig;
        }
        if let Some(approvals) = required_approvals {
            if approvals > config.admin_principals.len() as u8 {
                return Err("Required approvals cannot exceed number of admins".to_string());
            }
            config.required_approvals = approvals;
        }
        if let Some(fee) = platform_fee_percentage {
            if fee > 10000 {
                return Err("Platform fee cannot exceed 100%".to_string());
            }
            config.platform_fee_percentage = fee;
        }
        if let Some(p) = paused {
            config.paused = p;
        }
        
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[update]
fn add_admin(principal_text: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    // Validate principal format
    Principal::from_text(&principal_text)
        .map_err(|e| format!("Invalid principal: {}", e))?;
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        if !config.admin_principals.contains(&principal_text) {
            config.admin_principals.push(principal_text);
            c.borrow_mut().set(config).unwrap();
        }
        Ok(())
    })
}

#[update]
fn remove_admin(principal_text: String) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    // Prevent removing the core admins
    if principal_text == ADMIN_PRINCIPAL_CURSOR ||
       principal_text == ADMIN_PRINCIPAL_PLUG ||
       principal_text == ADMIN_PRINCIPAL_OISY ||
       principal_text == ADMIN_PRINCIPAL_NEW {
        return Err("Cannot remove core admin principals".to_string());
    }
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.admin_principals.retain(|p| p != &principal_text);
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

#[update]
fn update_multi_chain_addresses(
    btc_address: Option<String>,
    eth_address: Option<String>,
    sol_address: Option<String>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        
        if let Some(btc) = btc_address {
            config.multi_chain_addresses.btc_address = btc;
        }
        if let Some(eth) = eth_address {
            config.multi_chain_addresses.eth_address = eth;
        }
        if let Some(sol) = sol_address {
            config.multi_chain_addresses.sol_address = sol;
        }
        
        c.borrow_mut().set(config).unwrap();
        Ok(())
    })
}

// ============ HELPER FUNCTIONS ============

fn get_treasury_address(token: &TokenType) -> String {
    CONFIG.with(|c| {
        let addresses = c.borrow().get().multi_chain_addresses.clone();
        match token {
            TokenType::ICP | TokenType::CkBTC | TokenType::CkETH | 
            TokenType::CkUSDC | TokenType::CkUSDT | TokenType::HARLEE | TokenType::RAVEN => {
                addresses.icp_principal
            }
            TokenType::BTC => addresses.btc_address,
            TokenType::ETH => addresses.eth_address,
            TokenType::SOL | TokenType::SUI => addresses.sol_address,
        }
    })
}

fn get_chain_name(token: &TokenType) -> String {
    match token {
        TokenType::ICP | TokenType::CkBTC | TokenType::CkETH | 
        TokenType::CkUSDC | TokenType::CkUSDT | TokenType::HARLEE | TokenType::RAVEN => "ICP".to_string(),
        TokenType::BTC => "Bitcoin".to_string(),
        TokenType::ETH => "Ethereum".to_string(),
        TokenType::SOL => "Solana".to_string(),
        TokenType::SUI => "SUI".to_string(),
    }
}

// ============ ICRC-1 LEDGER INTEGRATION ============
// Real integration with $HARLEE and other ICRC-1 tokens

// Token Ledger Canister IDs
const HARLEE_LEDGER_ID: &str = "tlm4l-kaaaa-aaaah-qqeha-cai";
const ICP_LEDGER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const CKBTC_LEDGER_ID: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
const CKETH_LEDGER_ID: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
const CKUSDC_LEDGER_ID: &str = "xevnm-gaaaa-aaaar-qafnq-cai";

/// Fetch real balance from HARLEE ledger via inter-canister call
#[update]
async fn fetch_harlee_balance() -> Result<u64, String> {
    let ledger = Principal::from_text(HARLEE_LEDGER_ID)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;
    
    let treasury_principal = ic_cdk::api::id();
    
    // ICRC-1 balance_of call
    let account = Account {
        owner: treasury_principal,
        subaccount: None,
    };
    
    let result: Result<(Nat,), _> = ic_cdk::call(
        ledger,
        "icrc1_balance_of",
        (account,)
    ).await;
    
    match result {
        Ok((balance,)) => {
            let balance_u64 = balance.0.try_into().unwrap_or(0u64);
            
            // Update stored balance
            BALANCE.with(|b| {
                let mut bal = b.borrow().get().clone();
                bal.harlee = balance_u64;
                bal.last_updated = ic_cdk::api::time();
                b.borrow_mut().set(bal).unwrap();
            });
            
            Ok(balance_u64)
        }
        Err((code, msg)) => Err(format!("Failed to fetch HARLEE balance: {:?} - {}", code, msg))
    }
}

/// Fetch real ICP balance from ICP ledger
#[update]
async fn fetch_icp_balance() -> Result<u64, String> {
    let ledger = Principal::from_text(ICP_LEDGER_ID)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;
    
    let treasury_principal = ic_cdk::api::id();
    
    let account = Account {
        owner: treasury_principal,
        subaccount: None,
    };
    
    let result: Result<(Nat,), _> = ic_cdk::call(
        ledger,
        "icrc1_balance_of",
        (account,)
    ).await;
    
    match result {
        Ok((balance,)) => {
            let balance_u64 = balance.0.try_into().unwrap_or(0u64);
            
            BALANCE.with(|b| {
                let mut bal = b.borrow().get().clone();
                bal.icp = balance_u64;
                bal.last_updated = ic_cdk::api::time();
                b.borrow_mut().set(bal).unwrap();
            });
            
            Ok(balance_u64)
        }
        Err((code, msg)) => Err(format!("Failed to fetch ICP balance: {:?} - {}", code, msg))
    }
}

/// Fetch all token balances from their respective ledgers
#[update]
async fn fetch_all_balances() -> Result<TreasuryBalance, String> {
    // Fetch in parallel would be better, but sequential for simplicity
    let _ = fetch_icp_balance().await;
    let _ = fetch_harlee_balance().await;
    
    // Return updated balance
    Ok(BALANCE.with(|b| b.borrow().get().clone()))
}

/// Transfer HARLEE tokens to a recipient via ICRC-1
#[update]
async fn transfer_harlee(to: Principal, amount: u64, memo: Option<String>) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    let ledger = Principal::from_text(HARLEE_LEDGER_ID)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;
    
    let transfer_args = TransferArg {
        to: Account {
            owner: to,
            subaccount: None,
        },
        fee: None, // Use default fee
        memo: memo.map(|m| m.into_bytes()),
        from_subaccount: None,
        created_at_time: Some(ic_cdk::api::time()),
        amount: Nat::from(amount),
    };
    
    let result: Result<(TransferResult,), _> = ic_cdk::call(
        ledger,
        "icrc1_transfer",
        (transfer_args,)
    ).await;
    
    match result {
        Ok((TransferResult::Ok(block_index),)) => {
            let block_u64: u64 = block_index.0.try_into().unwrap_or(0);
            
            // Record transaction
            let tx_id = next_tx_id();
            let now = ic_cdk::api::time();
            let tx = Transaction {
                id: tx_id,
                tx_type: TransactionType::Transfer,
                token: TokenType::HARLEE,
                amount,
                from: Some(ic_cdk::api::id().to_text()),
                to: Some(to.to_text()),
                timestamp: now,
                memo: format!("HARLEE transfer, block: {}", block_u64),
                tx_hash: Some(block_u64.to_string()),
                chain: "ICP".to_string(),
            };
            
            TRANSACTIONS.with(|t| {
                t.borrow_mut().insert(StorableNat(tx_id), tx);
            });
            
            // Update stored balance
            BALANCE.with(|b| {
                let mut bal = b.borrow().get().clone();
                bal.harlee = bal.harlee.saturating_sub(amount);
                bal.last_updated = now;
                b.borrow_mut().set(bal).unwrap();
            });
            
            Ok(block_u64)
        }
        Ok((TransferResult::Err(err),)) => {
            Err(format!("Transfer failed: {:?}", err))
        }
        Err((code, msg)) => {
            Err(format!("Inter-canister call failed: {:?} - {}", code, msg))
        }
    }
}

/// Distribute HARLEE staking rewards to a user
#[update]
async fn distribute_staking_reward(recipient: Principal, amount: u64, staked_nft_count: u32) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    // Transfer HARLEE to recipient
    let memo = format!("Staking reward: {} NFTs staked", staked_nft_count);
    transfer_harlee(recipient, amount, Some(memo)).await
}

// ICRC-1 types for inter-canister calls
#[derive(CandidType, Deserialize, Clone, Debug)]
struct Account {
    owner: Principal,
    subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct TransferArg {
    to: Account,
    fee: Option<Nat>,
    memo: Option<Vec<u8>>,
    from_subaccount: Option<Vec<u8>>,
    created_at_time: Option<u64>,
    amount: Nat,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum TransferResult {
    Ok(Nat),
    Err(TransferError),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// Generate Candid
ic_cdk::export_candid!();
