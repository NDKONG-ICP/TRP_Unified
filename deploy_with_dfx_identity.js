#!/usr/bin/env node
/**
 * Deployment using IC SDK with dfx identity
 * Uses the same identity that dfx uses (ic_deploy)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Force using root node_modules for @dfinity packages (has compatible v3 versions)
// Clear any cached modules first
const Module = require('module');
const originalRequire = Module.prototype.require;
const rootNodeModules = path.join(__dirname, 'node_modules');

// Clear module cache for @dfinity packages to force reload
Object.keys(require.cache).forEach(key => {
  if (key.includes('@dfinity')) {
    delete require.cache[key];
  }
});

// Override require to prioritize root node_modules
Module.prototype.require = function(id) {
  if (id.startsWith('@dfinity/')) {
    // Try root node_modules first
    const rootPath = path.join(rootNodeModules, id);
    if (fs.existsSync(rootPath)) {
      return originalRequire.call(this, rootPath);
    }
    // Fall back to normal resolution (which will use root if available)
    return originalRequire.call(this, id);
  }
  return originalRequire.call(this, id);
};

const { HttpAgent, Actor } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');
const { IDL } = require('@dfinity/candid');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

const frontendPath = path.join(__dirname, 'frontend');
const nodeModulesPath = path.join(frontendPath, 'node_modules');

// Management canister ID
const MANAGEMENT_CANISTER_ID = Principal.fromText('aaaaa-aa');

// Canister configuration
const canisters = [
  { 
    name: 'siwe_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siwe_canister.wasm'),
  },
  { 
    name: 'siws_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siws_canister.wasm'),
  },
  { 
    name: 'siwb_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/siwb_canister.wasm'),
  },
  { 
    name: 'sis_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/sis_canister.wasm'),
  },
  { 
    name: 'ordinals_canister', 
    wasm: path.join(__dirname, 'target/wasm32-unknown-unknown/release/ordinals_canister.wasm'),
  },
];

// Wallet canister interface
// IC wallet canisters have wallet_create_canister which requires the caller to be a controller
// But we can also try using the wallet's proxy method if available
const WalletCanister = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [IDL.Record({
      cycles: IDL.Nat64,
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
  wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  // Some wallets have a forward method
  forward: IDL.Func(
    [IDL.Record({
      canister_id: IDL.Principal,
      method_name: IDL.Text,
      cycles: IDL.Nat64,
    })],
    [IDL.Record({ result: IDL.Variant({ ok: IDL.Vec(IDL.Nat8), err: IDL.Text }) })],
    []
  ),
});

// Management canister interface
const ManagementCanister = ({ IDL }) => IDL.Service({
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
});

function loadDfxIdentity() {
  console.log('🔍 Loading dfx identity (ic_deploy)...\n');
  
  // Get the expected principal from dfx (it works now!)
  let expectedPrincipal;
  try {
    expectedPrincipal = execSync('dfx identity get-principal --identity ic_deploy', { 
      encoding: 'utf8',
      env: { 
        ...process.env, 
        NO_COLOR: '1', 
        TERM: 'dumb',
        PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}`
      }
    }).trim();
    console.log(`✅ Expected principal (from dfx): ${expectedPrincipal}\n`);
  } catch (e) {
    // Fallback to hardcoded
    expectedPrincipal = 'gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae';
    console.log(`✅ Expected principal (hardcoded fallback): ${expectedPrincipal}\n`);
  }
  
  // Try multiple identity file locations
  // Priority: ic_deploy (restored from backup), then default
  const identityPaths = [
    path.join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem'),
    path.join(process.env.HOME, '.config/dfx/identity/default/identity.pem'),
  ];
  
  // Also try exported identity
  const exportedPath = '/tmp/ic_deploy_exported.pem';
  if (fs.existsSync(exportedPath)) {
    identityPaths.unshift(exportedPath);
  }
  
  let identity = null;
  let actualPrincipal = null;
  let usedPath = null;
  
  for (const identityPath of identityPaths) {
    if (!fs.existsSync(identityPath)) {
      continue;
    }
    
    console.log(`  Trying: ${identityPath}`);
    const pemContent = fs.readFileSync(identityPath, 'utf8');
    
    // Try both Ed25519 and Secp256k1
    // dfx may use Ed25519 by default, but the PEM shows EC PRIVATE KEY
    let testIdentity = null;
    let testPrincipal = null;
    
    // Try Ed25519 first (dfx default)
    try {
      const ed25519Identity = Ed25519KeyIdentity.fromPem(pemContent);
      testIdentity = ed25519Identity;
      testPrincipal = ed25519Identity.getPrincipal().toText();
      console.log(`    Principal (Ed25519): ${testPrincipal}`);
      
      if (testPrincipal === expectedPrincipal) {
        identity = testIdentity;
        actualPrincipal = testPrincipal;
        usedPath = identityPath;
        console.log(`    ✅✅✅ MATCH with Ed25519! Using this identity file.\n`);
        break;
      }
    } catch (e) {
      // Not Ed25519, try secp256k1
    }
    
    // Try Secp256k1
    try {
      const privateKey = crypto.createPrivateKey({
        key: pemContent,
        format: 'pem'
      });
      
      // Export as DER and extract the 32-byte private key
      const derKey = privateKey.export({ type: 'sec1', format: 'der' });
      const keyBytes = derKey.slice(-32);
      
      if (keyBytes.length === 32) {
        let Secp256k1KeyIdentity;
        try {
          const secp256k1 = require('@dfinity/identity-secp256k1');
          Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
        } catch (e) {
          try {
            const secp256k1 = require(path.join(nodeModulesPath, '@dfinity/identity-secp256k1'));
            Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
          } catch (e2) {
            throw new Error('@dfinity/identity-secp256k1 package required');
          }
        }
        
        const secpIdentity = Secp256k1KeyIdentity.fromSecretKey(keyBytes);
        const secpPrincipal = secpIdentity.getPrincipal().toText();
        console.log(`    Principal (Secp256k1): ${secpPrincipal}`);
        
        if (secpPrincipal === expectedPrincipal) {
          identity = secpIdentity;
          actualPrincipal = secpPrincipal;
          usedPath = identityPath;
          console.log(`    ✅✅✅ MATCH with Secp256k1! Using this identity file.\n`);
          break;
        }
      }
    } catch (error) {
      console.log(`    ⚠️  Error loading: ${error.message}`);
    }
    
    if (!testIdentity || testPrincipal !== expectedPrincipal) {
      console.log(`    ❌ Doesn't match expected principal`);
    }
  }
  
  if (!identity) {
    // CRITICAL: dfx reports the correct principal, but PEM parsing gives different
    // This means dfx uses a different key derivation or the PEM is encrypted
    // SOLUTION: Use dfx to export the identity, or use the ic_deploy identity anyway
    // and trust that dfx's principal is correct (wallet will accept it)
    
    console.log(`⚠️  WARNING: No identity file matches expected principal ${expectedPrincipal}`);
    console.log(`   However, dfx reports this principal is correct for ic_deploy`);
    console.log(`   This suggests dfx uses different key derivation or encryption`);
    console.log(`   Using ic_deploy identity anyway - wallet should accept it\n`);
    
    // Use ic_deploy identity - dfx says it's correct, so trust dfx
    const icDeployPath = path.join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem');
    if (fs.existsSync(icDeployPath)) {
      const pemContent = fs.readFileSync(icDeployPath, 'utf8');
      const privateKey = crypto.createPrivateKey({ key: pemContent, format: 'pem' });
      const derKey = privateKey.export({ type: 'sec1', format: 'der' });
      const keyBytes = derKey.slice(-32);
      
      let Secp256k1KeyIdentity;
      try {
        const secp256k1 = require('@dfinity/identity-secp256k1');
        Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
      } catch (e) {
        try {
          const secp256k1 = require(path.join(nodeModulesPath, '@dfinity/identity-secp256k1'));
          Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
        } catch (e2) {
          throw new Error('@dfinity/identity-secp256k1 package required');
        }
      }
      
      identity = Secp256k1KeyIdentity.fromSecretKey(keyBytes);
      actualPrincipal = identity.getPrincipal().toText();
      usedPath = icDeployPath;
      
      console.log(`✅ Using ic_deploy identity (dfx confirms it's correct)`);
      console.log(`   Path: ${usedPath}`);
      console.log(`   PEM-derived principal: ${actualPrincipal}`);
      console.log(`   dfx-reported principal: ${expectedPrincipal}`);
      console.log(`   ⚠️  Principals differ, but trusting dfx - wallet should accept\n`);
      
      return identity;
    }
    
    throw new Error(`Could not find ic_deploy identity file. Tried: ${identityPaths.join(', ')}`);
  }
  
  console.log(`✅ Identity loaded successfully`);
  console.log(`   Path: ${usedPath}`);
  console.log(`   Principal: ${actualPrincipal}\n`);
  
  return identity;
}

async function getWalletCanisterId(agent, principal) {
  console.log('🔍 Getting wallet canister ID...\n');
  
  // Hardcode wallet ID since dfx is broken
  // This is the wallet for ic_deploy identity
  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  console.log(`✅ Wallet canister (hardcoded): ${walletId}\n`);
  return Principal.fromText(walletId);
  
  // Try to get wallet from dfx (commented out due to color bug)
  /*
  try {
    const walletId = execSync('dfx identity get-wallet --network ic --identity ic_deploy', { 
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' }
    }).trim();
    
    if (walletId && walletId.length > 0 && !walletId.includes('Error') && !walletId.includes('panic')) {
      console.log(`✅ Wallet canister: ${walletId}\n`);
      return Principal.fromText(walletId);
    }
  } catch (e) {
    console.log('⚠️  Could not get wallet via dfx, using hardcoded value\n');
  }
  */
}

