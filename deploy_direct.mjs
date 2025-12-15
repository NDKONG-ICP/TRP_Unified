import { Actor, HttpAgent } from '@dfinity/agent';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load identity from PEM file
function loadIdentity() {
  const pemPath = join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem');
  console.log(`Loading identity from: ${pemPath}`);
  const pemContent = readFileSync(pemPath, 'utf8');
  
  // Extract private key from EC PRIVATE KEY format
  const privateKey = crypto.createPrivateKey({
    key: pemContent,
    format: 'pem'
  });
  
  // Export as DER and extract the 32-byte private key
  const derKey = privateKey.export({ type: 'sec1', format: 'der' });
  const keyBytes = derKey.slice(-32);
  
  if (keyBytes.length !== 32) {
    throw new Error(`Invalid key length: ${keyBytes.length}`);
  }
  
  const identity = Secp256k1KeyIdentity.fromSecretKey(keyBytes);
  console.log(`✓ Identity loaded: ${identity.getPrincipal().toText()}\n`);
  return identity;
}

// Wallet canister interface
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [
      IDL.Record({
        cycles: IDL.Nat64,
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
  wallet_call: IDL.Func(
    [
      IDL.Record({
        canister: IDL.Principal,
        method_name: IDL.Text,
        args: IDL.Vec(IDL.Nat8),
        cycles: IDL.Nat64,
      }),
    ],
    [IDL.Record({ return: IDL.Vec(IDL.Nat8) })],
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

async function deployCanister(agent, wallet, managementActor, canisterName, wasmPath) {
  console.log(`\n📦 Deploying ${canisterName}...`);

  try {
    // Read WASM
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    let canisterId;
    
    // Try wallet first
    try {
      console.log('   Creating canister via wallet...');
      const createResult = await wallet.wallet_create_canister({
        cycles: BigInt(100_000_000_000), // 100B cycles (0.1 TC)
        settings: [],
      });
      canisterId = createResult.canister_id;
      console.log(`   ✓ Canister created via wallet: ${canisterId.toText()}`);
    } catch (walletError) {
      if (walletError.message.includes('controller') || walletError.message.includes('custodian')) {
        console.log('   ⚠️  Wallet access denied. Trying management canister directly...');
        console.log('   💡 Note: This requires cycles in the identity, not the wallet');
        
        // Try management canister directly (requires cycles in identity)
        try {
          const createResult = await managementActor.create_canister({
            settings: [],
          });
          canisterId = createResult.canister_id;
          console.log(`   ✓ Canister created via management canister: ${canisterId.toText()}`);
        } catch (mgmtError) {
          throw new Error(`Cannot create canister: Wallet error (${walletError.message}) and Management error (${mgmtError.message})`);
        }
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
    if (error.message.includes('controller') || error.message.includes('custodian')) {
      console.error(`   💡 Wallet permission issue - identity may not be a controller`);
      console.error(`   💡 Solution: Add identity principal as wallet controller via Plug Wallet or NNS Frontend`);
    }
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
      const id = await deployCanister(agent, wallet, managementActor, canister.name, canister.wasm);
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
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Deployment failed:', error);
  process.exit(1);
});

