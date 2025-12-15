#!/usr/bin/env node
/**
 * Find canisters with cycles that can be transferred to wallet
 */

import { readFileSync } from 'fs';
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { homedir } from 'os';
import { join } from 'path';

function loadIdentity() {
  const pemPath = join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem');
  return Secp256k1KeyIdentity.fromPem(readFileSync(pemPath, 'utf-8'));
}

async function main() {
  console.log('🔍 Finding Canisters with Available Cycles');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    host: 'https://ic0.app',
    identity,
  });

  // Read canister IDs from frontend config
  const configPath = 'frontend/src/services/canisterConfig.ts';
  const configContent = readFileSync(configPath, 'utf8');
  
  // Extract canister IDs
  const canisterIds = {};
  const regex = /(\w+):\s*['"]([a-z0-9-]+)['"]/g;
  let match;
  while ((match = regex.exec(configContent)) !== null) {
    canisterIds[match[1]] = match[2];
  }

  console.log(`📋 Found ${Object.keys(canisterIds).length} canisters in config\n`);

  // Management canister for status
  const managementStatusIDL = ({ IDL }) => IDL.Service({
    canister_status: IDL.Func(
      [IDL.Record({ canister_id: IDL.Principal })],
      [IDL.Record({
        status: IDL.Variant({
          running: IDL.Null,
          stopping: IDL.Null,
          stopped: IDL.Null,
        }),
        cycles: IDL.Nat64,
        settings: IDL.Record({
          controllers: IDL.Vec(IDL.Principal),
        }),
      })],
      []
    ),
  });

  const statusActor = Actor.createActor(managementStatusIDL, {
    agent,
    canisterId: Principal.fromText('aaaaa-aa'),
  });

  const WALLET_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';
  const neededCycles = 550_000_000_000n; // 0.55 TC
  const candidates = [];

  console.log('💰 Checking canister cycles...\n');

  for (const [name, canisterId] of Object.entries(canisterIds)) {
    if (name === 'raven_ai' || canisterId === WALLET_ID) continue;

    try {
      const principal = Principal.fromText(canisterId);
      const status = await statusActor.canister_status({ canister_id: principal });
      const cyclesTC = Number(status.cycles) / 1_000_000_000_000;
      
      // Check if identity is a controller
      const isController = status.settings.controllers.some(
        c => c.toText() === identity.getPrincipal().toText()
      );

      if (Number(status.cycles) > Number(neededCycles) && isController) {
        candidates.push({
          name,
          id: canisterId,
          cycles: status.cycles,
          cyclesTC,
        });
        console.log(`✅ ${name.padEnd(20)} ${canisterId.padEnd(30)} ${cyclesTC.toFixed(3)} TC`);
      } else if (Number(status.cycles) > 0) {
        console.log(`   ${name.padEnd(20)} ${canisterId.padEnd(30)} ${cyclesTC.toFixed(3)} TC ${isController ? '(controller)' : '(not controller)'}`);
      }
    } catch (e) {
      // Canister might not exist or not accessible
      console.log(`   ${name.padEnd(20)} ${canisterId.padEnd(30)} (error: ${e.message.substring(0, 30)})`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (candidates.length === 0) {
    console.log('❌ No canisters found with sufficient cycles and controller access.\n');
    console.log('💡 Options:');
    console.log(`   1. Transfer cycles to wallet: ${WALLET_ID}`);
    console.log(`   2. Buy cycles with ICP via NNS or cycles wallet`);
    console.log(`   3. Wait for cycles to accumulate in wallet\n`);
  } else {
    console.log(`✅ Found ${candidates.length} canister(s) with available cycles:\n`);
    
    for (const candidate of candidates) {
      console.log(`   ${candidate.name}: ${candidate.cyclesTC.toFixed(3)} TC`);
      console.log(`   ID: ${candidate.id}\n`);
    }

    console.log('💡 To transfer cycles from a canister to the wallet:');
    console.log('   1. Use IC Dashboard: https://dashboard.internetcomputer.org');
    console.log('   2. Or use dfx: dfx canister deposit-cycles <amount> --wallet <wallet-id> <canister-id>');
    console.log(`   3. Or use a script to call the canister's deposit_cycles method\n`);
    
    // Try to create a transfer script for the first candidate
    if (candidates.length > 0) {
      const candidate = candidates[0];
      console.log(`📝 Creating transfer script for ${candidate.name}...`);
      
      const transferScript = `#!/usr/bin/env node
// Transfer cycles from ${candidate.name} to wallet
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SOURCE_CANISTER = '${candidate.id}';
const WALLET_ID = '${WALLET_ID}';
const AMOUNT = ${Number(neededCycles)}n; // ${(Number(neededCycles) / 1_000_000_000_000).toFixed(3)} TC

const identity = Secp256k1KeyIdentity.fromPem(
  readFileSync(join(homedir(), '.config', 'dfx', 'identity', 'ic_deploy', 'identity.pem'), 'utf-8')
);

const agent = new HttpAgent({ host: 'https://ic0.app', identity });

// Wallet deposit_cycles interface
const walletIDL = ({ IDL }) => IDL.Service({
  deposit_cycles: IDL.Func([IDL.Principal], [IDL.Record({ accepted: IDL.Nat64 })], []),
});

const wallet = Actor.createActor(walletIDL, { agent, canisterId: Principal.fromText(WALLET_ID) });

async function transfer() {
  console.log(\`Transferring cycles from \${SOURCE_CANISTER} to wallet...\`);
  try {
    const result = await wallet.deposit_cycles(Principal.fromText(SOURCE_CANISTER));
    console.log(\`✅ Transferred: \${(Number(result.accepted) / 1_000_000_000_000).toFixed(3)} TC\`);
  } catch (e) {
    console.error(\`❌ Error: \${e.message}\`);
  }
}

transfer();
`;
      
      writeFileSync('transfer_cycles_to_wallet.mjs', transferScript);
      console.log(`✅ Created: transfer_cycles_to_wallet.mjs`);
      console.log(`   Run: node transfer_cycles_to_wallet.mjs\n`);
    }
  }
}

main().catch(console.error);