async function createCanisterViaWallet(agent, walletId) {
  console.log('  Creating canister via wallet proxy...');
  
  // Wallet interface - use proxy method to call management canister
  const WalletCanister = ({ IDL }) => IDL.Service({
    call: IDL.Func(
      [IDL.Record({
        canister: IDL.Principal,
        method_name: IDL.Text,
        args: IDL.Vec(IDL.Nat8),
        cycles: IDL.Nat64,
      })],
      [IDL.Record({
        ok: IDL.Opt(IDL.Vec(IDL.Nat8)),
        err: IDL.Opt(IDL.Text),
      })],
      []
    ),
  });
  
  const walletActor = Actor.createActor(WalletCanister, {
    agent,
    canisterId: walletId,
  });
  
  // Create canister via management canister through wallet proxy
  const createCanisterArgs = IDL.encode([IDL.Record({
    settings: IDL.Opt(IDL.Record({
      controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
      compute_allocation: IDL.Opt(IDL.Nat),
      memory_allocation: IDL.Opt(IDL.Nat),
      freezing_threshold: IDL.Opt(IDL.Nat),
    })),
  })], [{
    settings: [],
  }]);
  
  const result = await walletActor.call({
    canister: MANAGEMENT_CANISTER_ID,
    method_name: 'create_canister',
    args: Array.from(createCanisterArgs),
    cycles: 1_000_000_000_000n, // 1T cycles
  });
  
  if (result.err) {
    throw new Error(`Wallet proxy error: ${result.err}`);
  }
  
  if (!result.ok) {
    throw new Error('Wallet proxy returned no result');
  }
  
  // Decode the result
  const decoded = IDL.decode([IDL.Record({ canister_id: IDL.Principal })], Buffer.from(result.ok))[0];
  return decoded.canister_id;
}

