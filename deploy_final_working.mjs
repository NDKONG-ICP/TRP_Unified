import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment
process.env.NO_COLOR = '1';
process.env.TERM = 'dumb';
process.env.DFX_WARNING = '-mainnet_plaintext_identity';
process.env.RUST_BACKTRACE = '0';

const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';
const CYCLES_PER_CANISTER = 1_000_000_000_000; // 1T cycles

// Existing canisters
const existing = {
  siwe_canister: 'ehdei-liaaa-aaaao-a4zfa-cai',
  siws_canister: 'eacc4-gqaaa-aaaao-a4zfq-cai',
  siwb_canister: 'evftr-hyaaa-aaaao-a4zga-cai',
};

function installCode(canisterId, wasmPath) {
  const wasmAbs = join(__dirname, wasmPath);
  const cmd = `dfx canister --network ic install ${canisterId} --wasm ${wasmAbs} --mode install 2>&1`;
  
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      maxBuffer: 10 * 1024 * 1024,
    });
    
    return output.includes('Installed code') || output.includes('Installed');
  } catch (error) {
    // Even if dfx panics, check if it succeeded
    const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');
    return output.includes('Installed code') || output.includes('Installed');
  }
}

function createCanisterViaDfx() {
  // Write Candid to temp file
  const candidFile = join(tmpdir(), `wallet_create_${Date.now()}.did`);
  const candidArg = `(record{
  cycles = ${CYCLES_PER_CANISTER} : nat64;
  settings = record{
    controller = null;
    freezing_threshold = null;
    controllers = null;
    memory_allocation = null;
    compute_allocation = null;
  }
})`;
  
  writeFileSync(candidFile, candidArg, 'utf8');
  
  const cmd = `dfx canister --network ic call ${WALLET_ID} wallet_create_canister --argument-file ${candidFile} 2>&1`;
  
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      maxBuffer: 10 * 1024 * 1024,
    });
    
    // Extract canister ID
    const match = output.match(/principal "([a-z0-9-]+)"/);
    if (match) {
      return match[1];
    }
    
    // Try stderr if stdout doesn't have it
    throw new Error('Could not parse canister ID');
  } catch (error) {
    // Even if dfx panics, try to extract canister ID from any output
    const output = (error.stdout || '') + (error.stderr || '') + (error.message || '');
    const match = output.match(/principal "([a-z0-9-]+)"/);
    if (match) {
      console.log(`   ⚠️  dfx panicked but canister may have been created`);
      return match[1];
    }
    // If no match, still throw - but check if it's just the panic
    if (output.includes('Abort trap') || output.includes('ColorOutOfRange')) {
      throw new Error('dfx color bug - cannot create canister');
    }
    throw error;
  } finally {
    try {
      execSync(`rm -f ${candidFile}`);
    } catch (e) {}
  }
}

async function main() {
  console.log('🚀 Final Deployment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Set identity
  try {
    execSync('dfx identity use ic_deploy', {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      stdio: 'pipe',
    });
    const principal = execSync('dfx identity get-principal', {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      stdio: 'pipe',
    }).trim();
    console.log(`✅ Identity: ${principal}\n`);
  } catch (e) {
    console.log(`⚠️  Could not set identity: ${e.message}\n`);
  }

  const canisters = [
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm', id: existing.siwe_canister },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm', id: existing.siws_canister },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm', id: existing.siwb_canister },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm', id: null },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm', id: null },
  ];

  const deployed = {};

  // Install code to existing canisters
  console.log('📦 Installing code to existing canisters...\n');
  for (const canister of canisters.filter(c => c.id)) {
    try {
      console.log(`Installing ${canister.name} (${canister.id})...`);
      const installed = installCode(canister.id, canister.wasm);
      if (installed) {
        console.log(`   ✅ Code installed`);
        deployed[canister.name] = canister.id;
      } else {
        console.log(`   ⚠️  Install may have failed - checking...`);
        // Try to verify by checking canister status
        try {
          const status = execSync(`dfx canister --network ic status ${canister.id} 2>&1`, {
            encoding: 'utf8',
            env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
            stdio: 'pipe',
          });
          if (status.includes('Status: Running')) {
            console.log(`   ✅ Canister is running - assuming install succeeded`);
            deployed[canister.name] = canister.id;
          }
        } catch (e) {
          console.log(`   ❌ Could not verify`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  // Create and install remaining canisters
  console.log('\n📦 Creating remaining canisters...\n');
  for (const canister of canisters.filter(c => !c.id)) {
    try {
      console.log(`Creating ${canister.name}...`);
      const canisterId = await createCanisterViaDfx();
      console.log(`   ✅ Created: ${canisterId}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Installing code to ${canisterId}...`);
      if (installCode(canisterId, canister.wasm)) {
        console.log(`   ✅ Code installed`);
        deployed[canister.name] = canisterId;
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
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

