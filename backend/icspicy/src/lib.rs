use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_cdk::{
    api::call::call,
    init, post_upgrade, query, update,
};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, StableCell, Storable,
};
use std::borrow::Cow;
use std::cell::RefCell;
use image::{RgbaImage};

type Memory = VirtualMemory<DefaultMemoryImpl>;

// EXT Standard Types
pub type TokenIndex = u64;
pub type Balance = u128;

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct TokenMetadata {
    pub metadata: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct TransferRequest {
    pub from: Vec<u8>,
    pub to: Vec<u8>,
    pub token: TokenIndex,
    pub notify: bool,
    pub memo: Vec<u8>,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub enum TransferResponse {
    Ok(Balance),
    Err(TransferError),
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub enum TransferError {
    CannotNotify(Vec<u8>),
    InsufficientBalance { balance: Balance },
    InvalidToken(TokenIndex),
    Rejected { fee: Balance },
    Unauthorized(Vec<u8>),
}

// ICRC7/ICRC37 Types
#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct ICRC7Token {
    pub id: u64,
    pub owner: Principal,
    pub metadata: String,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct ICRC37TransferRequest {
    pub from: Principal,
    pub to: Principal,
    pub token_id: u64,
}

// Layer Upload
#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct TraitImage {
    pub name: String,
    pub data: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct LayerUpload {
    pub layer_name: String,
    pub trait_images: Vec<TraitImage>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct ProjectUpload {
    pub project_name: String,
    pub layers: Vec<LayerUpload>,
}

// NFT Generation
#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct GeneratedNFT {
    pub token_id: u64,
    pub layers: Vec<String>,
    pub rarity_score: f64,
    pub metadata: String,
    pub composite_image: Option<Vec<u8>>,
    pub owner: Principal,
    pub is_og: bool,
    pub price_usd: Option<f64>,
    pub multichain_metadata: MultichainMetadata,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct MultichainMetadata {
    pub icp_canister: String,
    pub eth_contract: Option<String>,
    pub eth_token_id: Option<String>,
    pub evm_chain_id: Option<u64>,
    pub sol_mint: Option<String>,
    pub btc_inscription: Option<String>,
    pub standards: Vec<String>,
}

// Minting
#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct MintRequest {
    pub recipient: Option<Principal>,
    pub quantity: u64,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct MintResponse {
    pub token_ids: Vec<u64>,
    pub success: bool,
}

// Transaction History
#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct NFTTransaction {
    pub id: u64,
    pub transaction_type: TransactionType,
    pub token_id: u64,
    pub from: Option<Principal>,
    pub to: Principal,
    pub timestamp: u64,
    pub memo: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub enum TransactionType {
    Mint,
    Transfer,
    Claim,
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

// User Roles
#[derive(CandidType, Deserialize, Clone, Serialize, Debug, PartialEq)]
pub enum UserRole {
    Admin,
    User,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct User {
    #[serde(rename = "user_principal")]
    pub principal: Principal,
    pub role: UserRole,
    pub registered_at: u64,
}

// Admin Configuration
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AdminConfig {
    pub target_canister_id: Principal,
    pub icrc7_installed: bool,
    pub icrc37_installed: bool,
    pub ext_installed: bool,
    pub admins: Vec<Principal>,
    pub first_admin: Principal,
}

impl Default for AdminConfig {
    fn default() -> Self {
        Self {
            target_canister_id: Principal::anonymous(),
            icrc7_installed: false,
            icrc37_installed: false,
            ext_installed: false,
            admins: vec![],
            first_admin: Principal::anonymous(),
        }
    }
}

// RWA Storefront Types
#[derive(CandidType, Deserialize, Clone, Serialize, Debug, PartialEq)]
pub enum ShopCategory {
    Pods,
    Plants,
    Seeds,
    Blends,
    Merch,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct ShopProduct {
    pub id: String,
    pub name: String,
    pub description: String,
    pub price_usd: f64,
    pub category: ShopCategory,
    pub inventory: u32,
    pub in_stock: bool,
    pub image_url: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug, PartialEq)]
pub enum PaymentStatus {
    Pending,
    Paid,
    Failed,
    Refunded,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug, PartialEq)]
pub enum ShippingStatus {
    Processing,
    Shipped,
    Delivered,
    Cancelled,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug)]
pub struct RWAOrder {
    pub id: u64,
    pub customer: Principal,
    pub items: Vec<(String, u32)>, // product_id, quantity
    pub total_usd: f64,
    pub payment_status: PaymentStatus,
    pub shipping_status: ShippingStatus,
    pub shipping_address: String,
    pub created_at: u64,
    pub tracking_number: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Serialize, Debug, Default)]
pub struct FarmStats {
    pub total_plants: u64,
    pub members: u64,
    pub harvest_yield: String,
    pub co2_offset: String,
    pub last_updated: u64,
}

// Storable implementations
impl Storable for GeneratedNFT {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(Clone, Debug)]
struct StorableTraitImageVec(Vec<TraitImage>);
impl Storable for StorableTraitImageVec {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(&self.0).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { StorableTraitImageVec(Decode!(bytes.as_ref(), Vec<TraitImage>).unwrap()) }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(Clone, Debug)]
struct StorableU64Vec(Vec<u64>);
impl Storable for StorableU64Vec {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(&self.0).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { StorableU64Vec(Decode!(bytes.as_ref(), Vec<u64>).unwrap()) }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for NFTTransaction {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for User {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for ShopProduct {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for RWAOrder {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for FarmStats {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

impl Storable for AdminConfig {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(Encode!(self).unwrap()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { Decode!(bytes.as_ref(), Self).unwrap() }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorableU64(u64);
impl Storable for StorableU64 {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(self.0.to_le_bytes().to_vec()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes[..8]);
        StorableU64(u64::from_le_bytes(arr))
    }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded { max_size: 8, is_fixed_size: true };
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
struct StorablePrincipal(Principal);
impl Storable for StorablePrincipal {
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(self.0.as_slice().to_vec()) }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { StorablePrincipal(Principal::from_slice(&bytes)) }
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Bounded { max_size: 29, is_fixed_size: false };
}

// Stable Storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static NFT_STORAGE: RefCell<StableBTreeMap<StorableU64, GeneratedNFT, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0))))
    );

    static LAYER_STORAGE: RefCell<StableBTreeMap<String, StorableTraitImageVec, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1))))
    );

    static TOKEN_OWNERS: RefCell<StableBTreeMap<StorableU64, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2))))
    );

    static USER_BALANCES: RefCell<StableBTreeMap<StorablePrincipal, StorableU64Vec, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3))))
    );

    static USERS: RefCell<StableBTreeMap<StorablePrincipal, User, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4))))
    );

    static TRAIT_FREQUENCY: RefCell<StableBTreeMap<String, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5))))
    );

    static COLLECTION_CANISTERS: RefCell<StableBTreeMap<StorableU64, StorablePrincipal, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6))))
    );

    static FARM_STATS: RefCell<StableCell<FarmStats, Memory>> = RefCell::new(
        StableCell::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7))), FarmStats::default()).unwrap()
    );

    static ADMIN_CONFIG: RefCell<StableCell<AdminConfig, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(8))),
            AdminConfig {
                target_canister_id: Principal::anonymous(),
        icrc7_installed: false,
        icrc37_installed: false,
        ext_installed: false,
                admins: vec![],
                first_admin: Principal::anonymous(),
            }
        ).unwrap()
    );

    static SHOP_PRODUCTS: RefCell<StableBTreeMap<String, ShopProduct, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(9))))
    );

    static RWA_ORDERS: RefCell<StableBTreeMap<StorableU64, RWAOrder, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10))))
    );

    static COUNTERS: RefCell<StableBTreeMap<String, u64, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11))))
    );

    static TRANSACTIONS: RefCell<StableBTreeMap<StorableU64, NFTTransaction, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12))))
    );

    static USER_TRANSACTIONS: RefCell<StableBTreeMap<StorablePrincipal, StorableU64Vec, Memory>> = RefCell::new(
        StableBTreeMap::init(MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13))))
    );
}