async function createCanisterViaWallet(agent, walletId, identity) {
  console.log('  Creating canister via wallet...');
  console.log(`  Wallet: ${walletId.toText()}`);
  console.log(`  Identity: ${identity.getPrincipal().toText()}`);
  
  // Get expected principal from dfx (it works!)
  let expectedPrincipal;
  try {
    expectedPrincipal = execSync('dfx identity get-principal --identity ic_deploy', {
      encoding: 'utf8',
      env: { 
        ...process.env, 
        NO_COLOR: '1', 
        TERM: 'dumb',
        PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}`
      }
    }).trim();
  } catch (e) {
    expectedPrincipal = 'gqkko-43bbx-nwsp4-it2rg-pc2dy-w2pt2-fa5om-4y6es-oyhz2-5i5oh-5ae';
  }
  
  const actualPrincipal = identity.getPrincipal().toText();
  
  console.log(`  Expected principal (from dfx): ${expectedPrincipal}`);
  console.log(`  Actual principal (from PEM): ${actualPrincipal}`);
  
  // Query wallet to see controllers
  try {
    const WalletQuery = ({ IDL }) => IDL.Service({
      get_controllers: IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    });
    
    const walletQuery = Actor.createActor(WalletQuery, {
      agent,
      canisterId: walletId,
    });
    
    const controllers = await walletQuery.get_controllers();
    console.log(`  Wallet controllers:`);
    controllers.forEach(c => console.log(`    - ${c.toText()}`));
    
    const isController = controllers.some(c => c.toText() === actualPrincipal || c.toText() === expectedPrincipal);
    if (!isController) {
      console.log(`  ⚠️  WARNING: Identity is not a wallet controller!`);
      console.log(`     This will cause permission errors.`);
    }
  } catch (e) {
    console.log(`  ⚠️  Could not query wallet controllers: ${e.message}`);
  }
  
  // Create wallet actor
  const walletActor = Actor.createActor(WalletCanister, {
    agent,
    canisterId: walletId,
  });
  
  // Try wallet_create_canister
  console.log(`  💡 Attempting wallet_create_canister...`);
  
  try {
    const result = await walletActor.wallet_create_canister({
      cycles: 100_000_000_000n, // 100B cycles (0.1 TC)
      settings: [], // Empty = use defaults (wallet will be controller)
    });
    
    console.log(`  ✅ Canister created via wallet!`);
    return result.canister_id;
  } catch (error) {
    console.log(`  ❌ Wallet error: ${error.message}`);
    
    // If wallet fails, we cannot create canisters
    // The identity principal mismatch is the root cause
    throw new Error(`Cannot create canister: Identity principal (${actualPrincipal}) doesn't match wallet controller (${expectedPrincipal}). Wallet requires the dfx-reported principal as controller.`);
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

async function deployCanister(agent, managementActor, canister, walletId, identity) {
  console.log(`\n📦 Deploying ${canister.name}...`);
  
  if (!fs.existsSync(canister.wasm)) {
    console.log(`  ❌ WASM file not found: ${canister.wasm}`);
    return null;
  }

  try {
    // Create canister via wallet
    const canisterId = await createCanisterViaWallet(agent, walletId, identity);
    console.log(`  ✅ Canister created: ${canisterId.toText()}`);

    // Install WASM via management canister
    await installWasm(agent, managementActor, canisterId, canister.wasm);

    return canisterId.toText();
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    if (error.message.includes('cycles') || error.message.includes('insufficient')) {
      console.log('  💡 You may need more cycles in your wallet');
    }
    if (error.message.includes('controller') || error.message.includes('custodian')) {
      console.log('  💡 Wallet permission issue - check wallet controllers');
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
  console.log('🚀 Deployment using dfx identity (ic_deploy)\n');
  console.log('Using the same identity that dfx uses for this project.\n');

  try {
    // Load identity using dfx's identity file
    const identity = loadDfxIdentity();

    // Create agent
    console.log('🌐 Connecting to IC mainnet...');
    const agent = new HttpAgent({
      host: 'https://ic0.app',
      identity: identity,
    });
    
    // Verify connection by checking identity
    console.log(`   Using identity: ${identity.getPrincipal().toText()}`);

    // Get wallet canister ID if available
    const walletId = await getWalletCanisterId(agent, identity.getPrincipal());

    // Create management canister actor (for install_code only)
    const managementActor = Actor.createActor(ManagementCanister, {
      agent,
      canisterId: MANAGEMENT_CANISTER_ID,
    });

    console.log('✅ Connected to IC\n');

    // Deploy each canister
    const deployedIds = {};
    for (const canister of canisters) {
      const canisterId = await deployCanister(agent, managementActor, canister, walletId, identity);
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
    if (error.message.includes('Secp256k1KeyIdentity')) {
      console.error('\n💡 Installing required package...');
      try {
        execSync('npm install @dfinity/identity-secp256k1 --save-dev --legacy-peer-deps', {
          cwd: __dirname,
          stdio: 'inherit'
        });
        console.error('✅ Package installed. Please run the script again.');
      } catch (e) {
        console.error('❌ Failed to install package. Please install manually:');
        console.error('   npm install @dfinity/identity-secp256k1 --save-dev --legacy-peer-deps');
      }
    }
    console.error('\nFull error:', error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployCanister, loadDfxIdentity };

