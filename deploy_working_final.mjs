import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load Secp256k1KeyIdentity
let Secp256k1KeyIdentity;
try {
  const secp256k1 = await import('@dfinity/identity-secp256k1');
  Secp256k1KeyIdentity = secp256k1.Secp256k1KeyIdentity;
} catch (e) {
  throw new Error('@dfinity/identity-secp256k1 package required. Run: npm install @dfinity/identity-secp256k1');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load identity
function loadIdentity() {
  const pemPath = join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem');
  const pemContent = readFileSync(pemPath, 'utf8');
  const identity = Secp256k1KeyIdentity.fromPem(pemContent);
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);
  return identity;
}

// Wallet interface - use manual encoding to bypass IDL issues
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [IDL.Record({
      cycles: IDL.Nat64,
      settings: IDL.Opt(IDL.Record({
        controller: IDL.Opt(IDL.Principal),
        freezing_threshold: IDL.Opt(IDL.Nat),
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        memory_allocation: IDL.Opt(IDL.Nat),
        compute_allocation: IDL.Opt(IDL.Nat),
      })),
    })],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
  wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
});

// Management canister interface
const managementIDL = ({ IDL }) => IDL.Service({
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

async function createCanisterViaWallet(agent, walletId, identity, cycles) {
  // Use Actor with correct IDL - the Actor handles encoding automatically
  const WalletCreateIDL = ({ IDL }) => IDL.Service({
    wallet_create_canister: IDL.Func(
      [IDL.Record({
        cycles: IDL.Nat64,
        settings: IDL.Opt(IDL.Record({
          controller: IDL.Opt(IDL.Principal),
          freezing_threshold: IDL.Opt(IDL.Nat),
          controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
          memory_allocation: IDL.Opt(IDL.Nat),
          compute_allocation: IDL.Opt(IDL.Nat),
        })),
      })],
      [IDL.Record({ canister_id: IDL.Principal })],
      []
    ),
  });
  
  const wallet = Actor.createActor(WalletCreateIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });
  
  // Try calling with the value omitted (should encode as None)
  // Actually, let's try omitting the settings field entirely
  try {
    const result = await wallet.wallet_create_canister({
      cycles: BigInt(cycles),
      // Omit settings entirely - Actor should handle opt as None
    });
    return result.canister_id;
  } catch (e) {
    // If that fails, the Actor requires the field, so settings encoding is the issue
    throw e;
  }
}

async function deployCanister(agent, walletId, managementActor, identity, canisterName, wasmPath) {
  console.log(`\n📦 Deploying ${canisterName}...`);

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    let canisterId;
    
    // Try manual wallet call
    try {
      console.log(`   Creating canister via wallet (manual encoding)...`);
      canisterId = await createCanisterViaWallet(agent, walletId, identity, 100_000_000_000);
      console.log(`   ✓ Canister created: ${canisterId.toText()}`);
    } catch (walletError) {
      const errorMsg = walletError.message || String(walletError);
      console.log(`   ⚠️  Wallet failed: ${errorMsg.substring(0, 150)}`);
      throw new Error(`Cannot create canister: ${errorMsg.substring(0, 100)}`);
    }

    // Install WASM
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
  console.log('🚀 Deployment (Manual Encoding)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const wallet = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  try {
    const balance = await wallet.wallet_balance();
    console.log(`✓ Wallet: ${walletId} (${balance.amount.toString()} cycles)\n`);
  } catch (e) {
    console.log(`⚠️  Could not query wallet: ${e.message}\n`);
  }

  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm' },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm' },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm' },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm' },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm' },
  ];

  const deployed = {};

  for (const canister of canisters) {
    try {
      const id = await deployCanister(agent, walletId, managementActor, identity, canister.name, canister.wasm);
      deployed[canister.name] = id;
      await new Promise(resolve => setTimeout(resolve, 3000));
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
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
});