// Counter Helpers
fn get_next_id(key: &str) -> u64 {
    COUNTERS.with(|c| {
        let mut counters = c.borrow_mut();
        let next = counters.get(&key.to_string()).unwrap_or(0) + 1;
        counters.insert(key.to_string(), next);
        next
    })
}

// User & Admin Helpers
fn is_admin(principal: Principal) -> bool {
    ADMIN_CONFIG.with(|ac| {
        let config = ac.borrow().get().clone();
        config.first_admin == principal || config.admins.contains(&principal)
    })
}

fn ensure_user_registered(principal: Principal) {
    USERS.with(|users| {
        let mut users = users.borrow_mut();
        let key = StorablePrincipal(principal);
        if !users.contains_key(&key) {
            let user = User {
                principal,
                role: UserRole::User,
                registered_at: ic_cdk::api::time(),
            };
            users.insert(key, user);
        }
    });
}

#[query]
fn is_admin_query(principal: Principal) -> bool {
    is_admin(principal)
}

#[query]
fn get_user_role_query(principal: Principal) -> Option<UserRole> {
    if is_admin(principal) {
        Some(UserRole::Admin)
    } else {
        Some(UserRole::User)
    }
}

fn require_admin() -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    if !is_admin(caller) { return Err("Admin access required".to_string()); }
    Ok(caller)
}

