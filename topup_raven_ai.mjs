#!/usr/bin/env node
/**
 * Top up raven_ai canister with cycles from wallet canister
 * Bypasses dfx color bug by using IC SDK directly
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

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

// Load identity
function loadIdentity() {
  const pemPath = join(homedir(), '.config/dfx/identity/ic_deploy/identity.pem');
  const pemContent = readFileSync(pemPath, 'utf8');
  const identity = Secp256k1KeyIdentity.fromPem(pemContent);
  console.log(`✅ Identity: ${identity.getPrincipal().toText()}\n`);
  return identity;
}

// Wallet canister IDL
const walletIDL = ({ IDL }) => IDL.Service({
  wallet_balance: IDL.Func([], [IDL.Record({ amount: IDL.Nat64 })], ['query']),
  wallet_send: IDL.Func([
    IDL.Record({
      canister: IDL.Principal,
      amount: IDL.Nat64,
    })
  ], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], []),
});

// Management canister IDL for deposit_cycles
const managementIDL = ({ IDL }) => IDL.Service({
  deposit_cycles: IDL.Func(
    [IDL.Record({ canister_id: IDL.Principal })],
    [],
    []
  ),
});

const WALLET_CANISTER_ID = 'daf6l-jyaaa-aaaao-a4nba-cai';
const RAVEN_AI_CANISTER_ID = '3noas-jyaaa-aaaao-a4xda-cai';
const CYCLES_TO_SEND = 2_000_000_000_000n; // 2T cycles

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 TOPPING UP RAVEN_AI CANISTER WITH CYCLES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const identity = loadIdentity();
  const agent = new HttpAgent({
    identity,
    host: 'https://ic0.app',
  });

  // Check wallet balance
  console.log('📊 Checking wallet balance...');
  const walletActor = Actor.createActor(walletIDL, {
    agent,
    canisterId: Principal.fromText(WALLET_CANISTER_ID),
  });

  try {
    const balance = await walletActor.wallet_balance();
    const balanceTC = Number(balance.amount) / 1_000_000_000_000;
    console.log(`   Wallet balance: ${balanceTC.toFixed(2)}T cycles\n`);

    if (Number(balance.amount) < Number(CYCLES_TO_SEND)) {
      console.log(`❌ Insufficient wallet balance. Need ${Number(CYCLES_TO_SEND) / 1_000_000_000_000}T cycles.`);
      console.log(`   Current: ${balanceTC.toFixed(2)}T cycles\n`);
      process.exit(1);
    }

    // Send cycles to raven_ai canister
    console.log(`📤 Sending ${Number(CYCLES_TO_SEND) / 1_000_000_000_000}T cycles to raven_ai...`);
    const result = await walletActor.wallet_send({
      canister: Principal.fromText(RAVEN_AI_CANISTER_ID),
      amount: CYCLES_TO_SEND,
    });

    if ('Ok' in result) {
      console.log(`✅ Successfully sent ${Number(CYCLES_TO_SEND) / 1_000_000_000_000}T cycles!\n`);
    } else {
      console.log(`❌ Failed to send cycles: ${result.Err}\n`);
      process.exit(1);
    }

    // Note: Verification can be done via: dfx canister status 3noas-jyaaa-aaaao-a4xda-cai --network ic

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TOP-UP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 raven_ai canister is now topped up and ready for use!');
    console.log('   • AI Council should work');
    console.log('   • Article generation should work');
    console.log('   • All AI features enabled\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);

