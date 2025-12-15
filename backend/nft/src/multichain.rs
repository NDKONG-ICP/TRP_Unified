//! Multi-Chain NFT Standards Implementation
//! Supports ICP (ICRC-7, ICRC-37, EXT), EVM (ERC-721, ERC-1155), 
//! Bitcoin (Ordinals, BRC-20), Solana (Metaplex), SUI, TRON (TRC-721), Avalanche

use candid::{CandidType, Decode, Encode, Principal};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported blockchain networks for NFT minting
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
pub enum Chain {
    // Internet Computer
    ICP,
    
    // Ethereum and EVM-compatible
    Ethereum,
    Polygon,
    Arbitrum,
    Optimism,
    Base,
    Avalanche,
    BNBChain,
    
    // Bitcoin
    Bitcoin,
    
    // Solana
    Solana,
    
    // Other L1s
    SUI,
    TRON,
    Aptos,
    Near,
    
    // Custom/Test
    Custom(String),
}

impl std::fmt::Display for Chain {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Chain::ICP => write!(f, "ICP"),
            Chain::Ethereum => write!(f, "ETH"),
            Chain::Polygon => write!(f, "MATIC"),
            Chain::Arbitrum => write!(f, "ARB"),
            Chain::Optimism => write!(f, "OP"),
            Chain::Base => write!(f, "BASE"),
            Chain::Avalanche => write!(f, "AVAX"),
            Chain::BNBChain => write!(f, "BNB"),
            Chain::Bitcoin => write!(f, "BTC"),
            Chain::Solana => write!(f, "SOL"),
            Chain::SUI => write!(f, "SUI"),
            Chain::TRON => write!(f, "TRX"),
            Chain::Aptos => write!(f, "APT"),
            Chain::Near => write!(f, "NEAR"),
            Chain::Custom(name) => write!(f, "{}", name),
        }
    }
}

/// NFT Standard types supported across chains
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum NFTStandard {
    // ICP Standards
    ICRC7,      // ICP NFT Standard
    ICRC37,     // ICP NFT Approval Standard
    EXT,        // Entrepot NFT Standard
    Origyn,     // Origyn NFT Standard
    
    // EVM Standards
    ERC721,     // Ethereum NFT Standard
    ERC1155,    // Ethereum Multi-Token Standard
    
    // Bitcoin Standards
    Ordinals,   // Bitcoin Ordinals (Inscriptions)
    BRC20,      // Bitcoin BRC-20 Tokens
    Runes,      // Bitcoin Runes Protocol
    
    // Solana Standards
    Metaplex,   // Solana Metaplex NFT Standard
    
    // SUI Standards
    SUIObject,  // SUI Object-based NFTs
    
    // TRON Standards
    TRC721,     // TRON NFT Standard
    
    // Avalanche Standards
    ERC721Avalanche,  // Avalanche C-Chain NFT
    
    // Aptos Standards
    AptosToken, // Aptos Token Standard
    
    // Custom
    Custom(String),
}

