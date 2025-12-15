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
      memory_size: IDL.Nat,
      cycles: IDL.Nat64,
      settings: IDL.Record({
        controllers: IDL.Vec(IDL.Principal),
      }),
    })],
    ['query']
  ),
});

async function installCode(agent, canisterId, canisterName, wasmPath) {
  console.log(`\n📦 Installing code to ${canisterName}...`);
  console.log(`   Canister ID: ${canisterId}`);

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });

    // Check canister status
    try {
      const status = await managementActor.canister_status({ canister_id: Principal.fromText(canisterId) });
      console.log(`   ✓ Canister exists`);
      console.log(`   ✓ Status: ${Object.keys(status.status)[0]}`);
      console.log(`   ✓ Controllers: ${status.settings.controllers.map(c => c.toText()).join(', ')}`);
      console.log(`   ✓ Cycles: ${status.cycles.toString()}`);
      
      // Use upgrade if running, install otherwise
      const mode = status.status.running !== undefined ? { upgrade: null } : { install: null };
      console.log(`   Installing with mode: ${Object.keys(mode)[0]}...`);
      
      await managementActor.install_code({
        mode,
        canister_id: Principal.fromText(canisterId),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
    } catch (statusError) {
      // If status check fails, try install anyway
      console.log(`   ⚠️  Could not check status, trying install...`);
      await managementActor.install_code({
        mode: { install: null },
        canister_id: Principal.fromText(canisterId),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
    }

    console.log(`   ✅ ${canisterName} code installed successfully!`);
    return canisterId;

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Install Code to Existing Canisters');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get canister IDs from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 5) {
    console.log('❌ Please provide all 5 canister IDs as arguments:');
    console.log('   node install_with_ids.mjs <siwe_id> <siws_id> <siwb_id> <sis_id> <ordinals_id>');
    console.log('\nExample:');
    console.log('   node install_with_ids.mjs abcde-abcde-abcde-abcde-abc abcde-abcde-abcde-abcde-def ...');
    process.exit(1);
  }

  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm', id: args[0] },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm', id: args[1] },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm', id: args[2] },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm', id: args[3] },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm', id: args[4] },
  ];

  // Validate IDs
  for (const canister of canisters) {
    if (!canister.id.match(/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/)) {
      console.error(`❌ Invalid canister ID format: ${canister.id}`);
      process.exit(1);
    }
  }

  const identity = loadIdentity();

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  console.log('✅ Connected to IC mainnet\n');

  // Install code to each canister
  const installed = {};

  for (const canister of canisters) {
    try {
      await installCode(agent, canister.id, canister.name, canister.wasm);
      installed[canister.name] = canister.id;
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`\n❌ Failed to install ${canister.name}: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 INSTALLATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (Object.keys(installed).length > 0) {
    console.log('✅ Successfully installed code to:');
    Object.entries(installed).forEach(([name, id]) => {
      console.log(`   ${name}: ${id}`);
    });
    
    // Update frontend config
    console.log('\n📝 Updating frontend config...');
    const configPath = join(__dirname, 'frontend/src/services/canisterConfig.ts');
    try {
      let content = readFileSync(configPath, 'utf8');
      for (const [name, id] of Object.entries(installed)) {
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
    console.log('❌ No code was installed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Installation failed:', error.message);
  process.exit(1);
});