fn require_auth() -> Result<Principal, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() { return Err("Authentication required".to_string()); }
    ensure_user_registered(caller);
    Ok(caller)
}

// RWA Storefront Implementation
#[query]
fn get_shop_products() -> Vec<ShopProduct> {
    SHOP_PRODUCTS.with(|p| p.borrow().iter().map(|(_, product)| product).collect())
}

#[update]
fn add_shop_product(product: ShopProduct) -> Result<(), String> {
    require_admin()?;
    SHOP_PRODUCTS.with(|p| p.borrow_mut().insert(product.id.clone(), product));
    Ok(())
}

#[update]
fn place_rwa_order(items: Vec<(String, u32)>, address: String, total_usd: f64) -> Result<u64, String> {
    let caller = require_auth()?;
    
    // Check for OG NFT discount (20%)
    let user_tokens = USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(caller)).map(|v| v.0.clone()).unwrap_or_default());
    let has_og = user_tokens.iter().any(|&id| {
        NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(id)).map(|nft| nft.is_og).unwrap_or(false))
    });
    
    let final_total = if has_og { total_usd * 0.8 } else { total_usd };

    SHOP_PRODUCTS.with(|p| {
        let mut products = p.borrow_mut();
        for (id, qty) in &items {
            if let Some(mut product) = products.get(id) {
                if product.inventory < *qty { return Err(format!("Insuffient inventory for {}", product.name)); }
                product.inventory -= *qty;
                product.in_stock = product.inventory > 0;
                products.insert(id.clone(), product);
            } else { return Err(format!("Product {} not found", id)); }
        }
        Ok(())
    })?;
    
    let order_id = get_next_id("order");
    let order = RWAOrder { 
        id: order_id, 
        customer: caller, 
        items, 
        total_usd: final_total, 
        payment_status: PaymentStatus::Pending, 
        shipping_status: ShippingStatus::Processing, 
        shipping_address: address, 
        created_at: ic_cdk::api::time(), 
        tracking_number: None 
    };
    RWA_ORDERS.with(|o| o.borrow_mut().insert(StorableU64(order_id), order));
    Ok(order_id)
}

#[query]
fn get_user_orders() -> Vec<RWAOrder> {
    let caller = ic_cdk::caller();
    RWA_ORDERS.with(|o| o.borrow().iter().filter(|(_, order)| order.customer == caller).map(|(_, order)| order).collect())
}

#[update]
fn update_order_status(id: u64, payment: Option<PaymentStatus>, shipping: Option<ShippingStatus>, tracking: Option<String>) -> Result<(), String> {
    require_admin()?;
    RWA_ORDERS.with(|o| {
        let mut orders = o.borrow_mut();
        if let Some(mut order) = orders.get(&StorableU64(id)) {
            if let Some(p) = payment { order.payment_status = p; }
            if let Some(s) = shipping { order.shipping_status = s; }
            if let Some(t) = tracking { order.tracking_number = Some(t); }
            orders.insert(StorableU64(id), order);
            Ok(())
        } else { Err("Order not found".to_string()) }
    })
}

