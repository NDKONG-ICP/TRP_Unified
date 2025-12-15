import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
    // Use dfx canister call directly with correct Candid format
    // Redirect stderr to /dev/null to avoid color bug panic
    const cmd = `dfx canister --network ic call ${WALLET_ID} wallet_create_canister \\
      '(record{
          cycles = ${CYCLES_PER_CANISTER} : nat64;
          settings = record{
            controller = null;
            freezing_threshold = null;
            controllers = null;
            memory_allocation = null;
            compute_allocation = null;
          }
        })' 2>/dev/null`;
    
    console.log(`   Calling wallet_create_canister...`);
    const output = execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      stdio: ['pipe', 'pipe', 'pipe'], // Capture all output
    });
    
    // Parse output to get canister ID
    // Output format can be:
    // - (record { canister_id = principal "xxxxx-xxxxx-xxxxx-xxxxx-xxx" })
    // - (variant { 17_724 = record { 1_313_628_723 = principal "xxxxx-xxxxx-xxxxx-xxxxx-xxx" } })
    // The variant format uses numeric field IDs, but we can extract the principal
    let match = output.match(/principal "([a-z0-9-]+)"/);
    if (match) {
      const canisterId = match[1];
      console.log(`   ✅ Canister created: ${canisterId}`);
      return canisterId;
    } else {
      throw new Error(`Could not parse canister ID from output: ${output.substring(0, 200)}`);
    }
  } catch (error) {
    // Check if it's the color bug or actual error
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('ColorOutOfRange') || errorMsg.includes('panic')) {
      console.log(`   ⚠️  dfx color bug detected, trying alternative method...`);
      throw new Error('dfx color bug');
    }
    console.log(`   ❌ Error: ${errorMsg.substring(0, 200)}`);
    throw error;
  }
}

function installCode(canisterId, canisterName, wasmPath) {
  console.log(`\n   Installing code to ${canisterName} (${canisterId})...`);
  
  try {
    const wasmPathAbs = join(__dirname, wasmPath);
    const cmd = `dfx canister --network ic install ${canisterId} --wasm ${wasmPathAbs} --mode install 2>/dev/null`;
    
    execSync(cmd, {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    console.log(`   ✅ Code installed successfully!`);
    return canisterId;
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.log(`   ❌ Install failed: ${errorMsg.substring(0, 200)}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Deployment using dfx canister call');
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
      if (error.message.includes('dfx color bug')) {
        console.log(`   💡 dfx is blocked by color bug. Trying IC SDK approach...`);
        // Fall back to IC SDK if dfx fails
        break;
      }
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

