//! NFT Controller Module
//! Ensures application canisters maintain controller access to all minted NFTs
//! for continuous updates and customer service support

use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

/// Controller configuration for NFT canisters
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ControllerConfig {
    /// Primary admin principals with full control
    pub admin_principals: Vec<Principal>,
    
    /// Backend canister IDs that should be controllers
    pub backend_canisters: Vec<Principal>,
    
    /// Frontend asset canister ID
    pub frontend_canister: Option<Principal>,
    
    /// Whether to automatically add application canisters as controllers
    pub auto_add_app_controllers: bool,
    
    /// Whether the original minter retains controller access
    pub minter_retains_control: bool,
}

impl Default for ControllerConfig {
    fn default() -> Self {
        Self {
            admin_principals: Vec::new(),
            backend_canisters: Vec::new(),
            frontend_canister: None,
            auto_add_app_controllers: true,
            minter_retains_control: true,
        }
    }
}

/// Controller record for an NFT
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct NFTControllerRecord {
    pub token_id: u64,
    pub canister_id: Option<Principal>,
    pub controllers: Vec<Principal>,
    pub owner: Principal,
    pub created_at: u64,
    pub last_updated: u64,
}

/// Management canister interface for controller operations
pub mod management {
    use candid::{CandidType, Principal};
    use serde::{Deserialize, Serialize};

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct CanisterSettings {
        pub controllers: Option<Vec<Principal>>,
        pub compute_allocation: Option<u128>,
        pub memory_allocation: Option<u128>,
        pub freezing_threshold: Option<u128>,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct UpdateSettingsArgs {
        pub canister_id: Principal,
        pub settings: CanisterSettings,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct CreateCanisterArgs {
        pub settings: Option<CanisterSettings>,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct CanisterIdRecord {
        pub canister_id: Principal,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct CanisterStatusArgs {
        pub canister_id: Principal,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct CanisterStatusResponse {
        pub status: CanisterStatus,
        pub settings: DefiniteCanisterSettings,
        pub module_hash: Option<Vec<u8>>,
        pub memory_size: u128,
        pub cycles: u128,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub enum CanisterStatus {
        #[serde(rename = "running")]
        Running,
        #[serde(rename = "stopping")]
        Stopping,
        #[serde(rename = "stopped")]
        Stopped,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
    pub struct DefiniteCanisterSettings {
        pub controllers: Vec<Principal>,
        pub compute_allocation: u128,
        pub memory_allocation: u128,
        pub freezing_threshold: u128,
    }

    /// Get the management canister principal
    pub fn management_canister() -> Principal {
        Principal::from_text("aaaaa-aa").unwrap()
    }
}

/// Build the list of controllers for a new NFT canister
pub fn build_controller_list(
    config: &ControllerConfig,
    owner: Principal,
    this_canister: Principal,
) -> Vec<Principal> {
    let mut controllers = Vec::new();
    
    // Always include this canister (the minting canister)
    controllers.push(this_canister);
    
    // Add admin principals
    for admin in &config.admin_principals {
        if !controllers.contains(admin) {
            controllers.push(*admin);
        }
    }
    
    // Add backend canisters
    if config.auto_add_app_controllers {
        for backend in &config.backend_canisters {
            if !controllers.contains(backend) {
                controllers.push(*backend);
            }
        }
        
        // Add frontend canister if configured
        if let Some(frontend) = config.frontend_canister {
            if !controllers.contains(&frontend) {
                controllers.push(frontend);
            }
        }
    }
    
    // Optionally add the owner/minter
    if config.minter_retains_control && !controllers.contains(&owner) {
        controllers.push(owner);
    }
    
    controllers
}

/// Validate that a principal is an authorized controller
pub fn is_authorized_controller(
    principal: Principal,
    config: &ControllerConfig,
    this_canister: Principal,
) -> bool {
    // This canister is always authorized
    if principal == this_canister {
        return true;
    }
    
    // Check admin principals
    if config.admin_principals.contains(&principal) {
        return true;
    }
    
    // Check backend canisters
    if config.backend_canisters.contains(&principal) {
        return true;
    }
    
    // Check frontend canister
    if let Some(frontend) = config.frontend_canister {
        if principal == frontend {
            return true;
        }
    }
    
    false
}

/// Controller update request
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ControllerUpdateRequest {
    pub canister_id: Principal,
    pub action: ControllerAction,
    pub principal: Principal,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ControllerAction {
    Add,
    Remove,
}

/// Result of a controller operation
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ControllerOperationResult {
    pub success: bool,
    pub canister_id: Principal,
    pub controllers: Vec<Principal>,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_controller_list() {
        let config = ControllerConfig {
            admin_principals: vec![
                Principal::from_text("lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae").unwrap(),
            ],
            backend_canisters: vec![
                Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            ],
            frontend_canister: Some(Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap()),
            auto_add_app_controllers: true,
            minter_retains_control: true,
        };

        let owner = Principal::from_text("2vxsx-fae").unwrap();
        let this_canister = Principal::from_text("renrk-eyaaa-aaaaa-aaada-cai").unwrap();

        let controllers = build_controller_list(&config, owner, this_canister);

        assert!(controllers.contains(&this_canister));
        assert!(controllers.len() >= 3); // At least this_canister, admin, and backend
    }
}