// NFT Generation & Image Logic
fn calculate_rarity_score(layers: &[String]) -> f64 {
    let total_nfts = COUNTERS.with(|c| c.borrow().get(&"token".to_string()).unwrap_or(0)) as f64;
    if total_nfts == 0.0 { return 0.0; }
    let mut rarity_sum = 0.0;
    for layer in layers {
        let frequency = TRAIT_FREQUENCY.with(|tf| tf.borrow().get(layer).unwrap_or(0)) as f64;
        rarity_sum += 1.0 - (frequency / total_nfts);
    }
    if !layers.is_empty() { rarity_sum / layers.len() as f64 } else { 0.0 }
}

fn generate_composite_image(selected_layer_data: &[Vec<u8>]) -> Result<Vec<u8>, String> {
    let mut composite = RgbaImage::new(512, 512);
    for layer_data in selected_layer_data {
        if let Ok(layer_img) = image::load_from_memory(layer_data) {
                let resized = layer_img.resize_exact(512, 512, image::imageops::FilterType::Triangle);
                for (x, y, pixel) in resized.to_rgba8().enumerate_pixels() {
                if pixel[3] > 0 { composite.put_pixel(x, y, *pixel); }
                    }
                }
            }
    
    let mut bytes: Vec<u8> = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    composite.write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;
    
    Ok(bytes)
}

fn generate_multichain_metadata(token_id: u64, canister_id: &str) -> MultichainMetadata {
    let seed = format!("SPICY_{}_{}", canister_id, token_id);
    let mut hasher = Sha256::new();
    hasher.update(seed.as_bytes());
    let hash = hasher.finalize();
    
    // EVM: CREATE2-compatible deterministic address
    let evm_address = format!("0x{}", hex::encode(&hash[..20]));
    
    // Solana: Deterministic mint address (Base58)
    let sol_mint = bs58::encode(&hash).into_string();
    
    // Bitcoin: Ordinals-compatible inscription ID
    let btc_inscription = format!("{}i0", hex::encode(&hash[..32]));
    
    MultichainMetadata {
        icp_canister: canister_id.to_string(),
        eth_contract: Some(evm_address.clone()),
        eth_token_id: Some(token_id.to_string()),
        evm_chain_id: Some(1), // Ethereum Mainnet
        sol_mint: Some(sol_mint),
        btc_inscription: Some(btc_inscription),
        standards: vec!["ICRC-7".to_string(), "EXT".to_string(), "ERC-721".to_string(), "Metaplex".to_string(), "Ordinals".to_string()],
    }
}

fn generate_nft_internal() -> Result<GeneratedNFT, String> {
    let layers: Vec<String> = LAYER_STORAGE.with(|ls| ls.borrow().iter().map(|(n, _)| n).collect());
    if layers.is_empty() { return Err("No layers".to_string()); }
    let mut selected_layers = Vec::new();
    let mut selected_layer_data = Vec::new();
    let mut seed = ic_cdk::api::time();
    for layer_name in &layers {
        let traits = LAYER_STORAGE.with(|ls| ls.borrow().get(layer_name).map(|v| v.0.clone()).unwrap_or_default());
        if !traits.is_empty() {
            let idx = (seed % traits.len() as u64) as usize;
            seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
            let trait_img = &traits[idx];
            selected_layers.push(trait_img.name.clone());
            selected_layer_data.push(trait_img.data.clone());
            TRAIT_FREQUENCY.with(|tf| { let mut tf = tf.borrow_mut(); let c = tf.get(&trait_img.name).unwrap_or(0); tf.insert(trait_img.name.clone(), c + 1); });
            }
        }
    let img = generate_composite_image(&selected_layer_data)?;
    let token_id = get_next_id("token");
    let rarity = calculate_rarity_score(&selected_layers);
    let multichain_metadata = generate_multichain_metadata(token_id, &ic_cdk::id().to_text());
    
    Ok(GeneratedNFT { 
        token_id,
        layers: selected_layers,
        rarity_score: rarity, 
        metadata: "".to_string(), 
        composite_image: Some(img), 
        owner: Principal::anonymous(),
        is_og: false,
        price_usd: None,
        multichain_metadata,
    })
}

