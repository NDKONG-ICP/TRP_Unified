#!/usr/bin/env node
/**
 * Programmatic Canister Deployment using IC SDK
 * Deploys canisters directly using @dfinity/agent, bypassing dfx
 */

const { HttpAgent, Actor } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { IDL } = require('@dfinity/candid');
const { Ed25519KeyIdentity } = require('@dfinity/identity');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function loadIdentity() {
  console.log('\n🔐 Identity Setup\n');
  console.log('You need to provide your identity to deploy canisters.');
  console.log('Options:');
  console.log('1. Use existing dfx identity file (automatic)');
  console.log('2. Enter private key manually (hex format)');
  console.log('3. Use identity from dfx command output\n');

  const choice = await askQuestion('Choose option (1-3, default 1): ') || '1';

  if (choice === '1') {
    // Try multiple common identity paths
    const possiblePaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/ic_deploy/identity.pem'),
      path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/default/identity.pem'),
      path.join(process.env.HOME || process.env.USERPROFILE, '.config/dfx/identity/identity.pem'),
      path.join(process.cwd(), '.dfx/ic/identity/ic_deploy/identity.pem'),
    ];

    for (const identityPath of possiblePaths) {
      if (fs.existsSync(identityPath)) {
        try {
          const pemContent = fs.readFileSync(identityPath, 'utf8');
          const identity = Ed25519KeyIdentity.fromPem(pemContent);
          const principal = identity.getPrincipal();
          console.log('✅ Loaded identity from:', identityPath);
          console.log('   Principal:', principal.toText());
          return identity;
        } catch (e) {
          console.log('⚠️  Failed to load from:', identityPath);
        }
      }
    }
    
    console.log('❌ No identity file found in common locations');
    console.log('   Searched:');
    possiblePaths.forEach(p => console.log(`     - ${p}`));
    console.log('\n   Try option 2 to enter private key manually');
  } else if (choice === '2') {
    console.log('\n📝 To get your private key:');
    console.log('   1. Run: dfx identity export ic_deploy');
    console.log('   2. Copy the private key (hex format)');
    console.log('   3. Paste it below\n');
    
    const privateKeyInput = await askQuestion('Enter private key (hex, 64 characters): ');
    const privateKey = privateKeyInput.trim().replace(/^0x/, '');
    
    if (privateKey.length !== 64) {
      throw new Error('Private key must be 64 hex characters (32 bytes)');
    }
    
    try {
      const keyBytes = Buffer.from(privateKey, 'hex');
      if (keyBytes.length !== 32) {
        throw new Error('Invalid key length');
      }
      const identity = Ed25519KeyIdentity.fromSecretKey(keyBytes);
      const principal = identity.getPrincipal();
      console.log('✅ Identity created from private key');
      console.log('   Principal:', principal.toText());
      return identity;
    } catch (e) {
      throw new Error(`Invalid private key format: ${e.message}`);
    }
  } else if (choice === '3') {
    console.log('\n📝 Export your identity:');
    console.log('   Run: dfx identity export ic_deploy');
    console.log('   Copy the entire PEM content and paste below\n');
    
    const pemInput = await askQuestion('Paste PEM content (press Enter twice when done):\n');
    
    try {
      const identity = Ed25519KeyIdentity.fromPem(pemInput.trim());
      const principal = identity.getPrincipal();
      console.log('✅ Identity loaded from PEM');
      console.log('   Principal:', principal.toText());
      return identity;
    } catch (e) {
      throw new Error(`Failed to parse PEM: ${e.message}`);
    }
  }

  throw new Error('Could not load identity. Please try again.');
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
    // Try with explicit settings structure
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
  
  // Check if WASM file exists
  if (!fs.existsSync(canister.wasm)) {
    console.log(`  ❌ WASM file not found: ${canister.wasm}`);
    return null;
  }

  try {
    // Create canister
    const canisterId = await createCanister(agent, actor);
    console.log(`  ✅ Canister created: ${canisterId.toText()}`);

    // Install WASM
    await installWasm(agent, actor, canisterId, canister.wasm);

    return canisterId.toText();
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    if (error.message.includes('cycles')) {
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
  console.log('🚀 IC SDK Programmatic Deployment\n');
  console.log('This script deploys canisters using IC SDK directly, bypassing dfx.\n');

  // Check if packages are installed
  try {
    require.resolve('@dfinity/agent');
    require.resolve('@dfinity/identity');
    console.log('✅ IC SDK packages found\n');
  } catch (e) {
    console.log('❌ Required packages not found');
    console.log('   Installing @dfinity packages...\n');
    const { execSync } = require('child_process');
    try {
      execSync('npm install @dfinity/agent@^2.0.0 @dfinity/identity@^2.0.0 @dfinity/principal@^2.0.0 @dfinity/candid@^2.0.0 --save-dev --legacy-peer-deps', {
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log('✅ Packages installed\n');
    } catch (installError) {
      console.log('⚠️  Installation failed. Trying with frontend packages...');
      // Try using frontend's node_modules
      const frontendPath = path.join(__dirname, 'frontend');
      if (fs.existsSync(frontendPath)) {
        process.env.NODE_PATH = path.join(frontendPath, 'node_modules');
        require('module')._initPaths();
      }
    }
  }

  try {
    // Load identity
    const identity = await loadIdentity();

    // Create agent
    console.log('\n🌐 Connecting to IC...');
    const agent = new HttpAgent({
      host: 'https://icp-api.io',
      identity: identity,
    });

    // Fetch root key only for local development (not needed for mainnet)
    // For mainnet, we don't fetch root key
    if (process.env.DFX_NETWORK !== 'ic' && agent.rootKey === undefined) {
      await agent.fetchRootKey();
    }

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
      console.log('\nNext steps:');
      console.log('1. Rebuild frontend: cd frontend && npm run build');
      console.log('2. Deploy frontend assets');
    } else {
      console.log('\n⚠️  No canisters were deployed');
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployCanister, loadIdentity };

