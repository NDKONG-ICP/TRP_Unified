import { HttpAgent } from '@dfinity/agent';
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
  throw new Error('@dfinity/identity-secp256k1 package required');
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

async function createCanisterViaWallet(agent, walletId, cycles) {
  // Manually encode using the exact format the wallet expects
  // Based on error: wallet expects settings as record (not opt)
  // But the error also shows it receives opt, so it's confusing...
  // Let's try encoding with settings as null/empty for opt
  
  const requestType = ({ IDL }) => IDL.Record({
    cycles: IDL.Nat64,
    settings: IDL.Opt(IDL.Record({
      controller: IDL.Opt(IDL.Principal),
      freezing_threshold: IDL.Opt(IDL.Nat),
      controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
      memory_allocation: IDL.Opt(IDL.Nat),
      compute_allocation: IDL.Opt(IDL.Nat),
    })),
  });
  
  // Try encoding with settings as empty array (None for opt)
  const args = IDL.encode([requestType], [{
    cycles: BigInt(cycles),
    settings: [], // Empty array should encode as None
  }]);
  
  // Call wallet directly
  const result = await agent.call(
    Principal.fromText(walletId),
    'wallet_create_canister',
    args,
  );
  
  // Decode result
  const resultType = ({ IDL }) => IDL.Record({ canister_id: IDL.Principal });
  const decoded = IDL.decode([resultType], result);
  return decoded[0].canister_id;
}

async function deployCanister(agent, walletId, managementActor, canisterName, wasmPath) {
  console.log(`\n📦 Deploying ${canisterName}...`);

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    let canisterId;
    
    try {
      console.log(`   Creating canister via wallet (direct call)...`);
      canisterId = await createCanisterViaWallet(agent, walletId, 100_000_000_000);
      console.log(`   ✓ Canister created: ${canisterId.toText()}`);
    } catch (walletError) {
      const errorMsg = walletError.message || String(walletError);
      console.log(`   ⚠️  Wallet failed: ${errorMsg.substring(0, 200)}`);
      throw walletError;
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
  console.log('🚀 Deployment (Direct Agent Call)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const { Actor } = await import('@dfinity/agent');
  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  console.log(`✓ Wallet: ${walletId}`);
  console.log(`✓ Management canister: aaaaa-aa\n`);

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
      const id = await deployCanister(agent, walletId, managementActor, canister.name, canister.wasm);
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