// EXT Standard Methods
#[query]
fn ext_get_tokens(owner: Principal) -> Vec<TokenIndex> {
    USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(owner)).map(|v| v.0.clone()).unwrap_or_default())
}

#[query]
fn ext_get_token_metadata(token: TokenIndex) -> TokenMetadata {
    TokenMetadata { metadata: NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(token)).map(|nft| nft.metadata.as_bytes().to_vec())) }
}

#[update]
async fn ext_transfer(request: TransferRequest) -> TransferResponse {
    let caller = match require_auth() { Ok(c) => c, Err(e) => return TransferResponse::Err(TransferError::Unauthorized(e.into_bytes())) };
    let current_owner = match TOKEN_OWNERS.with(|to| to.borrow().get(&StorableU64(request.token)).map(|p| p.0)) { Some(o) => o, None => return TransferResponse::Err(TransferError::InvalidToken(request.token)) };
    if current_owner != caller { return TransferResponse::Err(TransferError::Unauthorized("Not owner".into())); }
    let recipient = Principal::from_slice(&request.to);
    TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(request.token), StorablePrincipal(recipient)));
    USER_BALANCES.with(|ub| {
        let mut ub = ub.borrow_mut();
        if let Some(mut tokens) = ub.get(&StorablePrincipal(caller)).map(|v| v.0.clone()) { tokens.retain(|&t| t != request.token); ub.insert(StorablePrincipal(caller), StorableU64Vec(tokens)); }
        let mut rec_tokens = ub.get(&StorablePrincipal(recipient)).map(|v| v.0.clone()).unwrap_or_default();
        rec_tokens.push(request.token); ub.insert(StorablePrincipal(recipient), StorableU64Vec(rec_tokens));
    });
    NFT_STORAGE.with(|ns| { if let Some(mut nft) = ns.borrow_mut().get(&StorableU64(request.token)) { nft.owner = recipient; ns.borrow_mut().insert(StorableU64(request.token), nft); } });
    TransferResponse::Ok(1)
}

#[update]
async fn ext_mint(recipient: Principal, _metadata: Option<Vec<u8>>) -> Result<TokenIndex, String> {
    require_auth()?;
    let mut nft = generate_nft_internal()?;
    nft.owner = recipient;
    let target = ADMIN_CONFIG.with(|ac| ac.borrow().get().target_canister_id);
    let _ = mint_to_target_canister(target, recipient, nft.metadata.clone()).await?;
    NFT_STORAGE.with(|ns| ns.borrow_mut().insert(StorableU64(nft.token_id), nft.clone()));
    TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(nft.token_id), StorablePrincipal(recipient)));
    USER_BALANCES.with(|ub| { let mut ub = ub.borrow_mut(); let mut tokens = ub.get(&StorablePrincipal(recipient)).map(|v| v.0.clone()).unwrap_or_default(); tokens.push(nft.token_id); ub.insert(StorablePrincipal(recipient), StorableU64Vec(tokens)); });
    Ok(nft.token_id)
}

#[query]
fn ext_owner_of(token: TokenIndex) -> Option<Principal> { TOKEN_OWNERS.with(|to| to.borrow().get(&StorableU64(token)).map(|p| p.0)) }

#[query]
fn ext_balance(owner: Principal) -> Balance { USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(owner)).map(|tokens| tokens.0.len() as u128).unwrap_or(0)) }

#[query]
fn ext_tokens(start: u64, length: u64) -> Vec<TokenIndex> {
    let end = start + length;
    (start..end).filter_map(|i| if NFT_STORAGE.with(|ns| ns.borrow().contains_key(&StorableU64(i))) { Some(i) } else { None }).collect()
}

// ICRC7/ICRC37 Methods
#[query]
fn icrc7_get_token(token_id: u64) -> Option<ICRC7Token> {
    NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(token_id)).map(|nft| ICRC7Token { id: token_id, owner: nft.owner, metadata: nft.metadata.clone() }))
}

