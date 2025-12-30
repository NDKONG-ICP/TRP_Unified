//! Treasury Canister - Platform fee collection and multi-chain management
//! Handles treasury operations with multi-sig support and multi-chain addresses
//! Admin-only access for send/receive operations
//! Reference: https://github.com/dragginzgame/icydb for data model patterns

use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableCell, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Memory IDs (following IcyDB patterns for stable storage)
const BALANCE_MEM_ID: MemoryId = MemoryId::new(0);
const TRANSACTIONS_MEM_ID: MemoryId = MemoryId::new(1);
const CONFIG_MEM_ID: MemoryId = MemoryId::new(2);
const PENDING_WITHDRAWALS_MEM_ID: MemoryId = MemoryId::new(3);
const MULTI_CHAIN_BALANCES_MEM_ID: MemoryId = MemoryId::new(4);

// ============ ADMIN PRINCIPALS AND ADDRESSES ============
// These are the ONLY addresses that can control treasury operations
// Admin principals are now managed dynamically or via controllers for privacy.

// ICP Account ID (Placeholder)
const ADMIN_ICP_ACCOUNT_ID: &str = "";

// Multi-chain addresses for NFT minting and receiving (Placeholders)
const ADMIN_BTC_ADDRESS: &str = "";
const ADMIN_ETH_ADDRESS: &str = "";
const ADMIN_SOL_ADDRESS: &str = "";

// Threshold ECDSA constants
const KEY_NAME: &str = "key_1"; // Use "key_1" for mainnet, "dfx_test_key" for local

fn get_ecdsa_key_id() -> EcdsaKeyId {
    EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: KEY_NAME.to_string(),
    }
}

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

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SwapRecord {
    pub from_token: TokenType,
    pub from_amount: u64,
    pub to_token: TokenType,
    pub to_amount: u64,
    pub timestamp: u64,
    pub status: String,
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
            icp_principal: "".to_string(),
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
            admin_principals: vec![],
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
    if ic_cdk::api::is_controller(&caller) {
        return true;
    }
    
    let caller_text = caller.to_text();
    
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
    // Initialize with default config
    CONFIG.with(|c| {
        let config = TreasuryConfig::default();
        c.borrow_mut().set(config).unwrap();
    });
    
    ic_cdk::println!("Treasury initialized with multi-chain support");
}

#[pre_upgrade]
fn pre_upgrade() {}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Treasury upgraded");
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
async fn distribute_harlee_reward(recipient: Principal, amount: u64, memo: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    require_admin(caller)?;
    
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }
    
    // Fetch latest balance from ledger to ensure accuracy
    let current_harlee = fetch_harlee_balance().await?;
    if amount > current_harlee {
        return Err(format!("Insufficient HARLEE balance on ledger. Available: {}, Requested: {}", current_harlee, amount));
    }
    
    // Perform actual transfer via ledger
    let block_index = transfer_harlee(recipient, amount, Some(memo)).await?;
    
    Ok(block_index)
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

/// Sync specific token balance from its ledger
#[update]
async fn sync_token_balance(token: TokenType) -> Result<u64, String> {
    match token {
        TokenType::ICP => fetch_icp_balance().await,
        TokenType::HARLEE => fetch_harlee_balance().await,
        TokenType::CkBTC => {
            let ledger = Principal::from_text(CKBTC_LEDGER_ID).map_err(|e| e.to_string())?;
            let balance = fetch_icrc1_balance(ledger).await?;
            BALANCE.with(|b| {
                let mut bal = b.borrow().get().clone();
                bal.ck_btc = balance;
                bal.last_updated = ic_cdk::api::time();
                b.borrow_mut().set(bal).unwrap();
            });
            Ok(balance)
        },
        TokenType::CkETH => {
            let ledger = Principal::from_text(CKETH_LEDGER_ID).map_err(|e| e.to_string())?;
            let balance = fetch_icrc1_balance(ledger).await?;
            BALANCE.with(|b| {
                let mut bal = b.borrow().get().clone();
                bal.ck_eth = balance;
                bal.last_updated = ic_cdk::api::time();
                b.borrow_mut().set(bal).unwrap();
            });
            Ok(balance)
        },
        _ => Err("Sync not supported for this token yet".to_string()),
    }
}

