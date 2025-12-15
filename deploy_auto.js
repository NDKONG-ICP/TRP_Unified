#!/usr/bin/env node
/**
 * Automated Canister Deployment using IC SDK
 * Non-interactive version that tries to auto-detect identity
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Use frontend's node_modules for @dfinity packages
const frontendPath = path.join(__dirname, 'frontend');
const nodeModulesPath = path.join(frontendPath, 'node_modules');
const Module = require('module');
const originalRequire = Module.prototype.require;

// Override require to check frontend node_modules first
Module.prototype.require = function(id) {
  if (id.startsWith('@dfinity/') && fs.existsSync(nodeModulesPath)) {
    try {
      const frontendModulePath = path.join(nodeModulesPath, id);
      if (fs.existsSync(frontendModulePath)) {
        return originalRequire.call(this, frontendModulePath);
      }
    } catch (e) {
      // Fall through to normal require
    }
  }
  return originalRequire.call(this, id);
};

const { HttpAgent, Actor } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { IDL } = require('@dfinity/candid');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

// Try to load Secp256k1KeyIdentity from separate package
// Try frontend first (where other @dfinity packages are)
let Secp256k1KeyIdentity;
try {
  const secp256k1 = require(path.join(frontendPath, 'node_modules/@dfinity/identity-secp256k1'));
  Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
} catch (e) {
  // Try root node_modules
  try {
    const secp256k1 = require('@dfinity/identity-secp256k1');
    Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
  } catch (e2) {
    Secp256k1KeyIdentity = null;
  }
}

// Management canister ID
const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

// Canister configuration
const canisters = [
  { 
    name: 'siwe_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siwe_canister.wasm'),
    candid: path.join(__dirname, 'backend/siwe_canister/siwe_canister.did')
  },
  { 
    name: 'siws_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siws_canister.wasm'),
    candid: path.join(__dirname, 'backend/siws_canister/siws_canister.did')
  },
  { 
    name: 'siwb_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siwb_canister.wasm'),
    candid: path.join(__dirname, 'backend/siwb_canister/siwb_canister.did')
  },
  { 
    name: 'sis_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/sis_canister.wasm'),
    candid: path.join(__dirname, 'backend/sis_canister/sis_canister.did')
  },
  { 
    name: 'ordinals_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/ordinals_canister.wasm'),
    candid: path.join(__dirname, 'backend/ordinals_canister/ordinals_canister.did')
  },
];

// Management canister interface
const ManagementCanister = IDL.Service({
  create_canister: IDL.Func(
    [IDL.Record({
      settings: IDL.Opt(IDL.Record({
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        compute_allocation: IDL.Opt(IDL.Nat),
        memory_allocation: IDL.Opt(IDL.Nat),
        freezing_threshold: IDL.Opt(IDL.Nat),
      })),
    })],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
  install_code: IDL.Func(
    [IDL.Record({
      mode: IDL.Variant({
        install: IDL.Null,
        reinstall: IDL.Null,
        upgrade: IDL.Null,
      }),
      canister_id: IDL.Principal,
      wasm_module: IDL.Vec(IDL.Nat8),
      arg: IDL.Vec(IDL.Nat8),
    })],
    [],
    []
  ),
  canister_status: IDL.Func(
    [IDL.Record({ canister_id: IDL.Principal })],
    [IDL.Record({
      status: IDL.Variant({
        stopped: IDL.Null,
        stopping: IDL.Null,
        running: IDL.Null,
      }),
      settings: IDL.Record({
        controllers: IDL.Vec(IDL.Principal),
        compute_allocation: IDL.Nat,
        memory_allocation: IDL.Opt(IDL.Nat),
        freezing_threshold: IDL.Nat,
      }),
      module_hash: IDL.Opt(IDL.Vec(IDL.Nat8)),
      memory_size: IDL.Nat,
      cycles: IDL.Nat,
    })],
    ['query']
  ),
});

function findIdentity() {
  console.log('🔍 Finding dfx identity...\n');
  
  // Get the current dfx identity name
  let dfxIdentityName = 'default';
  try {
    const { execSync } = require('child_process');
    dfxIdentityName = execSync('dfx identity whoami', { encoding: 'utf8' }).trim();
    console.log(`📌 Using dfx identity: ${dfxIdentityName}\n`);
  } catch (e) {
    console.log('⚠️  Could not determine dfx identity, using default\n');
  }
  
  const possiblePaths = [
    path.join(process.env.HOME || process.env.USERPROFILE, `.config/dfx/identity/${dfxIdentityName}/identity.pem`),
    path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/ic_deploy/identity.pem'),
    path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/default/identity.pem'),
    path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/identity.pem'),
    path.join(process.cwd(), '.dfx/ic/identity/ic_deploy/identity.pem'),
  ];

  for (const identityPath of possiblePaths) {
    if (fs.existsSync(identityPath)) {
      try {
        const pemContent = fs.readFileSync(identityPath, 'utf8');
        let identity;
        
        // Parse EC PRIVATE KEY format (secp256k1)
        try {
          // Extract private key using Node.js crypto
          const privateKey = crypto.createPrivateKey({
            key: pemContent,
            format: 'pem'
          });
          
          // Export as raw key (der format)
          const derKey = privateKey.export({ type: 'sec1', format: 'der' });
          
          // For secp256k1, the private key is 32 bytes
          // In SEC1 DER format, the private key is typically the last 32 bytes
          const keyBytes = derKey.slice(-32);
          
          if (keyBytes.length !== 32) {
            throw new Error(`Invalid key length: ${keyBytes.length}, expected 32`);
          }
          
          if (Secp256k1KeyIdentity && typeof Secp256k1KeyIdentity.fromSecretKey === 'function') {
            identity = Secp256k1KeyIdentity.fromSecretKey(keyBytes);
          } else {
            throw new Error('Secp256k1KeyIdentity.fromSecretKey not available. Package may not be installed correctly.');
          }
        } catch (e1) {
          // Fallback: try to parse as Ed25519 (won't work for EC keys, but try anyway)
          try {
            identity = Ed25519KeyIdentity.fromPem(pemContent);
          } catch (e2) {
            throw new Error(`Failed to parse EC identity: ${e1.message}`);
          }
        }
        
        const principal = identity.getPrincipal();
        console.log(`✅ Found identity: ${identityPath}`);
        console.log(`   Principal: ${principal.toText()}\n`);
        return identity;
      } catch (e) {
        console.log(`⚠️  Failed to load from: ${identityPath}`);
        console.log(`   Error: ${e.message}`);
      }
    }
  }
  
  throw new Error('Could not find identity. Please run: dfx identity export ic_deploy');
}

async function createCanister(agent, actor) {
  console.log('  Creating canister...');
  
  try {
    const result = await actor.create_canister({
      settings: {
        controllers: [],
        compute_allocation: [],
        memory_allocation: [],
        freezing_threshold: [],
      },
    });
    return result.canister_id;
  } catch (error) {
    // Try with empty settings
    const result = await actor.create_canister({
      settings: [],
    });
    return result.canister_id;
  }
}

async function installWasm(agent, actor, canisterId, wasmPath) {
  console.log('  Reading WASM file...');
  const wasmModule = Array.from(fs.readFileSync(wasmPath));

  console.log('  Installing WASM module...');
  await actor.install_code({
    mode: { install: null },
    canister_id: canisterId,
    wasm_module: wasmModule,
    arg: [],
  });

  console.log('  ✅ WASM installed successfully');
}

async function deployCanister(agent, actor, canister) {
  console.log(`\n📦 Deploying ${canister.name}...`);
  
  if (!fs.existsSync(canister.wasm)) {
    console.log(`  ❌ WASM file not found: ${canister.wasm}`);
    return null;
  }

  try {
    const canisterId = await createCanister(agent, actor);
    console.log(`  ✅ Canister created: ${canisterId.toText()}`);

    await installWasm(agent, actor, canisterId, canister.wasm);

    return canisterId.toText();
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    if (error.message.includes('cycles') || error.message.includes('insufficient')) {
      console.log('  💡 You may need more cycles in your wallet');
    }
    return null;
  }
}

async function updateFrontendConfig(deployedIds) {
  const configPath = path.join(__dirname, 'frontend/src/services/canisterConfig.ts');
  
  if (!fs.existsSync(configPath)) {
    console.log('⚠️  Config file not found');
    return;
  }

  console.log('\n📝 Updating frontend config...');
  let content = fs.readFileSync(configPath, 'utf8');

  for (const [canisterName, canisterId] of Object.entries(deployedIds)) {
    if (canisterId) {
      const pattern = new RegExp(
        `(${canisterName}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]+_CANISTER_ID\\s*\\|\\|\\s*)'[^']*'`,
        'g'
      );
      content = content.replace(pattern, `$1'${canisterId}'`);
      console.log(`  ✅ Updated ${canisterName}: ${canisterId}`);
    }
  }

  fs.writeFileSync(configPath, content, 'utf8');
  console.log('  ✅ Config file updated');
}

async function main() {
  console.log('🚀 Automated IC SDK Deployment\n');
  console.log('Deploying canisters using IC SDK directly, bypassing dfx.\n');

  try {
    // Load identity automatically
    const identity = findIdentity();

    // Create agent
    console.log('🌐 Connecting to IC mainnet...');
    const agent = new HttpAgent({
      host: 'https://icp-api.io',
      identity: identity,
    });

    // Create management canister actor
    const actor = Actor.createActor(ManagementCanister, {
      agent,
      canisterId: MANAGEMENT_CANISTER_ID,
    });

    console.log('✅ Connected to IC\n');

    // Deploy each canister
    const deployedIds = {};
    for (const canister of canisters) {
      const canisterId = await deployCanister(agent, actor, canister);
      if (canisterId) {
        deployedIds[canister.name] = canisterId;
      }
      // Small delay between deployments
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Update frontend config
    if (Object.keys(deployedIds).length > 0) {
      await updateFrontendConfig(deployedIds);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT COMPLETE');
      console.log('='.repeat(60));
      console.log('\nDeployed canisters:');
      for (const [name, id] of Object.entries(deployedIds)) {
        console.log(`  ${name}: ${id}`);
      }
      console.log('\n✅ Frontend config updated automatically');
      console.log('\nNext steps:');
      console.log('1. Rebuild frontend: cd frontend && npm run build');
      console.log('2. Deploy frontend assets');
    } else {
      console.log('\n⚠️  No canisters were deployed');
      console.log('   Check error messages above for details');
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.message.includes('identity')) {
      console.error('\n💡 To fix:');
      console.error('   1. Make sure you have a dfx identity: dfx identity whoami');
      console.error('   2. Export it: dfx identity export ic_deploy');
      console.error('   3. Or use the interactive script: node deploy_with_ic_sdk.js');
    }
    console.error('\nFull error:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployCanister, findIdentity };