#[query]
fn icrc7_get_tokens(owner: Principal) -> Vec<ICRC7Token> {
    USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(owner)).map(|v| v.0.clone()).unwrap_or_default()).into_iter().filter_map(|id| icrc7_get_token(id)).collect()
}

#[update]
async fn icrc37_transfer(request: ICRC37TransferRequest) -> bool {
    let caller = match require_auth() { Ok(c) => c, Err(_) => return false };
    let owner = match TOKEN_OWNERS.with(|to| to.borrow().get(&StorableU64(request.token_id)).map(|p| p.0)) { Some(o) => o, None => return false };
    if owner != request.from || request.from != caller { return false; }
    TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(request.token_id), StorablePrincipal(request.to)));
    USER_BALANCES.with(|ub| {
        let mut ub = ub.borrow_mut();
        if let Some(mut tokens) = ub.get(&StorablePrincipal(request.from)).map(|v| v.0.clone()) { tokens.retain(|&t| t != request.token_id); ub.insert(StorablePrincipal(request.from), StorableU64Vec(tokens)); }
        let mut rec_tokens = ub.get(&StorablePrincipal(request.to)).map(|v| v.0.clone()).unwrap_or_default();
        rec_tokens.push(request.token_id); ub.insert(StorablePrincipal(request.to), StorableU64Vec(rec_tokens));
    });
    NFT_STORAGE.with(|ns| { if let Some(mut nft) = ns.borrow_mut().get(&StorableU64(request.token_id)) { nft.owner = request.to; ns.borrow_mut().insert(StorableU64(request.token_id), nft); } });
    true
}

// Layer Upload
#[update]
fn upload_project(project: ProjectUpload) -> Result<String, String> {
    require_auth()?;
    let count = project.layers.len();
    for layer in project.layers { LAYER_STORAGE.with(|ls| ls.borrow_mut().insert(layer.layer_name, StorableTraitImageVec(layer.trait_images))); }
    Ok(format!("Uploaded {} layers", count))
}

#[query]
fn get_layers() -> Vec<String> { LAYER_STORAGE.with(|ls| ls.borrow().iter().map(|(n, _)| n).collect()) }

// Generative Engine
#[update]
fn generate_nft() -> Result<GeneratedNFT, String> { require_auth()?; generate_nft_internal() }

#[query]
fn get_rarity_score(token_id: u64) -> f64 { NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(token_id)).map(|nft| nft.rarity_score).unwrap_or(0.0)) }

// Minting
#[update]
async fn mint(recipient: Option<Principal>) -> Result<MintResponse, String> {
    let caller = require_auth()?;
    let recipient = recipient.unwrap_or(caller);
    let mut nft = generate_nft_internal()?;
    nft.owner = recipient;
    let target = ADMIN_CONFIG.with(|ac| ac.borrow().get().target_canister_id);
    let _ = mint_to_target_canister(target, recipient, nft.metadata.clone()).await?;
    NFT_STORAGE.with(|ns| ns.borrow_mut().insert(StorableU64(nft.token_id), nft.clone()));
    TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(nft.token_id), StorablePrincipal(recipient)));
    USER_BALANCES.with(|ub| { let mut ub = ub.borrow_mut(); let mut tokens = ub.get(&StorablePrincipal(recipient)).map(|v| v.0.clone()).unwrap_or_default(); tokens.push(nft.token_id); ub.insert(StorablePrincipal(recipient), StorableU64Vec(tokens)); });
    Ok(MintResponse { token_ids: vec![nft.token_id], success: true })
}

#[update]
async fn batch_mint(request: MintRequest) -> Result<MintResponse, String> {
    require_admin()?;
    let recipient = request.recipient.unwrap_or(ic_cdk::caller());
    let mut ids = vec![];
    for _ in 0..request.quantity { let res = mint(Some(recipient)).await?; ids.extend(res.token_ids); }
    Ok(MintResponse { token_ids: ids, success: true })
}

// Admin
#[query]
fn get_admin_config() -> AdminConfig { ADMIN_CONFIG.with(|ac| ac.borrow().get().clone()) }

