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

// Management canister interface for install_code
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

async function checkCanisterExists(agent, canisterId) {
  try {
    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });
    
    const status = await managementActor.canister_status({ canister_id: canisterId });
    return {
      exists: true,
      status: status.status,
      controllers: status.settings.controllers.map(c => c.toText()),
      cycles: status.cycles.toString(),
    };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function installCode(agent, canisterId, canisterName, wasmPath) {
  console.log(`\n📦 Installing code to ${canisterName} (${canisterId})...`);

  try {
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    const managementActor = Actor.createActor(managementIDL, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'),
    });

    // Try to check status, but don't fail if it doesn't work
    // Just proceed with reinstall mode which will work regardless
    try {
      const status = await checkCanisterExists(agent, canisterId);
      if (status.exists) {
        console.log(`   ✓ Canister exists`);
        console.log(`   ✓ Status: ${Object.keys(status.status)[0]}`);
        console.log(`   ✓ Controllers: ${status.controllers.join(', ')}`);
        console.log(`   ✓ Cycles: ${status.cycles}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not check status (proceeding anyway): ${e.message}`);
    }

    // Force reinstall mode to ensure WASM is installed even if canister exists but has no WASM
    // This handles the case where canister exists but has no code installed
    const mode = { reinstall: null };

    console.log(`   Installing with mode: reinstall (ensures WASM is installed)...`);

    await managementActor.install_code({
      mode,
      canister_id: canisterId,
      wasm_module: Array.from(new Uint8Array(wasmModule)),
      arg: [],
    });

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

  const identity = loadIdentity();

  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  // Canister IDs - update these if you know the actual IDs
  // If not provided, we'll try to find them from dfx.json or .env
  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm', id: null },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm', id: null },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm', id: null },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm', id: null },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm', id: null },
  ];

  // Try to get canister IDs from dfx
  console.log('🔍 Checking for existing canister IDs...\n');
  for (const canister of canisters) {
    try {
      const { execSync } = await import('child_process');
      const id = execSync(`dfx canister --network ic id ${canister.name} 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1', TERM: 'dumb' }
      }).trim();
      
      if (id.match(/^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/)) {
        canister.id = id;
        console.log(`   ✓ ${canister.name}: ${id}`);
      }
    } catch (e) {
      // Canister ID not found in dfx
    }
  }

  console.log('\n📋 Canisters to install:\n');
  const toInstall = canisters.filter(c => c.id);
  const missing = canisters.filter(c => !c.id);

  if (toInstall.length === 0) {
    console.log('❌ No canister IDs found!');
    console.log('\n💡 Options:');
    console.log('   1. Provide canister IDs as arguments:');
    console.log('      node install_code_only.mjs <siwe_id> <siws_id> <siwb_id> <sis_id> <ordinals_id>');
    console.log('   2. Or update dfx.json with canister IDs');
    console.log('   3. Or create canisters first using IC Dashboard');
    process.exit(1);
  }

  if (missing.length > 0) {
    console.log('⚠️  Missing canister IDs:');
    missing.forEach(c => console.log(`   - ${c.name}`));
    console.log('');
  }

  console.log('✅ Found canister IDs:');
  toInstall.forEach(c => console.log(`   - ${c.name}: ${c.id}`));
  console.log('');

  // Install code to each canister
  const installed = {};

  for (const canister of toInstall) {
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
        const envVar = name.toUpperCase().replace(/_/g, '_');
        const pattern = new RegExp(
          `(${name}:\\s*import\\.meta\\.env\\.VITE_${envVar}_CANISTER_ID\\s*\\|\\|\\s*)'[^']*'`,
          'g'
        );
        if (pattern.test(content)) {
          content = content.replace(pattern, `$1'${id}'`);
        } else {
          // Add if not found
          const insertPoint = content.indexOf(`${name}:`);
          if (insertPoint > 0) {
            const lineEnd = content.indexOf('\n', insertPoint);
            content = content.slice(0, lineEnd) + ` || '${id}'` + content.slice(lineEnd);
          }
        }
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

// Check for command line arguments (canister name and ID)
const args = process.argv.slice(2);

// If two arguments provided: canister_name and canister_id
if (args.length >= 2) {
  const canisterName = args[0];
  const canisterId = args[1];
  
  console.log(`\n🎯 Installing code for ${canisterName} (${canisterId})\n`);
  
  // Try multiple possible paths
  const possiblePaths = [
    join(__dirname, 'backend', canisterName, 'target', 'wasm32-unknown-unknown', 'release', `${canisterName}.wasm`),
    join(__dirname, 'target', 'wasm32-unknown-unknown', 'release', `${canisterName}.wasm`),
  ];
  
  let wasmPath = null;
  for (const path of possiblePaths) {
    try {
      readFileSync(path);
      wasmPath = path;
      break;
    } catch (e) {
      // Try next path
    }
  }
  
  if (!wasmPath) {
    console.error(`❌ WASM not found. Tried:`);
    possiblePaths.forEach(p => console.error(`   ${p}`));
    process.exit(1);
  }
  
  try {
    readFileSync(wasmPath);
  } catch (error) {
    console.error(`❌ WASM not found: ${wasmPath}`);
    process.exit(1);
  }
  
  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });
  
  // No need to fetch root key for mainnet
  // await agent.fetchRootKey();
  
  installCode(agent, canisterId, canisterName, wasmPath)
    .then(() => {
      console.log(`\n✅ Successfully installed code to ${canisterName} (${canisterId})`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n❌ Failed: ${error.message}`);
      process.exit(1);
    });
  
  // Don't run main() if we're installing specific canister
  process.exit(0);
}
if (args.length >= 5) {
  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm', id: args[0] },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm', id: args[1] },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm', id: args[2] },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm', id: args[3] },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm', id: args[4] },
  ];
  
  // Override the canisters array in main
  const originalMain = main;
  main = async () => {
    // ... (same setup code)
    // Then use the provided IDs
  };
}

main().catch(error => {
  console.error('\n❌ Installation failed:', error.message);
  process.exit(1);
});