async fn fetch_icrc1_balance(ledger: Principal) -> Result<u64, String> {
    let account = Account {
        owner: ic_cdk::api::id(),
        subaccount: None,
    };
    
    let result: Result<(Nat,), _> = ic_cdk::call(ledger, "icrc1_balance_of", (account,)).await;
    
    match result {
        Ok((balance,)) => Ok(balance.0.try_into().unwrap_or(0u64)),
        Err((code, msg)) => Err(format!("Failed to fetch balance: {:?} - {}", code, msg))
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

#[update]
async fn get_canister_public_key() -> Result<Vec<u8>, String> {
    let request = EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: vec![],
        key_id: get_ecdsa_key_id(),
    };

    let (res,) = ecdsa_public_key(request)
        .await
        .map_err(|(code, msg)| format!("Failed to get public key: {:?} - {}", code, msg))?;

    Ok(res.public_key)
}

#[update]
async fn sign_data(message_hash: Vec<u8>) -> Result<Vec<u8>, String> {
    require_admin(ic_cdk::caller())?;

    if message_hash.len() != 32 {
        return Err("Message hash must be 32 bytes".to_string());
    }

    let request = SignWithEcdsaArgument {
        message_hash,
        derivation_path: vec![],
        key_id: get_ecdsa_key_id(),
    };

    let (res,) = sign_with_ecdsa(request)
        .await
        .map_err(|(code, msg)| format!("Failed to sign data: {:?} - {}", code, msg))?;

    Ok(res.signature)
}

#[update]
async fn setup_multichain_addresses() -> Result<MultiChainAddresses, String> {
    require_admin(ic_cdk::caller())?;
    
    let public_key = get_canister_public_key().await?;
    
    // Convert public key to addresses
    // For ETH: Keccak256 hash of public key (last 20 bytes)
    use sha3::{Digest as _, Keccak256};
    let mut hasher = Keccak256::new();
    hasher.update(&public_key[1..]); // Remove leading 0x04 for uncompressed key
    let eth_hash = hasher.finalize();
    let eth_address = format!("0x{}", hex::encode(&eth_hash[12..]));
    
    // For BTC: P2PKH or P2WPKH (simplified here)
    use ripemd::{Digest as _, Ripemd160};
    use sha2::{Digest as _, Sha256};
    let sha256_hash = Sha256::digest(&public_key);
    let ripemd160_hash = Ripemd160::digest(&sha256_hash);
    let btc_address = format!("bc1q{}", hex::encode(&ripemd160_hash)); // Placeholder for real bech32
    
    let addresses = MultiChainAddresses {
        icp_principal: ic_cdk::id().to_text(),
        icp_account_id: ADMIN_ICP_ACCOUNT_ID.to_string(), // Keep if needed or derive
        btc_address,
        eth_address,
        sol_address: ADMIN_SOL_ADDRESS.to_string(), // Solana uses Ed25519, separate key
    };
    
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        config.multi_chain_addresses = addresses.clone();
        c.borrow_mut().set(config).unwrap();
    });
    
    Ok(addresses)
}

#[update]
async fn process_nft_payment(from_token: TokenType, amount: u64, nft_id: u64, tx_hash: Option<String>) -> Result<u64, String> {
    // 1. Swap the payment token to ICP via internal calculation (mainnet bridge pattern)
    let icp_received = if amount > 0 {
        auto_swap_to_icp(from_token.clone(), amount).await?
    } else {
        0 // ICPay handles the actual transfer
    };
    
    // 2. Record the final transaction
    let tx_id = next_tx_id();
    let now = ic_cdk::api::time();
    let tx = Transaction {
        id: tx_id,
        tx_type: TransactionType::NFTSale,
        token: TokenType::ICP,
        amount: icp_received,
        from: Some(format!("{:?}", from_token)),
        to: Some("Treasury_Wallet".to_string()),
        timestamp: now,
        memo: format!("Payment for NFT #{} (Original: {} units of {:?})", nft_id, amount, from_token),
        tx_hash,
        chain: "ICP".to_string(),
    };
    
    TRANSACTIONS.with(|t| {
        t.borrow_mut().insert(StorableNat(tx_id), tx);
    });
    
    // 3. Update the Treasury ICP balance
    if icp_received > 0 {
        BALANCE.with(|b| {
            let mut balance = b.borrow().get().clone();
            balance.icp = balance.icp.saturating_add(icp_received);
            balance.last_updated = now;
            b.borrow_mut().set(balance).unwrap();
        });
    }
    
    Ok(tx_id)
}

#[update]
async fn auto_swap_to_icp(from_token: TokenType, amount: u64) -> Result<u64, String> {
    // In a production environment, this would integrate with Sonic or ICPSwap
    // For now, we'll calculate the ICP equivalent and record the swap
    
    let icp_price = 10.0; // Mock price: 1 ICP = $10
    let token_price = match from_token {
        TokenType::CkBTC | TokenType::BTC => 100000.0,
        TokenType::CkETH | TokenType::ETH => 3000.0,
        TokenType::SOL => 100.0,
        TokenType::HARLEE => 0.1,
        TokenType::ICP => 10.0,
        _ => 1.0,
    };
    
    let usd_value = (amount as f64) * token_price;
    let icp_amount = (usd_value / icp_price) as u64;
    
    let now = ic_cdk::api::time();
    let tx_id = next_tx_id();
    
    // Record the "swap" transaction
    let tx = Transaction {
        id: tx_id,
        tx_type: TransactionType::Transfer,
        token: TokenType::ICP,
        amount: icp_amount,
        from: Some(format!("{:?}", from_token)),
        to: Some("Treasury".to_string()),
        timestamp: now,
        memo: format!("Auto-swap from {:?} to ICP", from_token),
        tx_hash: None,
        chain: "ICP".to_string(),
    };
    
    TRANSACTIONS.with(|t| {
        t.borrow_mut().insert(StorableNat(tx_id), tx);
    });
    
    Ok(icp_amount)
}

#[query]
fn health() -> String {
    "OK".to_string()
}

// Generate Candid
ic_cdk::export_candid!();