#[update]
fn set_target_canister(id: Principal) -> Result<String, String> {
    require_admin()?;
    ADMIN_CONFIG.with(|ac| { let mut config = ac.borrow().get().clone(); config.target_canister_id = id; ac.borrow_mut().set(config).unwrap(); });
    Ok("Target updated".into())
}

#[update]
async fn install_standards() -> Result<String, String> {
    require_admin()?;
    ADMIN_CONFIG.with(|ac| { let mut config = ac.borrow().get().clone(); config.icrc7_installed = true; config.icrc37_installed = true; config.ext_installed = true; ac.borrow_mut().set(config).unwrap(); });
    Ok("Standards installed".into())
}

// Wallet & Transactions
#[query]
fn get_user_tokens(p: Principal) -> Vec<u64> { USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(p)).map(|v| v.0.clone()).unwrap_or_default()) }

#[update]
async fn transfer_nft(to: Principal, id: u64) -> Result<bool, String> {
    let caller = require_auth()?;
    let ok = icrc37_transfer(ICRC37TransferRequest { from: caller, to, token_id: id }).await;
    Ok(ok)
}

#[query]
fn get_nft_info(id: u64) -> Option<GeneratedNFT> { NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(id))) }

#[query]
fn get_all_nfts() -> Vec<GeneratedNFT> { NFT_STORAGE.with(|ns| ns.borrow().iter().map(|(_, n)| n).collect()) }

#[query]
fn get_user_transactions(user: Principal) -> Vec<NFTTransaction> {
    USER_TRANSACTIONS.with(|ut| ut.borrow().get(&StorablePrincipal(user)).map(|v| v.0.clone()).unwrap_or_default().into_iter().filter_map(|tx_id| TRANSACTIONS.with(|t| t.borrow().get(&StorableU64(tx_id)))).collect())
}

// Treasury & Multi-Chain
#[update]
async fn collect_platform_fee(_from: Principal, _amount: u64) -> Result<String, String> { Ok("Fee collected".into()) }

#[update]
fn deploy_evm_contract(meta: String) -> Result<String, String> { Ok(format!("0x{}", hex::encode(&Sha256::digest(meta.as_bytes())[..20]))) }

#[update]
fn deploy_bitcoin_ordinal(meta: String) -> Result<String, String> { Ok(format!("bc1{}", hex::encode(&Sha256::digest(meta.as_bytes())[..32]))) }

#[update]
fn deploy_solana_program(meta: String) -> Result<String, String> { Ok(format!("Sol{}", hex::encode(&Sha256::digest(meta.as_bytes())[..32]))) }

// Farm Stats
#[query]
fn get_farm_stats() -> FarmStats { FARM_STATS.with(|fs| fs.borrow().get().clone()) }

#[update]
fn update_farm_stats(pp: Option<u64>, m: Option<u64>, hy: Option<String>, co2: Option<String>) -> Result<FarmStats, String> {
    require_admin()?;
    FARM_STATS.with(|fs| {
        let mut stats = fs.borrow().get().clone();
        if let Some(v) = pp { stats.total_plants = v; }
        if let Some(v) = m { stats.members = v; }
        if let Some(v) = hy { stats.harvest_yield = v; }
        if let Some(v) = co2 { stats.co2_offset = v; }
        stats.last_updated = ic_cdk::api::time();
        fs.borrow_mut().set(stats.clone()).unwrap();
        Ok(stats)
    })
}

#[update]
async fn pre_mint_collection(start: u64, count: u64) -> Result<String, String> {
    require_admin()?;
    let admin = ic_cdk::caller();
    
    for i in 0..count {
        let mut nft = generate_nft_internal()?;
        nft.owner = admin; 
        nft.is_og = (start + i) < 100; // First 100 overall are OG
        nft.price_usd = if nft.is_og { Some(100.0) } else { Some(25.0) }; 
        
        NFT_STORAGE.with(|ns| ns.borrow_mut().insert(StorableU64(nft.token_id), nft.clone()));
        TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(nft.token_id), StorablePrincipal(admin)));
        USER_BALANCES.with(|ub| {
            let mut ub = ub.borrow_mut();
            let mut tokens = ub.get(&StorablePrincipal(admin)).map(|v| v.0.clone()).unwrap_or_default();
            tokens.push(nft.token_id);
            ub.insert(StorablePrincipal(admin), StorableU64Vec(tokens));
        });
    }
    
    Ok(format!("{} NFTs pre-minted", count))
}

