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

// Load identity using fromPem (this works correctly!)
function loadIdentity() {
  const pemPath = join(process.env.HOME, '.config/dfx/identity/ic_deploy/identity.pem');
  console.log(`Loading identity from: ${pemPath}`);
  const pemContent = readFileSync(pemPath, 'utf8');
  
  // Use fromPem - this matches dfx's key derivation!
  const identity = Secp256k1KeyIdentity.fromPem(pemContent);
  const principal = identity.getPrincipal().toText();
  
  console.log(`✅ Identity loaded: ${principal}\n`);
  return identity;
}

// Wallet canister interface - Based on error, settings is REQUIRED (not opt)
// Error: "table5 (opt) is not a subtype of record" means wallet expects record directly
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [IDL.Record({
      cycles: IDL.Nat64,
      settings: IDL.Record({  // REQUIRED, not Opt! Wallet expects this directly
        controller: IDL.Opt(IDL.Principal),
        freezing_threshold: IDL.Opt(IDL.Nat),
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        memory_allocation: IDL.Opt(IDL.Nat),
        compute_allocation: IDL.Opt(IDL.Nat),
      }),
    })],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
  wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
});

// Management canister interface
const managementIDL = ({ IDL }) => IDL.Service({
  create_canister: IDL.Func(
    [IDL.Record({
      settings: IDL.Opt(IDL.Record({
        controllers: IDL.Opt(IDL.Vec(IDL.Principal)),
        compute_allocation: IDL.Opt(IDL.Nat),
        memory_allocation: IDL.Opt(IDL.Nat),
        freezing_threshold: IDL.Opt(IDL.Nat),
      })),
    })],
    [IDL.Record({ canister_id: IDL.Principal })],
    []
  ),
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
  deposit_cycles: IDL.Func(
    [IDL.Record({ canister_id: IDL.Principal })],
    [],
    []
  ),
});

async function deployCanister(agent, wallet, managementActor, identity, canisterName, wasmPath) {
  console.log(`\n📦 Deploying ${canisterName}...`);

  try {
    // Read WASM
    const wasmModule = readFileSync(wasmPath);
    console.log(`   ✓ WASM loaded: ${wasmModule.length} bytes`);

    let canisterId;
    const identityPrincipal = identity.getPrincipal();
    
    // Try wallet_create_canister first, but fallback to management canister
    try {
      console.log(`   Creating canister via wallet...`);
      
      // Settings is REQUIRED (not opt), pass record with all fields
      // Empty arrays for opt fields = use defaults
      const createResult = await wallet.wallet_create_canister({
        cycles: BigInt(100_000_000_000), // 100B cycles (0.1 TC)
        settings: {
          controller: [], // Empty = no controller override
          freezing_threshold: [], // Empty = use default
          controllers: [], // Empty = use default (wallet will be controller)
          memory_allocation: [], // Empty = use default
          compute_allocation: [], // Empty = use default
        },
      });
      
      canisterId = createResult.canister_id;
      console.log(`   ✓ Canister created via wallet: ${canisterId.toText()}`);
    } catch (walletError) {
      const errorMsg = walletError.message || String(walletError);
      console.log(`   ⚠️  Wallet create failed: ${errorMsg.substring(0, 150)}`);
      console.log(`   Trying management canister directly (requires cycles in identity)...`);
      
      // Fallback: Use management canister directly
      // This requires the identity to have cycles, not the wallet
      try {
        const createResult = await managementActor.create_canister({
          settings: [{
            controllers: [[identityPrincipal]],
            compute_allocation: [],
            memory_allocation: [],
            freezing_threshold: [],
          }],
        });
        
        canisterId = createResult.canister_id;
        console.log(`   ✓ Canister created via management canister: ${canisterId.toText()}`);
        console.log(`   ⚠️  Note: This uses cycles from identity, not wallet`);
      } catch (mgmtError) {
        const mgmtMsg = mgmtError.message || String(mgmtError);
        if (mgmtMsg.includes('insufficient') || mgmtMsg.includes('cycles')) {
          throw new Error(`Identity needs cycles. Transfer cycles from wallet ${'daf6l-jyaaa-aaaao-a4nba-cai'} to identity ${identityPrincipal.toText()}`);
        }
        throw new Error(`Both wallet and management canister failed. Wallet: ${errorMsg.substring(0, 100)}, Management: ${mgmtMsg.substring(0, 100)}`);
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
    throw error;
  }
}

async function main() {
  console.log('🚀 Final Deployment (IC SDK with correct identity)');
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

  // Verify wallet access
  try {
    const balance = await wallet.wallet_balance();
    console.log(`✓ Wallet: ${walletId} (${balance.amount.toString()} cycles)`);
  } catch (e) {
    console.log(`⚠️  Could not query wallet balance: ${e.message}`);
  }
  
  console.log(`✓ Management canister: aaaaa-aa\n`);

  // Deploy all canisters
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
      const id = await deployCanister(agent, wallet, managementActor, identity, canister.name, canister.wasm);
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
    console.log('\n💡 Check wallet permissions or IDL format');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
});

