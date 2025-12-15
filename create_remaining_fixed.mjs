import { Actor, HttpAgent } from '@dfinity/agent';
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

// CORRECT Wallet IDL - settings is REQUIRED record, inner fields are opt
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_create_canister: IDL.Func(
    [IDL.Record({
      cycles: IDL.Nat64,
      settings: IDL.Record({
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
});

// Management canister for install_code
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

async function createCanister(agent, wallet, cycles) {
  console.log(`   Creating canister with ${cycles} cycles...`);
  
  // Try with Actor - use empty arrays for opt None
  // Based on testing, [] works for opt types in Actor validation
  try {
    const result = await wallet.wallet_create_canister({
      cycles: BigInt(cycles),
      settings: {
        controller: [],  // [] = None for opt
        freezing_threshold: [],
        controllers: [],
        memory_allocation: [],
        compute_allocation: [],
      },
    });
    
    return result.canister_id;
  } catch (error) {
    // Get full error details
    const fullError = error.message || String(error);
    console.log(`   ⚠️  Actor call failed: ${fullError.substring(0, 300)}`);
    
    // Check if it's a rejection with details
    if (fullError.includes('rejection error') || fullError.includes('Reject')) {
      console.log(`   💡 This is a wallet rejection - checking error details...`);
      // The wallet might be rejecting due to encoding, but let's see the full message
      if (error.cause) {
        console.log(`   Reject code: ${error.cause.rejectCode}`);
        console.log(`   Reject message: ${error.cause.rejectMessage?.substring(0, 200)}`);
      }
    }
    
    console.log(`   Trying dfx as fallback...`);
    
    // Use dfx with file argument - even if it panics, it might create the canister
    const { tmpdir } = await import('os');
    const candidFile = join(tmpdir(), `wallet_create_${Date.now()}.did`);
    const candidArg = `(record{
  cycles = ${cycles} : nat64;
  settings = record{
    controller = null;
    freezing_threshold = null;
    controllers = null;
    memory_allocation = null;
    compute_allocation = null;
  }
})`;
    
    writeFileSync(candidFile, candidArg, 'utf8');
    
    try {
      // Run dfx and capture output - even if it panics, we might get the canister ID
      const cmd = `dfx canister --network ic call daf6l-jyaaa-aaaao-a4nba-cai wallet_create_canister --argument-file ${candidFile} 2>&1`;
      let output = '';
      try {
        output = execSync(cmd, {
          encoding: 'utf8',
          env: { ...process.env, NO_COLOR: '1', TERM: 'dumb', PATH: `${process.env.HOME}/.local/share/dfxvm/bin:${process.env.PATH}` },
          maxBuffer: 10 * 1024 * 1024,
        });
      } catch (dfxExecError) {
        // dfx panicked, but might have output the canister ID first
        output = (dfxExecError.stdout || '') + (dfxExecError.stderr || '') + (dfxExecError.message || '');
        // Continue to try parsing
      }
      
      // Extract canister ID from any format
      let match = output.match(/principal "([a-z0-9-]+)"/);
      if (!match) {
        // Try variant format or any principal-like string
        match = output.match(/([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/);
      }
      if (match) {
        const canisterId = match[1];
        console.log(`   ⚠️  Extracted canister ID from dfx output (may have panicked)`);
        return Principal.fromText(canisterId);
      }
      
      // If no match in output, the canister might still have been created
      // Check by trying to get wallet's recent canisters or just proceed
      console.log(`   💡 dfx output (first 500 chars): ${output.substring(0, 500)}`);
      throw new Error('Could not parse canister ID from dfx output');
    } catch (dfxError) {
      // Final attempt - extract from error message
      const allOutput = (dfxError.stdout || '') + (dfxError.stderr || '') + (dfxError.message || '') + (String(dfxError) || '');
      
      let match = allOutput.match(/principal "([a-z0-9-]+)"/);
      if (!match) {
        match = allOutput.match(/([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/);
      }
      if (match) {
        console.log(`   ⚠️  Found canister ID in error output`);
        return Principal.fromText(match[1]);
      }
      
      throw new Error(`dfx failed: ${dfxError.message.substring(0, 200)}`);
    } finally {
      try {
        execSync(`rm -f ${candidFile}`);
      } catch (e) {}
    }
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
  const wallet = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });

  const managementActor = Actor.createActor(managementIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  // Check wallet balance first
  const walletBalanceIDL = ({ IDL }) => IDL.Service({
    wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  });
  const balanceActor = Actor.createActor(walletBalanceIDL, {
    agent,
    canisterId: Principal.fromText(walletId),
  });
  
  const balance = await balanceActor.wallet_balance();
  const availableCycles = balance.amount;
  console.log(`💰 Wallet balance: ${availableCycles.toString()} cycles (${(Number(availableCycles) / 1e12).toFixed(2)} TC)\n`);
  
  // Creating a canister requires 500B cycles as a fee (deducted from initial balance)
  const FEE_PER_CANISTER = 500_000_000_000; // 500B fee
  const MIN_CYCLES_AFTER_FEE = 10_000_000_000; // 10B cycles after fee (minimal but functional)
  const IDEAL_CYCLES_TO_SEND = FEE_PER_CANISTER + MIN_CYCLES_AFTER_FEE; // 510B per canister
  
  const available = Number(availableCycles);
  const totalNeeded = IDEAL_CYCLES_TO_SEND * 2; // For 2 canisters
  
  let cyclesPerCanister;
  
  if (available < totalNeeded) {
    console.log(`⚠️  Warning: Wallet has ${(available / 1e12).toFixed(2)} TC`);
    console.log(`   Need ${(totalNeeded / 1e12).toFixed(2)} TC for 2 canisters (${(IDEAL_CYCLES_TO_SEND / 1e12).toFixed(2)} TC each)`);
    console.log(`   Will create with available cycles (canisters will have minimal cycles after fee)\n`);
    
    // Try to split between 2 canisters
    const cyclesForTwo = Math.floor(available / 2.2); // Leave small buffer
    if (cyclesForTwo >= FEE_PER_CANISTER + 1_000_000_000) {
      cyclesPerCanister = cyclesForTwo;
      console.log(`📊 Will allocate ${cyclesPerCanister} cycles per canister (${(cyclesPerCanister / 1e12).toFixed(2)} TC)\n`);
    } else {
      // Can only create 1 canister - use most of available, leave small buffer
      const cyclesForOne = available - 10_000_000_000; // Leave 10B buffer
      if (cyclesForOne < FEE_PER_CANISTER + 1_000_000_000) {
        throw new Error(`Insufficient cycles. Need at least ${((FEE_PER_CANISTER + 1_000_000_000) / 1e12).toFixed(2)} TC to create 1 canister, but wallet has ${(available / 1e12).toFixed(2)} TC`);
      }
      cyclesPerCanister = cyclesForOne;
      console.log(`   Can only create 1 canister with current balance`);
      console.log(`📊 Will allocate ${cyclesPerCanister} cycles (${(cyclesPerCanister / 1e12).toFixed(2)} TC) for first canister\n`);
    }
  } else {
    cyclesPerCanister = IDEAL_CYCLES_TO_SEND;
    console.log(`📊 Will allocate ${IDEAL_CYCLES_TO_SEND} cycles per canister (${(IDEAL_CYCLES_TO_SEND / 1e12).toFixed(2)} TC)\n`);
    console.log(`   Note: Each canister will have ${(MIN_CYCLES_AFTER_FEE / 1e12).toFixed(2)} TC after the 500B creation fee\n`);
  }

  const canisters = [
    { name: 'sis_canister', wasm: './target/wasm32-unknown-unknown/release/sis_canister.wasm' },
    { name: 'ordinals_canister', wasm: './target/wasm32-unknown-unknown/release/ordinals_canister.wasm' },
  ];
  
  // Check balance again before each creation
  let currentBalance = Number(availableCycles);

  const deployed = {};

  for (const canister of canisters) {
    try {
      // Check current balance before each creation
      const balanceCheck = await balanceActor.wallet_balance();
      currentBalance = Number(balanceCheck.amount);
      
      if (currentBalance < FEE_PER_CANISTER + 1_000_000_000) {
        console.log(`\n⚠️  Insufficient cycles for ${canister.name}`);
        console.log(`   Current balance: ${(currentBalance / 1e12).toFixed(2)} TC`);
        console.log(`   Need at least: ${((FEE_PER_CANISTER + 1_000_000_000) / 1e12).toFixed(2)} TC (500B fee + 1B minimum)`);
        console.log(`   Skipping ${canister.name} - add more cycles to wallet to continue`);
        continue;
      }
      
      // Use available balance, but leave a small buffer
      // Calculate cycles to send: need at least 500B + 1B, use most of available
      const minNeeded = FEE_PER_CANISTER + 1_000_000_000;
      const cyclesToSend = Math.max(minNeeded, Math.min(cyclesPerCanister, Math.floor(currentBalance * 0.95)));
      
      console.log(`\n📦 Creating ${canister.name}...`);
      console.log(`   Sending ${cyclesToSend} cycles (${(cyclesToSend / 1e12).toFixed(2)} TC)`);
      const cyclesAfterFee = cyclesToSend - FEE_PER_CANISTER;
      console.log(`   Canister will have ${(cyclesAfterFee / 1e12).toFixed(2)} TC after the 500B creation fee`);
      if (cyclesAfterFee < 1_000_000_000_000) {
        console.log(`   ⚠️  Note: Canister has less than 1T cycles. Add more cycles later using:`);
        console.log(`      dfx canister deposit-cycles ${canister.name} --amount <cycles>`);
      }
      
      const canisterId = await createCanister(agent, wallet, cyclesToSend);
      const canisterIdText = canisterId.toText ? canisterId.toText() : String(canisterId);
      console.log(`   ✅ Created: ${canisterIdText}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`   Installing code...`);
      const wasmModule = readFileSync(join(__dirname, canister.wasm));
      
      await managementActor.install_code({
        mode: { install: null },
        canister_id: Principal.fromText(canisterIdText),
        wasm_module: Array.from(new Uint8Array(wasmModule)),
        arg: [],
      });
      
      console.log(`   ✅ Code installed`);
      deployed[canister.name] = canisterIdText;
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      // Try dfx install as fallback if canister was created
      if (error.message.includes('Created') || error.message.includes(canister.name)) {
        console.log(`   Trying dfx install as fallback...`);
        // Extract canister ID from error if possible
        const idMatch = error.message.match(/([a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3})/);
        if (idMatch) {
          const canisterId = idMatch[1];
          if (installCode(canisterId, canister.wasm)) {
            console.log(`   ✅ Installed via dfx`);
            deployed[canister.name] = canisterId;
          }
        }
      }
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
  } else {
    console.log('\n❌ No canisters were created');
  }
}

main().catch(error => {
  console.error('\n❌ Failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});