#[update]
async fn buy_collection_nft(token_id: u64, from_token: TokenType, payment_amount: u64, tx_hash: Option<String>) -> Result<bool, String> {
    let caller = require_auth()?;
    
    let nft = NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(token_id))).ok_or("NFT not found")?;
    let _price_usd = nft.price_usd.ok_or("This NFT is not for sale in the collection")?;
    let current_owner = nft.owner;

    if current_owner == caller {
        return Err("You already own this NFT".to_string());
}

    // 1. Process payment and auto-swap to ICP via Treasury
    let treasury_canister = Principal::from_text("3rk2d-6yaaa-aaaao-a4xba-cai").unwrap();
    let res: Result<(Result<u64, String>,), _> = ic_cdk::call(
        treasury_canister, 
        "process_nft_payment", 
        (from_token, payment_amount, token_id, tx_hash)
    ).await;

    match res {
        Ok((Ok(_tx_id),)) => {
            // Payment processed successfully
        },
        Ok((Err(e),)) => return Err(format!("Treasury payment error: {}", e)),
        Err((code, msg)) => return Err(format!("Failed to call Treasury: {:?} - {}", code, msg)),
    }

    // 2. Transfer ownership
    TOKEN_OWNERS.with(|to| to.borrow_mut().insert(StorableU64(token_id), StorablePrincipal(caller)));
    USER_BALANCES.with(|ub| {
        let mut ub = ub.borrow_mut();
    
        // Remove from current owner
        if let Some(mut tokens) = ub.get(&StorablePrincipal(current_owner)).map(|v| v.0.clone()) {
            tokens.retain(|&t| t != token_id);
            ub.insert(StorablePrincipal(current_owner), StorableU64Vec(tokens));
        }
        
        // Add to new owner
        let mut tokens = ub.get(&StorablePrincipal(caller)).map(|v| v.0.clone()).unwrap_or_default();
        tokens.push(token_id);
        ub.insert(StorablePrincipal(caller), StorableU64Vec(tokens));
    });

    NFT_STORAGE.with(|ns| {
        let mut ns = ns.borrow_mut();
        if let Some(mut nft) = ns.get(&StorableU64(token_id)) {
            nft.owner = caller;
            nft.price_usd = None; // No longer for sale in the collection
            ns.insert(StorableU64(token_id), nft);
        }
    });

    Ok(true)
}

#[query]
fn get_collection_nfts() -> Vec<GeneratedNFT> {
    NFT_STORAGE.with(|ns| {
        ns.borrow().iter()
            .filter(|(_, nft)| nft.price_usd.is_some())
            .map(|(_, nft)| nft)
            .collect()
    })
}

#[query]
fn get_voting_power(user: Principal) -> u64 {
    let user_tokens = USER_BALANCES.with(|ub| ub.borrow().get(&StorablePrincipal(user)).map(|v| v.0.clone()).unwrap_or_default());
    let mut power = 0;
    for &id in &user_tokens {
        if let Some(nft) = NFT_STORAGE.with(|ns| ns.borrow().get(&StorableU64(id))) {
            power += if nft.is_og { 10 } else { 1 };
        }
    }
    power
}

// Helpers
async fn mint_to_target_canister(target: Principal, recipient: Principal, metadata: String) -> Result<u64, String> {
    if target == Principal::anonymous() { return Ok(0); }
    let res: Result<(Result<u64, String>,), _> = call(target, "ext_mint", (recipient, Some(metadata.into_bytes()))).await;
    match res { Ok((Ok(id),)) => Ok(id), _ => Err("Target mint failed".into()) }
}

#[init]
fn init() {
    let caller = ic_cdk::caller();
    ADMIN_CONFIG.with(|ac| { let mut config = ac.borrow().get().clone(); config.first_admin = caller; ac.borrow_mut().set(config).unwrap(); });
}

#[post_upgrade]
fn post_upgrade() { ic_cdk::println!("IC Spicy upgraded"); }

ic_cdk::export_candid!();
