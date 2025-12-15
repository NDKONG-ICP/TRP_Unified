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
  canister_status: IDL.Func(
    [IDL.Record({ canister_id: IDL.Principal })],
    [IDL.Record({
      status: IDL.Variant({
        running: IDL.Null,
        stopping: IDL.Null,
        stopped: IDL.Null,
      }),
      cycles: IDL.Nat64,
    })],
    ['query']
  ),
});

async function installCode(agent, canisterId, canisterName, wasmPath) {
  console.log(`\n📦 Installing code to ${canisterName} (${canisterId})...`);

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });

    // Check status
    try {
      const status = await managementActor.canister_status({ canister_id: Principal.fromText(canisterId) });
      console.log(`   ✓ Canister exists (${Object.keys(status.status)[0]}, ${status.cycles.toString()} cycles)`);
    } catch (e) {
      console.log(`   ⚠️  Could not check status, proceeding anyway...`);
    }

    // Install code
    await managementActor.install_code({
      mode: { install: null },
      canister_id: Principal.fromText(canisterId),
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

    console.log(`   ✅ Code installed successfully!`);
    return canisterId;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    throw error;
  }
}

async function createCanisterViaWallet(agent, walletId, cycles) {
  // Use agent.call directly with manually constructed IDL types
  // This bypasses Actor validation
  
  // Construct the IDL type properly
  const requestType = IDL.Record({
    cycles: IDL.Nat64,
    settings: IDL.Record({
      controller: IDL.Opt(IDL.Principal),
      freezing_threshold: IDL.Opt(IDL.Nat),
      controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
      memory_allocation: IDL.Opt(IDL.Nat),
      compute_allocation: IDL.Opt(IDL.Nat),
    }),
  });
  
  // Encode arguments - use empty arrays for opt None
  const args = IDL.encode([requestType], [{
    cycles: BigInt(cycles),
    settings: {
      controller: [],
      freezing_threshold: [],
      controllers: [],
      memory_allocation: [],
      compute_allocation: [],
    },
  }]);
  
  // Call wallet directly
  const result = await agent.call(
    Principal.fromText(walletId),
    'wallet_create_canister',
    args,
  );
  
  // Decode result
  const resultType = IDL.Record({ canister_id: IDL.Principal });
  const decoded = IDL.decode([resultType], result);
  return decoded[0].canister_id;
}

async function main() {
  console.log('🚀 Complete Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const CYCLES_PER_CANISTER = 1_000_000_000_000; // 1T cycles

  // Existing canisters (from first dfx run)
  const existing = {
    siwe_canister: 'ehdei-liaaa-aaaao-a4zfa-cai',
    siws_canister: 'eacc4-gqaaa-aaaao-a4zfq-cai',
    siwb_canister: 'evftr-hyaaa-aaaao-a4zga-cai',
  };

  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm', id: existing.siwe_canister },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm', id: existing.siws_canister },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm', id: existing.siwb_canister },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm', id: null },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm', id: null },
  ];

  const deployed = {};

  // First, install code to existing canisters
  for (const canister of canisters.filter(c => c.id)) {
    try {
      await installCode(agent, canister.id, canister.name, canister.wasm);
      deployed[canister.name] = canister.id;
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`\n❌ Failed to install ${canister.name}: ${error.message}`);
    }
  }

  // Then create and deploy remaining canisters
  for (const canister of canisters.filter(c => !c.id)) {
    try {
      console.log(`\n📦 Creating ${canister.name}...`);
      const canisterId = await createCanisterViaWallet(agent, walletId, CYCLES_PER_CANISTER);
      console.log(`   ✅ Canister created: ${canisterId.toText()}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await installCode(agent, canisterId.toText ? canisterId.toText() : String(canisterId), canister.name, canister.wasm);
      
      deployed[canister.name] = canisterId.toText ? canisterId.toText() : String(canisterId);
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
        const envVar = name.toUpperCase();
        const pattern = new RegExp(
          `(${name}:\\s*import\\.meta\\.env\\.VITE_${envVar}_CANISTER_ID\\s*\\|\\|\\s*)'[^']*'`,
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

