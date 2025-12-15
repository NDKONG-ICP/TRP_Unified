import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

// Try to load Secp256k1KeyIdentity
let Secp256k1KeyIdentity;
try {
  const secp256k1 = await import('@dfinity/identity-secp256k1');
  Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
} catch (e) {
  throw new Error('@dfinity/identity-secp256k1 package required. Run: npm install @dfinity/identity-secp256k1');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the correct principal from dfx
function getDfxPrincipal() {
  try {
    const principal = execSync('dfx identity get-principal --identity ic_deploy', {
      encoding: 'utf8',
      env: {
        ...process.env,
        NO_COLOR: '1',
        TERM: 'dumb',
        PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}`
      }
    }).trim();
    return principal;
  } catch (e) {
    throw new Error(`Could not get principal from dfx: ${e.message}`);
  }
}

// Load identity - try multiple methods
function loadIdentity() {
  const expectedPrincipal = getDfxPrincipal();
  console.log(`Expected principal (from dfx): ${expectedPrincipal}\n`);
  
  const pemPath = join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem');
  console.log(`Loading identity from: ${pemPath}`);
  
  if (!readFileSync(pemPath, 'utf8')) {
    throw new Error(`Identity file not found: ${pemPath}`);
  }
  
  const pemContent = readFileSync(pemPath, 'utf8');
  
  // Use fromPem directly - this matches dfx's key derivation!
  const identity = Secp256k1KeyIdentity.fromPem(pemContent);
  const actualPrincipal = identity.getPrincipal().toText();
  
  console.log(`PEM-derived principal: ${actualPrincipal}`);
  
  if (actualPrincipal !== expectedPrincipal) {
    console.log(`\n⚠️  WARNING: Principal mismatch!`);
    console.log(`   Expected (dfx): ${expectedPrincipal}`);
    console.log(`   Actual (PEM):  ${actualPrincipal}`);
    console.log(`\n💡 This means the PEM file doesn't match what dfx uses.`);
    console.log(`   The wallet requires: ${expectedPrincipal}`);
    console.log(`   But we have: ${actualPrincipal}`);
    console.log(`\n   SOLUTION: Add ${actualPrincipal} as wallet controller, or find the correct identity file.\n`);
  } else {
    console.log(`✅✅✅ Principal matches! Using correct identity!\n`);
  }
  
  return identity;
}

// Wallet canister interface
// Based on error message, wallet expects this exact format
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [
      IDL.Record({
        cycles: IDL.Nat64,
        settings: IDL.Opt(IDL.Record({
          controller: IDL.Opt(IDL.Principal),
          freezing_threshold: IDL.Opt(IDL.Nat),
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        })),
      }),
    ],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
});

// Management canister interface
const managementIDL = ({ IDL }) => IDL.Service({
  create_canister: IDL.Func(
    [
      IDL.Record({
        settings: IDL.Opt(
          IDL.Record({
            controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
            compute_allocation: IDL.Opt(IDL.Nat),
            memory_allocation: IDL.Opt(IDL.Nat),
            freezing_threshold: IDL.Opt(IDL.Nat),
          })
        ),
      }),
    ],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
  install_code: IDL.Func(
    [
      IDL.Record({
        mode: IDL.Variant({
          install: IDL.Null,
          reinstall: IDL.Null,
          upgrade: IDL.Null,
        }),
        canister_id: IDL.Principal,
        wasm_module: IDL.Vec(IDL.Nat8),
        arg: IDL.Vec(IDL.Nat8),
      }),
    ],
    [],
    []
  ),
});

async function deployCanister(agent, wallet, managementActor, identity, canisterName, wasmPath) {
  console.log(`\n📦 Deploying ${canisterName}...`);

  try {
    // Read WASM
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    let canisterId;
    const identityPrincipal = identity.getPrincipal();
    
    // Try wallet first (requires identity to be controller)
    try {
      console.log(`   Creating canister via wallet (identity: ${identityPrincipal.toText()})...`);
      const createResult = await wallet.wallet_create_canister({
        cycles: BigInt(100_000_000_000), // 100B cycles (0.1 TC)
        settings: [], // Empty settings = wallet will be controller
      });
      canisterId = createResult.canister_id;
      console.log(`   ✓ Canister created via wallet: ${canisterId.toText()}`);
    } catch (walletError) {
      // Check the actual error - maybe it's a different issue
      const errorMsg = walletError.message || String(walletError);
      console.log(`   ⚠️  Wallet error: ${errorMsg.substring(0, 200)}`);
      
      if (errorMsg.includes('controller') || errorMsg.includes('custodian') || errorMsg.includes('authorized')) {
        console.log(`   💡 Wallet permission issue detected.`);
        console.log(`   💡 Your identity: ${identityPrincipal.toText()}`);
        console.log(`   💡 This identity should be the wallet controller.`);
        console.log(`   💡 If this fails, the wallet may require a different authentication method.`);
        throw new Error(`Cannot deploy: Wallet access denied. Error: ${errorMsg.substring(0, 100)}`);
      } else {
        throw walletError;
      }
    }

    // Install WASM via management canister
    console.log('   Installing WASM...');
    
    await managementActor.install_code({
      mode: { install: null },
      canister_id: canisterId,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log(`   ✅ ${canisterName} deployed: ${canisterId.toText()}`);
    return canisterId.toText();

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Direct IC Deployment (no dfx)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load identity
  const identity = loadIdentity();

  // Create agent
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Wait for agent to be ready
  await agent.fetchRootKey();

  // Create wallet actor
  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const wallet = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });

  // Create management canister actor
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  console.log(`✓ Wallet: ${walletId}`);
  console.log(`✓ Management canister: aaaaa-aa\n`);

  // Deploy all canisters
  const canisters = [
    {
      name: 'siwe_canister',
      wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm',
    },
    {
      name: 'siws_canister',
      wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm',
    },
    {
      name: 'siwb_canister',
      wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm',
    },
    {
      name: 'sis_canister',
      wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm',
    },
    {
      name: 'ordinals_canister',
      wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm',
    },
  ];

  const deployed = {};

  for (const canister of canisters) {
    try {
      const id = await deployCanister(agent, wallet, managementActor, identity, canister.name, canister.wasm);
      deployed[canister.name] = id;
      // Small delay between deployments
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`\n❌ Failed to deploy ${canister.name}: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 DEPLOYMENT SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (Object.keys(deployed).length > 0) {
    console.log('✅ Successfully deployed canisters:');
    Object.entries(deployed).forEach(([name, id]) => {
      console.log(`   ${name}: ${id}`);
    });
    
    // Update frontend config
    console.log('\n📝 Updating frontend config...');
    const configPath = join(__dirname, 'frontend/src/services/canisterConfig.ts');
    try {
      let content = readFileSync(configPath, 'utf8');
      for (const [name, id] of Object.entries(deployed)) {
        const pattern = new RegExp(
          `(${name}:\\s*import\\.meta\\.env\\.VITE_[A-Z_]+_CANISTER_ID\\s*\\|\\|\\s*)'[^']*'`,
          'g'
        );
        content = content.replace(pattern, `$1'${id}'`);
      }
      const { writeFileSync } = await import('fs');
      writeFileSync(configPath, content, 'utf8');
      console.log('   ✅ Config updated!');
    } catch (e) {
      console.log(`   ⚠️  Could not update config: ${e.message}`);
    }
  } else {
    console.log('❌ No canisters were deployed');
    console.log('\n💡 To fix: Add your identity principal as wallet controller');
    console.log(`   Your principal: ${identity.getPrincipal().toText()}`);
    console.log(`   Wallet: ${walletId}`);
    console.log(`   Use Plug Wallet (https://plugwallet.ooo) or NNS Frontend (https://nns.ic0.app)`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
});