/// Multi-chain NFT metadata following common standards
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainMetadata {
    // Core metadata (all chains)
    pub name: String,
    pub description: String,
    pub image: String,                    // IPFS URI or on-chain blob
    pub external_url: Option<String>,
    
    // Collection info
    pub collection_name: String,
    pub collection_id: String,
    
    // Attributes/Traits (OpenSea compatible)
    pub attributes: Vec<NFTAttribute>,
    
    // Rarity info
    pub rarity_score: Option<f64>,
    pub rarity_rank: Option<u32>,
    
    // Chain-specific metadata
    pub chain_specific: HashMap<String, String>,
    
    // Animation/Media
    pub animation_url: Option<String>,
    pub background_color: Option<String>,
    
    // Creator info
    pub creator: String,
    pub royalty_bps: u16,               // Basis points (100 = 1%)
    
    // Timestamps
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NFTAttribute {
    pub trait_type: String,
    pub value: String,
    pub display_type: Option<String>,   // "number", "boost_percentage", "date", etc.
    pub max_value: Option<u64>,
}

/// Multi-chain address representation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainAddress {
    pub chain: Chain,
    pub address: String,
    pub address_type: AddressType,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum AddressType {
    Principal,      // ICP Principal
    AccountId,      // ICP Account Identifier
    EVM,            // 0x... addresses
    Bitcoin,        // bc1... or 1... or 3...
    Solana,         // Base58 addresses
    SUI,            // 0x... (64 chars)
    TRON,           // T... addresses
    Custom(String),
}

/// Multi-chain NFT token representation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainNFT {
    // Unique identifier
    pub global_id: String,              // UUID across all chains
    
    // Chain-specific identifiers
    pub chain_ids: HashMap<String, ChainTokenId>,
    
    // Metadata
    pub metadata: MultiChainMetadata,
    
    // Ownership
    pub owner: MultiChainAddress,
    pub approved: Option<MultiChainAddress>,
    
    // Status
    pub status: NFTStatus,
    pub minted_chains: Vec<Chain>,
    pub pending_chains: Vec<Chain>,
    
    // Bridging info
    pub bridge_status: Option<BridgeStatus>,
    
    // Timestamps
    pub created_at: u64,
    pub last_transfer: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChainTokenId {
    pub chain: Chain,
    pub standard: NFTStandard,
    pub contract_address: Option<String>,
    pub token_id: String,
    pub inscription_id: Option<String>,  // For Bitcoin Ordinals
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum NFTStatus {
    Pending,
    Minting,
    Minted,
    Transferring,
    Burning,
    Burned,
    Bridging,
    Error(String),
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct BridgeStatus {
    pub source_chain: Chain,
    pub target_chain: Chain,
    pub status: BridgeState,
    pub tx_hash: Option<String>,
    pub started_at: u64,
    pub completed_at: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum BridgeState {
    Initiated,
    SourceLocked,
    TargetMinting,
    Completed,
    Failed(String),
}

/// EVM-specific NFT configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EVMNFTConfig {
    pub chain: Chain,
    pub contract_address: String,
    pub standard: NFTStandard,
    pub rpc_url: String,
    pub chain_id: u64,
    pub gas_price_gwei: Option<u64>,
}

/// Bitcoin Ordinals configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct OrdinalsConfig {
    pub inscription_type: InscriptionType,
    pub content_type: String,           // MIME type
    pub parent_inscription: Option<String>,
    pub metaprotocol: Option<String>,   // BRC-20, Runes, etc.
    pub delegate: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum InscriptionType {
    Text,
    Image,
    HTML,
    JSON,
    Custom(String),
}

/// Solana Metaplex configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MetaplexConfig {
    pub collection_mint: Option<String>,
    pub uses: Option<MetaplexUses>,
    pub creators: Vec<MetaplexCreator>,
    pub seller_fee_basis_points: u16,
    pub is_mutable: bool,
    pub primary_sale_happened: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MetaplexUses {
    pub use_method: String,             // "burn", "multiple", "single"
    pub remaining: u64,
    pub total: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MetaplexCreator {
    pub address: String,
    pub verified: bool,
    pub share: u8,
}

/// SUI NFT configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct SUIConfig {
    pub package_id: String,
    pub module_name: String,
    pub object_type: String,
    pub display_fields: HashMap<String, String>,
}

/// TRON TRC-721 configuration
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TRONConfig {
    pub contract_address: String,       // T... format
    pub energy_limit: u64,
    pub fee_limit: u64,
}

/// Mint request for multi-chain NFT
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainMintRequest {
    pub metadata: MultiChainMetadata,
    pub target_chains: Vec<ChainMintConfig>,
    pub recipient: MultiChainAddress,
    pub options: MintOptions,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChainMintConfig {
    pub chain: Chain,
    pub standard: NFTStandard,
    pub config: ChainConfig,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ChainConfig {
    ICP { canister_id: Option<String> },
    EVM(EVMNFTConfig),
    Bitcoin(OrdinalsConfig),
    Solana(MetaplexConfig),
    SUI(SUIConfig),
    TRON(TRONConfig),
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MintOptions {
    pub batch_id: Option<String>,
    pub priority: MintPriority,
    pub callback_url: Option<String>,
    pub metadata_storage: MetadataStorage,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum MintPriority {
    Low,
    Normal,
    High,
    Urgent,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum MetadataStorage {
    OnChain,
    IPFS,
    Arweave,
    Hybrid,
}

/// Multi-chain mint result
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainMintResult {
    pub global_id: String,
    pub chain_results: Vec<ChainMintResult>,
    pub status: MintResultStatus,
    pub total_cost: MintCost,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChainMintResult {
    pub chain: Chain,
    pub standard: NFTStandard,
    pub success: bool,
    pub token_id: Option<String>,
    pub contract_address: Option<String>,
    pub tx_hash: Option<String>,
    pub error: Option<String>,
    pub cost: Option<ChainCost>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum MintResultStatus {
    AllSucceeded,
    PartialSuccess,
    AllFailed,
    Pending,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MintCost {
    pub total_usd: f64,
    pub chain_costs: Vec<ChainCost>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ChainCost {
    pub chain: Chain,
    pub native_amount: String,
    pub native_symbol: String,
    pub usd_equivalent: f64,
}

/// ICRC-7 Token type (ICP NFT Standard)
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ICRC7Token {
    pub id: u128,
    pub owner: Principal,
    pub metadata: Vec<(String, ICRC7Value)>,
    pub memo: Option<Vec<u8>>,
    pub created_at: u64,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ICRC7Value {
    Nat(u128),
    Int(i128),
    Text(String),
    Blob(Vec<u8>),
    Array(Vec<ICRC7Value>),
    Map(Vec<(String, ICRC7Value)>),
}

/// EXT Token type (Entrepot Standard)
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct EXTToken {
    pub index: u32,
    pub owner: Principal,
    pub metadata: Option<Vec<u8>>,
}

/// Transfer request for multi-chain NFT
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MultiChainTransferRequest {
    pub global_id: String,
    pub from: MultiChainAddress,
    pub to: MultiChainAddress,
    pub chain: Chain,
    pub memo: Option<Vec<u8>>,
}

/// Transfer result
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TransferResult {
    pub success: bool,
    pub tx_hash: Option<String>,
    pub error: Option<String>,
    pub new_owner: Option<MultiChainAddress>,
}

/// Marketplace listing for multi-chain NFT
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct MarketplaceListing {
    pub global_id: String,
    pub seller: MultiChainAddress,
    pub price: ListingPrice,
    pub chain: Chain,
    pub status: ListingStatus,
    pub created_at: u64,
    pub expires_at: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ListingPrice {
    pub amount: String,
    pub currency: String,
    pub usd_equivalent: Option<f64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ListingStatus {
    Active,
    Sold,
    Cancelled,
    Expired,
}

/// Helper functions for chain validation
impl Chain {
    pub fn is_evm(&self) -> bool {
        matches!(
            self,
            Chain::Ethereum
                | Chain::Polygon
                | Chain::Arbitrum
                | Chain::Optimism
                | Chain::Base
                | Chain::Avalanche
                | Chain::BNBChain
        )
    }

    pub fn native_token(&self) -> &str {
        match self {
            Chain::ICP => "ICP",
            Chain::Ethereum => "ETH",
            Chain::Polygon => "MATIC",
            Chain::Arbitrum => "ETH",
            Chain::Optimism => "ETH",
            Chain::Base => "ETH",
            Chain::Avalanche => "AVAX",
            Chain::BNBChain => "BNB",
            Chain::Bitcoin => "BTC",
            Chain::Solana => "SOL",
            Chain::SUI => "SUI",
            Chain::TRON => "TRX",
            Chain::Aptos => "APT",
            Chain::Near => "NEAR",
            Chain::Custom(_) => "UNKNOWN",
        }
    }

    pub fn default_standard(&self) -> NFTStandard {
        match self {
            Chain::ICP => NFTStandard::ICRC7,
            Chain::Ethereum
            | Chain::Polygon
            | Chain::Arbitrum
            | Chain::Optimism
            | Chain::Base
            | Chain::BNBChain => NFTStandard::ERC721,
            Chain::Avalanche => NFTStandard::ERC721Avalanche,
            Chain::Bitcoin => NFTStandard::Ordinals,
            Chain::Solana => NFTStandard::Metaplex,
            Chain::SUI => NFTStandard::SUIObject,
            Chain::TRON => NFTStandard::TRC721,
            Chain::Aptos => NFTStandard::AptosToken,
            Chain::Near => NFTStandard::Custom("NEP-171".to_string()),
            Chain::Custom(_) => NFTStandard::Custom("Unknown".to_string()),
        }
    }
}

/// Validate address format for a specific chain
pub fn validate_address(chain: &Chain, address: &str) -> Result<(), String> {
    match chain {
        Chain::ICP => {
            if address.len() < 10 || address.len() > 64 {
                return Err("Invalid ICP principal/account format".to_string());
            }
            Ok(())
        }
        Chain::Ethereum
        | Chain::Polygon
        | Chain::Arbitrum
        | Chain::Optimism
        | Chain::Base
        | Chain::Avalanche
        | Chain::BNBChain => {
            if !address.starts_with("0x") || address.len() != 42 {
                return Err("Invalid EVM address format".to_string());
            }
            Ok(())
        }
        Chain::Bitcoin => {
            if !address.starts_with("bc1")
                && !address.starts_with('1')
                && !address.starts_with('3')
            {
                return Err("Invalid Bitcoin address format".to_string());
            }
            Ok(())
        }
        Chain::Solana => {
            if address.len() < 32 || address.len() > 44 {
                return Err("Invalid Solana address format".to_string());
            }
            Ok(())
        }
        Chain::SUI => {
            if !address.starts_with("0x") || address.len() != 66 {
                return Err("Invalid SUI address format".to_string());
            }
            Ok(())
        }
        Chain::TRON => {
            if !address.starts_with('T') || address.len() != 34 {
                return Err("Invalid TRON address format".to_string());
            }
            Ok(())
        }
        _ => Ok(()),
    }
}






