import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

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

async function createCanister(agent, walletId, cycles) {
  // Use IDL.encode directly with correct format
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
  
  try {
    const result = await agent.call(
      Principal.fromText(walletId),
      'wallet_create_canister',
      args,
    );
    
    const resultType = IDL.Record({ canister_id: IDL.Principal });
    const decoded = IDL.decode([resultType], result);
    
    // Debug: check what we got
    console.log(`   Debug: decoded type: ${typeof decoded[0]?.canister_id}`);
    console.log(`   Debug: has toText: ${!!decoded[0]?.canister_id?.toText}`);
    
    // canister_id should be a Principal object
    const canisterId = decoded[0].canister_id;
    
    // Handle both Principal object and string
    if (canisterId && typeof canisterId.toText === 'function') {
      return canisterId;
    } else if (typeof canisterId === 'string') {
      return Principal.fromText(canisterId);
    } else {
      // Try to convert
      return Principal.fromText(String(canisterId));
    }
  } catch (error) {
    console.log(`   Debug error: ${error.message}`);
    console.log(`   Debug stack: ${error.stack?.substring(0, 300)}`);
    throw error;
  }
}

function installCode(canisterId, wasmPath) {
  const wasmAbs = join(__dirname, wasmPath);
  const cmd = `dfx canister --network ic install ${canisterId} --wasm ${wasmAbs} --mode install 2>&1`;
  
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1', TERM: 'dumb', PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      maxBuffer: 10 * 1024 * 1024,
    });
    return output.includes('Installed code') || output.includes('Installed');
  } catch (error) {
    const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');
    return output.includes('Installed code') || output.includes('Installed');
  }
}

async function main() {
  console.log('🚀 Creating Remaining Canisters');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  await agent.fetchRootKey();

  const walletId = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const CYCLES = 1_000_000_000_000; // 1T cycles

  const canisters = [
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm' },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm' },
  ];

  const deployed = {};

  for (const canister of canisters) {
    try {
      console.log(`\n📦 Creating ${canister.name}...`);
      const canisterId = await createCanister(agent, walletId, CYCLES);
      const canisterIdText = canisterId.toText ? canisterId.toText() : String(canisterId);
      console.log(`   ✅ Created: ${canisterIdText}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`   Installing code...`);
      if (installCode(canisterIdText, canister.wasm)) {
        console.log(`   ✅ Code installed`);
        deployed[canister.name] = canisterIdText;
      } else {
        console.log(`   ⚠️  Install may have failed`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  if (Object.keys(deployed).length > 0) {
    console.log('\n✅ Created canisters:');
    Object.entries(deployed).forEach(([name, id]) => {
      console.log(`   ${name}: ${id}`);
    });
    
    // Update frontend config
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
      console.log('\n✅ Frontend config updated!');
    } catch (e) {
      console.log(`\n⚠️  Could not update config: ${e.message}`);
    }
  }
}

main().catch(error => {
  console.error('\n❌ Failed:', error.message);
  process.exit(1);
});

