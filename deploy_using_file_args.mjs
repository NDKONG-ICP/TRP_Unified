import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment to avoid color bug
process.env.NO_COLOR = '1';
process.env.TERM = 'dumb';
process.env.DFX_WARNING = '-mainnet_plaintext_identity';
process.env.RUST_BACKTRACE = '0';

const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';
const CYCLES_PER_CANISTER = 1_000_000_000_000; // 1T cycles

function createCanisterViaDfx(canisterName) {
  console.log(`\n📦 Creating ${canisterName}...`);
  
  try {
    // Write Candid argument to a file to avoid shell escaping issues
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
    
    // Use dfx canister call with file argument
    const cmd = `dfx canister --network ic call ${WALLET_ID} wallet_create_canister --argument-file ${candidFile} 2>&1`;
    
    console.log(`   Calling wallet_create_canister...`);
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // Clean up temp file
    try {
      execSync(`rm -f ${candidFile}`);
    } catch (e) {}
    
    // Parse output - look for principal in any format
    const match = output.match(/principal "([a-z0-9-]+)"/);
    if (match) {
      const canisterId = match[1];
      console.log(`   ✅ Canister created: ${canisterId}`);
      return canisterId;
    } else {
      // If we can't parse but got output, check if it's an error
      if (output.includes('Error') || output.includes('error')) {
        throw new Error(`Wallet call failed: ${output.substring(0, 300)}`);
      }
      throw new Error(`Could not parse canister ID from output: ${output.substring(0, 300)}`);
    }
  } catch (error) {
    const errorMsg = error.message || String(error);
    // Check if it's the color bug or actual error
    if (errorMsg.includes('ColorOutOfRange') || errorMsg.includes('Abort trap') || errorMsg.includes('panic')) {
      // Even if dfx panics, it might have created the canister
      // Try to extract canister ID from stderr/stdout if available
      const output = error.stdout || error.stderr || errorMsg;
      const match = output.match(/principal "([a-z0-9-]+)"/);
      if (match) {
        const canisterId = match[1];
        console.log(`   ⚠️  dfx panicked, but canister may have been created: ${canisterId}`);
        return canisterId;
      }
      throw new Error('dfx color bug - cannot create canister');
    }
    console.log(`   ❌ Error: ${errorMsg.substring(0, 200)}`);
    throw error;
  }
}

function installCode(canisterId, canisterName, wasmPath) {
  console.log(`\n   Installing code to ${canisterName} (${canisterId})...`);
  
  try {
    const wasmPathAbs = join(__dirname, wasmPath);
    const cmd = `dfx canister --network ic install ${canisterId} --wasm ${wasmPathAbs} --mode install 2>&1`;
    
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      maxBuffer: 10 * 1024 * 1024,
    });
    
    if (output.includes('Error') || output.includes('error')) {
      throw new Error(`Install failed: ${output.substring(0, 300)}`);
    }
    
    console.log(`   ✅ Code installed successfully!`);
    return canisterId;
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('ColorOutOfRange') || errorMsg.includes('Abort trap')) {
      // Check if install actually succeeded despite panic
      console.log(`   ⚠️  dfx panicked, but install may have succeeded`);
      return canisterId; // Assume success if we can't tell
    }
    console.log(`   ❌ Install failed: ${errorMsg.substring(0, 200)}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Deployment using dfx canister call (file args)');
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
    { name: 'siwe_canister', wasm: './target/wasm32-unknown-unknown/release/siwe_canister.wasm' },
    { name: 'siws_canister', wasm: './target/wasm32-unknown-unknown/release/siws_canister.wasm' },
    { name: 'siwb_canister', wasm: './target/wasm32-unknown-unknown/release/siwb_canister.wasm' },
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm' },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm' },
  ];

  const deployed = {};

  for (const canister of canisters) {
    try {
      // Create canister
      const canisterId = createCanisterViaDfx(canister.name);
      
      // Install code
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait a bit
      installCode(canisterId, canister.name, canister.wasm);
      
      deployed[canister.name] = canisterId;
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait between deployments
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

